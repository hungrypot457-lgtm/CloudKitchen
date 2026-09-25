import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { ForgotPasswordLink } from "@/components/AuthExtras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerAuth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const u = await login(form.email.trim(), form.password);
        if (u.role !== "customer") { toast.error("Please use the correct portal for your account."); return; }
      } else {
        await register({ name: form.name, email: form.email.trim(), phone: form.phone, password: form.password });
      }
      toast.success("Welcome to CloudBite!");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="relative flex flex-col justify-end bg-secondary px-6 pb-8 pt-12 text-white" style={{ minHeight: 260 }}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-extrabold">Hungry?</h1>
        <p className="mt-1 text-slate-300">Fresh from our cloud kitchen to your pin.</p>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => setMode(m)} data-testid={`auth-tab-${m}`}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div><Label>Full name</Label><Input value={form.name} required data-testid="signup-name" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} required data-testid="signup-phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </>
          )}
          <div><Label>Email</Label><Input type="email" value={form.email} required data-testid="auth-email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} required data-testid="auth-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {mode === "login" && <div className="mt-1.5 text-right"><ForgotPasswordLink /></div>}
          </div>
          <Button type="submit" disabled={busy} className="w-full" data-testid="auth-submit">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 space-y-2">
          <p className="text-center text-xs text-slate-400">or continue with</p>
          <Button variant="outline" type="button" className="w-full gap-2" data-testid="google-login" onClick={googleLogin}>
            <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}
