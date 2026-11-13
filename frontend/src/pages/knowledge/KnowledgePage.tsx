import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getKnowledgeArticles, type KnowledgeArticle } from "../../api";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    let active = true;
    getKnowledgeArticles().then((result) => { if (active) setArticles(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Knowledge articles could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const selectedId = params.get("article");
  const selected = articles.find((article) => article.id === selectedId);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return articles;
    return articles.filter((article) => `${article.title}\n${article.content}`.toLowerCase().includes(query));
  }, [articles, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Self-service</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Knowledge base</h1>
        <p className="mt-2 text-sm text-slate-400">Browse approved support guidance. Articles are loaded from the knowledge service used by the assistant.</p>
      </header>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search knowledge articles</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search articles…" className="pl-10" />
      </label>
      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
      {loading ? <LoadingSpinner /> : visible.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-10 w-10" />} title={articles.length ? "No matching articles" : "No approved articles yet"} description={articles.length ? "Try a different search." : "The campus knowledge team has not published guidance here yet."} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section aria-label="Knowledge articles" className="space-y-3">
            {visible.map((article) => <button key={article.id} type="button" onClick={() => setParams({ article: article.id })} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === article.id ? "border-indigo-400/50 bg-indigo-950/30" : "border-slate-800 bg-slate-900/70 hover:border-slate-700"}`}>
              <h2 className="font-semibold capitalize text-white">{article.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{article.excerpt}</p>
            </button>)}
          </section>
          <article className="min-h-64 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
            {selected ? <>
              <p className="text-xs uppercase tracking-wider text-indigo-300">Approved campus guidance</p>
              <h2 className="mt-2 text-xl font-semibold capitalize text-white">{selected.title}</h2>
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">{selected.content}</div>
            </> : <EmptyState icon={<BookOpen className="h-10 w-10" />} title="Choose an article" description="Select a result to read the approved guidance." />}
          </article>
        </div>
      )}
    </div>
  );
}
