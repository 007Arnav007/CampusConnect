type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: "default" | "indigo" | "cyan" | "emerald" | "rose" | "amber";
};

import type React from "react";

const colorMap = {
  default: "from-slate-800 to-slate-700/50 border-slate-700",
  indigo: "from-indigo-900/50 to-indigo-800/30 border-indigo-700/50",
  cyan: "from-cyan-900/50 to-cyan-800/30 border-cyan-700/50",
  emerald: "from-emerald-900/50 to-emerald-800/30 border-emerald-700/50",
  rose: "from-rose-900/50 to-rose-800/30 border-rose-700/50",
  amber: "from-amber-900/50 to-amber-800/30 border-amber-700/50",
};

const textColorMap = {
  default: "text-slate-100",
  indigo: "text-indigo-300",
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  amber: "text-amber-300",
};

export default function MetricCard({ label, value, sub, icon, color = "default" }: Props) {
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">{label}</p>
          <p className={`text-3xl font-bold ${textColorMap[color]}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && <div className={`${textColorMap[color]} opacity-60`}>{icon}</div>}
      </div>
    </div>
  );
}
