import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { login } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login: saveLogin, user } = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await login({ email: email.trim(), password });
      if (!result.roles.includes("ADMIN")) {
        setError("This account does not have administrator access.");
        return;
      }
      saveLogin(result);
      navigate("/admin", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Administrator sign-in failed.");
    } finally { setBusy(false); }
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-violet-500/20 bg-slate-900/80 p-7 shadow-2xl shadow-violet-950/20 sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200"><ShieldCheck className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Operations access</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Administrator sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Sign in with an account that already has the administrator role. This form never elevates student accounts.</p>
        {user?.roles.includes("ADMIN") && <button onClick={() => navigate("/admin")} className="mt-4 text-sm text-violet-300 underline">Continue to admin console</button>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-200">Institutional email<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@institution.edu" className="mt-2" /></label>
          <label className="block text-sm text-slate-200">Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2" /></label>
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{busy ? "Signing in…" : "Sign in to admin"}</button>
        </form>
        <p className="mt-4 text-xs leading-5 text-slate-300">No administrator account yet? Set both <code className="text-violet-200">BOOTSTRAP_ADMIN_EMAIL</code> (an approved institutional address) and a private <code className="text-violet-200">BOOTSTRAP_ADMIN_PASSWORD</code> (14+ characters) in the repository-root <code className="text-violet-200">.env</code>, not <code className="text-violet-200">.env.example</code>, then restart the backend. This page does not create or promote accounts; an existing student account will not be elevated.</p>
        <Link to="/login" className="mt-5 inline-block text-sm text-slate-400 hover:text-white">Student/staff sign-in</Link>
      </section>
    </section>
  );
}
