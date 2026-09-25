import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChefHat, Loader2 } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
      toast.success("Password reset. Please log in.");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"><ChefHat className="h-5 w-5 text-white" /></div>
          <span className="font-display font-extrabold">CloudBite</span>
        </div>
        {!token ? (
          <p className="text-sm text-red-500">This reset link is invalid.</p>
        ) : done ? (
          <div>
            <p className="font-display text-lg font-bold text-slate-900">Password updated</p>
            <p className="mt-1 text-sm text-slate-500">You can now log in with your new password.</p>
            <Button className="mt-4 w-full" onClick={() => navigate("/")} data-testid="reset-goto-login">Go to login</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="font-display text-xl font-bold">Set a new password</h1>
            <div><Label>New password</Label><Input type="password" required minLength={6} value={pw} data-testid="reset-new" onChange={(e) => setPw(e.target.value)} /></div>
            <Button type="submit" disabled={busy} className="w-full" data-testid="reset-submit">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
