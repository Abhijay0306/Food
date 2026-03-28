import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, DollarSign, MapPin, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryDashboard() {
  const [myOrders, setMyOrders] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [myRes, avRes] = await Promise.all([
        api.get("/delivery/orders"),
        api.get("/delivery/available"),
      ]);
      setMyOrders(myRes.data);
      setAvailable(avRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAcceptDelivery = async (orderId) => {
    try {
      await api.put(`/delivery/orders/${orderId}/accept`);
      toast.success("Delivery accepted!");
      loadData();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success(`Order ${status.replace(/_/g, " ")}`);
      loadData();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const activeOrders = myOrders.filter(o => ["ready", "picked_up"].includes(o.status));
  const completedOrders = myOrders.filter(o => o.status === "delivered");
  const earnings = completedOrders.reduce((s, o) => s + (o.total || 0) * 0.15, 0); // 15% commission

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="delivery-dashboard">
      <h1 className="font-display text-3xl tracking-tight text-stone-900 mb-2">Delivery Dashboard</h1>
      <p className="text-sm text-stone-500 mb-8">Manage your deliveries</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Package, label: "Active", value: activeOrders.length, color: "text-blue-600 bg-blue-50" },
          { icon: Truck, label: "Completed", value: completedOrders.length, color: "text-green-600 bg-green-50" },
          { icon: DollarSign, label: "Earnings", value: `$${earnings.toFixed(2)}`, color: "text-orange-600 bg-orange-50" },
        ].map((s, i) => (
          <Card key={i} className="border-stone-200/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-stone-500">{s.label}</p>
                <p className="font-display text-xl font-bold text-stone-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-stone-100 mb-6">
          <TabsTrigger value="active" data-testid="tab-active">My Deliveries ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available">Available ({available.length})</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed ({completedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeOrders.length === 0 ? (
            <div className="text-center py-12 text-stone-400"><Truck className="h-10 w-10 mx-auto mb-3 text-stone-200" /><p>No active deliveries</p></div>
          ) : (
            <div className="space-y-3" data-testid="active-deliveries">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-stone-200/60 p-5" data-testid={`delivery-order-${order.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-stone-900">{order.kitchen_name}</h3>
                      <p className="text-xs text-stone-400">Order #{order.id?.slice(-6)}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800 border-0">{order.status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="text-sm text-stone-600 space-y-1 mb-3">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-stone-400" />{order.delivery_address}</p>
                    <p>{order.items?.length} items - ${order.total?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "ready" && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, "picked_up")}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full" data-testid={`pickup-${order.id}`}>
                        Mark Picked Up
                      </Button>
                    )}
                    {order.status === "picked_up" && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, "delivered")}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-full" data-testid={`deliver-${order.id}`}>
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available">
          {available.length === 0 ? (
            <div className="text-center py-12 text-stone-400"><Package className="h-10 w-10 mx-auto mb-3 text-stone-200" /><p>No available deliveries right now</p></div>
          ) : (
            <div className="space-y-3" data-testid="available-deliveries">
              {available.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-stone-200/60 p-5" data-testid={`available-order-${order.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-stone-900">{order.kitchen_name}</h3>
                      <p className="text-xs text-stone-400 flex items-center gap-1"><Clock className="h-3 w-3" />{order.created_at ? new Date(order.created_at).toLocaleTimeString() : ""}</p>
                    </div>
                    <span className="font-display font-bold text-orange-600">${order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-stone-600 flex items-center gap-1.5 mb-3"><MapPin className="h-3.5 w-3.5 text-stone-400" />{order.delivery_address}</p>
                  <Button size="sm" onClick={() => handleAcceptDelivery(order.id)}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-full" data-testid={`accept-delivery-${order.id}`}>
                    Accept Delivery
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedOrders.length === 0 ? (
            <p className="text-center py-12 text-stone-400">No completed deliveries yet</p>
          ) : (
            <div className="space-y-2" data-testid="completed-deliveries">
              {completedOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-stone-200/60 p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-stone-700 text-sm">{order.kitchen_name}</span>
                    <span className="text-stone-400 text-xs ml-2">#{order.id?.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-600">${order.total?.toFixed(2)}</span>
                    <Badge className="bg-green-100 text-green-800 border-0 text-xs">Delivered</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
