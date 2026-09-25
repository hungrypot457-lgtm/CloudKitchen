import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ChefHat, LayoutDashboard, ShoppingBag, UtensilsCrossed, Tags, Users, Bike, UserCog,
  Truck, MapPin, BarChart3, Bell, Settings as SettingsIcon, ScrollText, Menu as MenuIcon,
  LogOut, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const NAV = [
  { to: "", label: "Dashboard", icon: LayoutDashboard, perm: "view_dashboard", end: true },
  { to: "orders", label: "Orders", icon: ShoppingBag, perm: "view_orders" },
  { to: "menu", label: "Menu", icon: UtensilsCrossed, perm: "manage_menu" },
  { to: "categories", label: "Categories", icon: Tags, perm: "manage_menu" },
  { to: "customers", label: "Customers", icon: Users, perm: "view_customers" },
  { to: "deliveries", label: "Deliveries", icon: Truck, perm: "view_deliveries" },
  { to: "live", label: "Live Tracking", icon: MapPin, perm: "view_deliveries" },
  { to: "delivery-partners", label: "Delivery Partners", icon: Bike, perm: "view_deliveries" },
  { to: "managers", label: "Managers", icon: UserCog, adminOnly: true },
  { to: "reports", label: "Reports", icon: BarChart3, perm: "view_reports" },
  { to: "notifications", label: "Notifications", icon: Bell, perm: "view_notifications" },
  { to: "settings", label: "Settings", icon: SettingsIcon, adminOnly: true },
  { to: "audit", label: "Audit Logs", icon: ScrollText, adminOnly: true },
];

function NavItems({ onNavigate }) {
  const { user, hasPerm } = useAuth();
  const visible = NAV.filter((n) => (n.adminOnly ? user.role === "admin" : n.perm ? hasPerm(n.perm) : true));
  return (
    <nav className="flex flex-col gap-1 px-3">
      {visible.map((n) => (
        <NavLink
          key={n.to || "home"}
          to={n.to ? `/console/${n.to}` : "/console"}
          end={n.end}
          onClick={onNavigate}
          data-testid={`nav-${n.to || "dashboard"}`}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <n.icon className="h-[18px] w-[18px]" />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function StaffLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const seg = location.pathname.replace("/console", "").replace("/", "") || "dashboard";
  const title = (NAV.find((n) => n.to === seg)?.label) || "Dashboard";

  const doLogout = () => {
    logout();
    navigate("/");
  };

  const Brand = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <ChefHat className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-display text-base font-extrabold leading-none text-white">CloudBite</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">{user.role} console</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-secondary lg:flex">
        {Brand}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          <NavItems />
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 px-2 text-xs text-slate-400">{user.email}</div>
          <Button variant="ghost" onClick={doLogout} data-testid="staff-logout"
            className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-secondary p-0">
          <div className="flex items-center justify-between">
            {Brand}
            <button onClick={() => setOpen(false)} className="mr-4 text-slate-400"><X className="h-5 w-5" /></button>
          </div>
          <div className="py-2"><NavItems onNavigate={() => setOpen(false)} /></div>
          <div className="border-t border-white/10 p-3">
            <Button variant="ghost" onClick={doLogout}
              className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="mobile-menu-toggle">
            <MenuIcon className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="font-display text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {user.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
