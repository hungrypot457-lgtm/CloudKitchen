import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrollText } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";

export default function AuditLogs() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setLogs(r.data.logs)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!logs) return <Loader />;
  if (logs.length === 0) return <EmptyState icon={ScrollText} title="No audit records" />;

  return (
    <div className="space-y-2">
      {logs.map((l) => (
        <div key={l.id} className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`audit-${l.id}`}>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              <span className="capitalize">{l.action.replace(/_/g, " ")}</span> · {l.entity}
            </p>
            <p className="text-xs text-slate-500">by {l.actor_name} ({l.actor_role})</p>
          </div>
          <p className="text-xs text-slate-400">{new Date(l.timestamp).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
