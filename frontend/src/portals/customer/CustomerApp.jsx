import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common";
import { CartProvider } from "./CartContext";
import CustomerAuth from "./CustomerAuth";
import CustomerLayout from "./CustomerLayout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";
import Profile from "./pages/Profile";
import CustomerNotifications from "./pages/CustomerNotifications";

export default function CustomerApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-100"><Loader /></div>;
  if (!user || user.role !== "customer") return <CustomerAuth />;

  return (
    <CartProvider>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<CustomerNotifications />} />
        </Route>
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders/:id" element={<OrderTracking />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </CartProvider>
  );
}
