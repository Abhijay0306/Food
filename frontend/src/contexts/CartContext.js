import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

const CART_KEY = "hyper_eats_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { kitchen_id: null, kitchen_name: "", items: [] };
  } catch {
    return { kitchen_id: null, kitchen_name: "", items: [] };
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);
  const [pendingAdd, setPendingAdd] = useState(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (kitchenId, kitchenName, item) => {
    if (cart.kitchen_id && cart.kitchen_id !== kitchenId) {
      setPendingAdd({ kitchenId, kitchenName, item });
      return false;
    }
    setCart(prev => {
      const existing = prev.items.find(i => i.id === item.id);
      if (existing) {
        return {
          ...prev, kitchen_id: kitchenId, kitchen_name: kitchenName,
          items: prev.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        };
      }
      return { ...prev, kitchen_id: kitchenId, kitchen_name: kitchenName, items: [...prev.items, { ...item, quantity: 1 }] };
    });
    return true;
  };

  const confirmReplaceCart = () => {
    if (!pendingAdd) return;
    setCart({
      kitchen_id: pendingAdd.kitchenId,
      kitchen_name: pendingAdd.kitchenName,
      items: [{ ...pendingAdd.item, quantity: 1 }]
    });
    setPendingAdd(null);
  };

  const cancelPendingAdd = () => setPendingAdd(null);

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const items = prev.items.filter(i => i.id !== itemId);
      return items.length === 0 ? { kitchen_id: null, kitchen_name: "", items: [] } : { ...prev, items };
    });
  };

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) return removeFromCart(itemId);
    setCart(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, quantity: qty } : i) }));
  };

  const clearCart = () => setCart({ kitchen_id: null, kitchen_name: "", items: [] });

  const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount, pendingAdd, confirmReplaceCart, cancelPendingAdd }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
