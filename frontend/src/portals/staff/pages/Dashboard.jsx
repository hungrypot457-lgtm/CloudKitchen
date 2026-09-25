import { useEffect, useState } from "react";
import { ShoppingBag, Clock, Truck, CheckCircle2, XCircle, IndianRupee, Users, Bike } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { api, rupee } from "@/lib/api";
import { StatsSkeleton } from "@/components/common";
import { useAuth } from "@/context/AuthContext";

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="space-y-6"><StatsSkeleton count={4} /><StatsSkeleton count={3} /></div>;

  const chart = Object.entries(data.by_status || {}).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }));
  const colors = ["#94a3b8", "#6366f1", "#f59e0b", "#f97316", "#a855f7", "#06b6d4", "#2563eb", "#10b981", "#94a3b8"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={ShoppingBag} label="Today's Orders" value={data.today_orders} tint="bg-orange-100 text-orange-600" />
        <Stat icon={Clock} label="Pending / Preparing" value={data.pending + data.preparing} tint="bg-amber-100 text-amber-600" />
        <Stat icon={Truck} label="Out For Delivery" value={data.out_for_delivery} tint="bg-blue-100 text-blue-600" />
        <Stat icon={CheckCircle2} label="Delivered" value={data.delivered} tint="bg-emerald-100 text-emerald-600" />
        <Stat icon={XCircle} label="Cancelled" value={data.cancelled} tint="bg-slate-100 text-slate-500" />
        <Stat icon={Truck} label="Active Deliveries" value={data.active_deliveries} tint="bg-indigo-100 text-indigo-600" />
        {user.role === "admin" && (
          <>
            <Stat icon={IndianRupee} label="Revenue (Delivered)" value={rupee(data.total_revenue)} tint="bg-green-100 text-green-600" />
            <Stat icon={Users} label="Customers" value={data.total_customers} tint="bg-purple-100 text-purple-600" />
          </>
        )}
      </div>

      {user.role === "admin" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon={Bike} label="Delivery Partners" value={data.total_partners} tint="bg-blue-100 text-blue-600" />
          <Stat icon={CheckCircle2} label="Available Items" value={data.available_items} tint="bg-emerald-100 text-emerald-600" />
          <Stat icon={XCircle} label="Unavailable Items" value={data.unavailable_items} tint="bg-red-100 text-red-500" />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="mb-4 font-display text-base font-bold text-slate-900">Orders by status</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
              <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chart.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
