import React from "react";
import { 
  Ticket, 
  Award, 
  Users, 
  ShieldAlert, 
  ArrowUpRight, 
  TrendingUp,
  Phone,
  PhoneCall,
  CalendarCheck
} from "lucide-react";
import { DashboardData } from "../types";

interface MetricCardsProps {
  data: DashboardData | null;
  loading: boolean;
}

export default function MetricCards({ data, loading }: MetricCardsProps) {
  // Simple loaders showing structural skeleton
  if (loading || !data) {
    return (
      <div id="metrics-skeleton-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bento-card p-5 animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="h-8 bg-slate-800 rounded w-2/3"></div>
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    ticketsCount,
    totalKpiPoints,
    totalManualBonus,
    totalManualPenalty,
    technicianCount,
    totalDials,
    totalInboundConnects,
    totalOutboundConnects,
    totalInboundCalls,
    totalOutboundCalls,
    totalKPISummaryPoints,
    totalTicketPoints,
    totalWeekendPoints,
    totalDeductedPoints,
  } = data;

  const isCallCenterMode = totalDials !== undefined;
  const avgKpi = ticketsCount > 0 ? Number((totalKpiPoints / ticketsCount).toFixed(2)) : 0;
  const netAdjustments = Number((totalManualBonus - totalManualPenalty).toFixed(2));

  if (isCallCenterMode) {
    const totalConnects = (totalInboundConnects || 0) + (totalOutboundConnects || 0);
    return (
      <div id="metrics-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Call Center Dials Card */}
        <div id="metric-card-dials" className="bento-card p-5 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans text-sky-400">Total Call Dials</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-white">{(totalDials || 0).toLocaleString()}</h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase select-none">dials</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
              <span>Connects: <strong>{totalConnects.toLocaleString()}</strong> success</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-450 flex items-center justify-center shadow-md shadow-slate-950/50">
            <Phone className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* Inbound vs Outbound Calls Card */}
        <div id="metric-card-calls" className="bento-card p-5 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Inbound & Outbound</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black tracking-tight text-white">
                {((totalInboundCalls || 0) + (totalOutboundCalls || 0)).toLocaleString()}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase select-none">calls</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
              <span className="text-emerald-400 font-bold">{totalInboundCalls || 0} In</span>
              <span>/</span>
              <span className="text-sky-400 font-bold">{totalOutboundCalls || 0} Out</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-indigo-400 flex items-center justify-center shadow-md shadow-slate-950/50">
            <PhoneCall className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {/* Total Ticket Resolutions Points Card */}
        <div id="metric-card-ticket-pts" className="bento-card p-5 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Ticket Resolutions</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-white">{ticketsCount}</h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/30">
                +{totalTicketPoints} pts
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Weekend: <strong>+{totalWeekendPoints || 0} pts</strong></span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-teal-400 flex items-center justify-center shadow-md shadow-slate-950/50">
            <Ticket className="w-5 h-5 text-teal-400" />
          </div>
        </div>

        {/* Aggregate KPI Points Card */}
        <div id="metric-card-summary-total" className="bento-card p-5 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans text-sky-400">Consolidated Net Score</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black tracking-tight text-sky-450 kpi-glow text-sky-400">{(totalKPISummaryPoints || 0).toLocaleString()}</h3>
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                -{totalDeductedPoints || 0} ded.
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Consolidated Call Center + Tickets KPIs</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400 flex items-center justify-center shadow-md shadow-slate-950/50">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="metrics-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Tickets Card */}
      <div id="metric-card-tickets" className="bento-card p-5 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Resolved Tickets</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-white">{ticketsCount}</h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase select-none">tickets</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Parsed from database logs</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400 flex items-center justify-center shadow-md shadow-slate-950/50">
          <Ticket className="w-5 h-5" />
        </div>
      </div>

      {/* Total KPI Points Card */}
      <div id="metric-card-kpi" className="bento-card p-5 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Total KPI Points</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-sky-400 kpi-glow">{totalKpiPoints}</h3>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/30">
              Avg: {avgKpi}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Weighted ticket value</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400 flex items-center justify-center shadow-md shadow-slate-950/50">
          <Award className="w-5 h-5" />
        </div>
      </div>

      {/* Active Technicians Card */}
      <div id="metric-card-techs" className="bento-card p-5 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Active Staff</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-white">{technicianCount}</h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase select-none">active</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Resolving in selected active period</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sky-400 flex items-center justify-center shadow-md shadow-slate-950/50">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Manual Adjustments Metric */}
      <div id="metric-card-adjustments" className="bento-card p-5 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-sans">Net Adjustments</p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-black tracking-tight ${
              netAdjustments >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {netAdjustments > 0 ? `+${netAdjustments}` : netAdjustments}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold select-none">points</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-bold font-mono">+{totalManualBonus} bonus</span>
            <span>/</span>
            <span className="text-rose-400 font-bold font-mono">-{totalManualPenalty} penalty</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
          netAdjustments >= 0 
            ? "bg-slate-800/80 border-slate-700/60 text-amber-400" 
            : "bg-slate-800/80 border-slate-700/60 text-rose-400"
        } shadow-md shadow-slate-950/50`}>
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

