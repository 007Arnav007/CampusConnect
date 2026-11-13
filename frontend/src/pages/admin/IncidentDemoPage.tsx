import { useEffect, useState } from "react";

type Res = { posterior: { node: string; p: number }[]; pNone: number; conformalSet: { nodes: string[]; size: number; alpha: number; includesNone?: boolean }; needsReview: boolean;
  zoneImpact: { zone: string; p: number }[]; decomposition: Record<string, { telemetry: number; missingness: number; reports: number; prior: number }> };
type Step = { t: number; tickets: number; observedNodes: number; silentNodes: string[]; blindNodes: string[]; result: Res; mode: string; modelVersion?: string };
type Case = { name: string; family: string; truth: string[]; blurb: string; blindFraction: number; steps: Step[] };
const card = "rounded-xl border border-slate-800 bg-slate-900/60 p-4";

export default function IncidentDemoPage() {
  const [cases, setCases] = useState<Case[]>(); const [ci, setCi] = useState(0); const [si, setSi] = useState(3); const [sev, setSev] = useState(0.6); const [reveal, setReveal] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { fetch("/demo/incidents.json").then((r) => r.json()).then((d) => setCases(d.cases)).catch(() => setErr("Demo data not found. Run experiments/make_demo_incident.py.")); }, []);
  if (err) return <p className="p-6 text-rose-300">{err}</p>; if (!cases) return <p className="p-6 text-slate-400">Loading…</p>;
  const c = cases[ci], s = c.steps[si], r = s.result, top = r.posterior[0]; const dec = r.decomposition[top?.node ?? ""];
  const thresh = 1 / (2 + 4 * sev);                                         // notify z iff P(z)(1+4sev) > 1-P(z)  (spec 5.2.6 with C0 = C_unneeded)
  const maxNats = Math.max(1, ...(dec ? Object.values(dec).map(Math.abs) : [1]));
  return (<div className="p-6 text-slate-200 space-y-5 max-w-5xl"><div><h1 className="text-2xl font-bold text-white">Incident localisation (live model output)</h1>
    <p className="text-sm text-slate-400 mt-1">Real responses from the Fault Localizer on <b>synthetic</b> scenarios ({s.mode}{s.modelVersion ? `, ${s.modelVersion}` : ""}). Prototype only — see Results for aggregate accuracy and limits.</p></div>
    <div className="flex gap-2 flex-wrap">{cases.map((x, i) => <button key={x.name} onClick={() => { setCi(i); setSi((s) => Math.min(s, x.steps.length - 1)); setReveal(false); }} className={`px-3 py-1.5 rounded-lg text-sm ${i === ci ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}>{x.name}</button>)}</div>
    <p className="text-sm text-slate-400">{c.blurb}</p>
    <label className="text-sm">Minutes after onset: <b className="text-violet-300">{s.t}</b><input type="range" min={0} max={c.steps.length - 1} value={si} onChange={(e) => setSi(Number(e.target.value))} className="w-full accent-violet-500" aria-label="Minutes after onset" /></label>
    {r.needsReview && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm p-3" role="alert">⚠ Needs human review: the conformal set is large or the fault/no-fault call is uncertain.</div>}
    <div className="grid md:grid-cols-2 gap-4">
      <div className={card}><h2 className="font-semibold mb-2">Calibrated posterior</h2>{r.posterior.slice(0, 6).map((p) => (<div key={p.node} className="flex items-center gap-2 text-sm mb-1"><span className="w-28 truncate font-mono">{p.node}</span><div className="flex-1 bg-slate-800 rounded h-3"><div className={`h-3 rounded ${p.node === "NONE" ? "bg-slate-500" : "bg-violet-500"}`} style={{ width: `${p.p * 100}%` }} /></div><span className="w-12 text-right">{(p.p * 100).toFixed(0)}%</span></div>))}
        <p className="text-xs text-slate-400 mt-2">{(1 - r.conformalSet.alpha) * 100}% conformal set: {r.conformalSet.nodes.length ? r.conformalSet.nodes.join(", ") : "—"} <span className="text-slate-500">(coverage is a marginal guarantee under exchangeability, not a promise for new fault types)</span></p></div>
      <div className={card}><h2 className="font-semibold mb-2">Why {top?.node}? (nats vs. “no fault”)</h2>{dec ? Object.entries(dec).map(([k, v]) => (<div key={k} className="flex items-center gap-2 text-sm mb-1"><span className="w-24 capitalize">{k}</span><div className="flex-1 bg-slate-800 rounded h-3 relative"><div className={`h-3 rounded ${v >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${(Math.abs(v) / maxNats) * 100}%` }} /></div><span className="w-14 text-right">{v >= 0 ? "+" : ""}{v.toFixed(1)}</span></div>)) : <p className="text-sm text-slate-500">No hypothesis.</p>}
        <p className="text-xs text-slate-400 mt-2">{s.tickets} reports · {s.observedNodes} nodes reporting · {s.silentNodes.length} silent · {s.blindNodes.length} without a collector</p>
        {s.silentNodes.length > 0 && <p className="text-xs text-slate-500">Silent: {s.silentNodes.slice(0, 8).join(", ")}{s.silentNodes.length > 8 ? "…" : ""} — silence is evidence (informative missingness).</p>}</div></div>
    <div className={card}><div className="flex items-center justify-between gap-4 flex-wrap"><h2 className="font-semibold">Who should be notified? (test mode)</h2>
      <label className="text-sm">Severity <b className="text-violet-300">{sev.toFixed(1)}</b> → notify if P(impact) &gt; <b className="text-violet-300">{(thresh * 100).toFixed(0)}%</b><input type="range" min={0} max={1} step={0.1} value={sev} onChange={(e) => setSev(Number(e.target.value))} className="w-full accent-violet-500" aria-label="Severity" /></label></div>
      <div className="flex flex-wrap gap-2 mt-3">{r.zoneImpact.length === 0 && <span className="text-sm text-slate-500">No zone above 2% impact.</span>}{r.zoneImpact.map((z) => <span key={z.zone} className={`px-2 py-1 rounded text-xs font-mono ${z.p > thresh ? "bg-violet-600/30 border border-violet-400 text-violet-100" : "bg-slate-800 text-slate-400"}`}>{z.zone} {(z.p * 100).toFixed(0)}%</span>)}</div>
      <p className="text-xs text-slate-500 mt-2">Higher severity lowers the threshold, widening the notified scope: missing an affected zone costs more than an unneeded warning.</p></div>
    <button onClick={() => setReveal(!reveal)} className="text-sm underline text-slate-400">{reveal ? "Hide" : "Reveal"} synthetic ground truth</button>{reveal && <p className="text-sm">True fault: <b className="font-mono text-emerald-300">{c.truth.join(", ")}</b> ({c.family})</p>}</div>);
}
