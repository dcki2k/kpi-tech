import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import fs from "fs/promises";
import { existsSync } from "fs";

// Fix for Node 18+ DNS resolution issues
dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface Ticket {
  id: number;
  composite_id: string;
  resolved_by: string;
  type: string;
  category: string;
  created_date: string;
  status: string;
  kpi_points: number;
  imported_at: string;
}

interface Adjustment {
  id: number;
  technician_name: string;
  amount: number;
  type: string; // 'Bonus' or 'Penalty'
  description: string;
  date: string;
}

interface Technician {
  id: number;
  name: string;
  is_active: number;
  custom_notes: string;
}

interface KPISummary {
  id: number;
  month: string;
  employee_name: string;
  dials: number;
  inbound_connects: number;
  outbound_connects: number;
  inbound_calls: number;
  outbound_calls: number;
  total_tickets: number;
  ticket_points: number;
  weekend_days: number;
  weekend_points: number;
  deducted_points: number;
  total_points: number;
  rank: string;
  payout: number;
}

interface DBStructure {
  tickets: Ticket[];
  adjustments: Adjustment[];
  technicians: Technician[];
  kpi_summaries?: KPISummary[];
  nextIds: {
    tickets: number;
    adjustments: number;
    technicians: number;
    kpi_summaries?: number;
  };
}

const DB_FILE = path.join(__dirname, "database.json");

class JsonDB {
  private data: DBStructure = {
    tickets: [],
    adjustments: [],
    technicians: [],
    kpi_summaries: [],
    nextIds: { tickets: 1, adjustments: 1, technicians: 1, kpi_summaries: 1 }
  };

