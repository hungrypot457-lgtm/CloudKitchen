import { Loader2 } from "lucide-react";

export function VegBadge({ isVeg, size = 16 }) {
  const color = isVeg ? "#16A34A" : "#DC2626";
  return (
    <span
      title={isVeg ? "Veg" : "Non-Veg"}
      data-testid="veg-badge"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}`,
        borderRadius: 3,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ width: size / 2, height: size / 2, background: color, borderRadius: "50%" }} />
    </span>
  );
}

const STAGE_STYLES = {
  "ORDER BEING PREPARED": "bg-amber-100 text-amber-700 border-amber-200",
  "ORDER ON THE WAY": "bg-blue-100 text-blue-700 border-blue-200",
  "ORDER ARRIVED": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "ORDER CANCELLED": "bg-slate-100 text-slate-500 border-slate-200",
};

const INTERNAL_STYLES = {
  PENDING: "bg-slate-100 text-slate-600 border-slate-200",
  CONFIRMED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PREPARING: "bg-amber-100 text-amber-700 border-amber-200",
  READY_FOR_PICKUP: "bg-orange-100 text-orange-700 border-orange-200",
  ASSIGNED: "bg-purple-100 text-purple-700 border-purple-200",
  ACCEPTED: "bg-cyan-100 text-cyan-700 border-cyan-200",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  REJECTED: "bg-red-100 text-red-600 border-red-200",
};

export function StatusBadge({ status, stage }) {
  const label = stage || status;
  const cls = stage ? STAGE_STYLES[stage] : INTERNAL_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      data-testid="order-status-badge"
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {(label || "").replace(/_/g, " ")}
    </span>
  );
}

export function Loader({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500" data-testid="loader">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-500">
      {Icon && <Icon className="h-10 w-10 text-slate-300" />}
      <p className="font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-sm max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function FoodListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3" data-testid="food-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <Skeleton className="h-24 w-24 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="stats-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="card-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
