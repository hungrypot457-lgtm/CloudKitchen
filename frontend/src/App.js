import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StaffApp from "@/portals/staff/StaffApp";
import CustomerApp from "@/portals/customer/CustomerApp";
import DeliveryApp from "@/portals/delivery/DeliveryApp";
import ResetPassword from "@/pages/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/console/*" element={<StaffApp />} />
        <Route path="/app/*" element={<CustomerApp />} />
        <Route path="/rider/*" element={<DeliveryApp />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
