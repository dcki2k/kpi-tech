import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { AreaChart as AreaIcon, BarChart2, PieChart as PieIcon } from "lucide-react";
import { DashboardData } from "../types";

interface KPIChartsProps {
  data: DashboardData | null;
  loading: boolean;
}

const COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#f43f5e", "#818cf8", "#a78bfa", "#f472b6", "#60a5fa"];

export default function KPICharts({ data, loading }: KPIChartsProps) {
  if (loading || !data) {
    return (
      <div id="charts-skeleton" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bento-card p-6 h-[380px] animate-pulse"></div>
        <div className="bento-card p-6 h-[380px] animate-pulse"></div>
      </div>
    );
  }

  const { trends, categories } = data;

  // Formatting date for nice axis displays (Format YYYY-MM-DD -> MM/DD)
  const formatAxisDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;
      }
    } catch (_) {}
    return dateStr;
  };

  // Safe formatting for Tooltip
  const formatTooltipDate = (label: string) => {
    try {
      const d = new Date(label);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    } catch (_) {}
    return label;
  };

  return (
    <div id="performance-visualizer-row" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* KPI Trend Chart Card */}
      <div className="bento-card p-6 shadow-md flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <AreaIcon className="w-4.5 h-4.5 text-sky-400" />
              Daily KPI Points Trend
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Timeline of resolved ticket points</p>
          </div>
          {trends.length > 0 && (
            <div className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20 font-mono">
              {trends.length} days plotted
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {trends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-xs">No trend data. Upload CRM logs to plot coordinates.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorKpi" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                     <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.01} />
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(51, 65, 85, 0.2)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Tooltip
                  labelFormatter={formatTooltipDate}
                  contentStyle={{
                    backgroundColor: "#0d1527",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#38bdf8" }}
                />
                <Area
                  type="monotone"
                  dataKey="kpi_points"
                  name="KPI Points"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorKpi)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* KPI By Category Chart Card */}
      <div className="bento-card p-6 shadow-md flex flex-col h-[380px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <BarChart2 className="w-4.5 h-4.5 text-emerald-400" />
              Volume & Score by Category
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Tickets category distributions</p>
          </div>
          {categories.length > 0 && (
            <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-mono">
              {categories.length} segments
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-xs">No categories resolved yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categories} layout="vertical" margin={{ left: 15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(51, 65, 85, 0.2)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d1527",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Bar dataKey="kpi_points" name="Total Points" radius={[0, 4, 4, 0]} barSize={12}>
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="ticket_count" name="Total Tickets" radius={[0, 4, 4, 0]} fill="#1e293b" barSize={8} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
