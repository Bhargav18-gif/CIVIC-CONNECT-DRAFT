import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext.jsx';
import TopHeader from '../../components/layout/TopHeader.jsx';
import EngineerSidebar from '../../components/engineer/EngineerSidebar.jsx';
import api from '../../utils/api.js';
import { Navigation, Clock, RefreshCw, MapPin } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RoutePlanner() {
  const { user } = useAuth();
  const engineerId = user?.uid || user?.id || 'ENG-01';
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/engineer/route?engineerId=' + engineerId);
      setRouteData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [engineerId]);

  const stops = routeData?.route || [];
  const polylineCoords = stops.map(s => [s.lat, s.lng]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 relative">
        <EngineerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 lg:pl-64 flex flex-col p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Optimized Field Route</h1>
              <p className="text-sm text-slate-400">
                Sequence of {stops.length} stops ({routeData?.totalDistanceKm || 0} km, ~{routeData?.estimatedTotalDriveMinutes || 0} mins).
              </p>
            </div>
            <button
              onClick={fetchRoute}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Re-optimize
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <div className="lg:col-span-2 min-h-[500px] rounded-2xl overflow-hidden border border-white/10">
              <MapContainer center={[28.6139, 77.2090]} zoom={12} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {polylineCoords.length > 1 && (
                  <Polyline positions={polylineCoords} color="#06b6d4" weight={4} dashArray="5, 10" />
                )}
                {stops.map((stop) => (
                  <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                    <Popup>
                      <div className="text-slate-900 p-1">
                        <h4 className="font-bold text-sm">Stop #{stop.stopNumber}: {stop.title}</h4>
                        <p className="text-xs text-slate-600">Address: {stop.address}</p>
                        <p className="text-xs text-cyan-600 font-bold mt-1">Priority: {stop.priority}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/10 space-y-3 overflow-y-auto max-h-[600px]">
              <h3 className="text-sm font-semibold text-slate-200">Stop Sequence</h3>
              {stops.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">Stop #{s.stopNumber}</span>
                    <span className="text-[10px] text-slate-400">+{s.estimatedTravelMinutes} min drive</span>
                  </div>
                  <h4 className="text-xs font-medium text-white">{s.title}</h4>
                  <p className="text-[11px] text-slate-400">{s.address}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
