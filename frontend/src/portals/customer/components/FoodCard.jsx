import { useState } from "react";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
import { rupee, errMsg } from "@/lib/api";
import { VegBadge } from "@/components/common";
import { useCart } from "../CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function FoodCard({ item }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const price = item.price - (item.discount || 0);
  const hasCustom = (item.customizations || []).length > 0;

  const quickAdd = async () => {
    try {
      await add({ menu_item_id: item.id, quantity: 1, customizations: [] });
      toast.success(`${item.name} added to cart`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <div className={`flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 ${!item.available ? "opacity-60" : ""}`} data-testid={`food-card-${item.id}`}>
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {item.image && <img src={item.image} alt={item.name} className={`h-full w-full object-cover ${!item.available ? "grayscale-[40%]" : ""}`} />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <VegBadge isVeg={item.is_veg} />
            {item.featured && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">Bestseller</span>}
          </div>
          <p className="mt-1 truncate font-semibold text-slate-900">{item.name}</p>
          <p className="line-clamp-2 text-xs text-slate-500">{item.description}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="font-bold text-slate-900">{rupee(price)}</span>
            {item.available ? (
              <Button size="sm" className="h-8" data-testid={`add-to-cart-${item.id}`}
                onClick={() => (hasCustom ? setOpen(true) : quickAdd())}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500" data-testid={`unavailable-${item.id}`}>Currently Unavailable</span>
            )}
          </div>
        </div>
      </div>
      {hasCustom && <FoodDetailSheet item={item} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

function FoodDetailSheet({ item, open, onClose }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState({});

  const toggle = (group, option) => {
    setSelected((s) => {
      const cur = s[group.group_name] || [];
      if (group.multi) {
        return { ...s, [group.group_name]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] };
      }
      return { ...s, [group.group_name]: [option] };
    });
  };

  const submit = async () => {
    for (const g of item.customizations) {
      if (g.required && !(selected[g.group_name] || []).length) { toast.error(`Please select ${g.group_name}`); return; }
    }
    const customizations = [];
    Object.entries(selected).forEach(([group, opts]) => opts.forEach((o) => customizations.push({ group_name: group, option_name: o })));
    try {
      await add({ menu_item_id: item.id, quantity: qty, customizations });
      toast.success(`${item.name} added to cart`);
      onClose(); setQty(1); setSelected({});
    } catch (e) { toast.error(errMsg(e)); }
  };

  const extra = Object.entries(selected).reduce((sum, [g, opts]) => {
    const grp = item.customizations.find((x) => x.group_name === g);
    return sum + opts.reduce((s, o) => s + (grp?.options.find((x) => x.name === o)?.price_adjust || 0), 0);
  }, 0);
  const total = (item.price - (item.discount || 0) + extra) * qty;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><VegBadge isVeg={item.is_veg} /> {item.name}</SheetTitle></SheetHeader>
        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
        <div className="mt-4 space-y-4">
          {item.customizations.map((g) => (
            <div key={g.group_name}>
              <p className="text-sm font-semibold text-slate-800">{g.group_name} {g.required && <span className="text-xs text-red-500">*</span>}</p>
              <div className="mt-2 space-y-1.5">
                {g.options.map((o) => {
                  const active = (selected[g.group_name] || []).includes(o.name);
                  return (
                    <button key={o.name} onClick={() => toggle(g, o.name)} data-testid={`custom-${g.group_name}-${o.name}`}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${active ? "border-primary bg-accent" : "border-slate-200"}`}>
                      <span>{o.name}</span>
                      <span className="text-slate-500">{o.price_adjust > 0 ? `+${rupee(o.price_adjust)}` : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 px-2 py-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} data-testid="detail-qty-minus"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} data-testid="detail-qty-plus"><Plus className="h-4 w-4" /></button>
          </div>
          <Button onClick={submit} data-testid="detail-add-button" className="flex-1 ml-3">Add · {rupee(total)}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
