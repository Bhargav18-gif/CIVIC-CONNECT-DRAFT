import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { MapPin, AlertTriangle, Clock, Layers, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api.js";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPriorityIcon(priority, isBreached) {
  const color = isBreached ? "#ef4444" : priority === "urgent" ? "#f97316" : priority === "high" ? "#f59e0b" : "#06b6d4";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36"><path d="M12 0C5.37 0 0 5.37 0 12c0 8.25 12 24 12 24S24 20.25 24 12C24 5.37 18.63 0 12 0z" fill="${color}" opacity="0.9"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const SLA_COLOR = { SAFE: "text-emerald-400", WARNING: "text-yellow-400", AT_RISK: "text-amber-400", BREACHED: "text-red-400", COMPLETED: "text-slate-400" };

export default function EngineerMap() {
  const { user } = useAuth();
  const engineerId = user?.uid || "ENG-RDS-01";
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`http://localhost:5177/api/engineer/tasks?engineerId=${engineerId}`);
      const fetchedTasks = resp.data?.tasks || [];
      setTasks(fetchedTasks);
      // Center map on first task with GPS
      const firstWithGps = fetchedTasks.find((t) => t.location?.lat && t.location?.lng);
      if (firstWithGps) setMapCenter([firstWithGps.location.lat, firstWithGps.location.lng]);
    } catch (err) {
      console.warn("Map tasks fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [engineerId]);

  const tasksWithGps = tasks.filter((t) => t.location?.lat && t.location?.lng);
  const urgentCount = tasks.filter((t) => (t.priority || "").toLowerCase() === "urgent").length;
  const atRiskCount = tasks.filter((t) => t.sla?.slaStatus === "AT_RISK" || t.sla?.isBreached).length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 lg:px-8 pt-28 pb-20 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FIELD MAP</span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight">Engineer Route Map</h1>
            <p className="text-slate-400 text-sm mt-1">Live task locations, priority markers, and recommended visit order.</p>
          </div>
          <button onClick={fetchTasks} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex items-center justify-between">Total Tasks<Layers size={14} className="text-cyan-400" /></div>
            <div className="text-2xl font-bold text-white mt-2">{tasks.length}</div>
          </div>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex items-center justify-between">Critical/Urgent<AlertTriangle size={14} className="text-red-400" /></div>
            <div className="text-2xl font-bold text-red-400 mt-2">{urgentCount}</div>
          </div>
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 flex items-center justify-between">SLA At Risk<Clock size={14} className="text-amber-400" /></div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{atRiskCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map */}
          <div className="lg:col-span-8">
            <div className="glass rounded-2xl border border-white/10 overflow-hidden" style={{ height: "520px" }}>
              {typeof window !== "undefined" && (
                <MapContainer center={mapCenter} zoom={13} style={{ width: "100%", height: "100%" }} zoomControl={false}>
                  <ZoomControl position="bottomright" />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {tasksWithGps.map((task) => (
                    <Marker
                      key={task.id}
                      position={[task.location.lat, task.location.lng]}
                      icon={createPriorityIcon(task.priority, task.sla?.isBreached)}
                      eventHandlers={{ click: () => setSelectedTask(task) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 180, fontFamily: "system-ui", fontSize: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>#{task.referenceId || task.id?.slice(0, 8)}</div>
                          <div style={{ marginBottom: 4 }}>{task.title || task.category || "Civic Task"}</div>
                          <div style={{ color: task.sla?.isBreached ? "#ef4444" : "#10b981" }}>SLA: {task.sla?.timeRemainingStr}</div>
                          <a href={`/engineer/tasks/${task.id}`} style={{ color: "#06b6d4", display: "block", marginTop: 6 }}>View Full Task →</a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Urgent/Breached</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> High Priority</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> At Risk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" /> Normal</span>
            </div>
          </div>

          {/* Side Panel: Recommended Visit Order */}
          <div className="lg:col-span-4">
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-3" style={{ maxHeight: 560, overflowY: "auto" }}>
              <h3 className="text-xs uppercase font-semibold tracking-wider text-slate-400">Recommended Visit Order</h3>
              <p className="text-[11px] text-slate-500">Sorted by priority → SLA risk → oldest first</p>
              {loading ? (
                <div className="text-xs text-slate-400 py-8 text-center">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-xs text-slate-400 py-8 text-center">No tasks assigned.</div>
              ) : (
                tasks.map((task, index) => {
                  const isUrgent = (task.priority || "").toLowerCase() === "urgent";
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <motion.div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? "bg-cyan-950/30 border-cyan-500/40" : "bg-slate-900/60 hover:bg-slate-900 border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">{index + 1}</span>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">#{task.referenceId || task.id?.slice(0, 6)}</span>
                        {isUrgent && <span className="text-[9px] font-bold text-red-300 bg-red-500/10 px-1 rounded">URGENT</span>}
                      </div>
                      <div className="text-xs font-semibold text-white line-clamp-1">{task.title || task.category || "Task"}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[10px] font-mono ${SLA_COLOR[task.sla?.slaStatus] || "text-slate-400"}`}>{task.sla?.timeRemainingStr}</span>
                        <Link to={`/engineer/tasks/${task.id}`} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5">
                          Details <ExternalLink size={9} />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
