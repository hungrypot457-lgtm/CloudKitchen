import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin } from "lucide-react";
import { api, rupee, errMsg } from "@/lib/api";
import { Loader, EmptyState, StatusBadge, VegBadge } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "ACCEPTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED"];
const NEXT = {
  PENDING: ["CONFIRMED", "CANCELLED", "REJECTED"], CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"], READY_FOR_PICKUP: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
};

export default function Orders() {
  const { hasPerm } = useAuth();
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [active, setActive] = useState(null);
  const [partners, setPartners] = useState([]);

  const load = useCallback(() => {
    const params = {};
    if (q) params.q = q;
    if (status !== "ALL") params.status = status;
    api.get("/admin/orders", { params }).then((r) => setOrders(r.data.orders)).catch((e) => toast.error(errMsg(e)));
  }, [q, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (hasPerm("manage_deliveries")) api.get("/admin/delivery-partners").then((r) => setPartners(r.data)).catch(() => {});
  }, [hasPerm]);

  const openOrder = async (id) => {
    const { data } = await api.get(`/orders/${id}`);
    setActive(data);
  };

  const changeStatus = async (id, s) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: s });
      toast.success(`Status updated to ${s.replace(/_/g, " ")}`);
      await openOrder(id);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const assign = async (partnerId) => {
    try {
      await api.post("/admin/deliveries/assign", { order_id: active.id, delivery_partner_id: partnerId });
      toast.success("Delivery partner assigned");
      await openOrder(active.id);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search by order # or customer" value={q} data-testid="orders-search"
            onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-56" data-testid="orders-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!orders ? <Loader /> : orders.length === 0 ? (
        <EmptyState icon={Search} title="No orders found" subtitle="Try adjusting filters." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => openOrder(o.id)} data-testid={`order-row-${o.order_number}`}
                    className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{o.order_number}</td>
                    <td className="px-4 py-3">{o.customer_name}</td>
                    <td className="px-4 py-3 font-semibold">{rupee(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.internal_status} /></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <button key={o.id} onClick={() => openOrder(o.id)} data-testid={`order-card-${o.order_number}`}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{o.order_number}</span>
                  <StatusBadge status={o.internal_status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{o.customer_name}</span><span className="font-semibold">{rupee(o.total)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{new Date(o.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active.order_number} <StatusBadge status={active.internal_status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">{active.customer_name}</p>
                  <p className="text-slate-500">{active.customer_phone}</p>
                  <p className="mt-1 flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> {active.delivery_latitude?.toFixed(5)}, {active.delivery_longitude?.toFixed(5)}
                  </p>
                  {active.delivery_note && <p className="mt-1 text-slate-500">Note: {active.delivery_note}</p>}
                </div>
                <div>
                  <p className="mb-2 font-semibold text-slate-700">Items</p>
                  <div className="space-y-2">
                    {active.items.map((it, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <VegBadge isVeg={it.is_veg} />
                          <div>
                            <p className="font-medium text-slate-800">{it.name} × {it.quantity}</p>
                            {it.customizations?.map((c, j) => (
                              <p key={j} className="text-xs text-slate-400">{c.group_name}: {c.option_name}</p>
                            ))}
                          </div>
                        </div>
                        <span className="font-medium">{rupee(it.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total ({active.payment_method})</span><span>{rupee(active.total)}</span>
                </div>

                {hasPerm("update_orders") && NEXT[active.internal_status] && (
                  <div>
                    <p className="mb-2 font-semibold text-slate-700">Update status</p>
                    <div className="flex flex-wrap gap-2">
                      {NEXT[active.internal_status].map((s) => (
                        <Button key={s} size="sm" variant={s.includes("CANCEL") || s === "REJECTED" ? "outline" : "default"}
                          data-testid={`order-status-${s}`} onClick={() => changeStatus(active.id, s)}>
                          {s.replace(/_/g, " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {hasPerm("manage_deliveries") && ["READY_FOR_PICKUP", "PREPARING", "CONFIRMED", "ASSIGNED"].includes(active.internal_status) && (
                  <div>
                    <p className="mb-2 font-semibold text-slate-700">Assign delivery partner</p>
                    <Select onValueChange={assign}>
                      <SelectTrigger data-testid="assign-partner-select"><SelectValue placeholder="Select partner" /></SelectTrigger>
                      <SelectContent>
                        {partners.filter((p) => p.status === "active").map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} · {p.vehicle_type} ({p.active_deliveries} active)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {active.history?.length > 0 && (
                  <div>
                    <p className="mb-2 font-semibold text-slate-700">History</p>
                    <div className="space-y-1 text-xs text-slate-500">
                      {active.history.map((h, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{h.new_status.replace(/_/g, " ")} · {h.actor_name}</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
