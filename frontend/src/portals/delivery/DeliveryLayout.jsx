import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, History, Bell, User } from "lucide-react";

const NAV = [
  { to: "/rider", icon: LayoutDashboard, label: "Deliveries", end: true, testid: "rider-nav-home" },
  { to: "/rider/history", icon: History, label: "History", testid: "rider-nav-history" },
  { to: "/rider/notifications", icon: Bell, label: "Alerts", testid: "rider-nav-notifications" },
  { to: "/rider/profile", icon: User, label: "Profile", testid: "rider-nav-profile" },
];

export default function DeliveryLayout() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 shadow-xl">
      <div className="flex-1 pb-20"><Outlet /></div>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.testid}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${isActive ? "text-blue-600" : "text-slate-400"}`}>
              <n.icon className="h-5 w-5" />{n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
