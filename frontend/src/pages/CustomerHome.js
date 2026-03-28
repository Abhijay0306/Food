import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, ChevronRight } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

export default function CustomerHome() {
  const [kitchens, setKitchens] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 40.7580, lng: -73.9855 })
    );
  }, []);

  useEffect(() => {
    const fetchKitchens = async () => {
      setLoading(true);
      try {
        const params = { search: search || undefined };
        if (location) { params.lat = location.lat; params.lng = location.lng; params.radius = 100; }
        const { data } = await api.get("/kitchens", { params });
        setKitchens(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    const debounce = setTimeout(fetchKitchens, 300);
    return () => clearTimeout(debounce);
  }, [search, location]);

  const mapCenter = location ? [location.lat, location.lng] : [40.7580, -73.9855];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="customer-home">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900">Nearby Kitchens</h1>
          <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Detecting location..."}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search kitchens or cuisines..." className="pl-10 rounded-xl" data-testid="kitchen-search" />
          </div>
          <button onClick={() => setShowMap(!showMap)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showMap ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            data-testid="toggle-map">{showMap ? "Hide Map" : "Map View"}
          </button>
        </div>
      </div>

      {/* Map */}
      {showMap && location && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-stone-200 h-[350px]" data-testid="kitchen-map">
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            {kitchens.filter(k => k.lat && k.lng).map(k => (
              <Marker key={k.id} position={[k.lat, k.lng]} icon={markerIcon}>
                <Popup>
                  <Link to={`/kitchen/${k.id}`} className="font-medium text-orange-600 hover:underline">{k.name}</Link>
                  <p className="text-xs text-stone-500 mt-1">{k.cuisine_types?.join(", ")}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Kitchen grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden animate-pulse">
              <div className="h-48 bg-stone-100" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-stone-100 rounded w-2/3" />
                <div className="h-4 bg-stone-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : kitchens.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 text-lg">No kitchens found nearby</p>
          <p className="text-stone-400 text-sm mt-2">Try expanding your search or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="kitchen-grid">
          {kitchens.map(k => (
            <Link to={`/kitchen/${k.id}`} key={k.id}
              className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden card-hover group"
              data-testid={`kitchen-card-${k.id}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={k.image_url || "https://images.unsplash.com/photo-1476005484258-bd38fa5bc155?w=600"}
                  alt={k.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className={`${k.is_open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} border-0 text-xs`}
                    data-testid={`kitchen-status-${k.id}`}>
                    {k.is_open ? "Open" : "Closed"}
                  </Badge>
                </div>
                {k.distance != null && (
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-stone-700">
                    {k.distance < 1 ? `${(k.distance * 1000).toFixed(0)}m` : `${k.distance.toFixed(1)}km`}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display text-lg font-medium text-stone-900 group-hover:text-orange-600 transition-colors">{k.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
                    <span className="font-medium text-stone-800">{k.rating?.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-sm text-stone-500 line-clamp-2 mb-3">{k.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {k.cuisine_types?.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-[11px] font-medium text-stone-500 bg-stone-100 rounded-full px-2.5 py-0.5">{c}</span>
                    ))}
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
