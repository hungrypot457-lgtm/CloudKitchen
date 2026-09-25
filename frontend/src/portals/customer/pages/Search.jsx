import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState, FoodListSkeleton } from "@/components/common";
import { FoodCard } from "../components/FoodCard";
import { Input } from "@/components/ui/input";

export default function Search() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.get("/menu", { params: q ? { search: q } : {} })
        .then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-slate-50/95 px-4 py-4 backdrop-blur">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input autoFocus placeholder="Search for dishes..." value={q} data-testid="customer-search-input"
            onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="px-4 pb-4">
        {loading || !items ? <FoodListSkeleton /> : items.length === 0 ? (
          <EmptyState icon={SearchIcon} title="No dishes found" subtitle="Try a different search term." />
        ) : (
          <div className="space-y-3">{items.map((i) => <FoodCard key={i.id} item={i} />)}</div>
        )}
      </div>
    </div>
  );
}
