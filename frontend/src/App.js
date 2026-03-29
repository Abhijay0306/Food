import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CustomerHome from "@/pages/CustomerHome";
import KitchenMenu from "@/pages/KitchenMenu";
import CartPage from "@/pages/CartPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import OrderTracking from "@/pages/OrderTracking";
import CustomerOrders from "@/pages/CustomerOrders";
import KitchenDashboard from "@/pages/KitchenDashboard";
import DeliveryDashboard from "@/pages/DeliveryDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-brand-bg font-body pb-20 md:pb-0">
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/browse" element={<ProtectedRoute roles={["customer"]}><CustomerHome /></ProtectedRoute>} />
              <Route path="/kitchen/:id" element={<ProtectedRoute roles={["customer"]}><KitchenMenu /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute roles={["customer"]}><CartPage /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute roles={["customer"]}><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute roles={["customer"]}><CustomerOrders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
              <Route path="/kitchen-dashboard" element={<ProtectedRoute roles={["kitchen_provider"]}><KitchenDashboard /></ProtectedRoute>} />
              <Route path="/delivery-dashboard" element={<ProtectedRoute roles={["delivery_agent"]}><DeliveryDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            </Routes>
          </div>
          <BottomNav />
          <Toaster position="top-right" richColors closeButton />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
