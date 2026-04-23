import { useAppStore } from "@/lib/store";
import { agents } from "@/lib/mockData";
import { Download } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

export default function Reports() {
  const { tickets } = useAppStore();
  const volume = Array.from({ length: 12 }, (_, i) => ({ m: `M${i+1}`, vol: 80 + Math.round(Math.sin(i/2)*30 + Math.random()*40) }));
  const resTime = Array.from({ length: 12 }, (_, i) => ({ m: `M${i+1}`, h: 6 + Math.round(Math.cos(i/2)*3 + Math.random()*4) }));
  const cats = ["Network","Hardware","Access","Software","Email","Security","Cloud"].map(c => ({ name: c, count: tickets.filter(t => t.category === c).length }));
  const perf = agents.slice(0,8).map(a => ({ name: a.name.split(" ")[0], resolved: a.resolved, rating: a.rating * 20 }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Analytics</div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Reports</h1>
          </div>
          <div className="flex gap-2">
            <select className="h-10 px-3 rounded-lg bg-surface border border-border text-sm">
              <option>Last 12 months</option><option>Last 90 days</option><option>Last 30 days</option>
            </select>
            <button className="h-10 px-4 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"><Download className="h-4 w-4" /> Export</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Ticket volume trend">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={volume} margin={{ left: -20, top: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="vol" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Resolution time (hours)">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={resTime} margin={{ left: -20, top: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="h" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Tickets by category">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={cats} margin={{ left: -20, top: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} cursor={{ fill: "hsl(var(--surface-2))" }} />
                  <Bar dataKey="count" radius={[8,8,0,0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Agent performance">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={perf} margin={{ left: -20, top: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} cursor={{ fill: "hsl(var(--surface-2))" }} />
                  <Bar dataKey="resolved" radius={[8,8,0,0]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="panel p-5">
      <div className="font-display font-semibold mb-4">{title}</div>
      {children}
    </div>
  );
}
