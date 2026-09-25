import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });

  const refresh = useCallback(() => {
    return api.get("/cart").then((r) => setCart(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (payload) => {
    const { data } = await api.post("/cart/items", payload);
    setCart(data);
    return data;
  };
  const updateQty = async (lineId, quantity) => {
    const { data } = await api.patch(`/cart/items/${lineId}`, { quantity });
    setCart(data);
  };
  const removeItem = async (lineId) => {
    const { data } = await api.delete(`/cart/items/${lineId}`);
    setCart(data);
  };
  const clear = async () => {
    const { data } = await api.delete("/cart");
    setCart(data);
  };

  const count = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, refresh, add, updateQty, removeItem, clear, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
