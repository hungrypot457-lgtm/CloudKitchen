import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { Input } from "@/components/ui/input";

export default function Customers() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/admin/customers", { params: q ? { q } : {} }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="customers-search" />
      </div>
      {!rows ? <Loader /> : rows.length === 0 ? <EmptyState icon={Users} title="No customers" /> : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Joined</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} data-testid={`customer-row-${c.id}`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3">{c.order_count}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-500">{c.email}</p>
                <p className="text-sm text-slate-500">{c.phone}</p>
                <p className="mt-1 text-xs text-slate-400">{c.order_count} orders · joined {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
