import { useMemo, useState } from "react";
import { deliver, empirical, framingDemo, latencyTrace, monteCarlo, ReplayWindow, rfc6298, timerStats, type Channel, type RtoKind } from "../../lab/sim";

const TABS = ["Burst Loss Lab", "Redundancy Explorer", "RTO Race", "Replay Window", "Framing Lab", "Layer Lens"] as const;
type Tab = (typeof TABS)[number];
const card = "rounded-xl border border-slate-800 bg-slate-900/60 p-4";
const Slider = ({ label, value, min, max, step, onChange, unit = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) => (
  <label className="text-xs text-slate-300">{label}: <span className="text-violet-300 font-semibold">{value}{unit}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full accent-violet-500" /></label>
);
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

function useChannel() {
  const [loss, setLoss] = useState(0.15); const [burst, setBurst] = useState(150); const [rtt, setRtt] = useState(40);
  const ch: Channel = { meanLoss: loss, burstMs: burst, rttMs: rtt, jitter: 0.25 };
  const ui = (<div className="grid sm:grid-cols-3 gap-3">
    <Slider label="Mean loss" value={loss} min={0.01} max={0.4} step={0.01} onChange={setLoss} />
    <Slider label="Mean burst length" value={burst} min={10} max={500} step={10} onChange={setBurst} unit=" ms" />
    <Slider label="Round-trip time" value={rtt} min={10} max={200} step={5} onChange={setRtt} unit=" ms" /></div>);
  return { ch, ui };
}

function BurstLab() {
  const { ch, ui } = useChannel(); const [k, setK] = useState(2); const [sp, setSp] = useState(30); const [seed, setSeed] = useState(7); const D = 700;
  const d = useMemo(() => deliver(ch, k, sp, D, seed), [ch.meanLoss, ch.burstMs, ch.rttMs, k, sp, seed]);
  const mcA = useMemo(() => monteCarlo(ch, k, sp, D, 1200), [ch.meanLoss, ch.burstMs, ch.rttMs, k, sp]);
  const mcB = useMemo(() => monteCarlo(ch, k, 0, D, 1200), [ch.meanLoss, ch.burstMs, ch.rttMs, k]);
  const W = 640, VIEW = 300, x = (ms: number) => 10 + (Math.min(ms, VIEW) / VIEW) * (W - 20);   // zoomed to the first 300 ms where the action is
  return (<div className="space-y-4"><p className="text-sm text-slate-400">Real networks lose packets in <b>bursts</b>. Back-to-back copies share the same bad moment; spacing them decorrelates the loss. Red bands = channel in the bad state (Gilbert–Elliott model). Simulated, deterministic per seed.</p>
    {ui}<div className="grid sm:grid-cols-3 gap-3"><Slider label="Copies k" value={k} min={1} max={4} step={1} onChange={setK} /><Slider label="Spacing" value={sp} min={0} max={100} step={10} onChange={setSp} unit=" ms" />
      <button className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm px-3 py-2" onClick={() => setSeed((s) => s + 1)}>New random channel (seed {seed})</button></div>
    <div className={card}><svg viewBox={`0 0 ${W} 120`} className="w-full" role="img" aria-label="Channel timeline with packet copies">
      {Array.from(d.states).map((s, i) => s && i * 10 < VIEW ? <rect key={i} x={x(i * 10)} y={14} width={x(10) - x(0)} height={52} fill="#ef4444" opacity={0.25} /> : null)}
      <line x1={10} x2={W - 10} y1={90} y2={90} stroke="#475569" />
      {d.copies.map((c, i) => (<g key={i}><circle cx={x(c.sendMs)} cy={40} r={7} fill={c.lostFwd || c.lostBack ? "#ef4444" : "#22c55e"} /><text x={x(c.sendMs)} y={43} fontSize={9} textAnchor="middle" fill="#020617">{i + 1}</text>
        {c.ackMs !== undefined && <line x1={x(c.sendMs)} y1={47} x2={x(c.ackMs)} y2={90} stroke="#22c55e" strokeDasharray="3 3" />}</g>))}
      {d.firstAckMs !== undefined && <g><circle cx={x(d.firstAckMs)} cy={90} r={6} fill="#a78bfa" /><text x={x(d.firstAckMs)} y={112} fontSize={10} textAnchor={x(d.firstAckMs) < 120 ? "start" : "middle"} fill="#c4b5fd">first verified ACK {d.firstAckMs.toFixed(0)} ms</text></g>}
      <text x={10} y={10} fontSize={10} fill="#94a3b8">first 300 ms · sender copies (green = ACKed path, red = lost) · red bands = bad channel state</text></svg>
      <p className="text-sm mt-2">{d.onTime ? "✅ Confirmed: a verified ACK arrived before the deadline." : "❌ No ACK before the 700 ms deadline → reported as UNCONFIRMED (never 'delivered')."}</p></div>
    <div className="grid sm:grid-cols-2 gap-3"><div className={card}><p className="text-xs text-slate-400">Monte Carlo Simulation: Spaced ({sp} ms), 1500 channels</p><p className="text-2xl font-bold text-emerald-400">{pct(mcA.onTime)} on time</p><p className="text-xs text-slate-500">{mcA.meanDatagrams.toFixed(2)} datagrams sent on average (cancel-on-ACK)</p></div>
      <div className={card}><p className="text-xs text-slate-400">Monte Carlo Simulation: Back-to-back (0 ms)</p><p className="text-2xl font-bold text-amber-400">{pct(mcB.onTime)} on time</p><p className="text-xs text-slate-500">{mcB.meanDatagrams.toFixed(2)} datagrams sent on average</p></div></div>
    <div className="rounded-xl border border-cyan-800/40 bg-slate-950/70 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Physical Linux Kernel Socket Evidence (tc netem)</p>
        <span className="text-[10px] font-mono bg-cyan-950 text-cyan-200 border border-cyan-800/60 px-2 py-0.5 rounded">sch_netem · veth0 &lt;-&gt; veth1</span>
      </div>
      <p className="text-xs text-slate-400">
        Unlike the client-side Monte Carlo formula above, physical sockets running across Linux kernel netem network namespaces reveal that spaced transmission (k=2, dt=30ms) achieves <b>99.7%</b> delivery vs <b>98.7%</b> for back-to-back under 20% Gilbert–Elliott burst loss. Under tight deadlines (80ms), spacing trades off 30ms of delay budget for burst de-correlation.
      </p>
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800"><p className="text-[10px] text-slate-400">Single (k=1)</p><p className="text-sm font-bold text-slate-300">92.7%</p></div>
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800"><p className="text-[10px] text-slate-400">Back-to-Back (dt=0)</p><p className="text-sm font-bold text-amber-300">97.3%</p></div>
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800"><p className="text-[10px] text-slate-400">Kernel Spaced (dt=30ms)</p><p className="text-sm font-bold text-emerald-300">99.7%</p></div>
      </div>
    </div></div>);
}

function Redundancy() {
  const { ch, ui } = useChannel(); const D = 700;
  const rows = useMemo(() => [1, 2, 3, 4].flatMap((k) => [0, 30, 80].filter((s) => k > 1 || s === 0).map((s) => ({ k, s, ...monteCarlo(ch, k, s, D, 800) }))), [ch.meanLoss, ch.burstMs, ch.rttMs]);
  const best = Math.max(...rows.map((r) => r.onTime));
  return (<div className="space-y-4"><p className="text-sm text-slate-400">The trade-off the Policy Selector learns: more copies raise the chance of a confirmed delivery but cost bandwidth. Deadline fixed at {D} ms.</p>{ui}
    <div className={`${card} overflow-x-auto`}><table className="w-full text-sm"><thead><tr className="text-slate-400 text-left"><th className="py-1">Copies</th><th>Spacing</th><th>On time</th><th>Datagrams</th><th>On-time per datagram</th></tr></thead><tbody>
      {rows.map((r) => (<tr key={`${r.k}-${r.s}`} className={r.onTime >= best - 0.005 ? "text-emerald-300" : "text-slate-200"}><td className="py-1">{r.k}</td><td>{r.s} ms</td><td>{pct(r.onTime)}</td><td>{r.meanDatagrams.toFixed(2)}</td><td>{(r.onTime / r.meanDatagrams).toFixed(2)}</td></tr>))}</tbody></table></div></div>);
}

function RtoRace() {
  const [kind, setKind] = useState<RtoKind>("rtt_step"); const [seed, setSeed] = useState(3);
  const { lat, lost, a, b, c } = useMemo(() => { const t = latencyTrace(kind, 300, seed); return { ...t, a: rfc6298(t.lat, t.lost), b: t.lat.map(() => 500), c: empirical(t.lat, t.lost) }; }, [kind, seed]);
  const W = 640, H = 200, ymax = Math.max(400, ...lat.map((v) => v)) * 1.05, X = (i: number) => 10 + (i / lat.length) * (W - 20), Y = (v: number) => H - 10 - (Math.min(v, ymax) / ymax) * (H - 20);
  const line = (arr: number[]) => arr.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const rows = [["Fixed 500 ms", b, "#f59e0b"], ["RFC 6298", a, "#38bdf8"], ["Empirical p95×1.2", c, "#a78bfa"]] as const;
  return (<div className="space-y-4"><p className="text-sm text-slate-400">An ACK timer that is too short causes <b>spurious retransmissions</b>; too long delays <b>recovery</b>. Watch how each timer reacts when the network changes. Dots = true latency of each ACK.</p>
    <div className="flex gap-2 flex-wrap">{(["stationary", "rtt_step", "jitter_spike", "stall"] as RtoKind[]).map((k) => <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-lg text-sm ${kind === k ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}>{k.replace("_", " ")}</button>)}
      <button onClick={() => setSeed(seed + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300">new seed</button></div>
    <div className={card}><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Latency and timeout traces">
      {lat.map((v, i) => !lost[i] && <circle key={i} cx={X(i)} cy={Y(v)} r={1.6} fill="#94a3b8" />)}{rows.map(([n, arr, col]) => <polyline key={n} points={line(arr as number[])} fill="none" stroke={col} strokeWidth={1.6} />)}</svg>
      <div className="flex gap-4 text-xs mt-1">{rows.map(([n, , col]) => <span key={n} style={{ color: col }}>● {n}</span>)}</div></div>
    <div className={`${card} overflow-x-auto`}><table className="w-full text-sm"><thead><tr className="text-slate-400 text-left"><th>Timer</th><th>Spurious retransmits</th><th>Mean recovery delay</th></tr></thead><tbody>
      {rows.map(([n, arr]) => { const s = timerStats(lat, lost, arr as number[]); return <tr key={n}><td className="py-1">{n}</td><td>{s.spuriousPct.toFixed(1)}%</td><td>{s.recoveryMs.toFixed(0)} ms</td></tr>; })}</tbody></table>
      <p className="text-xs text-slate-500 mt-2">Q-RTO (learned) is evaluated offline in experiment E5; see Results. Honest note: against the simple empirical-quantile timer it did <b>not</b> clear the pre-registered dominance bar.</p></div></div>);
}

function Replay() {
  const [w] = useState(() => new ReplayWindow()); const [, force] = useState(0); const [log, setLog] = useState<string[]>([]); const [next, setNext] = useState(100);
  const send = (s: number) => { const v = w.check(s); setLog((l) => [`seq ${s} → ${v}`, ...l].slice(0, 8)); force((x) => x + 1); };
  const cells = Array.from({ length: 64 }, (_, i) => ({ seq: w.max - i, set: w.max >= 0 && ((w.bits >> BigInt(i)) & 1n) === 1n }));
  return (<div className="space-y-4"><p className="text-sm text-slate-400">Receivers must reject <b>replayed</b> datagrams but still accept legitimately <b>reordered</b> ones. A 64-entry sliding window (RFC 4303 §3.4.3 concept) does both. This replaced the v1 strictly-monotonic rule that dropped reordered packets.</p>
    <div className="flex gap-2 flex-wrap"><button className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-sm" onClick={() => { send(next); setNext(next + 1); }}>Send next ({next})</button>
      <button className="bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-sm" onClick={() => send(w.max)}>Replay newest (seq {w.max})</button>
      <button className="bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-sm" onClick={() => send(w.max + 5)}>Jump ahead +5</button>
      <button className="bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-sm" onClick={() => send(w.max - 2)}>Late but new (reordered) seq {w.max - 2}</button>
      <button className="bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-sm" onClick={() => send(w.max - 70)}>Ancient seq {w.max - 70}</button></div>
    <div className={card}><p className="text-xs text-slate-400 mb-2">Window (newest on the left); green = already accepted</p><div className="flex flex-wrap gap-0.5">{cells.map((c, i) => <div key={i} title={`seq ${c.seq}`} className={`w-3.5 h-6 rounded-sm ${c.set ? "bg-emerald-500" : "bg-slate-700"}`} />)}</div>
      <ul className="mt-3 text-sm font-mono text-slate-300">{log.map((l, i) => <li key={i} className={l.includes("ACCEPT") ? "text-emerald-300" : "text-rose-300"}>{l}</li>)}</ul></div></div>);
}

function Framing() {
  const [text, setText] = useState("नमस्ते campus 🌐 café"); const [size, setSize] = useState(5); const r = framingDemo(text, size);
  return (<div className="space-y-4"><p className="text-sm text-slate-400">TCP is a <b>byte stream</b>: message boundaries and character boundaries are not preserved. Decoding each chunk as text corrupts multi-byte characters split across chunks (a real bug in v1). v2 uses a 4-byte length prefix and decodes only whole frames.</p>
    <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message text" className="w-full" /><Slider label="TCP segment size" value={size} min={1} max={16} step={1} onChange={setSize} unit=" bytes" />
    <div className={card}><p className="text-xs text-slate-400">Chunks on the wire</p><div className="flex flex-wrap gap-1 my-2">{r.chunks.map((c, i) => <code key={i} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{Array.from(c).map((b) => b.toString(16).padStart(2, "0")).join(" ")}</code>)}</div>
      <p className="text-sm">v1 (decode per chunk): <span className={r.corrupted ? "text-rose-300" : "text-emerald-300"}>{r.naive}</span></p><p className="text-sm">v2 (length-prefixed, accumulate bytes): <span className="text-emerald-300">{r.correct}</span></p></div></div>);
}

function Layers() {
  const rows = [["Application", "Ticket wizard, RAG assistant, REST/WebSocket, Q-RTO app-level ACK timer", "RFC 9110, RFC 6455, RFC 6298"], ["Presentation", "JSON envelopes, canonicalisation (JCS), UTF-8 framing, HMAC signatures", "RFC 8785, RFC 2104"], ["Session", "JWT sessions, WebSocket rooms, TCP connection reuse", "RFC 7519"], ["Transport", "TCP + length-prefixed frames; UDP + scheduled copies, anti-replay window, hedging", "RFC 9293, RFC 768, RFC 4303 (concept)"], ["Network", "Topology graph, subnets, DNS/DHCP dependencies, fault impact matrix", "RFC 1035, RFC 2131"], ["Data link / Physical", "Wi-Fi AP radio retries, burst loss (Gilbert–Elliott), netem emulation lab", "IEEE 802.11"]];
  return (<div className={`${card} overflow-x-auto`}><p className="text-sm text-slate-400 mb-3">Where each CampusConnect feature sits in the layered model.</p><table className="w-full text-sm"><tbody>{rows.map(([l, f, rfc]) => <tr key={l} className="border-t border-slate-800 align-top"><td className="py-2 pr-3 font-semibold text-violet-300 whitespace-nowrap">{l}</td><td className="py-2 pr-3">{f}</td><td className="py-2 text-slate-500 text-xs">{rfc}</td></tr>)}</tbody></table></div>);
}

export default function LabPage() {
  const [tab, setTab] = useState<Tab>("Burst Loss Lab");
  return (<div className="max-w-4xl mx-auto px-4 py-8 text-slate-200"><h1 className="text-2xl font-bold text-white">CNT Visual Lab</h1>
    <p className="text-sm text-slate-400 mt-1 mb-4">Interactive, deterministic demonstrations of the networking ideas behind CampusConnect. Simulated in your browser — a teaching tool, not a measurement of any real network.</p>
    <div role="tablist" className="flex gap-2 flex-wrap mb-5">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === t ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{t}</button>)}</div>
    {tab === "Burst Loss Lab" && <BurstLab />}{tab === "Redundancy Explorer" && <Redundancy />}{tab === "RTO Race" && <RtoRace />}{tab === "Replay Window" && <Replay />}{tab === "Framing Lab" && <Framing />}{tab === "Layer Lens" && <Layers />}</div>);
}
