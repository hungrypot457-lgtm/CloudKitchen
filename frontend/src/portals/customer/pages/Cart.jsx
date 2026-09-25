import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { rupee, errMsg } from "@/lib/api";
import { EmptyState } from "@/components/common";
import { VegBadge } from "@/components/common";
import { useCart } from "../CartContext";
import { Button } from "@/components/ui/button";

export default function Cart() {
  const { cart, updateQty, removeItem, clear } = useCart();
  const navigate = useNavigate();

  const change = async (line, delta) => {
    try { await updateQty(line.line_id, line.quantity + delta); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!cart.items.length) {
    return (
      <div className="px-4 pt-16">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" subtitle="Add some delicious food to get started." />
        <Button className="mx-auto mt-4 block" onClick={() => navigate("/app")}>Browse Menu</Button>
      </div>
    );
  }

  const hasUnavailable = cart.items.some((i) => !i.available);

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="font-display text-2xl font-extrabold">Your Cart</h1>
        <button onClick={() => clear()} className="text-xs font-semibold text-red-500" data-testid="cart-clear">Clear all</button>
      </div>

      <div className="space-y-3 px-4 py-3">
        {cart.items.map((line) => (
          <div key={line.line_id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3" data-testid={`cart-item-${line.line_id}`}>
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
              {line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><VegBadge isVeg={line.is_veg} /><p className="truncate font-semibold text-slate-900">{line.name}</p></div>
              {line.customizations?.map((c, i) => <p key={i} className="text-xs text-slate-400">{c.group_name}: {c.option_name}</p>)}
              {!line.available && <p className="text-xs font-semibold text-red-500">Currently unavailable — remove to checkout</p>}
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 px-2 py-0.5">
                  <button onClick={() => change(line, -1)} data-testid={`cart-minus-${line.line_id}`}><Minus className="h-4 w-4" /></button>
                  <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                  <button onClick={() => change(line, 1)} data-testid={`cart-plus-${line.line_id}`}><Plus className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{rupee(line.line_total)}</span>
                  <button onClick={() => removeItem(line.line_id)} data-testid={`cart-remove-${line.line_id}`}><Trash2 className="h-4 w-4 text-slate-400" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-2 rounded-2xl border border-slate-200 bg-white p-4">
        <Row label="Food Subtotal" value={rupee(cart.subtotal)} />
        <Row label="Delivery Fee" value="₹0" />
        <Row label="Platform Fee" value="₹0" />
        <Row label="Convenience Fee" value="₹0" />
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{rupee(cart.subtotal)}</span></div>
      </div>

      <div className="px-4 py-4">
        <Button className="w-full" disabled={hasUnavailable} onClick={() => navigate("/app/checkout")} data-testid="proceed-checkout">
          {hasUnavailable ? "Remove unavailable items" : "Proceed to Checkout"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between py-0.5 text-sm text-slate-600"><span>{label}</span><span>{value}</span></div>;
}
