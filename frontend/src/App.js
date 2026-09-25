import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import StaffApp from "@/portals/staff/StaffApp";
import CustomerApp from "@/portals/customer/CustomerApp";
import DeliveryApp from "@/portals/delivery/DeliveryApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/console/*" element={<StaffApp />} />
        <Route path="/app/*" element={<CustomerApp />} />
        <Route path="/rider/*" element={<DeliveryApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