  async init() {
    try {
      if (existsSync(DB_FILE)) {
        const fileContent = await fs.readFile(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure structure is sound
        if (!this.data.tickets) this.data.tickets = [];
        if (!this.data.adjustments) this.data.adjustments = [];
        if (!this.data.technicians) this.data.technicians = [];
        if (!this.data.kpi_summaries) this.data.kpi_summaries = [];
        if (!this.data.nextIds) {
          this.data.nextIds = {
            tickets: (this.data.tickets.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1,
            adjustments: (this.data.adjustments.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1,
            technicians: (this.data.technicians.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1,
            kpi_summaries: (this.data.kpi_summaries.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1,
          };
        }
        if (!this.data.nextIds.kpi_summaries) {
          this.data.nextIds.kpi_summaries = (this.data.kpi_summaries.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1;
        }
      } else {
        await this.save();
      }
      console.log("JSON Database initialized successfully.");
    } catch (error) {
      console.error("Failed to load database.json, initializing fresh", error);
      await this.save();
    }
  }

  private async save() {
    await fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  // Tickets operations
  async getTickets() {
    return this.data.tickets;
  }

  async insertTicketsIgnore(newTickets: Omit<Ticket, "id">[]) {
    let inserted = 0;
    let skipped = 0;
    for (const t of newTickets) {
      const exists = this.data.tickets.some(x => x.composite_id === t.composite_id);
      if (exists) {
        skipped++;
      } else {
        const id = this.data.nextIds.tickets++;
        this.data.tickets.push({ id, ...t });
        inserted++;
      }
    }
    if (inserted > 0) {
      await this.save();
    }
    return { inserted, skipped };
  }

  // Adjustments operations
  async getAdjustments() {
    return this.data.adjustments;
  }

  async insertAdjustment(adj: Omit<Adjustment, "id">) {
    const id = this.data.nextIds.adjustments++;
    const newAdj = { id, ...adj };
    this.data.adjustments.push(newAdj);
    await this.save();
    return id;
  }

  async deleteAdjustment(id: number) {
    const index = this.data.adjustments.findIndex(x => x.id === id);
    if (index !== -1) {
      this.data.adjustments.splice(index, 1);
      await this.save();
      return true;
    }
    return false;
  }

  // Technicians operations
  async getTechnicians() {
    return this.data.technicians;
  }

  async insertTechnicianIgnore(name: string) {
    const exists = this.data.technicians.some(x => x.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const id = this.data.nextIds.technicians++;
      this.data.technicians.push({ id, name, is_active: 1, custom_notes: "" });
      await this.save();
    }
  }

  async upsertTechnician(name: string, customNotes: string) {
    const techNameClean = name.trim();
    const tech = this.data.technicians.find(x => x.name.toLowerCase() === techNameClean.toLowerCase());
    if (tech) {
      tech.custom_notes = customNotes;
    } else {
      const id = this.data.nextIds.technicians++;
      this.data.technicians.push({ id, name: techNameClean, is_active: 1, custom_notes: customNotes || "" });
    }
    await this.save();
  }

  // KPI Summaries operations
  async getKPISummaries() {
    if (!this.data.kpi_summaries) this.data.kpi_summaries = [];
    return this.data.kpi_summaries;
  }

  async insertKPISummaries(newSummaries: Omit<KPISummary, "id">[]) {
    if (!this.data.kpi_summaries) this.data.kpi_summaries = [];
    if (!this.data.nextIds.kpi_summaries) {
      this.data.nextIds.kpi_summaries = (this.data.kpi_summaries.reduce((max, x) => Math.max(max, x.id), 0) || 0) + 1;
    }

    // Clean old summaries for the same month so we don't duplicate on re-import
    if (newSummaries.length > 0) {
      const monthToImport = newSummaries[0].month;
      this.data.kpi_summaries = this.data.kpi_summaries.filter(x => x.month !== monthToImport);
    }

    for (const s of newSummaries) {
      const id = this.data.nextIds.kpi_summaries++;
      this.data.kpi_summaries.push({ id, ...s });
    }
    await this.save();
  }

  async reset() {
    this.data.tickets = [];
    this.data.adjustments = [];
    this.data.technicians = [];
    this.data.kpi_summaries = [];
    this.data.nextIds = { tickets: 1, adjustments: 1, technicians: 1, kpi_summaries: 1 };
    await this.save();
  }
}

const db = new JsonDB();

// Regular expression to parse the KPI point after '#' in the ticket's Type field
function extractKPIPoint(typeField: string): number {
  if (!typeField) return 0;
  const match = typeField.match(/#\s*([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

// Normalize dates to YYYY-MM-DD
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  
  try {
    const isoMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, "0");
      const day = isoMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch (err) {
    console.error("Error parsing date:", dateStr, err);
  }
  
  return dateStr;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // Initialize JSON Database
  await db.init();

  // API ROUTE 1: Import tickets from uploaded CRM file
  app.post("/api/tickets/import", async (req, res) => {
    const { tickets, isSummary, summaries, reconstructedTickets } = req.body;

    try {
      if (isSummary && Array.isArray(summaries)) {
        await db.insertKPISummaries(summaries);
        
        for (const s of summaries) {
          await db.insertTechnicianIgnore(s.employee_name);
        }

        let countInserted = 0;
        let countSkipped = 0;
        if (Array.isArray(reconstructedTickets)) {
          const importedAt = new Date().toISOString();
          const ticketsToInsert: Omit<Ticket, "id">[] = [];
          
          reconstructedTickets.forEach((rawTicket, idx) => {
            const resolvedBy = String(rawTicket["Resolved By"] || rawTicket["resolved_by"] || "Unassigned").trim();
            const type = String(rawTicket["Type"] || rawTicket["type"] || "").trim();
            const category = String(rawTicket["Ticket Category"] || rawTicket["category"] || "General").trim();
            const createdDate = normalizeDate(String(rawTicket["Created Date"] || rawTicket["created_date"] || "").trim());
            const status = String(rawTicket["Status"] || rawTicket["status"] || "Closed").trim();
            
            const kpiPoints = extractKPIPoint(type);
            // Append progressive index block to allow multiple reconstructed tickets of same details
            const compositeId = `${resolvedBy}_${type}_${category}_${createdDate}_${status}_reconstruct_${idx}`;
            
            ticketsToInsert.push({
              composite_id: compositeId,
              resolved_by: resolvedBy,
              type,
              category,
              created_date: createdDate,
              status,
              kpi_points: kpiPoints,
              imported_at: importedAt
            });
          });

          // Delete previous reconstructed tickets of the month to keep layout clean
          const activeMonthText = summaries[0].month;
          const allTickets = await db.getTickets();
          const filteredKeep = allTickets.filter(t => 
            !(t.created_date && t.created_date.substring(0, 7) === activeMonthText && t.composite_id.includes("_reconstruct_"))
          );
          db["data"].tickets = filteredKeep;

          const outcome = await db.insertTicketsIgnore(ticketsToInsert);
          countInserted = outcome.inserted;
          countSkipped = outcome.skipped;
        }

        return res.json({
          success: true,
          isSummary: true,
          totalParsed: summaries.length,
          inserted: countInserted,
          skipped: countSkipped,
        });
      }

      if (!Array.isArray(tickets)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array of tickets or summary bundle." });
      }

      let countInserted = 0;
      let countSkipped = 0;
      const importedAt = new Date().toISOString();
      const uniqueTechnicians = new Set<string>();
      const ticketsToInsert: Omit<Ticket, "id">[] = [];

      for (const rawTicket of tickets) {
        const resolvedByRaw = rawTicket["Resolved By"] || rawTicket["resolved_by"] || "Unassigned";
        const resolvedBy = String(resolvedByRaw).trim();
        const typeRaw = rawTicket["Type"] || rawTicket["type"] || "";
        const type = String(typeRaw).trim();
        const categoryRaw = rawTicket["Ticket Category"] || rawTicket["category"] || "General";
        const category = String(categoryRaw).trim();
        const createdDateRaw = rawTicket["Created Date"] || rawTicket["created_date"] || "";
        const createdDate = normalizeDate(String(createdDateRaw).trim());
        const statusRaw = rawTicket["Status"] || rawTicket["status"] || "Closed";
        const status = String(statusRaw).trim();

        // Calculate direct KPI points
        const kpiPoints = extractKPIPoint(type);

        // Generate composite_id to protect against duplicate imports
        const compositeId = `${resolvedBy}_${type}_${category}_${createdDate}_${status}`;

        if (resolvedBy && resolvedBy !== "Unassigned") {
          uniqueTechnicians.add(resolvedBy);
        }

        ticketsToInsert.push({
          composite_id: compositeId,
          resolved_by: resolvedBy,
          type,
          category,
          created_date: createdDate,
          status,
          kpi_points: kpiPoints,
          imported_at: importedAt
        });
      }

      const outcome = await db.insertTicketsIgnore(ticketsToInsert);
      countInserted = outcome.inserted;
      countSkipped = outcome.skipped;

      for (const techName of uniqueTechnicians) {
        await db.insertTechnicianIgnore(techName);
      }

      res.json({
        success: true,
        totalParsed: tickets.length,
        inserted: countInserted,
        skipped: countSkipped,
      });
    } catch (error: any) {
      console.error("Import tickets error:", error);
      res.status(500).json({ error: error.message || "An error occurred during import." });
    }
  });

  // API ROUTE 2: Get entire dashboard summary filtered by Year-Month (e.g. YYYY-MM)
  app.get("/api/dashboard", async (req, res) => {
    const { month } = req.query; // YYYY-MM format or 'ALL'
    
    try {
      let tickets = await db.getTickets();
      let adjustments = await db.getAdjustments();
      let summaries = await db.getKPISummaries();
      const techniciansList = (await db.getTechnicians()).filter(t => t.is_active === 1);

      if (month && month !== "ALL" && typeof month === "string") {
        tickets = tickets.filter(t => t.created_date && t.created_date.substring(0, 7) === month);
        adjustments = adjustments.filter(adj => adj.date && adj.date.substring(0, 7) === month);
        summaries = summaries.filter(s => s.month === month);
      }

      // In-memory aggregations for supreme flexibility and performance
      const techAggregates: Record<string, {
        name: string;
        resolved_count: number;
        kpi_points: number;
        bonuses: number;
        penalties: number;
        net_score: number;
      }> = {};

      // Seed technicians list so all active techs appear, even with 0 tickets
      techniciansList.forEach((tech) => {
        techAggregates[tech.name] = {
          name: tech.name,
          resolved_count: 0,
          kpi_points: 0,
          bonuses: 0,
          penalties: 0,
          net_score: 0,
        };
      });

      // Aggregate tickets
      tickets.forEach((t) => {
        const name = t.resolved_by || "Unassigned";
        if (!techAggregates[name]) {
          techAggregates[name] = {
            name,
            resolved_count: 0,
            kpi_points: 0,
            bonuses: 0,
            penalties: 0,
            net_score: 0,
          };
        }
        techAggregates[name].resolved_count += 1;
        techAggregates[name].kpi_points += t.kpi_points || 0;
      });

      // Aggregate manual adjustments
      adjustments.forEach((adj) => {
        const name = adj.technician_name;
        if (!techAggregates[name]) {
          techAggregates[name] = {
            name,
            resolved_count: 0,
            kpi_points: 0,
            bonuses: 0,
            penalties: 0,
            net_score: 0,
          };
        }
        if (adj.type === "Bonus") {
          techAggregates[name].bonuses += adj.amount || 0;
        } else {
          techAggregates[name].penalties += adj.amount || 0;
        }
      });

      // Compute final scores and construct ranking list
      const rankings = Object.values(techAggregates).map((tech) => {
        const net_score = Number((tech.kpi_points + tech.bonuses - tech.penalties).toFixed(2));
        
        // Match with any summaries
        const summary = summaries.find(s => 
          s.employee_name.toLowerCase().includes(tech.name.toLowerCase()) || 
          tech.name.toLowerCase().includes(s.employee_name.toLowerCase())
        );

        return {
          ...tech,
          kpi_points: Number(tech.kpi_points.toFixed(2)),
          bonuses: Number(tech.bonuses.toFixed(2)),
          penalties: Number(tech.penalties.toFixed(2)),
          net_score,

          // Optional Call Center Stats
          dials: summary ? summary.dials : undefined,
          inbound_connects: summary ? summary.inbound_connects : undefined,
          outbound_connects: summary ? summary.outbound_connects : undefined,
          inbound_calls: summary ? summary.inbound_calls : undefined,
          outbound_calls: summary ? summary.outbound_calls : undefined,
          weekend_days: summary ? summary.weekend_days : undefined,
          weekend_points: summary ? summary.weekend_points : undefined,
          deducted_points: summary ? summary.deducted_points : undefined,
          ranking_tier: summary ? summary.rank : undefined,
          payout: summary ? summary.payout : undefined,
        };
      }).sort((a, b) => b.net_score - a.net_score);

      // Aggregate by categories
      const categoryAggregates: Record<string, { name: string; kpi_points: number; ticket_count: number }> = {};
      tickets.forEach((t) => {
        const catName = t.category || "General";
        if (!categoryAggregates[catName]) {
          categoryAggregates[catName] = { name: catName, kpi_points: 0, ticket_count: 0 };
        }
        categoryAggregates[catName].kpi_points += t.kpi_points || 0;
        categoryAggregates[catName].ticket_count += 1;
      });

      const categories = Object.values(categoryAggregates).map((cat) => ({
        ...cat,
        kpi_points: Number(cat.kpi_points.toFixed(2)),
      })).sort((a, b) => b.kpi_points - a.kpi_points);

      // Aggregate trends
      const trendAggregates: Record<string, { date: string; kpi_points: number; ticket_count: number }> = {};
      tickets.forEach((t) => {
        const date = t.created_date; // YYYY-MM-DD
        if (date) {
          if (!trendAggregates[date]) {
            trendAggregates[date] = { date, kpi_points: 0, ticket_count: 0 };
          }
          trendAggregates[date].kpi_points += t.kpi_points || 0;
          trendAggregates[date].ticket_count += 1;
        }
      });

      const trends = Object.values(trendAggregates).map((tr) => ({
        ...tr,
        kpi_points: Number(tr.kpi_points.toFixed(2)),
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Get uniquely available reporting months dynamically from all tickets and summaries
      const allTickets = await db.getTickets();
      const allSummaries = await db.getKPISummaries();
      const monthsSet = new Set<string>();
      
      allTickets.forEach((t) => {
        if (t.created_date && t.created_date.length >= 7) {
          const m = t.created_date.substring(0, 7);
          if (m.match(/^\d{4}-\d{2}$/)) {
            monthsSet.add(m);
          }
        }
      });

      allSummaries.forEach((s) => {
        if (s.month && s.month.match(/^\d{4}-\d{2}$/)) {
          monthsSet.add(s.month);
        }
      });

      const availableMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

      // Compute global call center summaries if present
      const totalDials = summaries.length > 0 ? summaries.reduce((sum, s) => sum + (s.dials || 0), 0) : undefined;
      const totalInboundConnects = summaries.length > 0 ? summaries.reduce((sum, s) => sum + (s.inbound_connects || 0), 0) : undefined;
      const totalOutboundConnects = summaries.length > 0 ? summaries.reduce((sum, s) => sum + (s.outbound_connects || 0), 0) : undefined;
      const totalInboundCalls = summaries.length > 0 ? summaries.reduce((sum, s) => sum + (s.inbound_calls || 0), 0) : undefined;
      const totalOutboundCalls = summaries.length > 0 ? summaries.reduce((sum, s) => sum + (s.outbound_calls || 0), 0) : undefined;
      const totalKPISummaryPoints = summaries.length > 0 ? Number(summaries.reduce((sum, s) => sum + (s.total_points || 0), 0).toFixed(2)) : undefined;
      const totalTicketPoints = summaries.length > 0 ? Number(summaries.reduce((sum, s) => sum + (s.ticket_points || 0), 0).toFixed(2)) : undefined;
      const totalWeekendPoints = summaries.length > 0 ? Number(summaries.reduce((sum, s) => sum + (s.weekend_points || 0), 0).toFixed(2)) : undefined;
      const totalDeductedPoints = summaries.length > 0 ? Number(summaries.reduce((sum, s) => sum + (s.deducted_points || 0), 0).toFixed(2)) : undefined;

      res.json({
        rankings,
        categories,
        trends,
        adjustments,
        tickets,
        availableMonths,
        ticketsCount: tickets.length,
        totalKpiPoints: Number(tickets.reduce((sum, t) => sum + (t.kpi_points || 0), 0).toFixed(2)),
        totalManualBonus: Number(adjustments.reduce((sum, a) => sum + (a.type === "Bonus" ? a.amount : 0), 0).toFixed(2)),
        totalManualPenalty: Number(adjustments.reduce((sum, a) => sum + (a.type === "Penalty" ? a.amount : 0), 0).toFixed(2)),
        technicianCount: rankings.filter(r => r.resolved_count > 0 || r.net_score > 0).length,
        kpiSummaries: summaries,
        totalDials,
        totalInboundConnects,
        totalOutboundConnects,
        totalInboundCalls,
        totalOutboundCalls,
        totalKPISummaryPoints,
        totalTicketPoints,
        totalWeekendPoints,
        totalDeductedPoints,
      });
    } catch (error: any) {
      console.error("Dashboard calculation error:", error);
      res.status(500).json({ error: error.message || "An error occurred fetching dashboard metrics." });
    }
  });

  // API ROUTE 3: Adjustments Routing (CREATE manual adjustment)
  app.post("/api/adjustments", async (req, res) => {
    const { technician_name, amount, type, description, date } = req.body;

    if (!technician_name || typeof amount !== "number" || !type || !date) {
      return res.status(400).json({ error: "Missing required fields for manual adjustment (technician_name, amount, type, date)." });
    }

    try {
      const parsedDate = normalizeDate(date);
      const adjustmentId = await db.insertAdjustment({
        technician_name: technician_name.trim(),
        amount,
        type,
        description: description || "",
        date: parsedDate
      });

      // Check if tech exists in technicians, if not insert
      await db.insertTechnicianIgnore(technician_name.trim());

      res.json({
        success: true,
        adjustmentId,
      });
    } catch (error: any) {
      console.error("Manual adjustment error:", error);
      res.status(500).json({ error: error.message || "An error occurred creating manual adjustment." });
    }
  });

  // API ROUTE 4: Adjustments Routing (DELETE manual adjustment)
  app.delete("/api/adjustments/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const success = await db.deleteAdjustment(Number(id));
      if (success) {
        res.json({ success: true, message: "Adjustment deleted successfully." });
      } else {
        res.status(404).json({ error: "Adjustment not found." });
      }
    } catch (error: any) {
      console.error("Delete adjustment error:", error);
      res.status(500).json({ error: error.message || "An error occurred deleting historical adjustment." });
    }
  });

  // API ROUTE 5: Get Technicians
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await db.getTechnicians();
      const sorted = [...technicians].sort((a, b) => a.name.localeCompare(b.name));
      res.json(sorted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API ROUTE 6: Create or update a technician
  app.post("/api/technicians", async (req, res) => {
    const { name, custom_notes } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Technician name is required" });
    }
    try {
      await db.upsertTechnician(name.trim(), custom_notes || "");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API ROUTE 7: Reset entire database (clear tables)
  app.post("/api/reset", async (req, res) => {
    try {
      await db.reset();
      res.json({ success: true, message: "All transactions and records have been cleared." });
    } catch (error: any) {
      console.error("Database reset error:", error);
      res.status(500).json({ error: error.message || "An error occurred while resetting the database." });
    }
  });

  // Serve Frontend via Vite dev server in development or build outputs in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failure starting the full-stack server:", error);
  process.exit(1);
});
