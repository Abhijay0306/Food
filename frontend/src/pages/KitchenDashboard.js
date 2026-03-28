import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, DollarSign, ChefHat, Loader2, Trash2, Edit, Clock } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function LocationPicker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 15);
    },
  });
  return position ? <Marker position={position} icon={markerIcon} /> : null;
}

export default function KitchenDashboard() {
  const [kitchen, setKitchen] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noKitchen, setNoKitchen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: k } = await api.get("/my/kitchen");
      if (!k) { setNoKitchen(true); setLoading(false); return; }
      setKitchen(k);
      const [ordersRes, menuRes] = await Promise.all([
        api.get("/orders"),
        api.get(`/kitchens/${k.id}/menu`),
      ]);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
    } catch (e) {
      if (e.response?.status === 403) setNoKitchen(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
  if (noKitchen) return <CreateKitchenForm onCreated={loadData} />;

  const activeOrders = orders.filter(o => ["placed", "accepted", "preparing", "ready"].includes(o.status));
  const completedOrders = orders.filter(o => ["delivered", "rejected", "picked_up"].includes(o.status));
  const revenue = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="kitchen-dashboard">
      {/* Stats */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-stone-900">{kitchen.name}</h1>
          <p className="text-sm text-stone-500 mt-1">Kitchen Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600">{kitchen.is_open ? "Open" : "Closed"}</span>
          <Switch checked={kitchen.is_open} onCheckedChange={async () => {
            try {
              const { data } = await api.put(`/kitchens/${kitchen.id}/toggle`);
              setKitchen(p => ({ ...p, is_open: data.is_open }));
              toast.success(data.is_open ? "Kitchen is now open" : "Kitchen is now closed");
            } catch (e) { toast.error(formatApiError(e)); }
          }} data-testid="kitchen-toggle" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Package, label: "Active Orders", value: activeOrders.length, color: "text-blue-600 bg-blue-50" },
          { icon: DollarSign, label: "Revenue", value: `$${revenue.toFixed(2)}`, color: "text-green-600 bg-green-50" },
          { icon: ChefHat, label: "Total Orders", value: orders.length, color: "text-orange-600 bg-orange-50" },
        ].map((s, i) => (
          <Card key={i} className="border-stone-200/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className="font-display text-xl font-bold text-stone-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="bg-stone-100 mb-6">
          <TabsTrigger value="orders" data-testid="tab-orders">Orders ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="menu" data-testid="tab-menu">Menu ({menuItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {activeOrders.length === 0 ? (
            <div className="text-center py-12 text-stone-400"><Package className="h-10 w-10 mx-auto mb-3 text-stone-200" /><p>No active orders</p></div>
          ) : (
            <div className="space-y-3" data-testid="kitchen-orders-list">
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} onUpdate={loadData} />
              ))}
            </div>
          )}
          {completedOrders.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-lg font-medium text-stone-900 mb-4">Completed</h3>
              <div className="space-y-2">
                {completedOrders.slice(0, 10).map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-stone-200/60 p-4 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-stone-700">{order.customer_name}</span>
                      <span className="text-stone-400 ml-2">#{order.id?.slice(-6)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-stone-600">${order.total?.toFixed(2)}</span>
                      <Badge className={`border-0 text-xs ${order.status === "delivered" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="menu">
          <MenuManager kitchen={kitchen} menuItems={menuItems} onUpdate={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({ order, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const nextAction = {
    placed: [{ status: "accepted", label: "Accept", cls: "bg-green-600 hover:bg-green-700" }, { status: "rejected", label: "Reject", cls: "bg-red-600 hover:bg-red-700" }],
    accepted: [{ status: "preparing", label: "Start Preparing", cls: "bg-orange-600 hover:bg-orange-700" }],
    preparing: [{ status: "ready", label: "Mark Ready", cls: "bg-blue-600 hover:bg-blue-700" }],
  };
  const actions = nextAction[order.status] || [];

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      onUpdate();
    } catch (e) { toast.error(formatApiError(e)); }
    setUpdating(false);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/60 p-5" data-testid={`kitchen-order-${order.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-stone-900">{order.customer_name}</h3>
            <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">{order.status?.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-xs text-stone-400 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />{order.created_at ? new Date(order.created_at).toLocaleTimeString() : ""}
          </p>
        </div>
        <span className="font-display font-bold text-orange-600">${order.total?.toFixed(2)}</span>
      </div>
      <div className="space-y-1 mb-3">
        {order.items?.map((item, i) => (
          <p key={i} className="text-sm text-stone-600">{item.quantity}x {item.name}</p>
        ))}
      </div>
      <p className="text-xs text-stone-400 mb-3">Deliver to: {order.delivery_address}</p>
      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(a => (
            <Button key={a.status} size="sm" onClick={() => handleUpdate(a.status)} disabled={updating}
              className={`${a.cls} text-white rounded-full text-xs`} data-testid={`order-action-${a.status}`}>
              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuManager({ kitchen, menuItems, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", image_url: "", is_available: true });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!form.name || !form.price) { toast.error("Name and price are required"); return; }
    setAdding(true);
    try {
      await api.post(`/kitchens/${kitchen.id}/menu`, { ...form, price: parseFloat(form.price) });
      toast.success("Item added");
      setForm({ name: "", description: "", price: "", category: "", image_url: "", is_available: true });
      setShowAdd(false);
      onUpdate();
    } catch (e) { toast.error(formatApiError(e)); }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/menu-items/${id}`);
      toast.success("Item deleted");
      onUpdate();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div data-testid="menu-manager">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-medium text-stone-900">Menu Items</h3>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-full" data-testid="add-menu-item-btn">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Add Menu Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-sm">Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="mt-1 rounded-xl" data-testid="menu-item-name" /></div>
              <div><Label className="text-sm">Description</Label><Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="mt-1 rounded-xl" data-testid="menu-item-desc" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm">Price ($) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} className="mt-1 rounded-xl" data-testid="menu-item-price" /></div>
                <div><Label className="text-sm">Category</Label><Input value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className="mt-1 rounded-xl" data-testid="menu-item-category" /></div>
              </div>
              <div><Label className="text-sm">Image URL</Label><Input value={form.image_url} onChange={e => setForm(p => ({...p, image_url: e.target.value}))} placeholder="https://..." className="mt-1 rounded-xl" data-testid="menu-item-image" /></div>
              <Button onClick={handleAdd} disabled={adding} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full" data-testid="save-menu-item">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {menuItems.length === 0 ? (
        <p className="text-center py-8 text-stone-400">No menu items yet. Add your first dish!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="menu-items-grid">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-stone-200/60 p-4 flex gap-3" data-testid={`menu-manage-item-${item.id}`}>
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-stone-900 text-sm">{item.name}</h4>
                    <p className="text-xs text-stone-400">{item.category}</p>
                  </div>
                  <span className="font-display font-bold text-orange-600 text-sm">${item.price?.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Badge className={`border-0 text-xs ${item.is_available ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-500"}`}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </Badge>
                  <button onClick={() => handleDelete(item.id)} className="text-stone-400 hover:text-red-500 transition-colors" data-testid={`delete-menu-${item.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateKitchenForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", address: "", lat: 40.7580, lng: -73.9855, cuisine_types: [], image_url: "" });
  const [cuisineInput, setCuisineInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setForm(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => {}
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Kitchen name is required"); return; }
    setLoading(true);
    try {
      await api.post("/kitchens", form);
      toast.success("Kitchen created!");
      onCreated();
    } catch (e) { toast.error(formatApiError(e)); }
    setLoading(false);
  };

  const addCuisine = () => {
    if (cuisineInput.trim()) {
      setForm(p => ({ ...p, cuisine_types: [...p.cuisine_types, cuisineInput.trim()] }));
      setCuisineInput("");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12" data-testid="create-kitchen-form">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <ChefHat className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="font-display text-3xl text-stone-900 mb-2">Set Up Your Kitchen</h1>
        <p className="text-stone-500">Tell us about your home kitchen</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label className="text-sm">Kitchen Name *</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="mt-1 rounded-xl" data-testid="kitchen-name-input" /></div>
        <div><Label className="text-sm">Description</Label><Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="mt-1 rounded-xl" data-testid="kitchen-desc-input" /></div>
        <div><Label className="text-sm">Address</Label><Input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} className="mt-1 rounded-xl" data-testid="kitchen-address-input" /></div>
        <div>
          <Label className="text-sm">Location</Label>
          <p className="text-xs text-stone-500 mb-2">Click on the map to set your kitchen's location</p>
          <div className="h-48 w-full rounded-xl overflow-hidden border border-stone-200">
            <MapContainer center={[form.lat, form.lng]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <LocationPicker 
                position={{ lat: form.lat, lng: form.lng }} 
                setPosition={(p) => setForm(f => ({ ...f, lat: p.lat, lng: p.lng }))} 
              />
            </MapContainer>
          </div>
        </div>
        <div>
          <Label className="text-sm">Cuisine Types</Label>
          <div className="flex gap-2 mt-1">
            <Input value={cuisineInput} onChange={e => setCuisineInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCuisine())} placeholder="e.g. Italian" className="rounded-xl" />
            <Button type="button" onClick={addCuisine} variant="outline" size="sm" className="rounded-xl">Add</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.cuisine_types.map((c, i) => (
              <Badge key={i} className="bg-orange-50 text-orange-700 border-0 cursor-pointer" onClick={() => setForm(p => ({...p, cuisine_types: p.cuisine_types.filter((_, j) => j !== i)}))}>
                {c} &times;
              </Badge>
            ))}
          </div>
        </div>
        <div><Label className="text-sm">Image URL</Label><Input value={form.image_url} onChange={e => setForm(p => ({...p, image_url: e.target.value}))} placeholder="https://..." className="mt-1 rounded-xl" /></div>
        <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-3" data-testid="create-kitchen-submit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Kitchen"}
        </Button>
      </form>
    </div>
  );
}
