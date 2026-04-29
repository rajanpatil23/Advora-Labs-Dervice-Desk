import { useAppStore, useOrgAgents, useOrgCustomers, useOrgSettings } from "@/lib/store";
import { Building2, Bell, Palette, ShieldCheck, Tag, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const sections = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "roles", label: "Roles & members", icon: Users },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export default function Settings() {
  const [sel, setSel] = useState("company");
  const { theme, toggleTheme, addCategory, removeCategory, setNotificationPref, updateOrgSettings } = useAppStore();
  const settings = useOrgSettings();
  const orgAgents = useOrgAgents();
  const orgCustomers = useOrgCustomers();
  const { currentMembership } = useAuth();

  const [companyDraft, setCompanyDraft] = useState({
    companyName: settings.companyName,
    supportEmail: settings.supportEmail,
    timezone: settings.timezone,
  });

  // Reset draft when org changes
  const orgKey = currentMembership?.org_id;
  useEffect(() => {
    setCompanyDraft({
      companyName: settings.companyName,
      supportEmail: settings.supportEmail,
      timezone: settings.timezone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgKey]);

  const addCat = () => {
    const name = window.prompt("New category name");
    if (name && name.trim()) {
      addCategory(name.trim());
      toast.success(`Added "${name.trim()}"`);
    }
  };
  const removeCat = (c: string) => { removeCategory(c); toast.message(`Removed "${c}"`); };

  const saveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgSettings(companyDraft);
    toast.success("Workspace settings saved");
  };

  const allMembers = [
    ...orgAgents.map(a => ({ id: a.id, name: a.name, email: a.email, role: a.role, kind: "Agent" as const })),
    ...orgCustomers.map(c => ({ id: c.id, name: c.name, email: c.email, role: c.role, kind: "Requester" as const })),
  ];

  const rolePermissions = [
    { role: "owner", tickets: "Full", settings: "Full", billing: "Full" },
    { role: "admin", tickets: "Full", settings: "Full", billing: "Full" },
    { role: "manager", tickets: "Full", settings: "Limited", billing: "View" },
    { role: "agent", tickets: "Read/Write", settings: "—", billing: "—" },
    { role: "resolver", tickets: "Read/Write", settings: "—", billing: "—" },
    { role: "requester", tickets: "Own only", settings: "—", billing: "—" },
  ];

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
              <form onSubmit={saveCompany} className="space-y-5">
                <div>
                  <div className="font-display font-semibold">Company profile</div>
                  <div className="text-xs text-muted-foreground">How your support workspace appears to customers.</div>
                </div>
                <Field label="Company name" value={companyDraft.companyName} onChange={(v) => setCompanyDraft({ ...companyDraft, companyName: v })} />
                <Field label="Support email" value={companyDraft.supportEmail} onChange={(v) => setCompanyDraft({ ...companyDraft, supportEmail: v })} />
                <Field label="Time zone" value={companyDraft.timezone} onChange={(v) => setCompanyDraft({ ...companyDraft, timezone: v })} />
                <button type="submit" className="h-9 px-4 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold">Save changes</button>
              </form>
            )}
            {sel === "categories" && (
              <>
                <div>
                  <div className="font-display font-semibold">Ticket categories</div>
                  <div className="text-xs text-muted-foreground">Used by ticket creation and reports for this workspace.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.categories.map(c => (
                    <span key={c} className="px-3 py-1.5 rounded-lg bg-surface-2 text-sm border border-border">
                      {c} <button onClick={() => removeCat(c)} className="ml-2 text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                  <button onClick={addCat} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm">+ Add category</button>
                </div>
              </>
            )}
            {sel === "notifications" && (
              <>
                <div className="font-display font-semibold">Notifications</div>
                {Object.entries(settings.notifications).map(([k, v]) => (
                  <Toggle key={k} label={k} checked={v} onChange={() => setNotificationPref(k, !v)} />
                ))}
              </>
            )}
            {sel === "appearance" && (
              <>
                <div className="font-display font-semibold">Appearance</div>
                <Toggle label="Dark mode" checked={theme === "dark"} onChange={toggleTheme} />
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {["#6366f1","#8b5cf6","#0ea5e9","#22c55e"].map(c => (
                    <button key={c} className="h-12 rounded-xl border-2 border-transparent hover:border-foreground/20" style={{ background: c }} title={c} />
                  ))}
                </div>
              </>
            )}
            {sel === "roles" && (
              <div className="space-y-6">
                <div>
                  <div className="font-display font-semibold">Role permissions</div>
                  <table className="w-full text-sm mt-2">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="text-left py-2">Role</th><th className="text-left py-2">Tickets</th><th className="text-left py-2">Settings</th><th className="text-left py-2">Billing</th></tr>
                    </thead>
                    <tbody>
                      {rolePermissions.map(r => (
                        <tr key={r.role} className="border-t border-border">
                          <td className="py-2 font-medium capitalize">{r.role}</td>
                          <td className="py-2 text-muted-foreground">{r.tickets}</td>
                          <td className="py-2 text-muted-foreground">{r.settings}</td>
                          <td className="py-2 text-muted-foreground">{r.billing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="font-display font-semibold">Workspace members ({allMembers.length})</div>
                  <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-lg">
                    {allMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-2 capitalize">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {sel === "security" && (
              <>
                <div className="font-display font-semibold">Security</div>
                <Toggle label="Require 2FA for all agents" checked={settings.require2fa} onChange={() => updateOrgSettings({ require2fa: !settings.require2fa })} />
                <Toggle label="Single sign-on (SSO)" checked={settings.ssoEnabled} onChange={() => updateOrgSettings({ ssoEnabled: !settings.ssoEnabled })} />
                <Toggle label="Session timeout after 30 min" checked={settings.sessionTimeout} onChange={() => updateOrgSettings({ sessionTimeout: !settings.sessionTimeout })} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm" />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} type="button" className="w-full flex items-center justify-between py-2.5 group">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-gradient-primary" : "bg-surface-2"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
