import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard
    switch (user.role) {
      case "customer": return <Navigate to="/browse" replace />;
      case "kitchen_provider": return <Navigate to="/kitchen-dashboard" replace />;
      case "delivery_agent": return <Navigate to="/delivery-dashboard" replace />;
      case "admin": return <Navigate to="/admin" replace />;
      default: return <Navigate to="/" replace />;
    }
  }

  return children;
}
