import { Link } from "react-router-dom";
import type { Ticket } from "../api";
import StatusBadge from "./StatusBadge";
import { Clock, MapPin, Tag } from "lucide-react";

type Props = {
  ticket: Ticket;
  href?: string;
};

export default function TicketCard({ ticket, href }: Props) {
  const card = (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-indigo-500/40 hover:bg-slate-800 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={ticket.status} />
          <StatusBadge status={ticket.priority} />
        </div>
        <span className="text-xs text-slate-500 font-mono shrink-0">{ticket.ticketNumber}</span>
      </div>
      <h3 className="text-slate-200 font-semibold group-hover:text-indigo-300 transition-colors line-clamp-1">
        {ticket.title}
      </h3>
      <p className="text-slate-400 text-sm mt-1 line-clamp-2">{ticket.description}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          {ticket.category.replace("_", " ")}
        </span>
        {ticket.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {ticket.location}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {new Date(ticket.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{card}</Link>;
  }
  return card;
}
