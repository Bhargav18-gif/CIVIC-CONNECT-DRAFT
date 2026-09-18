# CivicConnect Admin Task Classifier — Continuous Learning AI Service

An isolated, human-in-the-loop Python AI service for **CivicConnect** that uses Hugging Face Transformers (`distilbert-base-uncased`) to classify citizen complaints into 8 civic administrative departments, calculate confidence scores, recommend work types and priorities, suggest actionable next steps, collect verified administrator feedback, and periodically retrain and deploy versioned models with full safety guardrails and rollback capabilities.

---

## 1. Production Model Performance (Isolated Unseen Test Set)

The fine-tuned **`civicconnect-admin-v1`** model was evaluated on the **1,000 isolated test records** (125 per class) from `ai/dataset/test.csv`. These records were never seen during training or validation.

| Metric | Target | Achieved Result | Status |
| :--- | :---: | :---: | :---: |
| **Test Accuracy** | $\ge 96.0\%$ | **99.90%** (999 / 1,000 correct) | **ACHIEVED [YES]** |
| **Macro F1 Score** | $\ge 95.0\%$ | **99.90%** | **ACHIEVED [YES]** |
| **Macro Precision** | — | **99.90%** | **ACHIEVED [YES]** |
| **Macro Recall** | — | **99.90%** | **ACHIEVED [YES]** |
| **Weighted F1 Score** | — | **99.90%** | **ACHIEVED [YES]** |

### Per-Department Classification Breakdown

| Department Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| **Roads** | 1.0000 | 0.9920 | 0.9960 | 125 |
| **Water** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Electricity** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Sanitation** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Drainage** | 0.9921 | 1.0000 | 0.9960 | 125 |
| **Traffic** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Public Health** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Municipal Services** | 1.0000 | 1.0000 | 1.0000 | 125 |
| **Overall Macro Avg** | **0.9990** | **0.9990** | **0.9990** | **1,000** |

### Confusion Matrix (1,000 Isolated Test Records)

```
Actual \ Pred          Roads   Water   Elect   Sanit   Drain   Traff   Publi   Munic
Roads                    124       0       0       0       1       0       0       0
Water                      0     125       0       0       0       0       0       0
Electricity                0       0     125       0       0       0       0       0
Sanitation                 0       0       0     125       0       0       0       0
Drainage                   0       0       0       0     125       0       0       0
Traffic                    0       0       0       0       0     125       0       0
Public Health              0       0       0       0       0       0     125       0
Municipal Services         0       0       0       0       0       0       0     125
```
*(Only 1 boundary case out of 1,000 was misclassified: an excavated pavement trench tagged as Drainage instead of Roads).*

---

## 2. Dataset Architecture & Quality Audit

The dataset consists of **EXACTLY 10,000 unique civic complaints** distributed evenly across 8 departments (1,250 per department):

| Split | Samples | Per Department | Purpose |
| :--- | :---: | :---: | :--- |
| **`train.csv`** | 8,000 | 1,000 / department | Model parameter optimization |
| **`validation.csv`** | 1,000 | 125 / department | Checkpoint selection & hyperparameter tuning |
| **`test.csv`** | 1,000 | 125 / department | Strict isolated holdout evaluation |
| **Total** | **10,000** | **1,250 / department** | Balanced civic complaint corpus |

### Data Quality Assurance Audit
- **Exact Duplicates**: 0 across entire dataset
- **Cross-Split Data Leakage**: 0 (verified across train, val, and test splits)
- **Missing / Null Values**: 0
- **Length Range**: 9 to 45 words (mean: 21 words)
- **Audit Reports**: Generated and stored in `ai/dataset/data_quality_report.json` and `ai/dataset/dataset_metadata.json`.
- **Original Seed Preservation**: Original seed files are preserved intact in `ai/dataset/seed/`.

---

## 3. Human-in-the-Loop Architecture

```mermaid
graph TD
    subgraph Frontend [React Admin Interface]
        Modal[ComplaintDetailsModal.jsx] --> RecCard[AIAdminRecommendation.jsx Card]
        RecCard -->|Accept or Override| Firestore[(Firebase Firestore: ai_training_feedback)]
        DashboardUI[Admin Dashboard.jsx] --> PerfCard[AIPerformanceCard.jsx Analytics]
    end

    subgraph Gateway [Node.js Express Proxy Gateway :5177]
        NodeProxy[/api/admin/ai/*] --> PythonAPI[FastAPI AI Service :8000]
    end

    subgraph AIService [Isolated Python AI Service (/ai)]
        PythonAPI --> InferenceEngine[src/predict.py]
        PythonAPI --> FeedbackCollector[src/collect_feedback.py + PII Sanitizer]
        FeedbackCollector --> FeedbackStore[(dataset/admin_feedback.jsonl)]

        PythonAPI --> RetrainPipeline[src/retrain_pipeline.py]
        RetrainPipeline --> DatasetBuilder[src/prepare_dataset.py]
        DatasetBuilder --> IncrementalDataset[Old Verified Data + New Verified Data]
        IncrementalDataset --> FineTuner[src/train.py]
        FineTuner --> Evaluator[src/evaluate.py]
        Evaluator --> ModelRegistry[src/model_registry.py]

        ModelRegistry -->|Passes Guardrails Macro F1 >= 0.75| ActiveModel[Active Production Model Pointer]
        ModelRegistry -->|Rollback Trigger| RollbackModel[Previous Production Model]
    end
```

