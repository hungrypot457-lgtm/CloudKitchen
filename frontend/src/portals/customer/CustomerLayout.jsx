import { Outlet, NavLink } from "react-router-dom";
import { Home, Search, ShoppingBag, ReceiptText, User } from "lucide-react";
import { useCart } from "./CartContext";

const NAV = [
  { to: "/app", icon: Home, label: "Home", end: true, testid: "nav-home" },
  { to: "/app/search", icon: Search, label: "Search", testid: "nav-search" },
  { to: "/app/cart", icon: ShoppingBag, label: "Cart", testid: "nav-cart", cart: true },
  { to: "/app/orders", icon: ReceiptText, label: "Orders", testid: "nav-orders" },
  { to: "/app/profile", icon: User, label: "Profile", testid: "nav-profile" },
];

export default function CustomerLayout() {
  const { count } = useCart();
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 shadow-xl">
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.testid}
              className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${isActive ? "text-primary" : "text-slate-400"}`}>
              <span className="relative">
                <n.icon className="h-5 w-5" />
                {n.cart && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white" data-testid="cart-badge">{count}</span>
                )}
              </span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
