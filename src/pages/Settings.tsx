import { useAppStore } from "@/lib/store";
import { Building2, Bell, Palette, ShieldCheck, Tag, Users } from "lucide-react";
import { useState } from "react";

const sections = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "roles", label: "Roles", icon: Users },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export default function Settings() {
  const [sel, setSel] = useState("company");
  const { theme, toggleTheme } = useAppStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuration</div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold mt-1">Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <nav className="space-y-1">
            {sections.map(s => {
              const Icon = s.icon;
              const active = sel === s.id;
              return (
                <button key={s.id} onClick={() => setSel(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-surface-2"}`}>
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </nav>

          <div className="panel p-6 space-y-5">
            {sel === "company" && (
              <>
                <div>
                  <div className="font-display font-semibold">Company profile</div>
                  <div className="text-xs text-muted-foreground">How your support workspace appears to customers.</div>
                </div>
                <Field label="Company name" defaultValue="Connecttly" />
                <Field label="Support email" defaultValue="support@connecttly.io" />
                <Field label="Time zone" defaultValue="Europe/Stockholm" />
              </>
            )}
            {sel === "categories" && (
              <>
                <div className="font-display font-semibold">Ticket categories</div>
                <div className="flex flex-wrap gap-2">
                  {["Network","Hardware","Access","Software","Email","Security","Cloud","Mobile"].map(c => (
                    <span key={c} className="px-3 py-1.5 rounded-lg bg-surface-2 text-sm border border-border">{c} <button className="ml-2 text-muted-foreground">×</button></span>
                  ))}
                  <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm">+ Add category</button>
                </div>
              </>
            )}
            {sel === "notifications" && (
              <>
                <div className="font-display font-semibold">Notifications</div>
                {["New ticket assigned","SLA at risk","SLA breached","Mention in note","Daily summary"].map(n => (
                  <Toggle key={n} label={n} defaultChecked />
                ))}
              </>
            )}
            {sel === "appearance" && (
              <>
                <div className="font-display font-semibold">Appearance</div>
                <Toggle label="Dark mode" checked={theme === "dark"} onChange={toggleTheme} />
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {["#6366f1","#8b5cf6","#0ea5e9","#22c55e"].map(c => (
                    <button key={c} className="h-12 rounded-xl border-2 border-transparent hover:border-foreground/20" style={{ background: c }} />
                  ))}
                </div>
              </>
            )}
            {sel === "roles" && (
              <>
                <div className="font-display font-semibold">Roles & permissions</div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="text-left py-2">Role</th><th className="text-left py-2">Tickets</th><th className="text-left py-2">Settings</th></tr></thead>
                  <tbody>
                    {["Admin","Support Manager","Support Agent","Viewer","Requester"].map(r => (
                      <tr key={r} className="border-t border-border"><td className="py-2 font-medium">{r}</td><td className="py-2 text-muted-foreground">Full</td><td className="py-2 text-muted-foreground">{r === "Admin" ? "Full" : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {sel === "security" && (
              <>
                <div className="font-display font-semibold">Security</div>
                <Toggle label="Require 2FA for all agents" defaultChecked />
                <Toggle label="Single sign-on (SSO)" defaultChecked />
                <Toggle label="Session timeout after 30 min" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: any) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input defaultValue={defaultValue} className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
    </div>
  );
}

function Toggle({ label, defaultChecked, checked, onChange }: any) {
  const [on, setOn] = useState(defaultChecked ?? false);
  const isOn = checked !== undefined ? checked : on;
  const handle = () => { if (onChange) onChange(); else setOn(!on); };
  return (
    <button onClick={handle} className="w-full flex items-center justify-between py-2.5 group">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${isOn ? "bg-gradient-primary" : "bg-surface-2"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
