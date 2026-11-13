import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, AlertTriangle, MapPin, Network, Radio, RefreshCw, Shield, Ticket as TicketIcon, Users, Zap } from "lucide-react";
import {
  getAllTickets, getAllUsers, getDeliveryEvents, getHealthStatus, getIncidents, getLatestNetworkTelemetry, getNetworkMetrics, getNetworkNodes,
  approveAcademicDocument, createAcademicCourse, getDiscussionsForModeration, getNetworkLabEvents, getPendingAcademicDocuments, injectNetworkFault, moderateAcademicDiscussion, publishAcademicNotice, sendEmergencyAlert, updateTicket,
  type DeliveryEvent, type EmergencyAlert, type HealthStatus, type Incident, type NetworkLabEvent, type NetworkMetrics, type NetworkNode, type NetworkTelemetry, type Ticket, type User,
} from "../../api";
import { connectRealtime } from "../../realtime";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import MetricCard from "../../components/MetricCard";
import StatusBadge from "../../components/StatusBadge";

const ticketStatuses = ["ALL", "OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED"];

export function AdminOverviewPage() {
  const { user } = useAuth();
  const token = user?.token;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const [allTickets, network, backend] = await Promise.all([
        getAllTickets(), getNetworkMetrics().catch(() => null), getHealthStatus().catch(() => null),
      ]);
      setTickets(allTickets); setMetrics(network); setHealth(backend); setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin overview could not be loaded.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    if (!token) return;
    const socket = connectRealtime(token);
    socket.emit("network:subscribe");
    const onNetworkEvent = () => {
      void getNetworkMetrics().then(setMetrics).catch(() => setMetrics(null));
    };
    const onTicketEvent = () => { void refresh(); };
    socket.on("network:event", onNetworkEvent);
    socket.on("ticket:event", onTicketEvent);
    return () => {
      socket.off("network:event", onNetworkEvent);
      socket.off("ticket:event", onTicketEvent);
    };
  }, [refresh, token]);
  const open = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const active = tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length;
  const resolved = tickets.filter((ticket) => ticket.status === "RESOLVED").length;
  const backendUp = health?.status?.toUpperCase() === "UP" || health?.status?.toLowerCase() === "ok";
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-violet-300">Operations</p><h1 className="mt-1 text-2xl font-bold text-white">Admin overview</h1><p className="mt-1 text-sm text-slate-400">Current service and ticket snapshot.</p></div><button onClick={() => { setLoading(true); void refresh(); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><RefreshCw className="h-4 w-4" /> Refresh</button></header>
      {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <LoadingSpinner /> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total tickets" value={tickets.length} icon={<TicketIcon className="h-6 w-6" />} />
          <MetricCard label="Open" value={open} color="indigo" />
          <MetricCard label="In progress" value={active} color="amber" />
          <MetricCard label="Resolved" value={resolved} color="emerald" />
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-4 font-semibold text-white">Service status</h2>
            <div className="flex items-center justify-between border-b border-slate-800 py-3"><span className="text-sm text-slate-400">Application backend</span><span className={backendUp ? "text-sm text-emerald-300" : "text-sm text-amber-300"}>{health ? (backendUp ? "Available" : health.status) : "Status unavailable"}</span></div>
            <div className="flex items-center justify-between py-3"><span className="text-sm text-slate-400">WebSocket clients</span><span className="font-mono text-sm text-white">{metrics?.websocket.activeConnections ?? "Unavailable"}</span></div>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-4 font-semibold text-white">Transport counters</h2>
            <dl className="space-y-3">
              {[["TCP acknowledgments", metrics?.transports.tcp.acknowledged], ["TCP failures", metrics?.transports.tcp.failed], ["UDP socket sends", metrics?.transports.udp.sent], ["UDP send failures", metrics?.transports.udp.failed]].map(([label, value]) => <div key={label} className="flex justify-between text-sm"><dt className="text-slate-400">{label}</dt><dd className="font-mono text-slate-200">{value ?? "Unavailable"}</dd></div>)}
            </dl>
            <p className="mt-4 text-xs text-amber-200/80">A UDP send counter is not proof that a receiver acknowledged an alert.</p>
          </article>
        </section>
      </>}
    </div>
  );
}

