type Props = {
  status: string;
};

const statusMap: Record<string, string> = {
  OPEN: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  IN_PROGRESS: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  CLOSED: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  ESCALATED: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  LOW: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  MEDIUM: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  HIGH: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  CRITICAL: "bg-red-600/20 text-red-300 border border-red-500/30",
  ADMIN: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  STAFF: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  STUDENT: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

export default function StatusBadge({ status }: Props) {
  const cls = statusMap[status] ?? "bg-slate-500/20 text-slate-300 border border-slate-500/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
