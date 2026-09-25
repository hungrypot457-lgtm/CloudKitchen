import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, LocateFixed, MapPin, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api, rupee, errMsg } from "@/lib/api";
import { LeafletMap } from "@/components/LeafletMap";
import { useCart } from "../CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [pin, setPin] = useState(null);
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const validate = async (lat, lng) => {
    setChecking(true);
    setPin([lat, lng]);
    try {
      const { data } = await api.post("/location/check", { latitude: lat, longitude: lng });
      setCheck(data);
    } catch (e) { toast.error(errMsg(e)); } finally { setChecking(false); }
  };

  const useCurrent = () => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("Unable to determine your location. Please select your location on the map."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => validate(pos.coords.latitude, pos.coords.longitude),
      () => setGeoError("Please allow location access to check whether we deliver to your area."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const placeOrder = async () => {
    if (!pin || !check?.within_radius) return;
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        delivery_latitude: pin[0], delivery_longitude: pin[1], delivery_note: note, payment_method: "COD",
      });
      await refresh();
      toast.success(`Order ${data.order_number} placed!`);
      navigate(`/app/orders/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setPlacing(false); }
  };

  if (!settings) return null;
  const kitchen = [settings.kitchen_latitude, settings.kitchen_longitude];
  const mapCenter = pin || kitchen;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28">
      <div className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate("/app/cart")} data-testid="checkout-back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-lg font-bold">Checkout</h1>
      </div>

      <div className="space-y-4 p-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><MapPin className="h-4 w-4 text-primary" /> Delivery Location</h2>
          <p className="mt-1 text-xs text-slate-500">Tap the map to drop a pin or drag the marker. We deliver within {settings.delivery_radius_km} km.</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <LeafletMap center={mapCenter} zoom={14} draggable onMove={validate}
              markers={[{ lat: kitchen[0], lng: kitchen[1], type: "kitchen", label: "Kitchen" }]}
              radiusKm={settings.delivery_radius_km} radiusCenter={kitchen} height={260} />
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={useCurrent} data-testid="use-current-location">
            <LocateFixed className="mr-2 h-4 w-4" /> Use Current Location
          </Button>
          {geoError && <p className="mt-2 text-sm text-red-500" data-testid="geo-error">{geoError}</p>}

          {checking && <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking delivery availability...</p>}
          {check && !checking && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${check.within_radius ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`} data-testid="location-check-result">
              {check.within_radius ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span>{check.message} ({check.distance_km} km)</span>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <Label>Delivery Note (Optional)</Label>
          <Input className="mt-1.5" placeholder="e.g. Blue gate, call on arrival" value={note} data-testid="delivery-note" onChange={(e) => setNote(e.target.value)} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-display text-base font-bold">Order Summary</h2>
          {cart.items.map((l) => (
            <div key={l.line_id} className="flex justify-between py-0.5 text-sm text-slate-600"><span>{l.name} × {l.quantity}</span><span>{rupee(l.line_total)}</span></div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2 text-sm text-slate-600"><span>Delivery / Platform / Convenience</span><span>₹0</span></div>
          <div className="mt-1 flex justify-between text-base font-bold"><span>Total</span><span>{rupee(cart.subtotal)}</span></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-display text-base font-bold">Payment</h2>
          <div className="mt-2 rounded-lg border border-primary bg-accent p-3 text-sm font-semibold text-slate-800">Cash on Delivery</div>
        </section>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-4">
        <Button className="w-full" disabled={!check?.within_radius || placing || !cart.items.length} onClick={placeOrder} data-testid="place-order-button">
          {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Place Order · {rupee(cart.subtotal)}
        </Button>
      </div>
    </div>
  );
}
