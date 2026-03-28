import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Plus, Minus, ShoppingCart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function KitchenMenu() {
  const { id } = useParams();
  const { user } = useAuth();
  const { cart, addToCart, itemCount, pendingAdd, confirmReplaceCart, cancelPendingAdd } = useCart();
  const [kitchen, setKitchen] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [kRes, mRes] = await Promise.all([
          api.get(`/kitchens/${id}`),
          api.get(`/kitchens/${id}/menu`),
        ]);
        setKitchen(kRes.data);
        setMenuItems(mRes.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAddToCart = (item) => {
    if (!user) { toast.error("Please log in to add items"); return; }
    const added = addToCart(id, kitchen.name, { id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    if (added) {
      toast.success(`${item.name} added to cart`);
    }
  };

  const handleConfirmReplace = () => {
    confirmReplaceCart();
    toast.success("Cart replaced and item added");
  };

  const categories = [...new Set(menuItems.map(i => i.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-stone-100 rounded-2xl" />
          <div className="h-8 bg-stone-100 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-stone-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!kitchen) return <div className="text-center py-20 text-stone-400">Kitchen not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="kitchen-menu-page">
      {/* Back link */}
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-600 mb-6 transition-colors" data-testid="back-to-browse">
        <ArrowLeft className="h-4 w-4" /> Back to kitchens
      </Link>

      {/* Kitchen header */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <img src={kitchen.image_url || "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?w=800"}
          alt={kitchen.name} className="w-full h-56 sm:h-72 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${kitchen.is_open ? "bg-green-500 text-white" : "bg-red-500 text-white"} border-0`} data-testid="kitchen-open-status">
              {kitchen.is_open ? "Open Now" : "Closed"}
            </Badge>
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs">
              <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
              {kitchen.rating?.toFixed(1)} ({kitchen.total_orders}+ orders)
            </div>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight" data-testid="kitchen-name">{kitchen.name}</h1>
          <p className="text-white/70 text-sm mt-1">{kitchen.description}</p>
          <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{kitchen.address}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />20-35 min</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Menu */}
        <div className="flex-1">
          {menuItems.length === 0 ? (
            <p className="text-center py-12 text-stone-400">No menu items yet</p>
          ) : (
            <>
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat} className="mb-8">
                  <h2 className="font-display text-xl font-medium text-stone-900 mb-4" data-testid={`category-${cat}`}>{cat}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {menuItems.filter(i => i.category === cat).map(item => (
                      <MenuItemCard key={item.id} item={item} onAdd={() => handleAddToCart(item)} />
                    ))}
                  </div>
                </div>
              )) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                    <MenuItemCard key={item.id} item={item} onAdd={() => handleAddToCart(item)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cart summary sidebar (desktop) */}
        {user && user.role === "customer" && itemCount > 0 && cart.kitchen_id === id && (
          <div className="hidden lg:block w-72">
            <div className="sticky top-24 bg-white rounded-2xl border border-stone-200/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="font-display text-lg font-medium text-stone-900 mb-4">Your Cart</h3>
              <div className="space-y-2 mb-4">
                {cart.items.map(i => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-stone-700">{i.quantity}x {i.name}</span>
                    <span className="text-stone-500">${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-100 pt-3 mb-4">
                <div className="flex justify-between font-medium">
                  <span className="text-stone-900">Total</span>
                  <span className="text-orange-600">${cart.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</span>
                </div>
              </div>
              <Link to="/cart">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full" data-testid="go-to-cart">
                  <ShoppingCart className="h-4 w-4 mr-2" /> View Cart
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cart bar */}
      {user && user.role === "customer" && itemCount > 0 && cart.kitchen_id === id && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-40 pb-[max(1rem,env(safe-area-inset-bottom))] mb-[70px]">
          <Link to="/cart">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-3" data-testid="mobile-cart-bar">
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Cart ({itemCount} items) - ${cart.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
            </Button>
          </Link>
        </div>
      )}

      {/* Cart Conflict Dialog */}
      <Dialog open={!!pendingAdd && pendingAdd.kitchenId === id} onOpenChange={(open) => { if (!open) cancelPendingAdd(); }}>
        <DialogContent className="w-[90vw] max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Start a new cart?</DialogTitle>
            <DialogDescription>
              Your cart currently contains items from <strong>{cart.kitchen_name}</strong>. Adding items from <strong>{kitchen?.name}</strong> will clear your current cart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={cancelPendingAdd} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleConfirmReplace} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white">Start New Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuItemCard({ item, onAdd }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden flex group card-hover" data-testid={`menu-item-${item.id}`}>
      <div className="flex-1 p-4">
        <h4 className="font-medium text-stone-900 text-sm mb-1">{item.name}</h4>
        <p className="text-xs text-stone-400 line-clamp-2 mb-2">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-orange-600">${item.price?.toFixed(2)}</span>
          {item.is_available !== false && (
            <button onClick={onAdd}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg p-1.5 transition-colors"
              data-testid={`add-item-${item.id}`}>
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        {item.is_available === false && <Badge variant="outline" className="mt-1 text-xs text-stone-400">Unavailable</Badge>}
      </div>
      {item.image_url && (
        <div className="w-28 h-full">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
