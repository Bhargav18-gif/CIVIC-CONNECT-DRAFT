"""
CivicConnect Admin Task Classifier - Model Training Pipeline
Fine-tunes DistilBERT for multi-class civic department classification.
Refactored to support candidate isolation: trains strictly inside output_dir
without modifying the active production directory.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from .config import (
        BASE_MODEL_NAME,
        MODEL_DIR,
        CHECKPOINT_DIR,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
        TRAIN_BATCH_SIZE,
        EVAL_BATCH_SIZE,
        LEARNING_RATE,
        NUM_EPOCHS,
        WEIGHT_DECAY,
        WARMUP_RATIO,
        MODEL_VERSION,
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
    )
    from .dataset import load_csv_raw
except ImportError:
    from config import (
        BASE_MODEL_NAME,
        MODEL_DIR,
        CHECKPOINT_DIR,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
        TRAIN_BATCH_SIZE,
        EVAL_BATCH_SIZE,
        LEARNING_RATE,
        NUM_EPOCHS,
        WEIGHT_DECAY,
        WARMUP_RATIO,
        MODEL_VERSION,
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
    )
    from dataset import load_csv_raw


def compute_metrics_fn(eval_pred):
    import numpy as np
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support

    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=1)

    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        labels, preds, average="macro", zero_division=0
    )
    _, _, weighted_f1, _ = precision_recall_fscore_support(
        labels, preds, average="weighted", zero_division=0
    )
    acc = accuracy_score(labels, preds)

    return {
        "accuracy": float(acc),
        "macro_precision": float(macro_p),
        "macro_recall": float(macro_r),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
    }


def train(
    train_csv: Path = None,
    validation_csv: Path = None,
    output_dir: Path = None,
    base_model_dir: Path = None,
    epochs: int = None,
    batch_size: int = None,
    lr: float = None,
    version_tag: str = "candidate"
) -> Dict[str, Any]:
    """
    Executes fine-tuning of DistilBERT sequence classifier.
    Saves weights, tokenizer, config, and metadata strictly inside output_dir.
    """
    actual_train_csv = Path(train_csv or TRAIN_CSV)
    actual_val_csv = Path(validation_csv or VALIDATION_CSV)
    target_output_dir = Path(output_dir or MODEL_DIR)
    num_epochs = epochs or NUM_EPOCHS
    train_bs = batch_size or TRAIN_BATCH_SIZE
    learning_rate = lr or LEARNING_RATE

    target_output_dir.mkdir(parents=True, exist_ok=True)
    custom_checkpoint_dir = target_output_dir / "checkpoints"
    custom_checkpoint_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 70)
    print(f"   CIVICCONNECT CLASSIFIER - TRAINING PIPELINE ({version_tag})")
    print(f"   Output Directory: {target_output_dir}")
    print("=" * 70)

    try:
        import torch
        from transformers import (
            AutoTokenizer,
            AutoModelForSequenceClassification,
            TrainingArguments,
            Trainer,
            DataCollatorWithPadding,
        )
        from datasets import Dataset
    except ImportError as e:
        print(f"\n[FATAL ERROR] Required ML libraries missing: {e}")
        print("Please install requirements: pip install -r requirements.txt")
        sys.exit(1)

    # 1. Device check
    if torch.cuda.is_available():
        device_name = torch.cuda.get_device_name(0)
        device_str = f"GPU: {device_name}"
    else:
        device_str = "CPU"
    print(f"Device: {device_str}")

    # 2. Load Datasets
    raw_train = load_csv_raw(actual_train_csv)
    raw_val = load_csv_raw(actual_val_csv)

    train_data = [{"complaint": r["complaint"], "label": LABEL_TO_ID[r["department"]]} for r in raw_train]
    val_data = [{"complaint": r["complaint"], "label": LABEL_TO_ID[r["department"]]} for r in raw_val]

    print(f"Training examples  : {len(train_data)} from {actual_train_csv.name}")
    print(f"Validation examples: {len(val_data)} from {actual_val_csv.name}")

    train_dataset = Dataset.from_list(train_data)
    val_dataset = Dataset.from_list(val_data)

    # 3. Base model/tokenizer resolution
    # If base_model_dir is specified and contains config.json, initialize from it
    init_source = BASE_MODEL_NAME
    if base_model_dir and (Path(base_model_dir) / "config.json").exists():
        init_source = str(base_model_dir)
        print(f"Initializing candidate from base model dir: {init_source}")
    else:
        print(f"Initializing from Hugging Face base: {init_source}")

    tokenizer = AutoTokenizer.from_pretrained(init_source)

    def tokenize_batch(batch):
        return tokenizer(
            batch["complaint"],
            padding=False,
            truncation=True,
            max_length=MAX_LENGTH,
        )

    tokenized_train = train_dataset.map(tokenize_batch, batched=True)
    tokenized_val = val_dataset.map(tokenize_batch, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(
        init_source,
        num_labels=NUM_LABELS,
        id2label={str(k): v for k, v in ID_TO_LABEL.items()},
        label2id={k: int(v) for k, v in LABEL_TO_ID.items()},
    )

    # 4. Training Arguments
    training_args = TrainingArguments(
        output_dir=str(custom_checkpoint_dir),
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        learning_rate=learning_rate,
        per_device_train_batch_size=train_bs,
        per_device_eval_batch_size=EVAL_BATCH_SIZE,
        num_train_epochs=num_epochs,
        weight_decay=WEIGHT_DECAY,
        warmup_steps=10,
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        logging_steps=20,
        report_to="none",
        use_cpu=not torch.cuda.is_available(),
        fp16=torch.cuda.is_available(),
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=compute_metrics_fn,
    )

    # 5. Train
    print("\nStarting sequence classification training...")
    train_result = trainer.train()
    print(f"Training completed in {train_result.metrics.get('train_runtime', 0):.2f}s!")

    # 6. Evaluate on validation split
    val_metrics = trainer.evaluate(eval_dataset=tokenized_val)

    # 7. Save candidate artifacts strictly to target_output_dir
    print(f"\nSaving model weights and tokenizer to: {target_output_dir}")
    trainer.save_model(str(target_output_dir))
    tokenizer.save_pretrained(str(target_output_dir))

    meta = {
        "model_version": version_tag,
        "base_model": init_source,
        "num_labels": NUM_LABELS,
        "id2label": ID_TO_LABEL,
        "label2id": LABEL_TO_ID,
        "training_info": {
            "train_samples": len(train_data),
            "validation_samples": len(val_data),
            "epochs": num_epochs,
            "learning_rate": learning_rate,
            "batch_size": train_bs,
        },
        "validation_metrics": {
            k: float(v) for k, v in val_metrics.items() if k.startswith("eval_")
        },
        "device": device_str,
    }
    with open(target_output_dir / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Candidate artifacts safely preserved at: {target_output_dir}")
    return meta


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CivicConnect Classifier")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    args = parser.parse_args()

    train(
        output_dir=Path(args.output_dir) if args.output_dir else None,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )
