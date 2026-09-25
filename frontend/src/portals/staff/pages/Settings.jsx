import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Loader } from "@/components/common";
import { LeafletMap } from "@/components/LeafletMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then((r) => setForm(r.data)).catch((e) => toast.error(errMsg(e))); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        business_name: form.business_name,
        kitchen_latitude: Number(form.kitchen_latitude),
        kitchen_longitude: Number(form.kitchen_longitude),
        delivery_radius_km: Number(form.delivery_radius_km),
        tax_percent: Number(form.tax_percent || 0),
      };
      const { data } = await api.put("/admin/settings", payload);
      setForm(data);
      toast.success("Settings saved");
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  if (!form) return <Loader />;
  const center = [Number(form.kitchen_latitude), Number(form.kitchen_longitude)];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="mb-4 font-display text-base font-bold text-slate-900">Business & Delivery</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Business name</Label><Input value={form.business_name} data-testid="settings-business-name" onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div><Label>Kitchen latitude</Label><Input type="number" step="any" value={form.kitchen_latitude} data-testid="settings-kitchen-lat" onChange={(e) => setForm({ ...form, kitchen_latitude: e.target.value })} /></div>
          <div><Label>Kitchen longitude</Label><Input type="number" step="any" value={form.kitchen_longitude} data-testid="settings-kitchen-lng" onChange={(e) => setForm({ ...form, kitchen_longitude: e.target.value })} /></div>
          <div><Label>Delivery radius (km)</Label><Input type="number" step="any" value={form.delivery_radius_km} data-testid="settings-radius" onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })} /></div>
          <div><Label>Tax (%)</Label><Input type="number" step="any" value={form.tax_percent} data-testid="settings-tax" onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} /></div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <LeafletMap center={center} zoom={13} markers={[{ lat: center[0], lng: center[1], type: "kitchen", label: "Kitchen" }]}
            radiusKm={Number(form.delivery_radius_km)} radiusCenter={center} height={320} />
        </div>
        <p className="mt-2 text-xs text-slate-500">The shaded circle shows the {form.delivery_radius_km} km delivery zone. Orders outside are rejected server-side.</p>
        <Button className="mt-4" onClick={save} disabled={saving} data-testid="settings-save"><Save className="mr-1.5 h-4 w-4" /> Save settings</Button>
      </div>
    </div>
  );
}
