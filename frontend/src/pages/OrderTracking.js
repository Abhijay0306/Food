import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api, { getWsUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Package, ChefHat, Flame, CheckCircle2, Truck, MapPin, ArrowLeft, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const STEPS = [
  { key: "placed", label: "Order Placed", icon: Package, desc: "Your order has been received" },
  { key: "accepted", label: "Accepted", icon: CheckCircle2, desc: "Kitchen accepted your order" },
  { key: "preparing", label: "Preparing", icon: Flame, desc: "Your food is being prepared" },
  { key: "ready", label: "Ready", icon: ChefHat, desc: "Food is ready for pickup" },
  { key: "picked_up", label: "Picked Up", icon: Truck, desc: "Delivery agent has your food" },
  { key: "delivered", label: "Delivered", icon: MapPin, desc: "Enjoy your meal!" },
];

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let ws = null;
    let reconnectTimer = null;
    let retryCount = 0;

    const connect = () => {
      const wsUrl = getWsUrl(`/ws/orders/${id}`);
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setOrder(prev => prev ? { ...prev, status: data.status, updated_at: data.updated_at } : prev);
        } catch {}
      };

      ws.onclose = () => {
        if (retryCount < 5) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          reconnectTimer = setTimeout(connect, timeout);
          retryCount++;
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-1/3" />
          <div className="h-64 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) return <div className="text-center py-20 text-stone-400">Order not found</div>;

  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const isRejected = order.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8" data-testid="order-tracking-page">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-600 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-stone-900" data-testid="order-tracking-title">Order Tracking</h1>
          <p className="text-sm text-stone-500 mt-1">Order #{id?.slice(-8)}</p>
        </div>
        <Badge className={`${isRejected ? "bg-red-100 text-red-800" : currentIdx >= 5 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"} border-0 text-sm`}
          data-testid="order-status-badge">
          {isRejected ? "Rejected" : order.status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>

      {/* Tracking Map */}
      {!isRejected && order.kitchen_lat && order.kitchen_lng && (
        <div className="bg-white rounded-2xl border border-stone-200/60 p-2 mb-6 h-64 overflow-hidden relative" data-testid="tracking-map">
          <MapContainer center={[order.kitchen_lat, order.kitchen_lng]} zoom={13} style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <Marker position={[order.kitchen_lat, order.kitchen_lng]} icon={markerIcon} />
            {currentIdx >= 4 && (
              <>
                <Marker position={[order.kitchen_lat + 0.005, order.kitchen_lng - 0.005]} icon={markerIcon} />
                <Polyline positions={[[order.kitchen_lat, order.kitchen_lng], [order.kitchen_lat + 0.005, order.kitchen_lng - 0.005]]} color="#ea580c" weight={3} dashArray="5, 10" />
              </>
            )}
          </MapContainer>
        </div>
      )}

      {/* Status timeline */}
      {!isRejected && (
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 sm:p-8 mb-6" data-testid="status-timeline">
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isActive = i === currentIdx;
              const isComplete = i < currentIdx;
              const isPending = i > currentIdx;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isComplete ? "bg-green-100 text-green-600" : isActive ? "bg-orange-600 text-white status-active" : "bg-stone-100 text-stone-300"}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-10 my-1 ${isComplete ? "bg-green-300" : "bg-stone-200"}`} />
                    )}
                  </div>
                  <div className={`pt-2 ${isPending ? "opacity-40" : ""}`}>
                    <h3 className={`font-medium text-sm ${isActive ? "text-orange-600" : "text-stone-900"}`}>{step.label}</h3>
                    <p className="text-xs text-stone-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center" data-testid="order-rejected">
          <p className="text-red-700 font-medium">This order was rejected by the kitchen.</p>
          <p className="text-red-500 text-sm mt-1">Your payment will be refunded shortly.</p>
        </div>
      )}

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-stone-200/60 p-6" data-testid="order-details">
        <h2 className="font-display text-lg font-medium text-stone-900 mb-4">Order Details</h2>
        <div className="space-y-3 mb-4">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-stone-700">{item.quantity}x {item.name}</span>
              <span className="text-stone-500">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-100 pt-3 space-y-2 text-sm">
          <div className="flex justify-between font-display font-bold text-base">
            <span className="text-stone-900">Total</span>
            <span className="text-orange-600" data-testid="order-total">${order.total?.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400 text-xs">Kitchen</p>
            <p className="text-stone-700 font-medium">{order.kitchen_name}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs">Delivery Address</p>
            <p className="text-stone-700">{order.delivery_address}</p>
          </div>
          {order.delivery_agent_name && (
            <div>
              <p className="text-stone-400 text-xs">Delivery Agent</p>
              <p className="text-stone-700 font-medium">{order.delivery_agent_name}</p>
            </div>
          )}
          <div>
            <p className="text-stone-400 text-xs">Placed at</p>
            <p className="text-stone-700">{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
