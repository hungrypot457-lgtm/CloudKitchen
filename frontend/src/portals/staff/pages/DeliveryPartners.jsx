import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bike } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const blank = { name: "", email: "", phone: "", password: "", vehicle_type: "Bike", vehicle_number: "", emergency_contact: "", joining_date: "", notes: "", status: "active" };

export default function DeliveryPartners() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => api.get("/admin/delivery-partners").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (form.id) {
        const { id, email, ...rest } = form;
        if (!rest.password) delete rest.password;
        await api.put(`/admin/delivery-partners/${form.id}`, rest);
      } else await api.post("/admin/delivery-partners", form);
      toast.success("Saved"); setForm(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try { await api.delete(`/admin/delivery-partners/${p.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setForm({ ...blank })} data-testid="partner-add-button"><Plus className="mr-1.5 h-4 w-4" /> Add Partner</Button>
        </div>
      )}
      {!rows ? <Loader /> : rows.length === 0 ? <EmptyState icon={Bike} title="No delivery partners" /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`partner-${p.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.status}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>{p.phone}</p>
                <p>{p.vehicle_type} · {p.vehicle_number}</p>
                <p className="text-xs text-slate-400">{p.active_deliveries} active deliveries</p>
              </div>
              {isAdmin && (
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...p, password: "" })}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit" : "Add"} delivery partner</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label>Name</Label><Input value={form.name} data-testid="partner-form-name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} disabled={!!form.id} data-testid="partner-form-email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>{form.id ? "New password (optional)" : "Password"}</Label><Input type="text" value={form.password} data-testid="partner-form-password" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Vehicle type</Label><Input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} /></div>
              <div><Label>Vehicle number</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
              <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
              <div><Label>Joining date</Label><Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /> Active</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} data-testid="partner-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
