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
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<MenuMgmt />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="delivery-partners" element={<DeliveryPartners />} />
        <Route path="managers" element={<Managers />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="live" element={<LiveTracking />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </StaffLayout>
  );
}
