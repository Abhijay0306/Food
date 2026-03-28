import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Package, DollarSign, ChefHat, Truck, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      const [anRes, usRes, orRes, agRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users"),
        api.get("/orders"),
        api.get("/admin/users", { params: { role: "delivery_agent" } }),
      ]);
      setAnalytics(anRes.data);
      setUsers(usRes.data);
      setOrders(orRes.data);
      setAgents(agRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async (orderId, agentId) => {
    try {
      await api.put(`/admin/orders/${orderId}/assign`, { agent_id: agentId });
      toast.success("Agent assigned");
      loadData();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;

  const filteredUsers = roleFilter === "all" ? users : users.filter(u => u.role === roleFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-dashboard">
      <h1 className="font-display text-3xl tracking-tight text-stone-900 mb-2">Admin Dashboard</h1>
      <p className="text-sm text-stone-500 mb-8">Platform overview and management</p>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { icon: Package, label: "Orders", value: analytics?.total_orders || 0, color: "text-blue-600 bg-blue-50" },
          { icon: Users, label: "Users", value: analytics?.total_users || 0, color: "text-indigo-600 bg-indigo-50" },
          { icon: ChefHat, label: "Kitchens", value: analytics?.total_kitchens || 0, color: "text-purple-600 bg-purple-50" },
          { icon: Truck, label: "Agents", value: analytics?.total_agents || 0, color: "text-teal-600 bg-teal-50" },
          { icon: DollarSign, label: "Revenue", value: `$${(analytics?.total_revenue || 0).toFixed(2)}`, color: "text-green-600 bg-green-50" },
        ].map((s, i) => (
          <Card key={i} className="border-stone-200/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">{s.label}</p>
                <p className="font-display text-lg font-bold text-stone-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="bg-stone-100 mb-6">
          <TabsTrigger value="orders" data-testid="admin-tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden" data-testid="admin-orders-table">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-xs font-medium text-stone-500">Order</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Kitchen</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Total</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 30).map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="text-xs font-mono text-stone-500">#{order.id?.slice(-6)}</TableCell>
                    <TableCell className="text-sm text-stone-700">{order.customer_name}</TableCell>
                    <TableCell className="text-sm text-stone-700">{order.kitchen_name}</TableCell>
                    <TableCell className="text-sm font-medium text-stone-900">${order.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${
                        order.status === "delivered" ? "bg-green-100 text-green-800" :
                        order.status === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>{order.status?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.delivery_agent_name ? (
                        <span className="text-sm text-stone-600">{order.delivery_agent_name}</span>
                      ) : ["placed", "accepted", "preparing", "ready"].includes(order.status) ? (
                        <Select onValueChange={v => handleAssign(order.id, v)}>
                          <SelectTrigger className="h-8 text-xs w-36 rounded-lg" data-testid={`assign-agent-${order.id}`}>
                            <SelectValue placeholder="Assign agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-stone-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {orders.length === 0 && (
              <div className="text-center py-12 text-stone-400"><Package className="h-8 w-8 mx-auto mb-2 text-stone-200" /><p className="text-sm">No orders yet</p></div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="flex gap-2 mb-4">
            {["all", "customer", "kitchen_provider", "delivery_agent", "admin"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${roleFilter === r ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                data-testid={`user-filter-${r}`}>
                {r === "all" ? "All" : r.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden" data-testid="admin-users-table">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-xs font-medium text-stone-500">Name</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Email</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Role</TableHead>
                  <TableHead className="text-xs font-medium text-stone-500">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium text-stone-900">{u.name}</TableCell>
                    <TableCell className="text-sm text-stone-600">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${
                        u.role === "admin" ? "bg-purple-100 text-purple-800" :
                        u.role === "kitchen_provider" ? "bg-orange-100 text-orange-800" :
                        u.role === "delivery_agent" ? "bg-blue-100 text-blue-800" :
                        "bg-stone-100 text-stone-800"
                      }`}>{u.role?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-stone-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
