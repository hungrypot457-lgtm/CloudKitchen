import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Categories() {
  const [cats, setCats] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => api.get("/categories?all=true").then((r) => setCats(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { name: form.name, sort_order: Number(form.sort_order || 0), enabled: form.enabled };
      if (form.id) await api.put(`/categories/${form.id}`, payload);
      else await api.post("/categories", payload);
      toast.success("Category saved"); setForm(null); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try { await api.delete(`/categories/${c.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ name: "", sort_order: (cats?.length || 0) + 1, enabled: true })} data-testid="category-add-button">
          <Plus className="mr-1.5 h-4 w-4" /> Add Category
        </Button>
      </div>
      {!cats ? <Loader /> : cats.length === 0 ? <EmptyState title="No categories" /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4" data-testid={`category-${c.id}`}>
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-400">Order {c.sort_order} · {c.enabled ? "Enabled" : "Disabled"}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setForm(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{form?.id ? "Edit" : "Add"} category</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} data-testid="category-form-name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /> Enabled</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} data-testid="category-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
