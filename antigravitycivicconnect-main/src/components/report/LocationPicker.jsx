import { useState, useEffect, useRef, useCallback } from "react";
import { LocateFixed, Loader2, Map as MapIcon, AlertCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl, Circle, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import * as turf from "@turf/turf";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../firebase.js";

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for existing complaints
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const iconRed = createCustomIcon('red');
const iconYellow = createCustomIcon('gold');
const iconGreen = createCustomIcon('green');
const iconBlack = createCustomIcon('black');

function getIconForComplaint(complaint) {
  if (complaint.status === "resolved") return iconGreen;
  if (complaint.status === "rejected" || complaint.status === "closed") return iconBlack;
  if (complaint.priority === "urgent" || complaint.priority === "emergency" || complaint.priority === "high") return iconRed;
  return iconYellow; // Default / Medium priority
}

function LocationMarker({ location, setLocation, setAddress }) {
  const map = useMap();
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (location && location.accuracy) {
      map.flyTo([location.lat, location.lng], map.getZoom());
    }
  }, [location?.lat, location?.lng, map]);

  const onDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker != null) {
      const pos = marker.getLatLng();
      setLocation({ lat: pos.lat, lng: pos.lng });
    }
  }, [setLocation]);

  return location === null ? null : (
    <>
      <Marker
        position={location}
        draggable={true}
        ref={markerRef}
        eventHandlers={{ dragend: onDragEnd }}
      />
      {location.accuracy && (
        <Circle 
          center={location} 
          radius={location.accuracy} 
          pathOptions={{ fillColor: '#06b6d4', color: '#06b6d4', fillOpacity: 0.2 }}
        />
      )}
    </>
  );
}

export default function LocationPicker({ location, setLocation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  const defaultCenter = { lat: 28.6139, lng: 77.2090 };

  // Fetch complaints for clustering and duplicate detection
  useEffect(() => {
    async function fetchComplaints() {
      try {
        const q = query(collection(db, "complaints"), limit(200)); // Limit for performance
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const mapped = data.filter(c => c.location && c.location.lat).map(c => ({
          ...c,
          lat: c.location.lat,
          lng: c.location.lng,
          status: c.status?.toLowerCase() || 'pending',
          priority: c.priority?.toLowerCase() || 'normal'
        }));
        setComplaints(mapped);
      } catch (err) {
        console.error("Failed to load complaints for map", err);
      }
    }
    fetchComplaints();
  }, []);

  // Reverse Geocoding & Duplicate Detection
  useEffect(() => {
    if (location) {
      // 1. Reverse Geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        })
        .catch(console.error);

      // 2. Duplicate Radius Detection (100m)
      const centerPt = turf.point([location.lng, location.lat]);
      const foundDuplicates = complaints.filter(c => {
        const pt = turf.point([c.lng, c.lat]);
        const distance = turf.distance(centerPt, pt, { units: 'meters' });
        c.distanceToUser = Math.round(distance);
        return distance <= 100;
      });
      setDuplicates(foundDuplicates.sort((a, b) => a.distanceToUser - b.distanceToUser));
    }
  }, [location?.lat, location?.lng, complaints]);

  function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.");
      return;
    }
    setLoading(true);
    setError("");

    let readings = [];
    let watchId;
    let timeoutId;

    // Collect GPS samples for 4 seconds for high accuracy
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        readings.push(pos);
      },
      (err) => {
        console.warn("GPS watch warning:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    timeoutId = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (readings.length === 0) {
        setError("Couldn't capture location. Check browser permissions or move outdoors.");
        setLoading(false);
        return;
      }

      // Find the reading with the best (lowest) accuracy value
      const bestReading = readings.reduce((prev, current) => 
        (prev.coords.accuracy < current.coords.accuracy) ? prev : current
      );

      if (bestReading.coords.accuracy > 100) {
        setError(`Location accuracy is very low (${Math.round(bestReading.coords.accuracy)}m). Move outdoors or try again.`);
      } else {
        setError("");
      }

      setLocation({
        lat: bestReading.coords.latitude,
        lng: bestReading.coords.longitude,
        accuracy: bestReading.coords.accuracy
      });
      setLoading(false);
    }, 4000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-slate-400">Location</label>
        {location && location.accuracy && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            GPS Accuracy: {Math.round(location.accuracy)}m
          </span>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/10 h-[350px] md:h-[500px] lg:h-[600px] bg-slate-900 shadow-lg">
        <MapContainer
          center={location || defaultCenter}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Road Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite Map">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          <LocationMarker location={location} setLocation={setLocation} setAddress={setAddress} />

          {/* Render nearby complaints as a cluster */}
          {complaints.length > 0 && (
            <MarkerClusterGroup chunkedLoading>
              {complaints.map(c => (
                <Marker key={c.id} position={[c.lat, c.lng]} icon={getIconForComplaint(c)}>
                  <Popup>
                    <div className="text-sm font-sans text-slate-900">
                      <p className="font-bold mb-1">{c.issueTitle || 'Complaint'}</p>
                      <p className="text-xs mb-1">ID: {c.complaintId || c.id}</p>
                      <p className="text-xs mb-1 capitalize">Status: {c.status}</p>
                      <p className="text-xs capitalize">Priority: {c.priority}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>
        
        {/* Absolute UI overlay inside map container */}
        <div className="absolute bottom-4 left-4 z-[400]">
          <button
            type="button"
            onClick={detectLocation}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/20 text-sm font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-60 px-4 py-2 rounded-xl shadow-lg transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {loading ? "Detecting high-accuracy GPS..." : "Use my current location"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
      
      {address && (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-cyan-400 block mb-1">Detected Address:</span> 
            {address}
          </p>
          {location && (
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </p>
          )}
        </div>
      )}

      {/* Duplicate Warning UI */}
      {duplicates.length > 0 && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-2 mb-2">
            <AlertCircle size={16} />
            Possible Duplicates Detected
          </h4>
          <p className="text-xs text-amber-200/70 mb-3">
            We found {duplicates.length} complaint(s) within 100 meters of your selected location.
          </p>
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {duplicates.map(d => (
              <div key={d.id} className="bg-black/20 p-2 rounded-lg text-xs border border-white/5">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-white">{d.issueTitle || 'Complaint'}</span>
                  <span className="text-amber-400">{d.distanceToUser}m away</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ID: {d.complaintId || d.id}</span>
                  <span className="capitalize text-emerald-400">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-200/50">
            Please verify if your issue is already reported. Submitting a duplicate will result in it being auto-merged by our AI.
          </p>
        </div>
      )}
    </div>
  );
}
