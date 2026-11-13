import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Topbar({ title }: { title?: string }) {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center px-6 gap-4 sticky top-0 z-10">
      {title && <h1 className="text-slate-200 font-semibold text-sm">{title}</h1>}
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
        >
          <Bell className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-slate-300 text-xs font-medium">{user?.name.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  );
}
