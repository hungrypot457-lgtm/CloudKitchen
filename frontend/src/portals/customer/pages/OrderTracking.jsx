import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChefHat, Bike, PackageCheck, Phone, MapPin } from "lucide-react";
import { api, rupee } from "@/lib/api";
import { Loader } from "@/components/common";
import { LeafletMap } from "@/components/LeafletMap";

const STAGES = [
  { key: "ORDER BEING PREPARED", label: "ORDER BEING PREPARED", icon: ChefHat },
  { key: "ORDER ON THE WAY", label: "ORDER ON THE WAY", icon: Bike },
  { key: "ORDER ARRIVED", label: "ORDER ARRIVED", icon: PackageCheck },
];

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef(null);

  const load = () => api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch((e) => {
    if (e?.response?.status && e.response.status !== 401) { setNotFound(true); clearInterval(timer.current); }
  });
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
    load();
    timer.current = setInterval(load, 5000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center" data-testid="tracking-not-found">
        <p className="font-display text-lg font-bold text-slate-900">Order not found</p>
        <p className="text-sm text-slate-500">This order doesn't exist or isn't linked to your account.</p>
        <button onClick={() => navigate("/app/orders")} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white" data-testid="tracking-not-found-back">Back to orders</button>
      </div>
    );
  }
  if (!order || !settings) return <div className="mx-auto max-w-md"><Loader /></div>;

  const cancelled = order.customer_stage === "ORDER CANCELLED";
  const activeIdx = STAGES.findIndex((s) => s.key === order.customer_stage);
  const onTheWay = order.customer_stage === "ORDER ON THE WAY";
  const kitchen = [settings.kitchen_latitude, settings.kitchen_longitude];

  const markers = [
    { lat: kitchen[0], lng: kitchen[1], type: "kitchen", label: "Kitchen" },
    { lat: order.delivery_latitude, lng: order.delivery_longitude, type: "customer", label: "You" },
  ];
  if (order.partner_location) markers.push({ lat: order.partner_location.latitude, lng: order.partner_location.longitude, type: "rider", label: order.delivery_partner_name || "Rider" });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-8">
      <div className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate("/app/orders")} data-testid="tracking-back"><ArrowLeft className="h-5 w-5" /></button>
        <div><h1 className="font-display text-lg font-bold">{order.order_number}</h1><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p></div>
      </div>

      <div className="space-y-4 p-4">
        {cancelled ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center" data-testid="tracking-cancelled">
            <p className="font-display text-lg font-bold text-red-600">Order Cancelled</p>
            <p className="mt-1 text-sm text-red-500">This order was cancelled. Please contact support if you need help.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid="tracking-stages">
            {STAGES.map((s, i) => {
              const done = i <= activeIdx;
              const current = i === activeIdx;
              return (
                <div key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-primary text-white" : "bg-slate-100 text-slate-400"} ${current ? "ring-4 ring-orange-100" : ""}`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    {i < STAGES.length - 1 && <div className={`h-10 w-0.5 ${i < activeIdx ? "bg-primary" : "bg-slate-200"}`} />}
                  </div>
                  <div className="pb-6 pt-2">
                    <p className={`font-semibold ${done ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
                    {current && <p className="text-xs text-primary">In progress</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {onTheWay && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{order.delivery_partner_name || "Your rider"}</p>
                <p className="text-xs text-slate-500">On the way to you</p>
              </div>
              {order.delivery_partner_phone && (
                <a href={`tel:${order.delivery_partner_phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white" data-testid="call-rider"><Phone className="h-4 w-4" /></a>
              )}
            </div>
            <LeafletMap center={order.partner_location ? [order.partner_location.latitude, order.partner_location.longitude] : kitchen} zoom={14} markers={markers} height={280} />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-display text-base font-bold">Items</h2>
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between py-0.5 text-sm text-slate-600"><span>{it.name} × {it.quantity}</span><span>{rupee(it.line_total)}</span></div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total ({order.payment_method})</span><span>{rupee(order.total)}</span></div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="flex items-center gap-1 font-semibold text-slate-800"><MapPin className="h-4 w-4 text-primary" /> Delivery Location</p>
          <p className="mt-1">Pinned at {order.delivery_latitude.toFixed(5)}, {order.delivery_longitude.toFixed(5)}</p>
          {order.delivery_note && <p className="mt-1">Note: {order.delivery_note}</p>}
        </div>
      </div>
    </div>
  );
}
