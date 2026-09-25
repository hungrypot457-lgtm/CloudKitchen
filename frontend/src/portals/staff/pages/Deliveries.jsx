import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";

const STATUS_COLORS = {
  assigned: "bg-purple-100 text-purple-700", accepted: "bg-cyan-100 text-cyan-700",
  picked_up: "bg-orange-100 text-orange-700", out_for_delivery: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-600",
};

export default function Deliveries() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/admin/deliveries").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e))); }, []);

  if (!rows) return <Loader />;
  if (rows.length === 0) return <EmptyState icon={Truck} title="No deliveries yet" />;

  return (
    <div className="space-y-3">
      {rows.map((d) => (
        <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`delivery-${d.id}`}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{d.order_number}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[d.status] || "bg-slate-100 text-slate-600"}`}>{d.status.replace(/_/g, " ")}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Partner: {d.partner_name || "—"}</p>
          <p className="text-xs text-slate-400">Assigned {new Date(d.assigned_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
