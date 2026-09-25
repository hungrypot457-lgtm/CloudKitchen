import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import { api, rupee } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";

export default function History() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/delivery/assignments").then((r) => setRows(r.data)).catch(() => {}); }, []);
  if (!rows) return <Loader />;
  const done = rows.filter((r) => ["delivered", "rejected"].includes(r.status));

  return (
    <div>
      <h1 className="px-5 pb-2 pt-6 font-display text-2xl font-extrabold">Delivery History</h1>
      {done.length === 0 ? <EmptyState icon={PackageCheck} title="No past deliveries" /> : (
        <div className="space-y-3 p-4">
          {done.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`history-${a.order_number}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{a.order_number}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "delivered" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{a.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{a.order?.customer_name} · {rupee(a.order?.total)}</p>
              <p className="text-xs text-slate-400">{a.delivered_at ? new Date(a.delivered_at).toLocaleString() : new Date(a.assigned_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
