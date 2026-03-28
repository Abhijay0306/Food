import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Home, Package, ShoppingCart, User, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

export default function BottomNav() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user || user.role !== "customer") return null;

  const tabs = [
    { label: "Browse", path: "/browse", icon: Home },
    { label: "Orders", path: "/orders", icon: Package },
    { label: "Cart", path: "/cart", icon: ShoppingCart },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 flex items-center justify-around p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center p-2 flex-1 ${
              isActive ? "text-orange-600" : "text-stone-500"
            }`}
          >
            <div className="relative">
              <tab.icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
              {tab.label === "Cart" && itemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium mt-1">{tab.label}</span>
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center p-2 flex-1 text-stone-500">
            <User className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-[10px] font-medium mt-1">Profile</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl border-t-0 p-6">
          <SheetTitle className="sr-only">User Profile</SheetTitle>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="font-display font-medium text-lg text-stone-900">{user.name}</h3>
            <p className="text-sm text-stone-500">{user.email}</p>
          </div>
          <button onClick={() => { logout(); setOpen(false); }} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 rounded-xl font-medium focus:outline-none">
            <LogOut className="h-5 w-5" /> Log Out
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
