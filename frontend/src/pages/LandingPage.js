import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { MapPin, Clock, Shield, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role) {
      switch (user.role) {
        case "customer": navigate("/browse"); break;
        case "kitchen_provider": navigate("/kitchen-dashboard"); break;
        case "delivery_agent": navigate("/delivery-dashboard"); break;
        case "admin": navigate("/admin"); break;
        default: break;
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen" data-testid="landing-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/4e35fcbb-3203-4527-8349-7602eda95188/images/0f249fff42fc986ffc47ec208d3905ef5fcca59f1bb8ce5d5ca38186c9144b14.png"
            alt="Homemade food" className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-4 animate-fade-up" data-testid="hero-overline">
              Homemade food, delivered fresh
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none text-stone-900 mb-6 animate-fade-up stagger-1" data-testid="hero-title">
              Discover kitchens<br />in your neighborhood
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-stone-600 mb-10 max-w-lg animate-fade-up stagger-2" data-testid="hero-subtitle">
              Fresh, homemade meals from trusted local home chefs. Order in 3 taps, delivered to your door.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-up stagger-3">
              <Link to="/register">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8 py-3 text-base font-medium shadow-lg shadow-orange-600/20" data-testid="hero-cta-signup">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/browse">
                <Button variant="outline" className="rounded-full px-8 py-3 text-base border-stone-300 text-stone-700 hover:border-orange-600 hover:text-orange-600" data-testid="hero-cta-browse">
                  Browse Kitchens
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 lg:py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-3">Why HyperEats</p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900">Food made with love, near you</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {[
            { icon: MapPin, title: "Hyperlocal Discovery", desc: "Find home kitchens within walking distance. Fresh food, zero compromise." },
            { icon: Clock, title: "Quick Delivery", desc: "From kitchen to your door in minutes. Real-time tracking every step of the way." },
            { icon: Shield, title: "Trusted Kitchens", desc: "Verified home chefs with ratings and reviews. Hygiene you can count on." },
          ].map((f, i) => (
            <div key={i} className={`bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 card-hover animate-fade-up stagger-${i + 1}`}>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                <f.icon className="h-6 w-6 text-orange-600" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl font-medium text-stone-900 mb-3">{f.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 lg:py-28">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-3">Simple as 1-2-3</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-stone-900">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Pick a Kitchen", desc: "Browse nearby home kitchens sorted by distance and rating" },
              { step: "02", title: "Choose Your Meal", desc: "Explore menus, add items to your cart, and customize" },
              { step: "03", title: "Sit Back & Enjoy", desc: "Pay securely, track your order live, and enjoy fresh food" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <span className="font-display text-5xl font-bold text-orange-100">{s.step}</span>
                <h3 className="font-display text-xl font-medium text-stone-900 mt-2 mb-3">{s.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 lg:py-28">
        <div className="bg-stone-900 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight mb-3">Ready to cook & earn?</h2>
            <p className="text-stone-400 text-base">Register as a kitchen provider and start selling your homemade food today.</p>
          </div>
          <Link to="/register">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8 py-3 whitespace-nowrap" data-testid="cta-register-kitchen">
              Start Your Kitchen
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200/60 py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-400">HyperEats - Hyperlocal homemade food marketplace</p>
          <div className="flex items-center gap-1 text-sm text-stone-400">
            <Star className="h-3.5 w-3.5 text-orange-400 fill-orange-400" /> Trusted by home chefs everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}
