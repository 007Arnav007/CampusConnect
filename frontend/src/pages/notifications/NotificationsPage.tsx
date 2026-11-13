import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { getNotifications, markNotificationRead, type Notification } from "../../api";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getNotifications()
      .then((notifications) => { if (active) setItems(notifications); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Notifications could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function markRead(id: string) {
    setUpdating(id); setError("");
    try {
      await markNotificationRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notification could not be updated.");
    } finally { setUpdating(null); }
  }
  const unread = items.filter((item) => !item.read).length;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header><p className="text-xs uppercase tracking-wider text-slate-500">Your updates</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">Notifications <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-200">{unread} unread</span></h1></header>
      {error && <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState icon={<Bell className="h-10 w-10" />} title="You're all caught up" description="New ticket updates will appear here." /> : (
        <div className="space-y-3">{items.map((item) => (
          <article key={item.id} className={`rounded-xl border p-4 ${item.read ? "border-slate-800 bg-slate-900/50" : "border-indigo-500/30 bg-indigo-950/20"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-sm font-semibold text-white">{item.title}</h2><p className="mt-1 text-sm text-slate-300">{item.body}</p><time className="mt-2 block text-xs text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div>
              {!item.read && <button disabled={updating === item.id} onClick={() => void markRead(item.id)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-300 disabled:opacity-50"><CheckCheck className="h-4 w-4" />{updating === item.id ? "Saving…" : "Mark read"}</button>}
            </div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
