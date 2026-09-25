import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";

export default function CustomerNotifications() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    api.get("/notifications").then((r) => setData(r.data)).catch(() => {});
    api.post("/notifications/read-all").catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate("/app")} data-testid="notif-back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-lg font-bold">Notifications</h1>
      </div>
      {!data ? <Loader /> : data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" />
      ) : (
        <div className="space-y-2 p-4">
          {data.notifications.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`cnotif-${n.id}`}>
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
