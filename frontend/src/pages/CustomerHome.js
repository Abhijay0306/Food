import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, ChevronRight, Loader2 } from "lucide-react";
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
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Grab initial location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        (err) => {
          console.error("Geo error:", err);
          setLocationError(true);
          setLocationLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      setLocationError(true);
      setLocationLoading(false);
    }
  }, []);

  // Fetch kitchens only when location is known
  useEffect(() => {
    if (!location) return;
    const fetchKitchens = async () => {
      setLoading(true);
      try {
        const params = { search: search || undefined };
        params.lat = location.lat; 
        params.lng = location.lng; 
        params.radius = 100;
        const { data } = await api.get("/kitchens", { params });
        setKitchens(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    const debounce = setTimeout(fetchKitchens, 300);
    return () => clearTimeout(debounce);
  }, [search, location]);

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualAddress.trim()) return;
    setManualLoading(true);
    try {
      // Free Nominatim API for geocoding
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setLocationError(false);
      } else {
        toast.error("Could not find this location. Try a broader area.");
      }
    } catch (err) {
      toast.error("Failed to search location.");
    }
    setManualLoading(false);
  };

  const mapCenter = location ? [location.lat, location.lng] : [22.5726, 88.3639]; // Default to Kolkata visually

  if (locationLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <MapPin className="h-10 w-10 text-orange-600 animate-bounce mb-4" />
        <h2 className="font-display text-xl text-stone-900">Detecting your exact location...</h2>
        <p className="text-stone-500 mt-2">We need this to find the hottest kitchens near you.</p>
      </div>
    );
  }

  if (locationError && !location) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto px-4">
        <MapPin className="h-12 w-12 text-stone-300 mb-4" />
        <h2 className="font-display text-2xl text-stone-900 mb-2">Where are you?</h2>
        <p className="text-stone-500 text-center mb-6">We couldn't detect your GPS automatically. Please enter your neighborhood or city below to find restaurants.</p>
        <form onSubmit={handleManualSearch} className="w-full flex gap-2">
          <Input value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="e.g. Salt Lake, Kolkata" className="rounded-xl flex-1" />
          <Button type="submit" disabled={manualLoading} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-6">
            {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="customer-home">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900">Nearby Kitchens</h1>
          <div className="text-sm text-stone-500 mt-1 flex items-center gap-1 group cursor-pointer" onClick={() => { setLocation(null); setLocationError(true); setManualAddress(""); }}>
            <MapPin className="h-4 w-4 text-orange-600 group-hover:animate-bounce" />
            <span className="font-medium hover:text-orange-600 underline decoration-dashed underline-offset-4">Location Set: {location.lat.toFixed(3)}, {location.lng.toFixed(3)} (Change)</span>
          </div>
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

      {loading && !search && (
        <div className="flex items-center gap-2 mb-4 text-stone-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
          <span>Looking for nearby restaurants...</span>
        </div>
      )}

      {/* Map */}
      {showMap && location && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-stone-200 h-[350px]" data-testid="kitchen-map">
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            {(search ? kitchens : kitchens.filter(k => k.distance <= 10)).filter(k => k.lat && k.lng).map(k => (
              <Marker key={k.id} position={[k.lat, k.lng]} icon={markerIcon} opacity={k.distance > 10 ? 0.5 : 1}>
                <Popup>
                  {k.distance > 10 ? (
                    <span className="font-medium text-stone-500">{k.name} (Too Far)</span>
                  ) : (
                    <Link to={`/kitchen/${k.id}`} className="font-medium text-orange-600 hover:underline">{k.name}</Link>
                  )}
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
      ) : (search ? kitchens : kitchens.filter(k => k.distance <= 10)).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 text-lg">No kitchens found nearby</p>
          <p className="text-stone-400 text-sm mt-2">Try expanding your search or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="kitchen-grid">
          {(search ? kitchens : kitchens.filter(k => k.distance <= 10)).map(k => {
            const isTooFar = k.distance > 10;
            return (
              <Link to={isTooFar ? "#" : `/kitchen/${k.id}`} key={k.id}
                onClick={(e) => { if (isTooFar) e.preventDefault(); }}
                className={`bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group ${isTooFar ? 'opacity-60 grayscale cursor-not-allowed' : 'card-hover'}`}
                data-testid={`kitchen-card-${k.id}`}>
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  <img src={k.image_url || "https://images.unsplash.com/photo-1476005484258-bd38fa5bc155?w=600"}
                    alt={k.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isTooFar && 'group-hover:scale-105'}`} />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {isTooFar ? (
                      <Badge className="bg-stone-800 hover:bg-stone-800 text-stone-100 border-0 text-[10px] shadow-md uppercase tracking-wider py-0.5">
                        Too Far
                      </Badge>
                    ) : (
                      <Badge className={`${k.is_open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} border-0 text-[10px] uppercase font-bold tracking-wider py-0.5 shadow-sm`}
                        data-testid={`kitchen-status-${k.id}`}>
                        {k.is_open ? "Open" : "Closed"}
                      </Badge>
                    )}
                  </div>
                  {k.distance != null && (
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm shadow-sm rounded-full px-3 py-1 text-xs font-bold text-stone-700">
                      {k.distance < 1 ? `${(k.distance * 1000).toFixed(0)}m away` : `${k.distance.toFixed(1)}km away`}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className={`font-display text-lg font-medium transition-colors line-clamp-1 ${isTooFar ? "text-stone-500" : "text-stone-900 group-hover:text-orange-600"}`}>{k.name}</h3>
                    <div className="flex items-center gap-1 text-sm shrink-0 bg-stone-50 px-2 py-0.5 rounded-full">
                      <Star className={`h-3 w-3 ${isTooFar ? "text-stone-400 fill-stone-400" : "text-orange-400 fill-orange-400"}`} />
                      <span className="font-bold text-stone-700 text-xs">{k.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 line-clamp-2 mb-4 leading-relaxed">{k.description}</p>
                  <div className="flex items-center justify-between border-t border-stone-100 pt-4 mt-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {k.cuisine_types?.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-wider font-bold text-stone-500 bg-stone-100 rounded-md px-2 py-1">{c}</span>
                      ))}
                    </div>
                    {!isTooFar && <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-orange-500 transition-colors" />}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
