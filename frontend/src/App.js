import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StaffApp from "@/portals/staff/StaffApp";
import CustomerApp from "@/portals/customer/CustomerApp";
import DeliveryApp from "@/portals/delivery/DeliveryApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/console/*" element={<StaffApp />} />
        <Route path="/app/*" element={<CustomerApp />} />
        <Route path="/rider/*" element={<DeliveryApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
