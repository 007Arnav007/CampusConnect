import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-rose-900/30 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-rose-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-slate-400 mb-8">You do not have permission to view this page. Contact an administrator if you believe this is an error.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium px-6 py-3 rounded-lg transition-all">
          <ArrowLeft className="w-4 h-4" /> Go to dashboard
        </Link>
      </div>
    </div>
  );
}
