import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Menu, LogOut, User, ChefHat, Truck, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import InstallPwaButton from "./InstallPwaButton";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "customer": return "/browse";
      case "kitchen_provider": return "/kitchen-dashboard";
      case "delivery_agent": return "/delivery-dashboard";
      case "admin": return "/admin";
      default: return "/";
    }
  };

  const navItems = () => {
    if (!user || user === false) return null;
    switch (user.role) {
      case "customer":
        return (
          <>
            <Link to="/browse" className="text-stone-600 hover:text-orange-600 transition-colors font-medium text-sm" data-testid="nav-browse">Browse</Link>
            <Link to="/orders" className="text-stone-600 hover:text-orange-600 transition-colors font-medium text-sm" data-testid="nav-orders">My Orders</Link>
          </>
        );
      case "kitchen_provider":
        return <Link to="/kitchen-dashboard" className="text-stone-600 hover:text-orange-600 transition-colors font-medium text-sm" data-testid="nav-kitchen-dashboard">Dashboard</Link>;
      case "delivery_agent":
        return <Link to="/delivery-dashboard" className="text-stone-600 hover:text-orange-600 transition-colors font-medium text-sm" data-testid="nav-delivery-dashboard">My Deliveries</Link>;
      case "admin":
        return <Link to="/admin" className="text-stone-600 hover:text-orange-600 transition-colors font-medium text-sm" data-testid="nav-admin">Admin Panel</Link>;
      default: return null;
    }
  };

  const isCustomer = user && user.role === "customer";

  return (
    <nav className={`sticky top-0 z-50 glass-nav border-b border-stone-200/50 ${isCustomer ? "hidden md:block" : ""}`} data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? getDashboardLink() : "/"} className="flex items-center gap-2" data-testid="nav-logo">
            <ChefHat className="h-7 w-7 text-orange-600" strokeWidth={1.5} />
            <span className="font-display font-bold text-xl text-stone-900 tracking-tight">HyperEats</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems()}
          </div>

          <div className="flex items-center gap-3">
            <InstallPwaButton />
            
            {user && user.role === "customer" && (
              <Link to="/cart" className="relative p-2 rounded-full hover:bg-stone-100 transition-colors" data-testid="nav-cart">
                <ShoppingCart className="h-5 w-5 text-stone-600" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center" data-testid="cart-badge">{itemCount}</span>
                )}
              </Link>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-stone-700" data-testid="user-menu-trigger">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-stone-400">{user.email}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())} data-testid="menu-dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="menu-logout">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login"><Button variant="ghost" size="sm" className="text-stone-700" data-testid="nav-login">Log in</Button></Link>
                <Link to="/register"><Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-5" data-testid="nav-register">Sign up</Button></Link>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="mobile-menu-trigger"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-white">
                <div className="flex flex-col gap-4 mt-8">
                  {user ? (
                    <>
                      <p className="text-sm font-medium text-stone-900">{user.name}</p>
                      <p className="text-xs text-stone-400 -mt-3">{user.email}</p>
                      {user.role === "customer" && (
                        <>
                          <Link to="/browse" onClick={() => setOpen(false)} className="py-2 text-stone-700">Browse Kitchens</Link>
                          <Link to="/orders" onClick={() => setOpen(false)} className="py-2 text-stone-700">My Orders</Link>
                          <Link to="/cart" onClick={() => setOpen(false)} className="py-2 text-stone-700">Cart ({itemCount})</Link>
                        </>
                      )}
                      {user.role === "kitchen_provider" && <Link to="/kitchen-dashboard" onClick={() => setOpen(false)} className="py-2 text-stone-700">Dashboard</Link>}
                      {user.role === "delivery_agent" && <Link to="/delivery-dashboard" onClick={() => setOpen(false)} className="py-2 text-stone-700">My Deliveries</Link>}
                      {user.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="py-2 text-stone-700">Admin Panel</Link>}
                      <button onClick={() => { handleLogout(); setOpen(false); }} className="py-2 text-red-600 text-left">Logout</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setOpen(false)} className="py-2 text-stone-700">Log in</Link>
                      <Link to="/register" onClick={() => setOpen(false)} className="py-2 text-orange-600 font-medium">Sign up</Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
