import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Printer, FileText, CheckCircle2, ChevronRight, UserCheck, CalendarDays, RefreshCw } from "lucide-react";
import { DashboardData, Ticket } from "../types";

interface MonthlyReportTableProps {
  data: DashboardData | null;
  loading: boolean;
  selectedMonth: string;
  ticketsList: Ticket[];
  onRefresh: () => void;
}

export default function MonthlyReportTable({ data, loading, selectedMonth, ticketsList, onRefresh }: MonthlyReportTableProps) {
  const [activeTab, setActiveTab] = useState<"rankings" | "tickets">("rankings");
  const [ticketSearch, setTicketSearch] = useState("");

  if (loading || !data) {
    return (
      <div id="report-skeleton" className="bento-card p-6 h-96 mt-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-800 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  const { rankings } = data;

  // Filtered tickets based on nested ticket searches inside current reports
  const filteredTickets = ticketsList.filter((ticket) => {
    const term = ticketSearch.toLowerCase();
    return (
      (ticket.resolved_by && ticket.resolved_by.toLowerCase().includes(term)) ||
      (ticket.type && ticket.type.toLowerCase().includes(term)) ||
      (ticket.category && ticket.category.toLowerCase().includes(term))
    );
  });

  // Excel Export: Multi-sheet professional workbook
  const handleExcelExport = () => {
    try {
      const wb = XLSX.utils.book_new();
 
      // Sheet 1: Technicians performance aggregate
      const rankingExportRows = rankings.map((r, i) => ({
        "Rank Position": i + 1,
        "Technician": r.name,
        "Resolved Tickets Count": r.resolved_count,
        "Base Tech KPI Points": r.kpi_points,
        "Call Center Dials": r.dials ?? "N/A",
        "Inbound Connects": r.inbound_connects ?? "N/A",
        "Outbound Connects": r.outbound_connects ?? "N/A",
        "Inbound Calls": r.inbound_calls ?? "N/A",
        "Outbound Calls": r.outbound_calls ?? "N/A",
        "Weekend Days": r.weekend_days ?? "N/A",
        "Weekend Points": r.weekend_points ?? "N/A",
        "Deducted Points": r.deducted_points ?? "N/A",
        "Ranking Tier": r.ranking_tier ?? "N/A",
        "Payout (VND)": r.payout ?? "N/A",
        "Manual Assigned Bonuses": r.bonuses,
        "Manual Applied Penalties": r.penalties,
        "Total Final Net KPI": r.net_score,
      }));
      const wsRankings = XLSX.utils.json_to_sheet(rankingExportRows);
      XLSX.utils.book_append_sheet(wb, wsRankings, "Technician Leaderboard");
 
      // Sheet 2: Resolved raw tickets in details
      const ticketsExportRows = ticketsList.map((t) => ({
        "Ticket Reference ID": t.id,
        "Resolved By (Technician)": t.resolved_by,
        "Ticket Category": t.category,
        "Subject / Type": t.type,
        "Resolved Date": t.created_date,
        "Status": t.status,
        "KPI Points Calculated": t.kpi_points,
      }));
      const wsTickets = XLSX.utils.json_to_sheet(ticketsExportRows);
      XLSX.utils.book_append_sheet(wb, wsTickets, "Resolved Tickets Log");
 
      // Save file
      const filename = `Tech_Support_KPI_Report_${selectedMonth.replace("-", "_")}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Spreadsheet compilation error:", error);
      alert("An error occurred during file composition.");
    }
  };

  // Printable layout trigger
  const handlePrintTrigger = () => {
    window.print();
  };

  const isCallCenterMode = rankings.some(r => r.dials !== undefined);

  return (
    <div id="monthly-reporting-panel" className="bento-card shadow-lg mt-6 overflow-hidden">
      
      {/* Printable Area - Hidden during standard browser view, styled gracefully inside index.css print styles */}
      <div className="hidden print:block p-8 space-y-6 bg-white text-slate-900 rounded-lg">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold uppercase tracking-tight">KPI Technical Support Mac USA One Report</h1>
          <p className="text-sm text-slate-500 font-medium">Reporting Period: <span className="font-semibold text-slate-800">{selectedMonth === "ALL" ? "All Time" : selectedMonth}</span></p>
          <div className="h-0.5 w-16 bg-slate-900 mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-3 gap-4 border border-slate-200 p-4 rounded-lg bg-slate-50 text-xs">
          <div>
            <p className="text-slate-400 uppercase font-bold tracking-wider font-mono text-[9px]">Total Tickets</p>
            <p className="text-base font-bold text-slate-800">{data.ticketsCount}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase font-bold tracking-wider font-mono text-[9px]">Active Systems Techs</p>
            <p className="text-base font-bold text-slate-800">{data.technicianCount}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase font-bold tracking-wider font-mono text-[9px]">Summed Point Index</p>
            <p className="text-base font-bold text-slate-800">{data.totalKpiPoints} points</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 tracking-wide">Technician Cumulative Standings</h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2">Rank</th>
                <th className="py-2">Technician</th>
                <th className="py-2 text-right">Resolutions</th>
                <th className="py-2 text-right">Base KPI ID</th>
                {isCallCenterMode && (
                  <>
                    <th className="py-2 text-right">Dials</th>
                    <th className="py-2 text-right">Connects</th>
                    <th className="py-2 text-right">Weekend Days</th>
                    <th className="py-2 text-right">Weekend Points</th>
                    <th className="py-2 text-right">Deductions</th>
                    <th className="py-2 text-right">Tier</th>
                    <th className="py-2 text-right">Payout (VND)</th>
                  </>
                )}
                <th className="py-2 text-right">Bonus</th>
                <th className="py-2 text-right">Penalty</th>
                <th className="py-2 text-right">Net Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {rankings.map((r, i) => (
                <tr key={r.name}>
                  <td className="py-2 font-mono font-bold">{i + 1}</td>
                  <td className="py-2 font-semibold">{r.name}</td>
                  <td className="py-2 text-right">{r.resolved_count}</td>
                  <td className="py-2 text-right">{r.kpi_points}</td>
                  {isCallCenterMode && (
                    <>
                      <td className="py-2 text-right">{r.dials ?? 0}</td>
                      <td className="py-2 text-right">{((r.inbound_connects || 0) + (r.outbound_connects || 0))}</td>
                      <td className="py-2 text-right">{r.weekend_days ?? 0}</td>
                      <td className="py-2 text-right">+{r.weekend_points ?? 0}</td>
                      <td className="py-2 text-right text-rose-500">-{r.deducted_points ?? 0}</td>
                      <td className="py-2 text-right font-semibold uppercase">{r.ranking_tier ?? "Ok"}</td>
                      <td className="py-2 text-right font-mono font-semibold">{r.payout ? r.payout.toLocaleString() : "0"}</td>
                    </>
                  )}
                  <td className="py-2 text-right text-emerald-600">+{r.bonuses}</td>
                  <td className="py-2 text-right text-rose-500">-{r.penalties}</td>
                  <td className="py-2 text-right font-mono font-extrabold text-slate-900">{r.net_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen Interactive Tab View */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 uppercase tracking-wide">
            <CalendarDays className="w-4.5 h-4.5 text-sky-400" />
            Monthly KPI Performance Reports
          </h2>
          <p className="text-xs text-slate-400">
            Reporting index of <span className="font-bold text-sky-400">{selectedMonth === "ALL" ? "All Time" : selectedMonth}</span>. Manage rankings and audits.
          </p>
        </div>

        {/* Audit Export operations and tab switches */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Excel */}
          <button
            onClick={handleExcelExport}
            className="px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-500 active:translate-y-px transition-all text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950/20 cursor-pointer"
            id="export-xlsx-btn"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" /> Excel Export
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrintTrigger}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-lg hover:bg-slate-700 hover:border-slate-600 active:translate-y-px transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            id="print-pdf-btn"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" /> PDF/Print Report
          </button>
        </div>
      </div>

      {/* Internal Tabs (Rankings vs Logs) */}
      <div className="px-5 border-b border-slate-800/80 flex justify-between items-center bg-[#090d23]/20">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("rankings")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all relative ${
              activeTab === "rankings" 
                ? "border-sky-500 text-sky-400 font-extrabold" 
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
            id="tab-rankings-overview"
          >
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Technician Performance Scores
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("tickets")}
            className={`py-3 text-xs font-semibold border-b-2 transition-all relative ${
              activeTab === "tickets" 
                ? "border-sky-500 text-sky-400 font-extrabold" 
                : "border-transparent text-slate-400 hover:text-slate-300"
            }`}
            id="tab-tickets-lookup"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Detailed Resolved Tickets ({ticketsList.length})
            </span>
          </button>
        </div>

        {/* Filter sub search on active logs */}
        {activeTab === "tickets" && (
          <div className="py-2.5">
            <input
              type="text"
              placeholder="Filter current tab..."
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              className="px-3 py-1 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/60 text-white w-36 sm:w-48 transition-all"
              id="ticket-sub-search"
            />
          </div>
        )}
      </div>

      {/* Grid displays */}
      <div className="overflow-x-auto min-h-60 bg-transparent">
        {activeTab === "rankings" ? (
          <table className="w-full text-left border-collapse text-xs" id="rankings-data-table">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6 text-center w-14">Rank</th>
                <th className="p-4">Technician Name</th>
                <th className="p-4 text-center">Resolutions Count</th>
                <th className="p-4 text-right">Base KPI Score</th>
                {isCallCenterMode && (
                  <>
                    <th className="p-4 text-right text-sky-400">Dials</th>
                    <th className="p-4 text-right text-sky-400">Connects</th>
                    <th className="p-4 text-right text-emerald-400">Weekend Days</th>
                    <th className="p-4 text-right text-emerald-400">Weekend Pts</th>
                    <th className="p-4 text-right text-amber-400">Deductions</th>
                    <th className="p-4 text-right text-indigo-455">Tier</th>
                    <th className="p-4 text-right text-indigo-400">Payout</th>
                  </>
                )}
                <th className="p-4 text-right text-emerald-400">Manual Bonuses</th>
                <th className="p-4 text-right text-rose-400">Manual Penalties</th>
                <th className="p-4 text-right pr-6">Final Net Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium bg-transparent">
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={isCallCenterMode ? 14 : 7} className="p-8 text-center text-slate-500 italic font-sans">
                    No ratings on file. Upload data to initialize scores.
                  </td>
                </tr>
              ) : (
                rankings.map((r, i) => (
                  <tr key={r.name} className="hover:bg-slate-800/20 transition-colors font-sans">
                    <td className="p-4 pl-6 text-center font-mono font-bold text-slate-400">
                      #{i + 1}
                    </td>
                    <td className="p-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-800/80 border border-slate-700/50 text-sky-400 flex items-center justify-center text-[10px] uppercase font-mono font-bold">
                        {r.name.substring(0, 2)}
                      </div>
                      <span className="truncate">{r.name}</span>
                    </td>
                    <td className="p-4 text-center text-slate-300">{r.resolved_count}</td>
                    <td className="p-4 text-right pr-5 font-mono text-slate-400">{r.kpi_points}</td>
                    {isCallCenterMode && (
                      <>
                        <td className="p-4 text-right font-mono text-sky-400">{(r.dials ?? 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-sky-300">
                          {((r.inbound_connects || 0) + (r.outbound_connects || 0)).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-300">{r.weekend_days ?? 0}</td>
                        <td className="p-4 text-right font-mono text-emerald-400 font-semibold">+{r.weekend_points ?? 0}</td>
                        <td className="p-4 text-right font-mono text-rose-400 font-semibold">-{r.deducted_points ?? 0}</td>
                        <td className="p-4 text-right font-bold uppercase text-indigo-300">{r.ranking_tier ?? "Ok"}</td>
                        <td className="p-4 text-right font-mono font-medium text-slate-200">
                          {r.payout ? `${r.payout.toLocaleString()} VND` : "0"}
                        </td>
                      </>
                    )}
                    <td className="p-4 text-right pr-5 font-mono text-emerald-400 font-semibold">
                      {r.bonuses > 0 ? `+${r.bonuses}` : "0"}
                    </td>
                    <td className="p-4 text-right pr-5 font-mono text-rose-400 font-semibold">
                      {r.penalties > 0 ? `-${r.penalties}` : "0"}
                    </td>
                    <td className="p-4 text-right pr-6 font-mono font-black text-sky-400 text-sm kpi-glow">
                      {r.net_score}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse text-xs" id="tickets-data-table">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6 w-16 text-center">ID</th>
                <th className="p-4">Resolved By</th>
                <th className="p-4">Ticket Name & Subject</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Created Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right pr-6">Calculated KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium bg-transparent">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No tickets match your filter.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 pl-6 text-center text-slate-500 font-mono">#{t.id}</td>
                    <td className="p-4 font-semibold text-white">{t.resolved_by}</td>
                    <td className="p-4 font-medium text-slate-300">
                      <div className="max-w-[280px] sm:max-w-xs md:max-w-md truncate" title={t.type}>
                        {t.type}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700/60">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-400 font-mono">{t.created_date}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-pulse" /> {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 font-mono font-bold text-white">
                      +{t.kpi_points || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
