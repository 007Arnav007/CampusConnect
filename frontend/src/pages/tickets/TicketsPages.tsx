import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { Clock3, Plus, Search, Send, Tag } from "lucide-react";
import {
  createTicket, getTicketIncident, getTicketMessages, getTickets, sendTicketMessage,
  type Ticket, type TicketIncident, type TicketMessage,
} from "../../api";
import { useAuth } from "../../context/AuthContext";
import { connectRealtime } from "../../realtime";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import TicketCard from "../../components/TicketCard";

const statuses = ["ALL", "OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED"];

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    getTickets().then((items) => { if (active) setTickets(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load tickets."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const query = search.trim().toLowerCase();
  const filtered = tickets.filter((ticket) =>
    (filter === "ALL" || ticket.status === filter) &&
    (!query || ticket.title.toLowerCase().includes(query) || ticket.ticketNumber.toLowerCase().includes(query)),
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs uppercase tracking-wider text-slate-500">Support</p><h1 className="mt-1 text-2xl font-bold text-white">My tickets</h1></div>
        <Link to="/tickets/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> New ticket</Link>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search tickets</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or ticket number" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white" />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Filter tickets">
          {statuses.map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-medium ${filter === status ? "bg-indigo-600 text-white" : "border border-slate-700 bg-slate-900 text-slate-300"}`}>{status.replace("_", " ")}</button>)}
        </div>
      </div>
      {loading ? <LoadingSpinner /> : error ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-4 text-rose-200">{error}</div> : filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-10 w-10" />} title="No matching tickets" description="Try another search or filter." />
      ) : <div className="space-y-3">{filtered.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} href={`/tickets/${ticket.id}`} />)}</div>}
    </div>
  );
}

export function NewTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category") ?? "IT_NETWORK";
  const allowedCategories = ["IT_NETWORK", "ACADEMIC", "HOSTEL", "FINANCE", "FACILITIES", "OTHER"];
  const [form, setForm] = useState({ title: "", description: "", category: allowedCategories.includes(requestedCategory) ? requestedCategory : "IT_NETWORK", priority: "MEDIUM", location: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const ticket = await createTicket({ ...form, title: form.title.trim(), description: form.description.trim(), location: form.location.trim() });
      navigate(`/tickets/${ticket.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ticket could not be created.");
    } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header><p className="text-xs uppercase tracking-wider text-slate-500">Support</p><h1 className="mt-1 text-2xl font-bold text-white">Create a ticket</h1><p className="mt-2 text-sm text-slate-400">Include enough detail for the right team to help.</p></header>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
        <label>Title<input maxLength={160} required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Short summary of the issue" /></label>
        <label>Description<textarea required minLength={8} maxLength={5000} rows={5} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What happened, and what have you tried?" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Category<select value={form.category} onChange={(event) => update("category", event.target.value)}><option value="IT_NETWORK">IT and network</option><option value="ACADEMIC">Academic</option><option value="HOSTEL">Hostel</option><option value="FINANCE">Finance</option><option value="FACILITIES">Facilities</option><option value="OTHER">Other</option></select></label>
          <label>Priority<select value={form.priority} onChange={(event) => update("priority", event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        </div>
        <label>Location (optional)<input maxLength={180} value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Building, room, or campus area" /></label>
        {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Submitting…" : "Submit ticket"}</button>
          <Link to="/tickets" className="rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-300">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [incident, setIncident] = useState<TicketIncident | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([getTickets(), getTicketMessages(id)])
      .then(async ([allTickets, thread]) => {
        if (active) {
          setTicket(allTickets.find((candidate) => candidate.id === id) ?? null);
          setMessages(thread);
          const relatedIncident = await getTicketIncident(id).catch(() => null);
          if (active) setIncident(relatedIncident);
        }
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Ticket could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id || !user?.token) return;
    const socket = connectRealtime(user.token);
    const subscribe = () => socket.emit("ticket:subscribe", id);
    const refresh = (event: { ticketId?: string }) => {
      if (event.ticketId !== id) return;
      void Promise.all([getTickets(), getTicketMessages(id)])
        .then(([allTickets, thread]) => {
          setTicket(allTickets.find((candidate) => candidate.id === id) ?? null);
          setMessages(thread);
        })
        .catch(() => undefined);
    };
    socket.on("connect", subscribe);
    socket.on("ticket:event", refresh);
    if (socket.connected) subscribe();
    return () => {
      socket.off("connect", subscribe);
      socket.off("ticket:event", refresh);
    };
  }, [id, user?.token]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!id || !message.trim()) return;
    setSending(true); setError("");
    try {
      const sent = await sendTicketMessage(id, message.trim());
      setMessages((current) => [...current, sent]);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally { setSending(false); }
  }
  if (loading) return <LoadingSpinner size="lg" />;
  if (error && !ticket) return <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-4 text-rose-200">{error}</div>;
  if (!ticket) return <EmptyState title="Ticket not found" description="It may have been removed or you may not have access." />;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</p><h1 className="mt-1 text-2xl font-bold text-white">{ticket.title}</h1></div><StatusBadge status={ticket.status} /></header>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400"><StatusBadge status={ticket.priority} /><span className="inline-flex items-center gap-1"><Tag className="h-4 w-4" />{ticket.category.replaceAll("_", " ")}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{new Date(ticket.createdAt).toLocaleString()}</span>{ticket.location && <span>{ticket.location}</span>}</div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{ticket.description}</p>
      </section>
      {incident?.linked && <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Related network incident</p>
        <h2 className="mt-2 font-semibold text-white">{incident.incidentNumber} · {incident.severity}</h2>
        <p className="mt-2 text-sm text-slate-300">This report is linked to {incident.linkedTicketCount} related ticket(s). Estimated impact: {(Number(incident.impactScore ?? 0) * 100).toFixed(0)}%, approximately {incident.estimatedAffectedUsers} users.</p>
        <p className="mt-1 text-sm text-slate-400">Probable root cause: {incident.rootCauseNode ?? "unknown"} ({(Number(incident.rootCauseConfidence ?? 0) * 100).toFixed(0)}% confidence). Propagation estimate: {(Number(incident.propagationProbability ?? 0) * 100).toFixed(0)}%.</p>
        <p className="mt-2 text-xs text-amber-200/80">Predictions are heuristic research estimates, not verified diagnoses.</p>
      </section>}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <h2 className="border-b border-slate-800 px-5 py-4 font-semibold text-white">Conversation</h2>
        <div className="max-h-96 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? <p className="text-center text-sm text-slate-500">No replies yet.</p> : messages.map((item) => (
            <article key={item.id} className={`max-w-[85%] rounded-xl p-3 ${item.senderId === user?.userId ? "ml-auto bg-indigo-700/70" : "bg-slate-800"}`}>
              <p className="mb-1 text-xs text-slate-300">{item.senderName ?? (item.senderId === user?.userId ? "You" : "Support")} · {new Date(item.createdAt).toLocaleString()}</p>
              <p className="whitespace-pre-wrap text-sm text-white">{item.body}</p>
            </article>
          ))}
        </div>
        {error && <p role="alert" className="px-5 text-sm text-rose-300">{error}</p>}
        <form onSubmit={send} className="flex gap-2 border-t border-slate-800 p-4">
          <label className="flex-1"><span className="sr-only">Reply</span><input maxLength={4000} required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a reply…" /></label>
          <button disabled={sending || !message.trim()} aria-label="Send reply" className="rounded-lg bg-indigo-600 px-4 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </section>
    </div>
  );
}
