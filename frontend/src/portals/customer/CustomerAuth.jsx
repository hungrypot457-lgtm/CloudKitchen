import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingBag, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerAuth() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState({ enabled: false, appId: "" });

  useEffect(() => {
    api.get("/auth/config").then((r) => setFb({ enabled: r.data.facebook_enabled, appId: r.data.facebook_app_id })).catch(() => {});
  }, []);

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

  const facebookLogin = () => {
    if (!fb.enabled) { toast.info("Facebook login isn't configured yet."); return; }
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("fb_oauth_state", state);
    const redirectUrl = window.location.origin + "/app";
    window.location.href =
      `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fb.appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}&scope=email,public_profile`;
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
          <div><Label>Password</Label><Input type="password" value={form.password} required data-testid="auth-password" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button type="submit" disabled={busy} className="w-full" data-testid="auth-submit">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 space-y-2">
          <p className="text-center text-xs text-slate-400">or continue with</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" data-testid="google-login" onClick={googleLogin}>Google</Button>
            <Button variant="outline" type="button" data-testid="facebook-login" onClick={facebookLogin}>Facebook</Button>
          </div>
        </div>

        <p className="mt-6 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">Demo: customer@cloudbite.com / Customer@123</p>
      </div>
    </div>
  );
}
