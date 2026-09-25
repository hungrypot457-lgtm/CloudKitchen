import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function ForgotPasswordLink({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      toast.success(data.message);
      setOpen(false);
      setEmail("");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid="forgot-password-link"
        className={`text-sm font-medium text-primary hover:underline ${className}`}>
        Forgot password?
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset your password</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-slate-500">Enter your account email and we'll generate a secure password reset link.</p>
            <div><Label>Email</Label><Input type="email" required value={email} data-testid="forgot-email" onChange={(e) => setEmail(e.target.value)} /></div>
            <DialogFooter><Button type="submit" disabled={busy} data-testid="forgot-submit" className="w-full">Send reset link</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChangePasswordDialog({ open, onOpenChange }) {
  const [oldp, setOldp] = useState("");
  const [newp, setNewp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/change-password", { old_password: oldp, new_password: newp });
      toast.success("Password changed successfully.");
      onOpenChange(false);
      setOldp(""); setNewp("");
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Current password</Label><Input type="password" value={oldp} data-testid="change-old" onChange={(e) => setOldp(e.target.value)} placeholder="Leave blank if you signed up with Google" /></div>
          <div><Label>New password</Label><Input type="password" required minLength={6} value={newp} data-testid="change-new" onChange={(e) => setNewp(e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={busy} data-testid="change-submit" className="w-full">Update password</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
