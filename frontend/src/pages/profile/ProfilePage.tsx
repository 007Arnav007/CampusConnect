import { useState, type FormEvent } from "react";
import { Check, UserRound } from "lucide-react";
import { updateMyProfile } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function ProfilePage() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 120) {
      setError("Enter a name between 1 and 120 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const profile = await updateMyProfile(trimmedName);
      updateName(profile.name);
      setName(profile.name);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const details = [
    ["Institutional email", user?.email ?? "—"],
    ["Role", user?.roles.join(", ") || "STUDENT"],
    ["Account ID", user?.userId ?? "—"],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-slate-500">Account settings</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Your profile</h1>
        <p className="mt-2 text-sm text-slate-400">Update the name shown on your account and ticket conversations.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl font-bold text-white"><UserRound className="h-6 w-6" /></div>
          <div><h2 className="font-semibold text-white">{user?.name ?? "CampusConnect user"}</h2><p className="text-sm text-slate-400">{user?.email}</p></div>
        </div>
        <form onSubmit={submit} className="max-w-xl space-y-4">
          <label htmlFor="profile-name" className="block text-sm font-medium text-slate-200">Display name</label>
          <input id="profile-name" autoComplete="name" required maxLength={120} value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} />
          {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
          {saved && <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-300"><Check className="h-4 w-4" />Profile saved.</p>}
          <button disabled={busy || name.trim() === user?.name} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save profile"}</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5">
        <h2 className="pt-5 font-semibold text-white">Account information</h2>
        <dl className="divide-y divide-slate-800">
          {details.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-4"><dt className="text-sm text-slate-400">{label}</dt><dd className="break-all text-right text-sm font-medium text-slate-200">{value}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}
