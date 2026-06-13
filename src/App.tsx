import React, { useEffect, useState } from "react";
import { 
  Trophy, 
  HelpCircle, 
  Calendar, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  Database
} from "lucide-react";
import ExcelImporter from "./components/ExcelImporter";
import MetricCards from "./components/MetricCards";
import Leaderboard from "./components/Leaderboard";
import KPICharts from "./components/KPICharts";
import MonthlyReportTable from "./components/MonthlyReportTable";
import { DashboardData, Ticket } from "./types";

// Standard seed dataset simulating typical CRM technical tickets for instant visual auditing
const SAMPLE_TICKETS = [
  { "Resolved By": "Sarah Jenkins", "Type": "POS Setup Training #5", "Ticket Category": "POS Setup", "Created Date": "2026-06-01", "Status": "Closed" },
  { "Resolved By": "Sarah Jenkins", "Type": "TECH - Software License Crack Repair #1.5", "Ticket Category": "Software", "Created Date": "2026-06-01", "Status": "Closed" },
  { "Resolved By": "Marcus Aurelius", "Type": "Nail POS Build Database #2", "Ticket Category": "Database Build", "Created Date": "2026-06-02", "Status": "Resolved" },
  { "Resolved By": "Marcus Aurelius", "Type": "General System Troubleshooting #0.5", "Ticket Category": "General Hardware", "Created Date": "2026-06-02", "Status": "Closed" },
  { "Resolved By": "Elena Rostova", "Type": "Nail POS Build Database #2", "Ticket Category": "Database Build", "Created Date": "2026-06-03", "Status": "Closed" },
  { "Resolved By": "Elena Rostova", "Type": "TECH - Restaurant Terminal Config #3", "Ticket Category": "POS Setup", "Created Date": "2026-06-04", "Status": "Closed" },
  { "Resolved By": "John Mercer", "Type": "Cable Patch Cabinet Terminations Setup #10", "Ticket Category": "General Hardware", "Created Date": "2026-06-05", "Status": "Closed" },
  { "Resolved By": "John Mercer", "Type": "Tech Support Core - Cloud Sync Fail #0.5", "Ticket Category": "Software", "Created Date": "2026-06-06", "Status": "Closed" },
  { "Resolved By": "Sarah Jenkins", "Type": "POS Multi-Station Server Sync #4", "Ticket Category": "POS Setup", "Created Date": "2026-06-08", "Status": "Closed" },
  { "Resolved By": "Elena Rostova", "Type": "Printer Thermal Head Calibrations #0.5", "Ticket Category": "General Hardware", "Created Date": "2026-06-09", "Status": "Closed" },
  { "Resolved By": "Marcus Aurelius", "Type": "Database Migration Over Cloud Sync #1.5", "Ticket Category": "Database Build", "Created Date": "2026-06-10", "Status": "Closed" },
  { "Resolved By": "John Mercer", "Type": "TECH - Router Routing Protocols Config #5", "Ticket Category": "POS Setup", "Created Date": "2026-06-11", "Status": "Closed" },
  { "Resolved By": "Sarah Jenkins", "Type": "Emergency Backup Power Installation #3", "Ticket Category": "General Hardware", "Created Date": "2026-06-12", "Status": "Closed" },

  // Seed records for May 2026 to showcase robust monthly historical switching
  { "Resolved By": "Sarah Jenkins", "Type": "POS Setup Training #5", "Ticket Category": "POS Setup", "Created Date": "2026-05-10", "Status": "Closed" },
  { "Resolved By": "Marcus Aurelius", "Type": "Nail POS Build Database #2", "Ticket Category": "Database Build", "Created Date": "2026-05-12", "Status": "Closed" },
  { "Resolved By": "John Mercer", "Type": "General System Troubleshooting #0.5", "Ticket Category": "General Hardware", "Created Date": "2026-05-15", "Status": "Closed" },
  { "Resolved By": "Elena Rostova", "Type": "Tech Support Core - Cloud Sync Fail #0.5", "Ticket Category": "Software", "Created Date": "2026-05-18", "Status": "Closed" },
  { "Resolved By": "Sarah Jenkins", "Type": "Tech Support Core - Cloud Sync Fail #0.5", "Ticket Category": "Software", "Created Date": "2026-05-20", "Status": "Closed" },
  { "Resolved By": "Elena Rostova", "Type": "POS Team Training Class #5", "Ticket Category": "POS Setup", "Created Date": "2026-05-25", "Status": "Closed" }
];

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-06");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [ticketsList, setTicketsList] = useState<Ticket[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Sync dashboard metrics
  const fetchDashboardMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?month=${selectedMonth}`);
      if (!response.ok) {
        throw new Error("HTTP failure reading from SQLite.");
      }
      const data = await response.json();
      setDashboardData(data);
      setTicketsList(data.tickets || []);
      
      // Ensure the active month filters update dynamically
      if (data.availableMonths && data.availableMonths.length > 0) {
        // Merge in other months while keeping order sorted
        const mergedMonths = Array.from(new Set(["2026-06", "2026-05", ...data.availableMonths])).sort((a,b) => b.localeCompare(a));
        setAvailableMonths(mergedMonths);
      } else {
        setAvailableMonths(["2026-06", "2026-05"]);
      }
    } catch (error) {
      console.error("Dashboard render error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, [selectedMonth]);

  // Seeding sample data
  const handleLoadDemoDataset = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      const response = await fetch("/api/tickets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: SAMPLE_TICKETS }),
      });

      if (!response.ok) {
        throw new Error("Seed transaction failed on SQLite container.");
      }

      setSeedSuccess(true);
      await fetchDashboardMetrics();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err: any) {
      alert("Error seeding dataset: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Re-initializes clean SQLite tables
  const handleClearDatabase = async () => {
    if (!confirm("This will permanently drop all tickets, manual adjustments, and logged technician ratings from SQLite database. Continue?")) return;
    setClearing(true);
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });
      if (response.ok) {
        setSelectedMonth("2026-06");
        await fetchDashboardMetrics();
      } else {
        alert("Failed to reset SQLite database.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans antialiased pb-12">
      
      {/* Outer Root - Screen Only Container, hidden in print view */}
      <div id="main-interface-root">
        {/* Navigation Banner Header */}
        <header className="border-b border-slate-800/60 bg-[#090d23]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
                <Activity className="w-5 h-5 text-sky-400 stroke-[2] animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-sans uppercase">
                  KPI Technical Support Mac USA One
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  v2.4 • Persistent SQLite backend • Last sync: dynamic
                </p>
              </div>
            </div>

            {/* Quick action buttons & settings */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleLoadDemoDataset}
                disabled={seeding}
                className="px-3 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/40 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-indigo-500/30 disabled:opacity-50"
                id="load-demo-dataset-btn"
              >
                {seeding ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : seedSuccess ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                )}
                {seeding ? "Seeding..." : seedSuccess ? "Demo Loaded!" : "Load Demo Dataset"}
              </button>

              <button
                onClick={handleClearDatabase}
                disabled={clearing}
                className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/40 text-rose-200 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                id="drop-database-btn"
                title="Wipe SQLite database cleanup"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Reset Data
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Area Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Legend Help Box explaining automatic scoring */}
          <div className="bg-gradient-to-r from-[#03071e] via-[#090d23] to-[#012a4a] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
            <div className="space-y-1.5 z-10 max-w-xl">
              <span className="bg-sky-500/10 text-sky-400 font-semibold text-[10px] uppercase px-2 py-0.5 rounded border border-sky-500/25 font-mono tracking-wider">
                KPI Calculation Rules
              </span>
              <h2 className="text-base font-bold tracking-tight mt-1.5">Rule-Based Point Extraction:</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                The points parser dynamically extracts values following the <strong className="text-white">“#”</strong> sign in the ticket Type field. e.g. <code className="text-emerald-400 font-mono bg-slate-950/40 px-1 py-0.5 rounded border border-white/5 font-bold">Support #0.5</code> yields +0.5 points.
              </p>
            </div>

            {/* Parsing rule badges */}
            <div className="flex flex-wrap gap-2.5 z-10 shrink-0">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs backdrop-blur-sm min-w-[130px] space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">Low Support</span>
                <p className="font-semibold text-slate-100 truncate">... Support #0.5</p>
                <span className="font-mono text-sky-400 font-bold text-[10px] bg-sky-500/10 px-1.5 rounded border border-sky-500/25">+0.5 pt</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs backdrop-blur-sm min-w-[130px] space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">Medium Build</span>
                <p className="font-semibold text-slate-100 truncate">... Database #2</p>
                <span className="font-mono text-sky-400 font-bold text-[10px] bg-sky-500/10 px-1.5 rounded border border-sky-500/25">+2.0 pts</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs backdrop-blur-sm min-w-[130px] space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">High Training</span>
                <p className="font-semibold text-slate-100 truncate">... Training #5</p>
                <span className="font-mono text-sky-400 font-bold text-[10px] bg-sky-500/10 px-1.5 rounded border border-sky-500/25">+5.0 pts</span>
              </div>
            </div>
            
            {/* Subtle floating glow graphics */}
            <div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-48 h-48 bg-sky-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
          </div>

          {/* Filtering control row & Excel Loader card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left selector col: Period Select */}
            <div className="lg:col-span-4 bento-card p-6 shadow-md space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider text-slate-400">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  Reporting Period
                </h2>
                <p className="text-xs text-slate-400">Select active timeframe for global KPI rankings</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <select
                    id="month-period-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/80 text-white font-semibold hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Time</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m === "2026-06" ? "June 2026 (Active)" : m === "2026-05" ? "May 2026" : m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between items-center font-medium">
                    <span>Database Engine:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-sky-400">
                      <Database className="w-3.5 h-3.5" /> SQLite Persistent
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Resolution Range:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {selectedMonth === "ALL" ? "All historic dates" : `Month ${selectedMonth}`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleClearDatabase}
                  disabled={clearing}
                  className="w-full py-2 px-3 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                  id="sidebar-reset-data-btn"
                  title="Wipe database and reset to clean slate"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-450" />
                  {clearing ? "Resetting..." : "Reset All Data to New"}
                </button>
              </div>
            </div>

            {/* Right loader col: Drag and drop sheet loader */}
            <div className="lg:col-span-8">
              <ExcelImporter onImportComplete={fetchDashboardMetrics} />
            </div>
          </div>

          {/* Quick high contrast visual metrics row */}
          <MetricCards data={dashboardData} loading={loading} />

          {/* Charts visualizations */}
          <KPICharts data={dashboardData} loading={loading} />

          {/* Leaderboard and adjustments inputs (Bento grid style) */}
          <Leaderboard 
            data={dashboardData} 
            loading={loading} 
            selectedMonth={selectedMonth} 
            onAdjustmentAdded={fetchDashboardMetrics} 
          />

          {/* Monthly Detailed spreadsheet and Audit report component */}
          <MonthlyReportTable 
            data={dashboardData} 
            loading={loading} 
            selectedMonth={selectedMonth} 
            ticketsList={ticketsList} 
            onRefresh={fetchDashboardMetrics} 
          />

        </main>
      </div>

      {/* Footer copyright */}
      <footer className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-500 mt-12 print:hidden font-medium tracking-wide">
        Technical Support KPI Dashboard • Designed with Bento Grid theme • SQLite v3.0 backplane.
      </footer>
    </div>
  );
}