---

## 4. Key Operational Rules & Guardrails

1. **Inference / Retraining Isolation**: `POST /predict` executes inference strictly and fast without initiating training.
2. **No Unlabeled Training Data**: Raw citizen complaints are **never** used as training data directly. A complaint becomes eligible for training **only** when an administrator provides a final verified decision (*Accept* or *Override*).
3. **Ground-Truth Ownership**: If an administrator overrides the AI prediction, the **final admin decision is the ground-truth label**.
4. **Incremental Learning Strategy**: Retraining combines **old verified dataset + new verified admin decisions** (`dataset_v1`, `dataset_v2`, etc.) to prevent catastrophic forgetting.
5. **PII Privacy Protection**: Automatic regex sanitization strips emails, phone numbers, and street/door addresses prior to dataset construction.
6. **Safety Guardrails**: Candidate models are evaluated against the current production model. If a candidate underperforms or fails `Macro F1 >= 0.75`, it is marked `rejected` and the active production model is retained.

---

## 5. Directory Structure

```
ai/
├── dataset/
│   ├── cleaned/
│   │   └── cleaned_10000.csv       # Cleaned 10,000 unique records
│   ├── seed/                       # Preserved original seed dataset files
│   ├── train.csv                   # Stratified training split (8,000 samples; 1,000/class)
│   ├── validation.csv              # Stratified validation split (1,000 samples; 125/class)
│   ├── test.csv                    # Stratified isolated test split (1,000 samples; 125/class)
│   ├── admin_feedback.jsonl        # Persistent store for administrator accept/override decisions
│   ├── data_quality_report.json    # Complete data quality audit report
│   └── dataset_metadata.json       # Dataset distribution and split metadata
│
├── model/
│   ├── checkpoints/                # Hugging Face trainer epoch checkpoints
│   ├── civicconnect-admin-classifier/
│   │   ├── config.json             # Model architecture config
│   │   ├── model.safetensors       # Fine-tuned production transformer weights
│   │   ├── tokenizer.json          # Hugging Face tokenizer
│   │   ├── model_meta.json         # Production model metadata & test metrics
│   │   └── test_evaluation_report.json # Comprehensive isolated test set report
│   └── model_registry.json         # Model Registry tracking version statuses & metrics
│
├── src/
│   ├── __init__.py
│   ├── config.py                   # Model paths, department mappings, thresholds & hyperparameters
│   ├── dataset.py                  # Data quality validation & class distribution audit
│   ├── generate_and_clean_dataset.py # Generates and cleans 10,000 unique complaints
│   ├── split_and_audit.py          # Performs stratified 80/10/10 split & leakage audit
│   ├── collect_feedback.py         # Admin feedback collection, validation & PII sanitization
│   ├── prepare_dataset.py          # Incremental dataset builder & class balance analyzer
│   ├── train.py                    # Hugging Face sequence classification fine-tuning script
│   ├── evaluate.py                 # Test set evaluation: Macro F1, precision, recall & confusion matrix
│   ├── predict.py                  # Inference engine with confidence scoring & action guidance
│   ├── model_registry.py           # Version registry, status tracking & rollback manager
│   ├── retrain_pipeline.py         # Automated retraining pipeline & safety guardrails
│   └── api.py                      # FastAPI REST service on port 8000
│
├── requirements.txt                # Pinned Python package dependencies
└── README.md                       # System documentation
```

---

## 6. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service status, active model version (`civicconnect-admin-v1`), and feedback pool size |
| `GET` | `/model-info` | Department mappings, confidence thresholds, and active model metrics (99.9% accuracy) |
| `POST` | `/predict` | Real-time classification: department, confidence score, work type, priority, and recommended action |
| `POST` | `/predict/batch` | Classify an array of citizen complaints |
| `POST` | `/feedback` | Ingest administrator accept/override decision with PII sanitization |
| `GET` | `/training-status` | Feedback pool metrics, acceptance/override rates, dataset size, and retrain readiness |
| `POST` | `/training/check` | Checks if retraining conditions are satisfied |
| `POST` | `/training/run` | Triggers continuous learning retraining pipeline |
| `GET` | `/model/versions` | Lists all registered model versions, statuses (`production`, `archived`, `rejected`), and metrics |
| `POST` | `/model/rollback` | Rolls back the active production pointer to a specified version |

---

## 7. How to Run

### Start the AI FastAPI Service
```powershell
ai\.venv\Scripts\python.exe -m uvicorn ai.src.api:app --host 0.0.0.0 --port 8000 --reload
```

### Run CLI Prediction
```powershell
ai\.venv\Scripts\python.exe ai/src/predict.py "Severe water leakage from underground main supply pipe flooding basement"
```

### Re-evaluate on Isolated Test Set
```powershell
ai\.venv\Scripts\python.exe ai/src/evaluate.py
```
