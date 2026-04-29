import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Search, Plus, ArrowRight, Inbox, BookOpen, ShoppingBag, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useAppStore, useOrgArticles, useOrgCatalog } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export default function PortalHome() {
  const { user } = useAuth();
  const { tickets } = useAppStore();
  const articles = useOrgArticles();
  const catalog = useOrgCatalog();

  const myRequests = useMemo(
    () =>
      tickets
        .filter((t) => t.requesterId === user?.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [tickets, user]
  );

  const open = myRequests.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const popularArticles = articles.slice(0, 4);
  const popularCatalog = catalog.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-5">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl leading-tight">
          How can we <span className="gradient-text">help you</span> today?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Browse self-service answers, request something new, or check the status of an active request.
        </p>

        <div className="max-w-xl mx-auto pt-2">
          <Link
            to="/portal/kb"
            className="flex items-center gap-3 h-12 px-4 rounded-2xl bg-surface border border-border hover:border-ring transition-colors group"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1 text-left">Search articles, FAQs, how-tos…</span>
            <kbd className="text-[10px] text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">Enter</kbd>
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          to="/portal/new"
          icon={Plus}
          title="Submit a request"
          desc="Report an issue or ask a question"
          accent="primary"
        />
        <QuickAction
          to="/portal/catalog"
          icon={ShoppingBag}
          title="Browse catalog"
          desc="Hardware, software, access & more"
        />
        <QuickAction
          to="/portal/requests"
          icon={Inbox}
          title="My requests"
          desc={open > 0 ? `${open} open` : "Track active requests"}
          badge={open > 0 ? open : undefined}
        />
      </section>

      {/* Recent requests */}
      {myRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-semibold text-lg">Your recent requests</h2>
            <Link to="/portal/requests" className="text-xs text-primary hover:underline flex items-center gap-1">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {myRequests.map((t) => (
              <Link
                key={t.id}
                to={`/portal/requests/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors group"
              >
                <StatusIcon status={t.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{t.number}</span>
                    <span>·</span>
                    <span>{timeAgo(t.updatedAt)}</span>
                  </div>
                  <div className="text-sm font-medium truncate mt-0.5">{t.title}</div>
                </div>
                <StatusChip status={t.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      {popularCatalog.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-semibold text-lg">Popular requests</h2>
            <Link to="/portal/catalog" className="text-xs text-primary hover:underline flex items-center gap-1">
              Full catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {popularCatalog.map((item) => {
              const Icon = ((Icons as unknown) as Record<string, typeof Plus>)[item.icon] ?? Icons.Package;
              return (
                <Link
                  key={item.id}
                  to={`/portal/new?catalog=${item.id}`}
                  className="rounded-2xl border border-border bg-surface p-4 hover:border-ring hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary/15 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 font-semibold text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* KB */}
      {popularArticles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Helpful articles
            </h2>
            <Link to="/portal/kb" className="text-xs text-primary hover:underline flex items-center gap-1">
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularArticles.map((a) => (
              <Link
                key={a.id}
                to={`/portal/kb/${a.id}`}
                className="rounded-xl border border-border bg-surface p-4 hover:border-ring transition-colors"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.category}</div>
                <div className="font-medium text-sm mt-1 line-clamp-1">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickAction({
  to, icon: Icon, title, desc, accent, badge,
}: { to: string; icon: typeof Plus; title: string; desc: string; accent?: "primary"; badge?: number }) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-2xl border p-5 hover:-translate-y-0.5 transition-all flex flex-col gap-3",
        accent === "primary"
          ? "border-primary/30 bg-gradient-primary/10 hover:shadow-glow"
          : "border-border bg-surface hover:border-ring"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center",
          accent === "primary" ? "bg-gradient-primary text-primary-foreground" : "bg-surface-2 text-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        {badge !== undefined && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums">{badge}</span>
        )}
      </div>
      <div>
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "resolved" || status === "closed")
    return <CheckCircle2 className="h-5 w-5 text-success shrink-0" />;
  if (status === "in_progress")
    return <Loader2 className="h-5 w-5 text-primary shrink-0 animate-spin" />;
  return <Clock className="h-5 w-5 text-muted-foreground shrink-0" />;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new: { cls: "bg-info/10 text-info", label: "Submitted" },
    open: { cls: "bg-info/10 text-info", label: "Open" },
    in_progress: { cls: "bg-primary/10 text-primary", label: "In progress" },
    on_hold: { cls: "bg-warning/10 text-warning", label: "On hold" },
    resolved: { cls: "bg-success/10 text-success", label: "Resolved" },
    closed: { cls: "bg-muted text-muted-foreground", label: "Closed" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded", m.cls)}>{m.label}</span>;
}
