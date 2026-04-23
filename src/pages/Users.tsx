import { customers } from "@/lib/mockData";
import { Avatar } from "@/components/common/Chips";
import { Building2, Mail } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function Users() {
  const { tickets } = useAppStore();
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CRM</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Users & Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Requesters, companies and ticket history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map(c => {
            const open = tickets.filter(t => t.requesterId === c.id && t.status !== "resolved" && t.status !== "closed").length;
            const total = tickets.filter(t => t.requesterId === c.id).length;
            return (
              <div key={c.id} className="panel-elev p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar initials={c.initials} color={c.avatarColor} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="h-3 w-3" /> {c.company}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <KV label="Total" value={total} />
                  <KV label="Open" value={open} tone="primary" />
                  <KV label="Tier" value="Pro" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, tone }: { label: string; value: any; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display font-bold text-lg ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
