import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import api from "@/lib/api";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, total, itemCount } = useCart();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!address.trim()) { toast.error("Please enter a delivery address"); return; }
    if (cart.items.length === 0) { toast.error("Your cart is empty"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/orders", {
        kitchen_id: cart.kitchen_id,
        items: cart.items.map(i => ({ menu_item_id: i.id, quantity: i.quantity })),
        delivery_address: address,
        origin_url: window.location.origin,
      });
      clearCart();
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(formatApiError(err));
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" data-testid="cart-empty">
        <ShoppingCart className="h-16 w-16 text-stone-200 mx-auto mb-4" />
        <h2 className="font-display text-2xl text-stone-900 mb-2">Your cart is empty</h2>
        <p className="text-stone-500 mb-6">Explore nearby kitchens and add delicious items</p>
        <Link to="/browse">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8" data-testid="browse-kitchens-btn">Browse Kitchens</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="cart-page">
      <Link to={`/kitchen/${cart.kitchen_id}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-600 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to {cart.kitchen_name}
      </Link>

      <h1 className="font-display text-3xl tracking-tight text-stone-900 mb-2">Your Cart</h1>
      <p className="text-sm text-stone-500 mb-8">From <span className="font-medium text-stone-700">{cart.kitchen_name}</span></p>

      {/* Cart items */}
      <div className="space-y-3 mb-8">
        {cart.items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-stone-200/60 p-4 flex items-center gap-4" data-testid={`cart-item-${item.id}`}>
            {item.image_url && (
              <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-stone-900 text-sm">{item.name}</h3>
              <p className="text-sm text-orange-600 font-display font-bold">${item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors" data-testid={`qty-minus-${item.id}`}>
                <Minus className="h-3.5 w-3.5 text-stone-600" />
              </button>
              <span className="w-8 text-center font-medium text-sm" data-testid={`qty-value-${item.id}`}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors" data-testid={`qty-plus-${item.id}`}>
                <Plus className="h-3.5 w-3.5 text-stone-600" />
              </button>
              <button onClick={() => removeFromCart(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors ml-2" data-testid={`remove-item-${item.id}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <span className="font-medium text-stone-900 text-sm w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Delivery address */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-5 mb-6">
        <Label className="text-stone-700 font-medium text-sm">Delivery Address</Label>
        <Input value={address} onChange={e => setAddress(e.target.value)}
          placeholder="Enter your full delivery address" className="mt-2 rounded-xl" data-testid="delivery-address" />
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-5 mb-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal ({itemCount} items)</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Delivery fee</span>
            <span className="text-green-600">Free</span>
          </div>
          <div className="border-t border-stone-100 pt-2 mt-2">
            <div className="flex justify-between font-display font-bold text-lg">
              <span className="text-stone-900">Total</span>
              <span className="text-orange-600" data-testid="cart-total">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleCheckout} disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-3 text-base font-medium" data-testid="checkout-btn">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay $${total.toFixed(2)} & Place Order`}
      </Button>
    </div>
  );
}
