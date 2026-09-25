import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (!["admin", "manager"].includes(u.role)) {
        toast.error("This portal is for staff only.");
      } else {
        toast.success(`Welcome back, ${u.name}`);
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-secondary p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <ChefHat className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-extrabold">CloudBite</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">Operations Console</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Manage orders, menu availability, delivery partners and live tracking — from any device.
          </p>
        </div>
        <p className="text-sm text-slate-500">Admin & Manager access · Server-side RBAC</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-slate-50 p-6 lg:w-1/2">
        <div className="w-full max-w-sm cb-fade-in">
          <button
            onClick={() => navigate("/")}
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            data-testid="staff-back-home"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-lg font-extrabold">CloudBite</span>
          </div>
          <h2 className="font-display text-2xl font-bold">Sign in to console</h2>
          <p className="mt-1 text-sm text-slate-500">Admin & Manager portal</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} required data-testid="staff-email-input"
                onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="you@cloudbite.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} required data-testid="staff-password-input"
                onChange={(e) => setPassword(e.target.value)} className="mt-1.5" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} data-testid="staff-login-button" className="w-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Demo logins</p>
            <p className="mt-1">Admin: hungrypot457@gmail.com / Admin@12345</p>
            <p>Manager: manager@cloudbite.com / Manager@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
