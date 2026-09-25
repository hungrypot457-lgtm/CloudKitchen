import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { LeafletMap } from "@/components/LeafletMap";

export default function LiveTracking() {
  const [items, setItems] = useState(null);
  const [settings, setSettings] = useState(null);
  const timer = useRef(null);

  const load = () => api.get("/admin/live-deliveries").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    load();
    timer.current = setInterval(load, 5000);
    return () => clearInterval(timer.current);
  }, []);

  if (!items || !settings) return <Loader />;

  const kitchen = [settings.kitchen_latitude, settings.kitchen_longitude];
  const markers = [{ lat: kitchen[0], lng: kitchen[1], type: "kitchen", label: "Kitchen" }];
  items.forEach((d) => {
    markers.push({ lat: d.delivery_latitude, lng: d.delivery_longitude, type: "customer", label: `${d.order_number} · ${d.customer_name}` });
    if (d.partner_location) markers.push({ lat: d.partner_location.latitude, lng: d.partner_location.longitude, type: "rider", label: d.partner_name || "Rider" });
  });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <LeafletMap center={kitchen} zoom={13} markers={markers} radiusKm={settings.delivery_radius_km} radiusCenter={kitchen} height={480} />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={MapPin} title="No active deliveries" subtitle="Live rider positions appear here during out-for-delivery orders." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <div key={d.order_id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`live-${d.order_id}`}>
              <p className="font-semibold text-slate-900">{d.order_number}</p>
              <p className="text-sm text-slate-600">{d.customer_name}</p>
              <p className="mt-1 text-xs text-slate-500">Rider: {d.partner_name || "—"}</p>
              <p className="text-xs text-slate-400">{d.partner_location ? "Live location active" : "Awaiting rider location"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
