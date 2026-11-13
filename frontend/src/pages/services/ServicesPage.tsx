import { BookOpen, Building2, CircleDollarSign, GraduationCap, Laptop, MapPin, Plus, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  { category: "IT_NETWORK", title: "IT and network", description: "Report account access, campus Wi-Fi, lab systems, or other technical issues.", icon: Laptop },
  { category: "ACADEMIC", title: "Academic support", description: "Route an academic request to the appropriate support staff for review.", icon: GraduationCap },
  { category: "HOSTEL", title: "Hostel support", description: "Raise a request about hostel facilities or a residence-related issue.", icon: Building2 },
  { category: "FINANCE", title: "Finance support", description: "Submit a question or issue for the finance support team.", icon: CircleDollarSign },
  { category: "FACILITIES", title: "Campus facilities", description: "Report a maintenance or campus facility issue and include its location.", icon: MapPin },
  { category: "OTHER", title: "Student support", description: "For requests that do not fit another listed category, explain the issue clearly.", icon: Users },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Campus help directory</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Find the right support path</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Choose a request category, include relevant details, and track the response in your ticket workspace. This directory routes requests and does not replace emergency services.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map(({ category, title, description, icon: Icon }) => (
          <article key={category} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/30">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"><Icon className="h-5 w-5" /></span>
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{description}</p>
            <Link to={`/tickets/new?category=${encodeURIComponent(category)}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"><Plus className="h-4 w-4" /> Create request</Link>
          </article>
        ))}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/knowledge" className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:bg-slate-900"><BookOpen className="mt-1 h-5 w-5 text-indigo-300" /><div><h2 className="font-semibold text-white">Browse knowledge articles</h2><p className="mt-1 text-sm text-slate-400">Check approved troubleshooting guidance before submitting a request.</p></div></Link>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5"><ShieldCheck className="mt-1 h-5 w-5 text-amber-200" /><div><h2 className="font-semibold text-amber-100">Urgent danger?</h2><p className="mt-1 text-sm text-amber-100/70">Contact campus security or local emergency services directly. Do not wait for a ticket response.</p></div></div>
      </div>
    </div>
  );
}
