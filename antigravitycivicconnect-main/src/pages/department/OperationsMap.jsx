import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDepartment } from '../../context/DepartmentContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import DepartmentSidebar from '../../components/department/DepartmentSidebar.jsx';
import api from '../../utils/api.js';
import { Layers, RefreshCw, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function OperationsMap() {
  const { departmentId, departmentName } = useDepartment();
  const [data, setData] = useState({ clusters: [], totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchHotspots = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/department/hotspots?departmentId=' + (departmentId || 'Roads'));
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
  }, [departmentId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <DepartmentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Field Operations Map & Density Hotspots</h1>
              <p className="text-sm text-slate-400">
                Real-time 500m DBSCAN cluster visualization for {departmentName || 'department'}.
              </p>
            </div>
            <button
              onClick={fetchHotspots}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Refresh Hotspots
            </button>
          </div>

          <div className="flex-1 min-h-[550px] rounded-2xl overflow-hidden border border-white/10 relative">
            <MapContainer center={[28.6139, 77.2090]} zoom={12} className="h-full w-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {data.clusters?.map((c) => (
                <React.Fragment key={c.clusterId}>
                  <Circle
                    center={[c.center.lat, c.center.lng]}
                    radius={500}
                    pathOptions={{
                      color: c.density === 'CRITICAL' ? '#ef4444' : c.density === 'HIGH' ? '#f59e0b' : '#06b6d4',
                      fillColor: c.density === 'CRITICAL' ? '#ef4444' : c.density === 'HIGH' ? '#f59e0b' : '#06b6d4',
                      fillOpacity: 0.25,
                    }}
                  />
                  <Marker position={[c.center.lat, c.center.lng]}>
                    <Popup>
                      <div className="text-slate-900 p-1">
                        <h4 className="font-bold text-sm">{c.clusterId.toUpperCase()}</h4>
                        <p className="text-xs text-slate-600">Active Complaints: {c.count}</p>
                        <p className="text-xs font-semibold mt-1">Density: {c.density}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  );
}
