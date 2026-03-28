import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "customer", phone: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const data = await register(form.email, form.password, form.name, form.role, form.phone);
      toast.success(`Welcome, ${data.name}!`);
      switch (data.role) {
        case "customer": navigate("/browse"); break;
        case "kitchen_provider": navigate("/kitchen-dashboard"); break;
        case "delivery_agent": navigate("/delivery-dashboard"); break;
        default: navigate("/");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" data-testid="register-page">
      <Card className="w-full max-w-md border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
            <ChefHat className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="font-display text-2xl">Create account</CardTitle>
          <CardDescription className="text-stone-500">Join HyperEats today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-stone-700 text-sm">Full Name</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)}
                placeholder="Your name" required className="mt-1.5 rounded-xl" data-testid="register-name" />
            </div>
            <div>
              <Label className="text-stone-700 text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="you@example.com" required className="mt-1.5 rounded-xl" data-testid="register-email" />
            </div>
            <div>
              <Label className="text-stone-700 text-sm">Password</Label>
              <Input type="password" value={form.password} onChange={e => update("password", e.target.value)}
                placeholder="Min 6 characters" required className="mt-1.5 rounded-xl" data-testid="register-password" />
            </div>
            <div>
              <Label className="text-stone-700 text-sm">I want to</Label>
              <Select value={form.role} onValueChange={v => update("role", v)}>
                <SelectTrigger className="mt-1.5 rounded-xl" data-testid="register-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Order food (Customer)</SelectItem>
                  <SelectItem value="kitchen_provider">Sell food (Kitchen Provider)</SelectItem>
                  <SelectItem value="delivery_agent">Deliver food (Delivery Agent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-stone-700 text-sm">Phone (optional)</Label>
              <Input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                placeholder="+1 234 567 8900" className="mt-1.5 rounded-xl" data-testid="register-phone" />
            </div>
            <Button type="submit" disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-full py-3 font-medium" data-testid="register-submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium" data-testid="register-to-login">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
