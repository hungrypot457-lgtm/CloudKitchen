import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";

export default function DeliveryNotifications() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/notifications").then((r) => setData(r.data)).catch(() => {});
    api.post("/notifications/read-all").catch(() => {});
  }, []);
  return (
    <div>
      <h1 className="px-5 pb-2 pt-6 font-display text-2xl font-extrabold">Alerts</h1>
      {!data ? <Loader /> : data.notifications.length === 0 ? <EmptyState icon={Bell} title="No alerts" /> : (
        <div className="space-y-2 p-4">
          {data.notifications.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`rnotif-${n.id}`}>
              <p className="font-semibold text-slate-900">{n.title}</p>
              <p className="text-sm text-slate-600">{n.body}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
