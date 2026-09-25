import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, IndianRupee } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api, rupee, errMsg } from "@/lib/api";
import { Loader } from "@/components/common";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["#EA580C", "#2563EB", "#16A34A", "#f59e0b", "#a855f7", "#06b6d4", "#94a3b8", "#ef4444"];

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="mb-4 font-display text-base font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/reports").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!data) return <Loader />;

  return (
    <div className="space-y-4">
      {user.role === "admin" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total Orders</p><p className="text-2xl font-extrabold">{data.total_orders}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Delivered</p><p className="text-2xl font-extrabold">{data.total_delivered}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total Sales</p><p className="text-2xl font-extrabold">{rupee(data.total_sales)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Avg Order</p><p className="text-2xl font-extrabold">{rupee(data.avg_order_value)}</p></div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Orders (last 7 days)">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.orders_by_day} margin={{ left: -20, right: 8 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#EA580C" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer></div>
        </Card>
        <Card title="Orders by status">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.orders_by_status} dataKey="count" nameKey="status" outerRadius={90} label={(e) => e.status.replace(/_/g, " ")}>
                {data.orders_by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip />
            </PieChart>
          </ResponsiveContainer></div>
        </Card>
      </div>
      <Card title="Popular items">
        <div className="h-72"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.popular_items} margin={{ left: -20, right: 8, bottom: 40 }}>
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={70} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
            <Bar dataKey="qty" radius={[6, 6, 0, 0]} fill="#16A34A" />
          </BarChart>
        </ResponsiveContainer></div>
      </Card>
    </div>
  );
}
