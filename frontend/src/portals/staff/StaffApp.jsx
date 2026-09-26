import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common";
import StaffLogin from "./StaffLogin";
import StaffLayout from "./StaffLayout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import MenuMgmt from "./pages/MenuMgmt";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import DeliveryPartners from "./pages/DeliveryPartners";
import Managers from "./pages/Managers";
import Deliveries from "./pages/Deliveries";
import LiveTracking from "./pages/LiveTracking";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";

function Guard({ perm, adminOnly, children }) {
  const { user, hasPerm } = useAuth();
  const allowed = adminOnly ? user.role === "admin" : hasPerm(perm);
  return allowed ? children : <Navigate to="/console" replace />;
}

export default function StaffApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-50"><Loader label="Loading console..." /></div>;
  if (user?.role === "customer") return <Navigate to="/app" replace />;
  if (user?.role === "delivery_partner") return <Navigate to="/rider" replace />;
  if (!user || !["admin", "manager"].includes(user.role)) return <StaffLogin />;

  return (
    <StaffLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Guard perm="view_orders"><Orders /></Guard>} />
        <Route path="menu" element={<Guard perm="manage_menu"><MenuMgmt /></Guard>} />
        <Route path="categories" element={<Guard perm="manage_menu"><Categories /></Guard>} />
        <Route path="customers" element={<Guard perm="view_customers"><Customers /></Guard>} />
        <Route path="delivery-partners" element={<Guard perm="view_deliveries"><DeliveryPartners /></Guard>} />
        <Route path="managers" element={<Guard adminOnly><Managers /></Guard>} />
        <Route path="deliveries" element={<Guard perm="view_deliveries"><Deliveries /></Guard>} />
        <Route path="live" element={<Guard perm="view_deliveries"><LiveTracking /></Guard>} />
        <Route path="reports" element={<Guard perm="view_reports"><Reports /></Guard>} />
        <Route path="notifications" element={<Guard perm="view_notifications"><Notifications /></Guard>} />
        <Route path="settings" element={<Guard adminOnly><Settings /></Guard>} />
        <Route path="audit" element={<Guard adminOnly><AuditLogs /></Guard>} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </StaffLayout>
  );
}
