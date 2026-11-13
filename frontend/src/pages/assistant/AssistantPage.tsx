import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, BookOpen, Bot, CheckCircle2, RotateCcw, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { chatWithGemini, getAssistantHealth, type AssistantMessage, type AssistantResponse } from "../../api";
import ChatBubble from "../../components/ChatBubble";

type ChatMessage = AssistantMessage & {
  id: string;
  sources?: string[];
  mode?: string;
  intent?: string;
};

const suggestions = [
  "How do I report a campus Wi-Fi issue?",
  "What details should I include in a support ticket?",
  "Can you help me find the right support team?",
];

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "model",
  content: "Hi, I’m the CampusConnect assistant. Ask a campus support question and I’ll use approved campus guidance where it’s available.",
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<{ configured: boolean; provider: string; knowledgeDocuments: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getAssistantHealth().then((status) => {
      if (active) setHealth({ configured: status.configured, provider: status.provider, knowledgeDocuments: status.knowledgeDocuments });
    }).catch(() => {
      if (active) setHealth(null);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const nextMessages: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setBusy(true);
    const history: AssistantMessage[] = nextMessages
      .filter((message) => message.id !== "welcome")
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));
    try {
      const answer: AssistantResponse = await chatWithGemini(history);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "model",
        content: answer.answer,
        sources: answer.sources,
        mode: answer.mode,
        intent: answer.intent,
      }]);
    } catch (cause) {
      setMessages(messages);
      setInput(text);
      setError(cause instanceof Error ? cause.message : "The assistant could not answer. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await ask(input);
  }

  function reset() {
    setMessages([initialMessage]);
    setInput("");
    setError("");
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === "model" && message.id !== "welcome");

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl shadow-black/20 xl:min-h-[38rem]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/70 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-950"><Bot className="h-5 w-5" /></span>
            <div>
              <h1 className="font-semibold text-white">Campus assistant</h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`h-2 w-2 rounded-full ${health?.configured ? "bg-emerald-400" : health ? "bg-amber-400" : "bg-slate-500"}`} />
                {health?.configured ? "Gemini connected" : health ? "Knowledge fallback ready" : "Checking assistant…"}
              </div>
            </div>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><RotateCcw className="h-4 w-4" /> New chat</button>
        </header>

        <div aria-label="Assistant conversation" aria-live="polite" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
          {messages.map((message) => (
            <div key={message.id}>
              <ChatBubble role={message.role === "user" ? "user" : "assistant"} content={message.content} sources={message.sources} />
              {message.role === "model" && message.id !== "welcome" && (
                <div className="ml-10 mt-1 flex flex-wrap items-center gap-2">
                  {message.mode === "gemini" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-2 py-1 text-[11px] text-emerald-200"><Sparkles className="h-3 w-3" /> Gemini</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-100"><BookOpen className="h-3 w-3" /> Knowledge fallback</span>
                  )}
                  {message.intent === "UNKNOWN" && <span className="text-[11px] text-slate-500">Could not verify from current sources</span>}
                </div>
              )}
            </div>
          ))}
          {busy && <ChatBubble role="assistant" content="" isTyping />}
          {error && <div role="alert" className="mx-auto max-w-2xl rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-100">{error} <button type="button" onClick={() => void ask(input)} className="ml-2 font-semibold underline">Retry</button></div>}
          <div ref={endRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-5 pb-3 sm:px-7">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Try asking</p>
            <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="max-w-full whitespace-normal rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:border-indigo-400/50 hover:text-white">{suggestion}</button>)}</div>
          </div>
        )}

        <form onSubmit={submit} className="border-t border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex min-w-0 items-end gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-2 focus-within:border-indigo-400/70">
            <label className="m-0 min-w-0 flex-1"><span className="sr-only">Ask a campus question</span><textarea rows={1} maxLength={2000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(input); } }} placeholder="Message CampusConnect…" className="block max-h-36 min-h-10 w-full min-w-0 resize-y overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-base leading-5 text-slate-100 shadow-none placeholder:text-slate-400 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0" /></label>
            <button aria-label="Send message" disabled={busy || !input.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-500">AI can make mistakes. Verify important details with the responsible campus office.</p>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Grounded answers</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Campus information, with sources</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Answers use the configured campus knowledge articles. If a source cannot verify the answer, the assistant should say so instead of inventing a policy.</p>
          <p className="mt-4 text-xs text-slate-500">{health?.knowledgeDocuments ?? "—"} knowledge article(s) available</p>
          <Link to="/knowledge" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-300 hover:text-indigo-200">Browse knowledge <ArrowRight className="h-4 w-4" /></Link>
        </section>
        <section className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-100"><AlertTriangle className="h-4 w-4" /> Need a person?</h2>
          <p className="mt-2 text-sm leading-6 text-amber-100/70">For an unresolved issue, create a request so campus support staff can follow up.</p>
          <Link to="/tickets/new" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-200 hover:text-white">Create support ticket <ArrowRight className="h-4 w-4" /></Link>
        </section>
        {lastAssistant?.mode === "retrieval-fallback" && <p className="px-1 text-xs text-slate-500">Fallback is active when Gemini is unavailable or not configured. The assistant remains useful for matching approved articles.</p>}
        {health && <p className="flex items-center gap-2 px-1 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Assistant service is online</p>}
      </aside>
    </div>
  );
}
