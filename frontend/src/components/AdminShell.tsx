import { Outlet } from "react-router-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { disconnectRealtime } from "../realtime";
import {
  LayoutDashboard, Ticket, Users, Network, AlertTriangle, LogOut, Shield, ChevronRight, Activity, Radio, BookOpen, FlaskConical, Crosshair,
} from "lucide-react";

const adminNavItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/tickets", label: "All Tickets", icon: Ticket, end: false },
  { to: "/admin/users", label: "Users", icon: Users, end: false },
  { to: "/admin/incidents", label: "Incidents", icon: Activity, end: false },
  { to: "/admin/network", label: "Network Monitor", icon: Network, end: false },
  { to: "/admin/network-lab", label: "CNT Event Lab", icon: Radio, end: false },
  { to: "/admin/academics", label: "Academic Authoring", icon: BookOpen, end: false },
  { to: "/admin/emergency", label: "Critical Notices (test)", icon: AlertTriangle, end: false },
  { to: "/admin/incident-demo", label: "Fault Localizer", icon: Crosshair, end: false },
  { to: "/admin/lab", label: "CNT Visual Lab", icon: FlaskConical, end: false },
];

function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { disconnectRealtime(); logout(); navigate("/login"); }

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/50 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">CampusConnect</p>
            <p className="text-violet-400 text-xs mt-0.5">Admin Console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs text-slate-600 uppercase tracking-wider font-medium px-3 mb-2">Admin</p>
        {adminNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 group ${
                isActive ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                         : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{user?.name}</p>
            <p className="text-violet-400 text-xs truncate">Administrator</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminShell() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50 flex items-center px-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-3 h-3 text-violet-400" />
            <span className="text-violet-400 font-medium">Admin Console</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
