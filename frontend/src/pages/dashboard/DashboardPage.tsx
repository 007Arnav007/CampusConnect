import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Clock3, Plus, Ticket as TicketIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { getTickets, type Ticket } from "../../api";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import MetricCard from "../../components/MetricCard";
import TicketCard from "../../components/TicketCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTickets()
      .then((items) => { if (active) setTickets(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load tickets."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const open = tickets.filter((ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS").length;
  const resolved = tickets.filter((ticket) => ticket.status === "RESOLVED").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/70 to-cyan-950/40 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Your campus support</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Welcome, {user?.name.split(" ")[0] ?? "there"}.</h1>
        <p className="mt-2 text-sm text-slate-300">Track requests and find the next step for campus issues.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/tickets/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> New ticket</Link>
          <Link to="/assistant" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"><Bot className="h-4 w-4" /> Ask assistant</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Ticket summary">
        <MetricCard label="Open and in progress" value={open} icon={<Clock3 className="h-6 w-6" />} color="indigo" />
        <MetricCard label="Resolved" value={resolved} icon={<CheckCircle2 className="h-6 w-6" />} color="emerald" />
        <MetricCard label="All requests" value={tickets.length} icon={<TicketIcon className="h-6 w-6" />} color="cyan" />
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Overview</p><h2 className="mt-1 text-lg font-semibold text-white">Recent tickets</h2></div>
          <Link to="/tickets" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">View all</Link>
        </div>
        {loading ? <LoadingSpinner /> : error ? (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>
        ) : tickets.length === 0 ? (
          <EmptyState icon={<TicketIcon className="h-10 w-10" />} title="No tickets yet" description="Create a support request to get started." action={<Link to="/tickets/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Create a ticket</Link>} />
        ) : (
          <div className="space-y-3">{tickets.slice(0, 5).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} href={`/tickets/${ticket.id}`} />)}</div>
        )}
      </section>
    </div>
  );
}