export function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getAllTickets().then((result) => { if (active) setTickets(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Tickets could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function changeStatus(ticket: Ticket, status: string) {
    setUpdating(ticket.id); setError("");
    try {
      const updated = await updateTicket(ticket.id, status);
      setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, ...updated } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status update failed.");
    } finally { setUpdating(null); }
  }
  const shown = filter === "ALL" ? tickets : tickets.filter((ticket) => ticket.status === filter);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header><p className="text-xs uppercase tracking-wider text-violet-300">Operations</p><h1 className="mt-1 text-2xl font-bold text-white">Ticket queue</h1></header>
      <div className="flex flex-wrap gap-2" aria-label="Filter tickets">{ticketStatuses.map((status) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-medium ${filter === status ? "bg-violet-600 text-white" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>{status.replace("_", " ")}</button>)}</div>
      {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <LoadingSpinner /> : shown.length === 0 ? <EmptyState title="No tickets in this view" description="Try another status filter." /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400"><tr>{["Ticket", "Request", "Category", "Priority", "Status", "Change status"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800">
              {shown.map((ticket) => <tr key={ticket.id}>
                <td className="px-4 py-4 font-mono text-xs text-slate-400">{ticket.ticketNumber}</td>
                <td className="max-w-sm px-4 py-4"><p className="truncate font-medium text-white">{ticket.title}</p><p className="mt-1 truncate text-xs text-slate-500">{ticket.location || ticket.description}</p></td>
                <td className="px-4 py-4 text-slate-300">{ticket.category.replaceAll("_", " ")}</td>
                <td className="px-4 py-4"><StatusBadge status={ticket.priority} /></td>
                <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-4"><label><span className="sr-only">Set status for {ticket.ticketNumber}</span><select disabled={updating === ticket.id} value={ticket.status} onChange={(event) => void changeStatus(ticket, event.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="ESCALATED">Escalated</option></select></label></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getAllUsers().then((result) => { if (active) setUsers(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Users could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header><p className="text-xs uppercase tracking-wider text-violet-300">Access</p><h1 className="mt-1 text-2xl font-bold text-white">Users</h1></header>
      {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <LoadingSpinner /> : users.length === 0 ? <EmptyState icon={<Users className="h-10 w-10" />} title="No users found" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400"><tr>{["Name", "Email", "Role", "Joined"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800">{users.map((user) => <tr key={user.id}>
              <td className="px-4 py-4 font-medium text-white">{user.name}</td><td className="px-4 py-4 text-slate-300">{user.email}</td><td className="px-4 py-4"><StatusBadge status={user.roles.split(",")[0] || "STUDENT"} /></td><td className="px-4 py-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminNetworkPage() {
  const { user } = useAuth();
  const token = user?.token;
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [telemetry, setTelemetry] = useState<NetworkTelemetry[]>([]);
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState("");

  const handleInjectFault = async (faultType: string, node: string, zone: string) => {
    setInjecting(true);
    setInjectResult("");
    try {
      await injectNetworkFault({ faultType, node, zone, durationSec: 60 });
      setInjectResult(`Injected ${faultType} on ${node} (${zone}). Real-time broadcast emitted.`);
      void refresh({ silent: true });
    } catch (err) {
      setInjectResult(err instanceof Error ? err.message : "Fault injection failed");
    } finally {
      setInjecting(false);
    }
  };

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    try {
      const [network, topology, latest, deliveries] = await Promise.all([getNetworkMetrics(), getNetworkNodes(), getLatestNetworkTelemetry(), getDeliveryEvents()]);
      setMetrics(network); setNodes(topology); setTelemetry(latest); setDeliveryEvents(deliveries); setError(""); setUpdatedAt(new Date());
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Network metrics unavailable."); setMetrics(null); }
    finally { if (!options.silent) setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    if (!token) return;
    const socket = connectRealtime(token);
    socket.emit("network:subscribe");
    const onNetworkEvent = () => {
      void refresh({ silent: true });
    };
    socket.on("network:event", onNetworkEvent);
    return () => {
      socket.off("network:event", onNetworkEvent);
    };
  }, [refresh, token]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-violet-300">Operations</p><h1 className="mt-1 text-2xl font-bold text-white">Network monitor</h1>{updatedAt && <p className="mt-1 text-xs text-slate-500">Real-time WebSocket active · Last refreshed {updatedAt.toLocaleTimeString()}</p>}</div><button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></header>
      {error && <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
        <p className="font-semibold">Network telemetry is unavailable</p>
        <p className="mt-1 text-amber-100/80">{error}. Check that the gateway is running and that this admin session is still valid, then try again.</p>
      </div>}

      <section className="rounded-xl border border-violet-800/40 bg-slate-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Fault & Surge Injection (WebSocket Triggered)
            </h2>
            <p className="text-xs text-slate-400">
              Injects operational events into the live gateway event bus via Socket.io. Triggers instantaneous real-time UI updates across all connected dashboards.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleInjectFault("CONGESTION_SURGE", "AP-LIB1E1", "LIB-1-E")}
            disabled={injecting}
            className="rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            ⚡ Inject Demand Surge (LIB-1-E)
          </button>
          <button
            onClick={() => handleInjectFault("AP_DEGRADED", "AP-ENG1W2", "ENG-1-W")}
            disabled={injecting}
            className="rounded-lg bg-amber-600/80 hover:bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            ⚠️ Inject AP Degradation (AP-ENG1W2)
          </button>
          <button
            onClick={() => handleInjectFault("SWITCH_FLAPPING", "SW-ENG1", "ENG-1-W")}
            disabled={injecting}
            className="rounded-lg bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            🔴 Inject Switch Flap (SW-ENG1)
          </button>
        </div>
        {injectResult && (
          <p className="text-xs text-emerald-300 font-mono bg-slate-950/60 p-2 rounded border border-slate-800">
            {injectResult}
          </p>
        )}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="WebSocket clients" value={metrics?.websocket.activeConnections ?? "Unavailable"} icon={<Activity className="h-6 w-6" />} color="cyan" />
        <MetricCard label="TCP acknowledgments" value={metrics?.transports.tcp.acknowledged ?? "Unavailable"} icon={<Network className="h-6 w-6" />} color="indigo" />
        <MetricCard label="TCP sent" value={metrics?.transports.tcp.sent ?? "Unavailable"} color="default" />
        <MetricCard label="TCP failures" value={metrics?.transports.tcp.failed ?? "Unavailable"} color="rose" />
        <MetricCard label="UDP socket sends" value={metrics?.transports.udp.sent ?? "Unavailable"} icon={<Zap className="h-6 w-6" />} color="emerald" />
        <MetricCard label="UDP send failures" value={metrics?.transports.udp.failed ?? "Unavailable"} color="rose" />
      </section>
      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold text-white">Recent delivery records</h2><p className="text-xs text-slate-400">Persisted receiver acknowledgments and failures, newest first.</p></div>
        {deliveryEvents.length === 0 ? <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">No delivery records yet.</p> : <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-900 text-slate-400"><tr>{["Event", "Transport", "Status", "Attempt", "Latency", "Receiver", "Time"].map((name) => <th key={name} className="px-3 py-2">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{deliveryEvents.slice(0, 30).map((event, index) => <tr key={`${event.messageId}-${event.transport}-${event.attempt}-${index}`}><td className="px-3 py-2 font-mono text-slate-300">{event.eventType}</td><td className="px-3 py-2 text-slate-300">{event.transport}</td><td className="px-3 py-2 text-slate-300">{event.status}</td><td className="px-3 py-2 text-slate-300">{event.attempt}</td><td className="px-3 py-2 text-slate-300">{event.latencyMs == null ? "—" : `${event.latencyMs.toFixed(0)} ms`}</td><td className="px-3 py-2 text-slate-300">{event.receiverId ?? "—"}</td><td className="px-3 py-2 text-slate-400">{new Date(event.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
      <div className={`rounded-xl border p-4 text-sm ${metrics?.transports.tcp.connected ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>TCP receiver: {metrics ? (metrics.transports.tcp.connected ? "connected" : "disconnected") : "status unavailable"}</div>
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold text-white">Campus topology</h2><p className="text-xs text-slate-400">Seed topology for controlled local experiments. It is not live campus network inventory.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => {
            const sample = telemetry.find((entry) => entry.nodeId === node.nodeId);
            const state = sample?.status ?? node.status;
            const stateColor = state === "CRITICAL" ? "border-rose-500/40 bg-rose-950/20" : state === "DEGRADED" ? "border-amber-500/40 bg-amber-950/20" : "border-slate-800 bg-slate-900/70";
            return <article key={node.id} className={`rounded-xl border p-4 ${stateColor}`}>
              <div className="flex justify-between gap-3"><div><h3 className="font-semibold text-white">{node.nodeId}</h3><p className="text-xs text-slate-400">{node.type} · {node.building ?? "Campus"}</p></div><StatusBadge status={state} /></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-400">RTT</dt><dd className="text-slate-200">{sample?.rttMs?.toFixed(0) ?? "—"} ms</dd>
                <dt className="text-slate-400">Packet loss</dt><dd className="text-slate-200">{sample?.packetLoss == null ? "—" : `${(sample.packetLoss * 100).toFixed(1)}%`}</dd>
                <dt className="text-slate-400">Jitter</dt><dd className="text-slate-200">{sample?.jitterMs?.toFixed(0) ?? "—"} ms</dd>
                <dt className="text-slate-400">Source</dt><dd className="text-slate-200">{sample?.source ?? "No sample"}</dd>
              </dl>
            </article>;
          })}
        </div>
      </section>
      <p className="text-xs text-amber-200/80">UDP counters confirm local socket sends only. They do not confirm emergency receipt or acknowledgment.</p>
    </div>
  );
}

export function AdminIncidentsPage() {
  const { user } = useAuth();
  const token = user?.token;
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => getIncidents().then((result) => { if (active) setIncidents(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Incidents could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    void refresh();
    if (!token) return;
    const socket = connectRealtime(token);
    socket.emit("network:subscribe");
    const onEvent = () => { void refresh(); };
    socket.on("network:event", onEvent);
    socket.on("ticket:event", onEvent);
    return () => {
      active = false;
      socket.off("network:event", onEvent);
      socket.off("ticket:event", onEvent);
    };
  }, [token]);
  const activeCount = incidents.filter((incident) => incident.status !== "RESOLVED").length;
  const affectedUsers = incidents.filter((incident) => incident.status !== "RESOLVED")
    .reduce((total, incident) => total + incident.estimatedAffectedUsers, 0);
  const anomalous = incidents.filter((incident) => incident.rootCauseConfidence > 0.45).length;
  return <div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-xs uppercase tracking-wider text-violet-300">Operations</p><h1 className="mt-1 text-2xl font-bold text-white">Incident operations</h1><p className="mt-1 text-sm text-slate-400">Correlated support reports with heuristic/ML-service evidence. Scores are operational estimates, not verified diagnoses.</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    <section className="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Active incidents" value={activeCount} icon={<Activity className="h-6 w-6" />} />
      <MetricCard label="Estimated affected users" value={affectedUsers} color="amber" />
      <MetricCard label="Root-cause candidates" value={anomalous} color="cyan" />
    </section>
    {loading ? <LoadingSpinner /> : incidents.length === 0 ? <EmptyState title="No incident candidates" description="Submit IT/network tickets and ingest telemetry to begin correlating incidents." /> : <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-800 text-xs uppercase text-slate-400"><tr>{["Incident", "State", "Severity", "Location/root cause", "Reports", "Impact", "Root confidence", "Propagation"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-800">{incidents.map((incident) => <tr key={incident.id}>
          <td className="px-4 py-4"><p className="font-mono text-xs text-white">{incident.incidentNumber}</p><p className="mt-1 text-xs text-slate-500">{new Date(incident.detectedAt).toLocaleString()}</p></td>
          <td className="px-4 py-4"><StatusBadge status={incident.status} /></td>
          <td className="px-4 py-4"><StatusBadge status={incident.severity} /></td>
          <td className="px-4 py-4 text-slate-200">{incident.rootCauseNode ?? "Unknown candidate"}</td>
          <td className="px-4 py-4 text-slate-200">{incident.linkedTicketCount}</td>
          <td className="px-4 py-4 text-slate-200">{(incident.impactScore * 100).toFixed(0)}% · {incident.estimatedAffectedUsers} users</td>
          <td className="px-4 py-4 text-slate-200">{(incident.rootCauseConfidence * 100).toFixed(0)}%</td>
          <td className="px-4 py-4 text-slate-200">{(incident.propagationProbability * 100).toFixed(0)}%</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {incidents.some((item) => item.explanation) && <section className="space-y-3">
      <h2 className="font-semibold text-white">Prediction evidence</h2>
      {incidents.slice(0, 5).map((incident) => <article key={incident.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-100">{incident.incidentNumber} · {incident.rootCauseNode ?? "Root cause unknown"}</h3>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{incident.explanation}</p>
      </article>)}
    </section>}
  </div>;
}

export function AdminEmergencyPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [form, setForm] = useState({ type: "GENERAL", severity: "MEDIUM", location: "", message: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true); setError(""); setNotice("");
    try {
      const dispatch = await sendEmergencyAlert({ ...form, location: form.location.trim(), message: form.message.trim() });
      const acknowledged = dispatch.attempts.filter((attempt) => attempt.ackAt !== undefined).length;
      setAlerts((current) => [{
        id: crypto.randomUUID(),
        type: form.type,
        severity: form.severity,
        location: form.location.trim(),
        message: form.message.trim(),
        createdAt: new Date().toISOString(),
      }, ...current]);
      setNotice(`Receiver acknowledged the test datagram after ${acknowledged} of ${dispatch.attempts.length} attempt(s)` +
        (dispatch.latencyMs !== undefined ? ` in ${dispatch.latencyMs} ms` : "") +
        `. Policy decision: ${dispatch.decision?.action ?? "unknown"} (${dispatch.decision?.source ?? "unknown"}).` +
        " This confirms the local receiver only, not human response. The session list is not persistent.");
      setForm({ type: "GENERAL", severity: "MEDIUM", location: "", message: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dispatch request failed.");
    } finally { setSending(false); }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header><p className="text-xs uppercase tracking-wider text-rose-300">Operations</p><h1 className="mt-1 text-2xl font-bold text-white">Emergency protocol test</h1></header>
      <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">This feature sends signed test datagrams only when explicit local test mode is enabled. Never use it for real dispatch. A delivery is confirmed only after the receiver validates the envelope, persists the receipt, and returns a matching acknowledgment.</div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Alert type<select value={form.type} onChange={(event) => update("type", event.target.value)}><option value="GENERAL">General</option><option value="FIRE">Fire</option><option value="MEDICAL">Medical</option><option value="SECURITY">Security</option><option value="WEATHER">Weather</option></select></label>
          <label>Severity<select value={form.severity} onChange={(event) => update("severity", event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
        </div>
        <label>Location<input required maxLength={180} value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Building or campus area" /></label>
        <label>Message<textarea required minLength={5} maxLength={1000} rows={4} value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="Provide clear, actionable information" /></label>
        {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-100">{notice}</p>}
      <button disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-5 py-3 font-semibold text-white hover:bg-rose-600 disabled:opacity-50"><AlertTriangle className="h-4 w-4" />{sending ? "Sending test…" : "Send controlled test"}</button>
      </form>
      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Recent requests in this session</h2>
        <p className="mb-3 text-xs text-slate-400">Requests shown here are not persisted and disappear when the page is reloaded.</p>
        {alerts.length === 0 ? <EmptyState icon={<Shield className="h-10 w-10" />} title="No dispatches in this session" /> : (
          <div className="space-y-3">{alerts.map((alert) => <article key={alert.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><StatusBadge status={alert.severity} /><span className="text-xs uppercase text-slate-400">{alert.type}</span></div><time className="text-xs text-slate-500" dateTime={alert.createdAt}>{new Date(alert.createdAt).toLocaleString()}</time></div>
            <p className="mt-3 text-sm text-slate-200">{alert.message}</p>
            {alert.location && <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{alert.location}</p>}
          </article>)}</div>
        )}
      </section>
    </div>
  );
}

export function AdminNetworkLabPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<NetworkLabEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getNetworkLabEvents(100).then((result) => { if (active) setEvents(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Network events are unavailable."); });
    if (!user?.token) return () => { active = false; };
    const socket = connectRealtime(user.token);
    const subscribe = () => socket.emit("network:subscribe");
    const onEvent = (event: NetworkLabEvent) => setEvents((current) => [event, ...current].slice(0, 100));
    socket.on("connect", subscribe);
    socket.on("network:event", onEvent);
    if (socket.connected) subscribe();
    return () => {
      active = false;
      socket.off("connect", subscribe);
      socket.off("network:event", onEvent);
    };
  }, [user?.token]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-cyan-300">Campus Intelligence</p>
        <h1 className="mt-1 text-2xl font-bold text-white">CNT Network Lab</h1>
        <p className="mt-1 text-sm text-slate-400">Application-level request traces from the CampusConnect gateway.</p>
      </header>
      <div role="note" className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-sm text-cyan-100">
        This is a live application event stream, not packet capture. It shows gateway request completion, correlation IDs, service destination, duration, and status.
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-100">
        <p className="font-semibold">The event stream could not be loaded</p>
        <p className="mt-1 text-rose-100/80">{error}</p>
        {error.toLowerCase().includes("token") && <p className="mt-2 text-rose-100/80">Your admin session may have expired. <a className="font-semibold underline underline-offset-2 hover:text-white" href="/admin/login">Sign in again</a> to reconnect.</p>}
      </div>}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Live trace timeline</h2><p className="mt-1 text-xs text-slate-500">{events.length} buffered events</p></div>
        {events.length === 0 ? <div className="p-8"><EmptyState icon={<Radio className="h-10 w-10" />} title="Waiting for application events" /></div> : (
          <div className="divide-y divide-slate-800/80">
            {events.map((event) => <article key={event.eventId} className="grid gap-2 px-5 py-4 md:grid-cols-[150px_100px_1fr_110px] md:items-center">
              <time className="text-xs text-slate-500" dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>
              <span className={event.status === "SUCCESS" ? "text-xs font-medium text-emerald-300" : "text-xs font-medium text-rose-300"}>{event.status}</span>
              <div><p className="text-sm text-slate-200">{event.eventType} <span className="text-slate-500">via {event.protocol}</span></p><p className="mt-1 font-mono text-xs text-slate-500">{event.traceId} · {event.source} → {event.destination}</p></div>
              <span className="font-mono text-xs text-slate-400">{event.durationMs ?? 0} ms</span>
            </article>)}
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminAcademicsPage() {
  const [faculty, setFaculty] = useState<User[]>([]);
  const [notice, setNotice] = useState({ title: "", body: "" });
  const [course, setCourse] = useState({ code: "", title: "", facultyId: "", term: "", room: "", schedule: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<Array<{ id: string; title: string; content: string; sourceUrl?: string; code?: string }>>([]);
  const [discussions, setDiscussions] = useState<Array<{ id: string; code: string; authorName: string; body: string; hidden: boolean }>>([]);
  const refresh = () => Promise.all([getPendingAcademicDocuments(), getDiscussionsForModeration()]).then(([pending, posts]) => { setDocuments(pending); setDiscussions(posts); });
  useEffect(() => { void getAllUsers().then((users) => setFaculty(users.filter((user) => user.roles.includes("STAFF") || user.roles.includes("ADMIN")))).catch(() => setError("Faculty list is unavailable.")); void refresh().catch(() => setError("Academic review queue is unavailable.")); }, []);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="text-xs uppercase tracking-wider text-indigo-300">Academic administration</p><h1 className="mt-1 text-2xl font-bold text-white">Academic authoring</h1><p className="mt-1 text-sm text-slate-400">Create sections and publish campus-wide notices. Course content remains scoped to its faculty owner.</p></header>
      {message && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5" onSubmit={(event) => { event.preventDefault(); void createAcademicCourse({ ...course, facultyId: course.facultyId }).then(() => { setMessage("Course section created."); setError(""); setCourse({ code: "", title: "", facultyId: "", term: "", room: "", schedule: "" }); }).catch((cause) => { setMessage(""); setError(cause instanceof Error ? cause.message : "Course creation failed."); }); }}>
          <h2 className="font-semibold text-white">Create course section</h2>
          <input required placeholder="Course code" value={course.code} onChange={(event) => setCourse({ ...course, code: event.target.value })} />
          <input required placeholder="Course title" value={course.title} onChange={(event) => setCourse({ ...course, title: event.target.value })} />
          <select required value={course.facultyId} onChange={(event) => setCourse({ ...course, facultyId: event.target.value })}><option value="">Select faculty owner</option>{faculty.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select>
          <input required placeholder="Term, for example 2026-Fall" value={course.term} onChange={(event) => setCourse({ ...course, term: event.target.value })} />
          <div className="grid grid-cols-2 gap-3"><input placeholder="Room" value={course.room} onChange={(event) => setCourse({ ...course, room: event.target.value })} /><input placeholder="Schedule" value={course.schedule} onChange={(event) => setCourse({ ...course, schedule: event.target.value })} /></div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create section</button>
        </form>
        <form className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5" onSubmit={(event) => { event.preventDefault(); void publishAcademicNotice(notice).then(() => { setMessage("Notice published."); setError(""); setNotice({ title: "", body: "" }); }).catch((cause) => { setMessage(""); setError(cause instanceof Error ? cause.message : "Notice publication failed."); }); }}>
          <h2 className="font-semibold text-white">Publish campus notice</h2>
          <input required placeholder="Notice title" value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} />
          <textarea required rows={6} placeholder="Notice body" value={notice.body} onChange={(event) => setNotice({ ...notice, body: event.target.value })} />
          <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Publish notice</button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="mb-3 font-semibold text-white">Academic knowledge approval</h2>{documents.length === 0 ? <p className="text-sm text-slate-500">No documents awaiting approval.</p> : <div className="space-y-3">{documents.map((document) => <article key={document.id} className="rounded-lg bg-slate-800/60 p-3"><p className="text-sm font-medium text-white">{document.title} <span className="text-xs text-slate-500">{document.code}</span></p><p className="mt-2 line-clamp-3 text-xs text-slate-400">{document.content}</p><button onClick={() => void approveAcademicDocument(document.id).then(refresh).catch(() => setError("Document approval failed."))} className="mt-2 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Approve for assistant retrieval</button></article>)}</div>}</section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="mb-3 font-semibold text-white">Discussion moderation</h2>{discussions.length === 0 ? <p className="text-sm text-slate-500">No discussion posts.</p> : <div className="space-y-3">{discussions.map((post) => <article key={post.id} className="rounded-lg bg-slate-800/60 p-3"><p className="text-xs text-slate-500">{post.code} · {post.authorName}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{post.body}</p><button onClick={() => void moderateAcademicDiscussion(post.id, !post.hidden).then(refresh).catch(() => setError("Moderation update failed."))} className="mt-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300">{post.hidden ? "Restore post" : "Hide post"}</button></article>)}</div>}</section>
      </div>
    </div>
  );
}
