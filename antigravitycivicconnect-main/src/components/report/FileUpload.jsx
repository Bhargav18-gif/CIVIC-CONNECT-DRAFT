import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";

/**
 * Drag-and-drop / click upload zone. Accepts both images and short videos,
 * shows local previews, and reports the current file list to the parent.
 */
export default function FileUpload({ files, setFiles, accept = "image/*,video/*", label }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function addFiles(fileList) {
    const next = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setFiles((prev) => [...prev, ...next]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          dragActive ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/15 hover:border-white/25"
        }`}
      >
        <UploadCloud size={28} className="mx-auto text-cyan-400 mb-3" />
        <p className="text-sm text-slate-300">
          <span className="text-cyan-400 font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500 mt-1">Images or videos, up to 25MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
          <AnimatePresence>
            {files.map((f, i) => (
              <motion.div
                key={f.url}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative aspect-square rounded-xl overflow-hidden glass group"
              >
                {f.isVideo ? (
                  <video src={f.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                  {f.isVideo ? (
                    <VideoIcon size={12} className="text-white" />
                  ) : (
                    <ImageIcon size={12} className="text-white" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                >
                  <X size={12} className="text-white" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
