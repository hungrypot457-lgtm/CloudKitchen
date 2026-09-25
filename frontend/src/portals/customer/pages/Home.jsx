import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Bell, ShoppingBag, User } from "lucide-react";
import { api, rupee } from "@/lib/api";
import { FoodListSkeleton } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "../CartContext";
import { FoodCard } from "../components/FoodCard";

export default function Home() {
  const { user } = useAuth();
  const { cart, count } = useCart();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState(null);
  const [activeCat, setActiveCat] = useState("all");
  const [biz, setBiz] = useState("");

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data)).catch(() => {});
    api.get("/menu").then((r) => setItems(r.data)).catch(() => {});
    api.get("/settings").then((r) => setBiz(r.data.business_name)).catch(() => {});
  }, []);

  const filtered = items?.filter((i) => activeCat === "all" || i.category_id === activeCat) || [];
  const featured = items?.filter((i) => i.featured) || [];

  return (
    <div>
      <div className="bg-secondary px-5 pb-6 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Delivering from</p>
            <p className="flex items-center gap-1 font-display text-lg font-bold"><MapPin className="h-4 w-4 text-primary" /> {biz || "CloudBite Kitchen"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/app/notifications")} data-testid="home-notifications" className="relative rounded-full bg-white/10 p-2">
              <Bell className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/app/profile")} data-testid="home-profile" className="rounded-full bg-white/10 p-2">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="mt-4 font-display text-2xl font-extrabold">Hey {user.name?.split(" ")[0]} 👋</p>
        <p className="text-sm text-slate-300">What are you craving today?</p>
      </div>

      {/* Category chips */}
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-4 py-3 no-scrollbar backdrop-blur">
        <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="All" testid="cat-all" />
        {cats.map((c) => <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} label={c.name} testid={`cat-${c.id}`} />)}
      </div>

      {!items ? <div className="px-4 py-4"><FoodListSkeleton /></div> : (
        <div className="space-y-4 px-4 py-4">
          {activeCat === "all" && featured.length > 0 && (
            <div>
              <h3 className="mb-2 font-display text-base font-bold text-slate-900">⭐ Featured</h3>
              <div className="space-y-3">{featured.map((i) => <FoodCard key={i.id} item={i} />)}</div>
            </div>
          )}
          <div>
            <h3 className="mb-2 font-display text-base font-bold text-slate-900">{activeCat === "all" ? "All items" : cats.find((c) => c.id === activeCat)?.name}</h3>
            <div className="space-y-3">{filtered.map((i) => <FoodCard key={i.id} item={i} />)}</div>
          </div>
        </div>
      )}

      {count > 0 && (
        <button onClick={() => navigate("/app/cart")} data-testid="sticky-cart-bar"
          className="fixed bottom-20 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 items-center justify-between rounded-2xl bg-slate-900 px-5 py-3.5 text-white shadow-xl">
          <span className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4" /> {count} item{count > 1 ? "s" : ""}</span>
          <span className="text-sm font-bold">{rupee(cart.subtotal)} · View Cart</span>
        </button>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
      {label}
    </button>
  );
}
