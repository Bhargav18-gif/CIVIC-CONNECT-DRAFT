import { useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ImageViewer from "./ImageViewer.jsx";

export default function EvidenceGallery({ issue }) {
  const [activeTab, setActiveTab] = useState("citizen");
  const [viewerImages, setViewerImages] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Safely get arrays or create them
  const citizenPhotos = issue.citizenPhotos?.length > 0 ? issue.citizenPhotos : (issue.imageURL ? [{ url: issue.imageURL, caption: "Original Report Photo", uploadedAt: issue.createdAt, uploadedBy: issue.userName || "Citizen" }] : []);
  const citizenAdditional = issue.citizenAdditionalPhotos || [];
  const deptProgress = issue.departmentProgressPhotos || [];
  const deptCompletion = issue.departmentCompletionPhotos || [];
  const citizenVerification = issue.citizenVerificationPhotos || [];

  const tabs = [
    { id: "citizen", label: "Citizen Photos", count: citizenPhotos.length + citizenAdditional.length },
    { id: "progress", label: "Dept Progress", count: deptProgress.length },
    { id: "completion", label: "Dept Completion", count: deptCompletion.length },
    { id: "verification", label: "Verification", count: citizenVerification.length },
  ];

  const getActiveImages = () => {
    switch (activeTab) {
      case "citizen": return [...citizenPhotos, ...citizenAdditional];
      case "progress": return deptProgress;
      case "completion": return deptCompletion;
      case "verification": return citizenVerification;
      default: return [];
    }
  };

  const activeImages = getActiveImages();

  const handleImageClick = (index) => {
    setViewerImages(activeImages);
    setViewerIndex(index);
  };

  return (
    <div className="bg-[#0e1422] border border-white/10 rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Camera size={18} className="text-cyan-400" />
        Evidence Gallery
      </h3>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-inner"
                : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === tab.id ? "bg-cyan-400/20 text-cyan-300" : "bg-white/10 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Image Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeImages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
              <ImageIcon size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No images uploaded yet.</p>
              <p className="text-xs text-slate-500 mt-1">Images for this stage will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {activeImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/50 cursor-pointer"
                  onClick={() => handleImageClick(idx)}
                >
                  <img
                    src={img.url}
                    alt={img.caption || "Evidence"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    {img.stage && (
                      <span className="text-[9px] font-bold uppercase text-emerald-400 mb-1">{img.stage}</span>
                    )}
                    <span className="text-xs text-white font-medium truncate">{img.caption || "View Fullscreen"}</span>
                    {img.uploadedAt && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{new Date(img.uploadedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Fullscreen Viewer */}
      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          currentIndex={viewerIndex}
          onClose={() => setViewerImages(null)}
          onNavigate={(newIdx) => setViewerIndex(newIdx)}
        />
      )}
    </div>
  );
}
