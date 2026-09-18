import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Download, Info, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageViewer({ images, currentIndex, onClose, onNavigate }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  // Reset zoom/pan when changing images
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
      >
        {/* Top Bar */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold backdrop-blur-md">
              {currentIndex + 1} / {images.length}
            </div>
            {currentImage.uploadedAt && (
              <div className="text-sm text-slate-300 flex items-center gap-2">
                <Info size={16} className="text-cyan-400" />
                Uploaded: {new Date(currentImage.uploadedAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleZoomOut} className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all cursor-pointer">
              <ZoomOut size={18} />
            </button>
            <span className="text-white text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all cursor-pointer">
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button onClick={handleDownload} className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all cursor-pointer">
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-red-500/80 text-white transition-all cursor-pointer ml-4">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Areas */}
        <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-start p-4 z-10">
          {currentIndex > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }} 
              className="p-3 rounded-full bg-black/50 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer backdrop-blur-md"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        
        <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end p-4 z-10">
          {currentIndex < images.length - 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }} 
              className="p-3 rounded-full bg-black/50 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer backdrop-blur-md"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Main Image Area */}
        <div 
          className="flex-1 overflow-hidden flex items-center justify-center relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <motion.img
            src={currentImage.url}
            alt={currentImage.caption || "Evidence Image"}
            className="max-w-full max-h-full object-contain pointer-events-none"
            style={{ 
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          />
        </div>

        {/* Bottom Metadata */}
        {(currentImage.caption || currentImage.uploadedBy || currentImage.stage) && (
          <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col items-center z-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 max-w-2xl w-full">
              {currentImage.stage && (
                <span className="inline-block px-2.5 py-1 mb-2 rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                  {currentImage.stage}
                </span>
              )}
              {currentImage.caption && (
                <p className="text-white text-lg font-medium mb-1">{currentImage.caption}</p>
              )}
              {currentImage.uploadedBy && (
                <p className="text-slate-400 text-sm">Uploaded by <span className="text-cyan-400">{currentImage.uploadedBy}</span></p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
