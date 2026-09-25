import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common";
import DeliveryAuth from "./DeliveryAuth";
import DeliveryLayout from "./DeliveryLayout";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import History from "./pages/History";
import DeliveryProfile from "./pages/DeliveryProfile";
import DeliveryNotifications from "./pages/DeliveryNotifications";

export default function DeliveryApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-100"><Loader /></div>;
  if (!user || user.role !== "delivery_partner") return <DeliveryAuth />;

  return (
    <Routes>
      <Route element={<DeliveryLayout />}>
        <Route index element={<DeliveryDashboard />} />
        <Route path="history" element={<History />} />
        <Route path="notifications" element={<DeliveryNotifications />} />
        <Route path="profile" element={<DeliveryProfile />} />
        <Route path="*" element={<DeliveryDashboard />} />
      </Route>
    </Routes>
  );
}
