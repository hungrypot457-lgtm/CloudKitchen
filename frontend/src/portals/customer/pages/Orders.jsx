import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiptText, ChevronRight } from "lucide-react";
import { api, rupee } from "@/lib/api";
import { Loader, EmptyState, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get("/orders/mine").then((r) => setOrders(r.data)).catch(() => {}); }, []);

  if (!orders) return <Loader />;
  return (
    <div>
      <h1 className="px-5 pb-2 pt-6 font-display text-2xl font-extrabold">Your Orders</h1>
      {orders.length === 0 ? (
        <div className="px-4 pt-10">
          <EmptyState icon={ReceiptText} title="No orders yet" subtitle="Your past orders will show up here." />
          <Button className="mx-auto mt-4 block" onClick={() => navigate("/app")}>Order Now</Button>
        </div>
      ) : (
        <div className="space-y-3 px-4 py-3">
          {orders.map((o) => (
            <button key={o.id} onClick={() => navigate(`/app/orders/${o.id}`)} data-testid={`order-${o.order_number}`}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{o.order_number}</span>
                  <StatusBadge stage={o.customer_stage} />
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">{o.items.map((i) => `${i.name}×${i.quantity}`).join(", ")}</p>
                <p className="mt-0.5 text-xs text-slate-400">{new Date(o.created_at).toLocaleString()} · {rupee(o.total)} · {o.payment_method}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
