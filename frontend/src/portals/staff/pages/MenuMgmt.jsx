import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { api, rupee, errMsg } from "@/lib/api";
import { CardGridSkeleton, EmptyState, VegBadge } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const blank = { name: "", description: "", price: "", discount: 0, tax_percent: 0, image: "", is_veg: true, prep_time: 20, featured: false, available: true, tags: "", category_id: "" };

export default function MenuMgmt() {
  const { hasPerm } = useAuth();
  const canEdit = hasPerm("manage_menu");
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/menu").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));
    api.get("/categories?all=true").then((r) => setCats(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (item) => {
    try {
      await api.patch(`/menu/${item.id}/availability`, { available: !item.available });
      toast.success(`${item.name} marked ${!item.available ? "available" : "unavailable"}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const openNew = () => setForm({ ...blank, category_id: cats[0]?.id || "" });
  const openEdit = (it) => setForm({ ...it, tags: (it.tags || []).join(", ") });

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form, price: Number(form.price), discount: Number(form.discount || 0),
        tax_percent: Number(form.tax_percent || 0), prep_time: Number(form.prep_time || 0),
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        customizations: form.customizations || [],
      };
      delete payload.id; delete payload.created_at;
      if (form.id) await api.put(`/menu/${form.id}`, payload);
      else await api.post("/menu", payload);
      toast.success("Menu item saved");
      setForm(null); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const del = async (it) => {
    if (!window.confirm(`Delete ${it.name}?`)) return;
    try { await api.delete(`/menu/${it.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const catName = (id) => cats.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={openNew} data-testid="menu-add-button"><Plus className="mr-1.5 h-4 w-4" /> Add Item</Button>
        </div>
      )}
      {!items ? <CardGridSkeleton /> : items.length === 0 ? <EmptyState title="No menu items yet" /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} data-testid={`menu-item-${it.id}`}
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${!it.available ? "opacity-70" : ""}`}>
              <div className="relative h-36 bg-slate-100">
                {it.image && <img src={it.image} alt={it.name} className="h-full w-full object-cover" />}
                {!it.available && (
                  <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-1 text-xs font-semibold text-white">Unavailable</span>
                )}
                {it.featured && <Star className="absolute right-2 top-2 h-5 w-5 fill-amber-400 text-amber-400" />}
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <VegBadge isVeg={it.is_veg} />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{it.name}</p>
                    <p className="text-xs text-slate-400">{catName(it.category_id)}</p>
                  </div>
                  <span className="font-bold text-slate-900">{rupee(it.price)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{it.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Switch checked={it.available} onCheckedChange={() => toggle(it)}
                      disabled={!hasPerm("manage_availability")} data-testid={`availability-toggle-${it.id}`} />
                    {it.available ? "Available" : "Unavailable"}
                  </label>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(it)} data-testid={`menu-edit-${it.id}`}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del(it)} data-testid={`menu-delete-${it.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit" : "Add"} menu item</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} data-testid="menu-form-name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₹)</Label><Input type="number" value={form.price} data-testid="menu-form-price" onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger data-testid="menu-form-category"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Discount (₹)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
                <div><Label>Prep time (min)</Label><Input type="number" value={form.prep_time} onChange={(e) => setForm({ ...form, prep_time: e.target.value })} /></div>
              </div>
              <div><Label>Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
              <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_veg} onCheckedChange={(v) => setForm({ ...form, is_veg: v })} /> Vegetarian</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} /> Available</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="menu-form-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
