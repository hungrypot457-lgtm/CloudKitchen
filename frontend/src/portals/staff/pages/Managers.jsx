import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const PERM_LABELS = {
  view_dashboard: "View Dashboard", view_orders: "View Orders", update_orders: "Update Orders",
  view_customers: "View Customers", manage_menu: "Manage Menu", manage_availability: "Manage Availability",
  view_deliveries: "View Deliveries", manage_deliveries: "Manage Deliveries", view_reports: "View Reports",
  view_notifications: "View Notifications",
};

const blank = { name: "", email: "", phone: "", password: "", permissions: [], status: "active", notes: "" };

export default function Managers() {
  const [rows, setRows] = useState(null);
  const [perms, setPerms] = useState([]);
  const [form, setForm] = useState(null);

  const load = () => api.get("/admin/managers").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => {
    load();
    api.get("/admin/permissions/available").then((r) => setPerms(r.data)).catch(() => {});
  }, []);

  const togglePerm = (p) => setForm((f) => ({
    ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p],
  }));

  const save = async () => {
    try {
      if (form.id) {
        const { id, email, ...rest } = form;
        if (!rest.password) delete rest.password;
        await api.put(`/admin/managers/${form.id}`, rest);
      } else await api.post("/admin/managers", form);
      toast.success("Manager saved"); setForm(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (m) => {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    try { await api.delete(`/admin/managers/${m.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ ...blank })} data-testid="manager-add-button"><Plus className="mr-1.5 h-4 w-4" /> Add Manager</Button>
      </div>
      {!rows ? <Loader /> : rows.length === 0 ? <EmptyState icon={UserCog} title="No managers yet" /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`manager-${m.id}`}>
              <div className="flex items-start justify-between">
                <div><p className="font-semibold text-slate-900">{m.name}</p><p className="text-xs text-slate-500">{m.email}</p></div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(m.permissions || []).map((p) => <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{PERM_LABELS[p] || p}</span>)}
                {(!m.permissions || m.permissions.length === 0) && <span className="text-xs text-slate-400">No permissions</span>}
              </div>
              <div className="mt-3 flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setForm({ ...m, password: "", permissions: m.permissions || [] })}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del(m)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit" : "Add"} manager</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input value={form.name} data-testid="manager-form-name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} disabled={!!form.id} data-testid="manager-form-email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>{form.id ? "New password (optional)" : "Password"}</Label><Input type="text" value={form.password} data-testid="manager-form-password" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {perms.map((p) => (
                    <label key={p} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                      <Checkbox checked={form.permissions.includes(p)} onCheckedChange={() => togglePerm(p)} data-testid={`perm-${p}`} />
                      {PERM_LABELS[p] || p}
                    </label>
                  ))}
                </div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /> Active</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} data-testid="manager-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
