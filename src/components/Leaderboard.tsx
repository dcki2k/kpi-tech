import React, { useState } from "react";
import { Award, Search, PlusCircle, Trash2, ArrowUpCircle, ArrowDownCircle, Trophy, User } from "lucide-react";
import { DashboardData, TechnicianRank } from "../types";

interface LeaderboardProps {
  data: DashboardData | null;
  loading: boolean;
  selectedMonth: string;
  onAdjustmentAdded: () => void;
}

export default function Leaderboard({ data, loading, selectedMonth, onAdjustmentAdded }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [techName, setTechName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Bonus" | "Penalty">("Bonus");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading || !data) {
    return (
      <div className="bento-card p-6 shadow-sm animate-pulse h-96">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-slate-800"></div>
              <div className="flex-1 h-4 bg-slate-800 rounded"></div>
              <div className="w-12 h-4 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { rankings, adjustments } = data;

  // Filter rankings based on search
  const filteredRankings = rankings.filter((rank) =>
    rank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!techName.trim()) {
      setFormError("Please enter or select a technician's name.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid numeric point amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine the date to set. If the dashboard is filtered by a specific month (e.g., "2026-06"),
      // we'll attach this adjustment to the 1st of that month so that it falls in the reporting filter.
      // If "ALL" is selected, we'll set it to today's date.
      let adjustmentDate = new Date().toISOString().split("T")[0];
      if (selectedMonth && selectedMonth !== "ALL") {
        adjustmentDate = `${selectedMonth}-01`;
      }

      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technician_name: techName.trim(),
          amount: numAmount,
          type,
          description: description.trim(),
          date: adjustmentDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failure creating manual adjustment in SQLite.");
      }

      setFormSuccess(true);
      setTechName("");
      setAmount("");
      setDescription("");
      onAdjustmentAdded();
      
      // Auto-revert success state
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (id: number) => {
    if (!confirm("Are you sure you want to revert this manual adjustment?")) return;
    try {
      const response = await fetch(`/api/adjustments/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onAdjustmentAdded();
      } else {
        alert("Failed to delete adjustment.");
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="leaderboard-adjusted-bento">
      {/* Ranks & Standings Column */}
      <div className="lg:col-span-2 bento-card p-6 shadow-md flex flex-col h-[520px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
              <Trophy className="w-5 h-5 text-amber-400" />
              Technician Leaderboard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Rankings based on net KPI points</p>
          </div>
          
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search technician..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/60 text-white w-full sm:w-48 transition-all"
              id="tech-search-input"
            />
          </div>
        </div>

        {/* Standings List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
          {filteredRankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
              <User className="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
              <p className="text-xs font-semibold">No active technicians found.</p>
              <p className="text-[10px] mt-1 text-center text-slate-500">Import some CRM tickets or use the adjustment form to seed technicians.</p>
            </div>
          ) : (
            filteredRankings.map((rank, idx) => {
              // Medal or rank layout
              const absoluteRankIndex = rankings.findIndex(r => r.name === rank.name) + 1;
              const isTop3 = absoluteRankIndex <= 3;
              const medalColors = [
                "bg-amber-500/15 text-amber-400 border-amber-500/30", // Gold
                "bg-slate-400/15 text-slate-300 border-slate-400/30", // Silver
                "bg-orange-500/15 text-orange-400 border-orange-500/30", // Bronze
              ];

              return (
                <div
                  key={rank.name}
                  className={`p-3.5 rounded-lg border flex items-center justify-between transition-all hover:translate-x-0.5 ${
                    isTop3 
                      ? "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50" 
                      : "bg-[#090d23]/20 border-slate-800/40 hover:bg-slate-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-[50%]">
                    {/* Rank Badge */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border shrink-0 ${
                      isTop3 
                        ? medalColors[absoluteRankIndex - 1] 
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}>
                      {absoluteRankIndex}
                    </div>
                    {/* Name and Details */}
                    <div className="truncate space-y-0.5">
                      <p className="font-semibold text-white text-xs truncate flex items-center gap-1.5 font-sans">
                        {rank.name}
                        {absoluteRankIndex === 1 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-sm line-clamp-1 font-sans">
                            Champion
                          </span>
                        )}
                      </p>
                      <div className="text-[10px] text-slate-400 font-medium font-sans">
                        <span>{rank.resolved_count} ticket resolutions</span>
                        {rank.dials !== undefined && (
                          <div className="text-[10px] text-sky-400 font-semibold mt-1 space-y-0.5">
                            <span className="block">📞 Dials: {rank.dials.toLocaleString()} | Conn: {((rank.inbound_connects || 0) + (rank.outbound_connects || 0)).toLocaleString()}</span>
                            <span className="block text-[9px] text-slate-400">Calls: {rank.inbound_calls || 0} In / {rank.outbound_calls || 0} Out</span>
                          </div>
                        )}
                        {rank.weekend_days !== undefined && rank.weekend_days > 0 && (
                          <span className="block text-[10px] text-emerald-400 font-bold mt-0.5">
                            ⭐ Weekend days: {rank.weekend_days} (+{rank.weekend_points} pts)
                          </span>
                        )}
                        {rank.ranking_tier && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 rounded shadow-sm">
                            Tier: {rank.ranking_tier} {rank.payout ? `| Payout: ${rank.payout.toLocaleString()} VND` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown (Base, Bonus, Penalty, Net) */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div className="hidden sm:flex flex-col text-[10px] text-slate-400 font-mono">
                      <span>Base: <span className="text-slate-200 font-semibold">{rank.kpi_points}</span></span>
                      <div className="flex gap-1.5">
                        <span className="text-emerald-400 font-semibold">+{rank.bonuses} bonus</span>
                        <span>/</span>
                        <span className="text-rose-400 font-semibold">-{rank.penalties} penalty</span>
                      </div>
                    </div>
                    <div className="border-l border-slate-800 pl-3.5 py-0.5 min-w-[70px]">
                      <span className="text-[10px] text-slate-500 block font-bold font-sans">Net score:</span>
                      <span className={`text-sm font-extrabold font-mono ${
                        rank.net_score >= 0 ? "text-sky-400 kpi-glow" : "text-rose-400"
                      }`}>
                        {rank.net_score}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bonus / Penalty Adjustments Column */}
      <div className="bento-card p-6 shadow-md flex flex-col h-[520px]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
            <PlusCircle className="w-5 h-5 text-sky-400" />
            Adjust KPI score
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Apply custom bonus or penalty points</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Technician *</label>
            {/* Combo inputs/dropdown */}
            <input
              type="text"
              list="tech-names-list"
              placeholder="Type technician's name..."
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/60 text-white"
              required
            />
            <datalist id="tech-names-list">
              {rankings.map(r => (
                <option key={r.name} value={r.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Type *</label>
              <div className="flex rounded-lg border border-slate-700/60 overflow-hidden text-xs bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setType("Bonus")}
                  className={`flex-1 py-1.5 text-center font-bold transition-all ${
                    type === "Bonus" 
                      ? "bg-emerald-500/15 text-emerald-400 font-extrabold border-b border-emerald-500/30" 
                      : "text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  Bonus
                </button>
                <button
                  type="button"
                  onClick={() => setType("Penalty")}
                  className={`flex-1 py-1.5 text-center font-bold transition-all ${
                    type === "Penalty" 
                      ? "bg-rose-500/15 text-rose-400 font-extrabold border-b border-rose-500/30" 
                      : "text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  Penalty
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Points Value *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/60 text-white font-mono font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Description</label>
            <textarea
              placeholder="Comment why points were adjusted..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-900/60 text-white h-16 resize-none"
              maxLength={150}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 text-xs font-bold rounded-lg text-white shadow-lg transition-all ${
              type === "Bonus" 
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40" 
                : "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40"
            }`}
          >
            {isSubmitting ? "Saving..." : `Submit ${type} points`}
          </button>

          {formError && (
            <p className="text-[11px] font-medium text-rose-400 text-center animate-fade-in">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-[11px] font-bold text-emerald-400 text-center animate-fade-in">Adjusted successfully.</p>
          )}
        </form>

        {/* Mini Adjustments logs inside Dashboard */}
        <div className="flex-1 mt-4 flex flex-col min-h-0 border-t border-slate-800/80 pt-3.5">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">Adjustments Log ({adjustments.length})</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {adjustments.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic text-center py-6">No manual adjustments on file for this period.</p>
            ) : (
              adjustments.map((adj) => (
                <div key={adj.id} className="p-2 border border-slate-800/60 rounded bg-slate-900/30 flex items-center justify-between text-[11px] animate-fade-in">
                  <div className="truncate max-w-[80%]">
                    <p className="font-bold text-slate-200 truncate">
                      {adj.technician_name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate font-medium">
                      {adj.description || "No comment provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      adj.type === "Bonus" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}>
                      {adj.type === "Bonus" ? "+" : "-"}{adj.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAdjustment(adj.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
