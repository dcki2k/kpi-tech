export interface Ticket {
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

export interface Adjustment {
  id: number;
  technician_name: string;
  amount: number;
  type: "Bonus" | "Penalty";
  description: string;
  date: string;
}

export interface TechnicianRank {
  name: string;
  resolved_count: number;
  kpi_points: number;
  bonuses: number;
  penalties: number;
  net_score: number;
  
  // Call center optional fields
  dials?: number;
  inbound_connects?: number;
  outbound_connects?: number;
  inbound_calls?: number;
  outbound_calls?: number;
  weekend_days?: number;
  weekend_points?: number;
  deducted_points?: number;
  ranking_tier?: string;
  payout?: number;
}

export interface CategoryAggregate {
  name: string;
  kpi_points: number;
  ticket_count: number;
}

export interface TrendAggregate {
  date: string;
  kpi_points: number;
  ticket_count: number;
}

export interface KPISummary {
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

export interface DashboardData {
  rankings: TechnicianRank[];
  categories: CategoryAggregate[];
  trends: TrendAggregate[];
  adjustments: Adjustment[];
  ticketsCount: number;
  totalKpiPoints: number;
  totalManualBonus: number;
  totalManualPenalty: number;
  technicianCount: number;
  kpiSummaries?: KPISummary[];
  
  // Call center optional fields
  totalDials?: number;
  totalInboundConnects?: number;
  totalOutboundConnects?: number;
  totalInboundCalls?: number;
  totalOutboundCalls?: number;
  totalKPISummaryPoints?: number;
  totalTicketPoints?: number;
  totalWeekendPoints?: number;
  totalDeductedPoints?: number;
}

export interface Technician {
  id: number;
  name: string;
  is_active: number;
  custom_notes: string;
}
