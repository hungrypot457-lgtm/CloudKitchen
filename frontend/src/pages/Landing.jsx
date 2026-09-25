import { useNavigate } from "react-router-dom";
import { ChefHat, LayoutDashboard, ShoppingBag, Bike, ArrowRight } from "lucide-react";

const PORTALS = [
  {
    title: "Admin Portal",
    desc: "Full operational control — orders, menu, staff, delivery & reports.",
    icon: LayoutDashboard,
    to: "/console",
    tag: "Website",
    accent: "from-orange-500 to-amber-500",
    testid: "portal-admin",
  },
  {
    title: "Manager Portal",
    desc: "Kitchen fulfilment & delivery ops with permission-based access.",
    icon: ChefHat,
    to: "/console",
    tag: "Website",
    accent: "from-slate-700 to-slate-900",
    testid: "portal-manager",
  },
  {
    title: "Order Food",
    desc: "Browse the menu, pin your location and order in a few taps.",
    icon: ShoppingBag,
    to: "/app",
    tag: "Customer App",
    accent: "from-emerald-500 to-green-600",
    testid: "portal-customer",
  },
  {
    title: "Delivery Partner",
    desc: "View assigned deliveries, navigate and update live status.",
    icon: Bike,
    to: "/rider",
    tag: "Rider App",
    accent: "from-blue-500 to-indigo-600",
    testid: "portal-delivery",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-secondary text-white">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">CloudBite</span>
        </div>

        <div className="mt-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cloud Kitchen OS</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            One kitchen. <span className="text-primary">Four experiences.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            A single shared backend powering admin & manager websites and mobile apps for customers and delivery
            partners — with live GPS tracking and a 5&nbsp;km delivery zone.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((p) => (
            <button
              key={p.title}
              data-testid={p.testid}
              onClick={() => navigate(p.to)}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.accent}`}>
                <p.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{p.tag}</span>
              <h3 className="mt-1 font-display text-lg font-bold">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{p.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
