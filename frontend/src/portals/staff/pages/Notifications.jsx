import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const [data, setData] = useState(null);
  const load = () => api.get("/notifications").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.post("/notifications/read-all"); load(); };

  if (!data) return <Loader />;
  return (
    <div className="space-y-4">
      {data.notifications.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={readAll} data-testid="notif-read-all"><CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read</Button>
        </div>
      )}
      {data.notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : (
        <div className="space-y-2">
          {data.notifications.map((n) => (
            <div key={n.id} className={`rounded-2xl border p-4 ${n.read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50"}`} data-testid={`notif-${n.id}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{n.title}</p>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <p className="text-sm text-slate-600">{n.body}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
