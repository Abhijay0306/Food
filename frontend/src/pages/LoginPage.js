import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.name}!`);
      switch (data.role) {
        case "customer": navigate("/browse"); break;
        case "kitchen_provider": navigate("/kitchen-dashboard"); break;
        case "delivery_agent": navigate("/delivery-dashboard"); break;
        case "admin": navigate("/admin"); break;
        default: navigate("/");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" data-testid="login-page">
      <Card className="w-full max-w-md border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
            <ChefHat className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription className="text-stone-500">Sign in to your HyperEats account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-stone-700 text-sm">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="mt-1.5 rounded-xl" data-testid="login-email" />
            </div>
            <div>
              <Label htmlFor="password" className="text-stone-700 text-sm">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" required className="mt-1.5 rounded-xl" data-testid="login-password" />
            </div>
            <Button type="submit" disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-3 font-medium" data-testid="login-submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium" data-testid="login-to-register">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
