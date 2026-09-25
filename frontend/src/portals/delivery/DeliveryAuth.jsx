import { useState } from "react";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { ForgotPasswordLink } from "@/components/AuthExtras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeliveryAuth() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== "delivery_partner") { toast.error("This app is for delivery partners only."); return; }
      toast.success(`Welcome, ${u.name}`);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="relative flex flex-col justify-end bg-blue-600 px-6 pb-8 pt-12 text-white" style={{ minHeight: 260 }}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><Bike className="h-6 w-6" /></div>
        <h1 className="font-display text-3xl font-extrabold">Rider Partner</h1>
        <p className="mt-1 text-blue-100">Deliver orders. Track live. Earn more.</p>
      </div>
      <div className="flex-1 px-6 py-8">
        <h2 className="font-display text-xl font-bold">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Accounts are created by the admin.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label>Email</Label><Input type="email" value={email} required data-testid="rider-email" onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" value={password} required data-testid="rider-password" onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="rider-login">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
          </Button>
        </form>
        <div className="mt-4 text-center"><ForgotPasswordLink /></div>
      </div>
    </div>
  );
}
