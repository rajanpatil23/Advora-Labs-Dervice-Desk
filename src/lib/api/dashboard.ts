export type WidgetSize = "sm" | "md" | "lg" | "xl";
export type WidgetId =
  | "metric_total"
  | "metric_open"
  | "metric_overdue"
  | "metric_resolved_today"
  | "metric_at_risk"
  | "metric_csat"
  | "trend_area"
  | "sla_radial"
  | "category_bar"
  | "priority_pie"
  | "agent_workload"
  | "high_priority_list"
  | "recent_activity"
  | "my_queue_summary"
  | "incident_pulse";

export type WidgetInstance = {
  uid: string;
  id: WidgetId;
  size: WidgetSize;
};

export type DashboardLayout = {
  widgets: WidgetInstance[];
  updatedAt: string;
};

export type WidgetMeta = {
  id: WidgetId;
  title: string;
  description: string;
  category: "Metric" | "Chart" | "List" | "Activity";
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
};

export const WIDGET_CATALOG: WidgetMeta[] = [
  { id: "metric_total", title: "Total tickets", description: "Lifetime ticket count", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "metric_open", title: "Open tickets", description: "Currently unresolved", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "metric_overdue", title: "Overdue", description: "SLA breached tickets", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "metric_resolved_today", title: "Resolved today", description: "Closed in last 24h", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "metric_at_risk", title: "At risk", description: "SLA approaching breach", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "metric_csat", title: "CSAT score", description: "Customer satisfaction", category: "Metric", defaultSize: "sm", allowedSizes: ["sm"] },
  { id: "trend_area", title: "Ticket trend", description: "Created vs resolved over time", category: "Chart", defaultSize: "lg", allowedSizes: ["md", "lg", "xl"] },
  { id: "sla_radial", title: "SLA compliance", description: "Met / at-risk / breached", category: "Chart", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "category_bar", title: "Tickets by category", description: "Distribution by topic", category: "Chart", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "priority_pie", title: "By priority", description: "Critical / high / medium / low", category: "Chart", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "agent_workload", title: "Agent workload", description: "Tickets per agent", category: "Chart", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "high_priority_list", title: "High priority tickets", description: "Top issues needing attention", category: "List", defaultSize: "lg", allowedSizes: ["md", "lg", "xl"] },
  { id: "recent_activity", title: "Recent activity", description: "Latest events across the org", category: "Activity", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "my_queue_summary", title: "My queue", description: "Tickets assigned to me", category: "List", defaultSize: "md", allowedSizes: ["md", "lg"] },
  { id: "incident_pulse", title: "Incident pulse", description: "Active incidents and severity", category: "Activity", defaultSize: "md", allowedSizes: ["md", "lg"] },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { uid: "w1", id: "metric_total", size: "sm" },
    { uid: "w2", id: "metric_open", size: "sm" },
    { uid: "w3", id: "metric_overdue", size: "sm" },
    { uid: "w4", id: "metric_resolved_today", size: "sm" },
    { uid: "w5", id: "trend_area", size: "lg" },
    { uid: "w6", id: "sla_radial", size: "md" },
    { uid: "w7", id: "category_bar", size: "md" },
    { uid: "w8", id: "priority_pie", size: "md" },
    { uid: "w9", id: "agent_workload", size: "md" },
    { uid: "w10", id: "high_priority_list", size: "lg" },
    { uid: "w11", id: "recent_activity", size: "md" },
  ],
  updatedAt: new Date().toISOString(),
};

const KEY = "lovable.dashboard.layout.v1";

export const dashboardApi = {
  load(): DashboardLayout {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT_LAYOUT;
      const parsed = JSON.parse(raw) as DashboardLayout;
      if (!parsed.widgets?.length) return DEFAULT_LAYOUT;
      return parsed;
    } catch {
      return DEFAULT_LAYOUT;
    }
  },
  save(layout: DashboardLayout) {
    localStorage.setItem(KEY, JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }));
  },
  reset() {
    localStorage.removeItem(KEY);
  },
};

export const SIZE_CLASS: Record<WidgetSize, string> = {
  sm: "col-span-12 sm:col-span-6 lg:col-span-3",
  md: "col-span-12 lg:col-span-6 xl:col-span-4",
  lg: "col-span-12 xl:col-span-8",
  xl: "col-span-12",
};

export function getMeta(id: WidgetId): WidgetMeta | undefined {
  return WIDGET_CATALOG.find((w) => w.id === id);
}
