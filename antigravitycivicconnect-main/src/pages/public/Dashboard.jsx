import { motion } from "framer-motion";
import Navbar from "../../components/layout/Navbar.jsx";
import Footer from "../../components/layout/Footer.jsx";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const sampleData = [
  { id: 1, lat: 28.6139, lng: 77.2090, title: "Pothole", department: "Roads" },
  { id: 2, lat: 28.6239, lng: 77.2190, title: "Water Leak", department: "Water" },
];

export default function PublicDashboard() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen px-6 pt-32 pb-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display font-bold text-4xl tracking-tight mb-2 text-center">Public Transparency Dashboard</h1>
          <p className="text-slate-400 mb-10 text-center">View live civic issues and department statistics across the city.</p>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass rounded-3xl p-6 h-[500px] border border-white/10 relative z-0">
              <h2 className="text-xl font-semibold text-white mb-4">Live Issue Map</h2>
              <div className="w-full h-[calc(100%-2rem)] rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
                <MapContainer center={[28.6139, 77.2090]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {sampleData.map((issue) => (
                    <Marker key={issue.id} position={[issue.lat, issue.lng]}>
                      <Popup>
                        <strong>{issue.title}</strong><br />{issue.department}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass rounded-3xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2">Resolution Rate</h3>
                <p className="text-4xl font-bold font-display text-emerald-400">84%</p>
                <p className="text-sm text-slate-400 mt-1">Issues resolved this month</p>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2">Most Active Department</h3>
                <p className="text-2xl font-bold font-display text-cyan-400">Road & Transport</p>
                <p className="text-sm text-slate-400 mt-1">1,245 issues handled</p>
              </div>
              
              <div className="glass rounded-3xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2">Avg. Resolution Time</h3>
                <p className="text-2xl font-bold font-display text-violet-400">3.2 Days</p>
                <p className="text-sm text-slate-400 mt-1">Across all departments</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
