import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bike, MapPin, Phone, Navigation, IndianRupee } from "lucide-react";
import { api, rupee, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { LeafletMap } from "@/components/LeafletMap";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const ACTIVE = ["assigned", "accepted", "picked_up", "out_for_delivery"];

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [settings, setSettings] = useState(null);
  const geoTimer = useRef(null);

  const load = useCallback(() => api.get("/delivery/assignments").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    load();
  }, [load]);

  // send live location while any delivery is out_for_delivery
  useEffect(() => {
    const active = (rows || []).find((r) => r.status === "out_for_delivery");
    if (active && navigator.geolocation) {
      const push = () => navigator.geolocation.getCurrentPosition(
        (pos) => api.post(`/delivery/${active.order_id}/location`, { latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {}),
        () => {}, { enableHighAccuracy: true });
      push();
      geoTimer.current = setInterval(push, 8000);
      return () => clearInterval(geoTimer.current);
    }
  }, [rows]);

  const getPos = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(settings ? [settings.kitchen_latitude, settings.kitchen_longitude] : [19.076, 72.8777]);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      () => resolve([settings.kitchen_latitude, settings.kitchen_longitude]), { enableHighAccuracy: true, timeout: 6000 });
  });

  const act = async (orderId, action) => {
    try {
      if (action === "start") {
        const [lat, lng] = await getPos();
        await api.post(`/delivery/${orderId}/start`, { latitude: lat, longitude: lng });
      } else {
        await api.post(`/delivery/${orderId}/${action}`);
      }
      toast.success("Updated");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!rows || !settings) return <Loader />;
  const active = rows.filter((r) => ACTIVE.includes(r.status));
  const kitchen = [settings.kitchen_latitude, settings.kitchen_longitude];

  return (
    <div>
      <div className="bg-blue-600 px-5 pb-6 pt-8 text-white">
        <p className="text-sm text-blue-100">Hello,</p>
        <p className="font-display text-2xl font-extrabold">{user.name}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-blue-100">Active</p><p className="text-2xl font-bold">{active.length}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-blue-100">Vehicle</p><p className="text-lg font-bold">{user.vehicle_type || "—"}</p></div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Assigned Deliveries</h2>
        {active.length === 0 ? (
          <EmptyState icon={Bike} title="No active deliveries" subtitle="New assignments from admin will appear here." />
        ) : (
          <div className="space-y-4">
            {active.map((a) => {
              const o = a.order || {};
              const dest = [o.delivery_latitude, o.delivery_longitude];
              return (
                <div key={a.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white" data-testid={`rider-order-${a.order_number}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <div>
                      <p className="font-bold text-slate-900">{a.order_number}</p>
                      <p className="text-xs capitalize text-slate-500">{a.status.replace(/_/g, " ")}</p>
                    </div>
                    <span className="flex items-center gap-1 font-bold text-slate-900"><IndianRupee className="h-4 w-4" />{Number(o.total || 0).toFixed(0)} <span className="ml-1 rounded bg-amber-100 px-1.5 text-[10px] text-amber-700">COD</span></span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-800">{o.customer_name}</p>
                    <p className="text-xs text-slate-500">{(o.items || []).map((i) => `${i.name}×${i.quantity}`).join(", ")}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {o.delivery_latitude?.toFixed(5)}, {o.delivery_longitude?.toFixed(5)}</p>
                    {o.delivery_note && <p className="text-xs text-slate-500">Note: {o.delivery_note}</p>}

                    {a.status === "out_for_delivery" && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <LeafletMap center={dest} zoom={14} height={200}
                          markers={[{ lat: kitchen[0], lng: kitchen[1], type: "kitchen", label: "Kitchen" }, { lat: dest[0], lng: dest[1], type: "customer", label: o.customer_name }]} />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.customer_phone && <a href={`tel:${o.customer_phone}`} className="flex-1"><Button variant="outline" className="w-full" size="sm" data-testid={`call-customer-${a.order_number}`}><Phone className="mr-1 h-4 w-4" /> Call</Button></a>}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_latitude},${o.delivery_longitude}`} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full" size="sm" data-testid={`navigate-${a.order_number}`}><Navigation className="mr-1 h-4 w-4" /> Navigate</Button>
                      </a>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {a.status === "assigned" && <>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => act(a.order_id, "accept")} data-testid={`accept-${a.order_number}`}>Accept</Button>
                        <Button variant="outline" size="sm" onClick={() => act(a.order_id, "reject")} data-testid={`reject-${a.order_number}`}>Reject</Button>
                      </>}
                      {a.status === "accepted" && <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => act(a.order_id, "pickup")} data-testid={`pickup-${a.order_number}`}>Mark Picked Up</Button>}
                      {a.status === "picked_up" && <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => act(a.order_id, "start")} data-testid={`start-${a.order_number}`}>Start Delivery</Button>}
                      {a.status === "out_for_delivery" && <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => act(a.order_id, "delivered")} data-testid={`delivered-${a.order_number}`}>Mark Delivered</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
