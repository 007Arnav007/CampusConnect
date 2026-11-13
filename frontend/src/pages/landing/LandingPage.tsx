import { ArrowRight, Bell, Bot, Shield, Ticket, Wifi, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Ticket, title: "One place for support", body: "Create a request and follow its progress without chasing departments." },
  { icon: Bell, title: "Updates that stay", body: "Review ticket replies and notifications whenever you return." },
  { icon: Bot, title: "Knowledge assistant", body: "Ask campus questions and get grounded guidance with a safe fallback." },
  { icon: Shield, title: "Role-aware operations", body: "Students and campus staff see the tools relevant to their role." },
];

export default function LandingPage() {
  return (
    <div className="text-slate-200">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-slate-950 to-cyan-950/30" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
              <Wifi className="h-4 w-4" /> Campus support, connected
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
              Campus support without the runaround.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Submit a request, keep track of the response, and find approved campus guidance from one place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">
                Create an account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800">
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">For students and authorized campus support staff.</p>
          </div>
          <div className="mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[["01", "Create a request"], ["02", "Follow progress"], ["03", "Get a clear answer"]].map(([number, label]) => (
              <div key={number} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-bold text-cyan-300">{number}</span>
                <p className="mt-2 font-medium text-white">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">A better support loop</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Everything important, in one workspace.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <span className="mb-4 inline-flex rounded-xl border border-indigo-400/20 bg-indigo-400/10 p-3 text-indigo-300"><Icon className="h-5 w-5" /></span>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-5 text-sm text-cyan-100">
          <Zap className="h-5 w-5 shrink-0 text-cyan-300" />
          Important updates are stored in the application and can be reloaded after reconnecting.
        </div>
      </section>
    </div>
  );
}
