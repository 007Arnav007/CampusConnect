import { Outlet, Link, NavLink } from "react-router-dom";
import { Wifi } from "lucide-react";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">CampusConnect</span>
          </Link>
          <div className="flex items-center gap-4">
            <NavLink to="/login" className="text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
              Sign in
            </NavLink>
            <NavLink to="/admin/login" className="hidden text-sm font-medium text-violet-300 transition-colors hover:text-violet-200 sm:inline">
              Admin
            </NavLink>
            <NavLink to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get started
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-slate-400">
          <span>CampusConnect · VIT campus support</span>
          <span>Built with TCP, UDP, WebSocket</span>
        </div>
      </footer>
    </div>
  );
}
