import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Mail, Phone, Bike, Hash, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChangePasswordDialog } from "@/components/AuthExtras";
import { Button } from "@/components/ui/button";

export default function DeliveryProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
  const doLogout = () => { logout(); navigate("/"); toast.success("Logged out"); };

  return (
    <div>
      <div className="flex flex-col items-center bg-blue-600 px-5 pb-8 pt-10 text-white">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">{user.name?.[0]?.toUpperCase()}</div>
        <p className="mt-3 font-display text-xl font-bold">{user.name}</p>
        <p className="text-sm text-blue-100">Delivery Partner</p>
      </div>
      <div className="space-y-3 p-4">
        <Info icon={Mail} label="Email" value={user.email} />
        <Info icon={Phone} label="Phone" value={user.phone} />
        <Info icon={Bike} label="Vehicle" value={`${user.vehicle_type || "—"}`} />
        <Info icon={Hash} label="Vehicle number" value={user.vehicle_number || "—"} />
        <Button variant="outline" className="w-full" onClick={() => setPwOpen(true)} data-testid="rider-change-password">
          <KeyRound className="mr-2 h-4 w-4" /> Change Password
        </Button>
        <Button variant="outline" className="w-full text-red-600" onClick={doLogout} data-testid="rider-logout">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs text-slate-400">{label}</p><p className="font-medium text-slate-800">{value}</p></div>
    </div>
  );
}
