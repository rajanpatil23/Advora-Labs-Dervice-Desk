import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { BookOpen, Search, ArrowLeft, ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { useOrgArticles, useAppStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PortalKnowledge() {
  const articles = useOrgArticles();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set(articles.map((a) => a.category));
    return ["all", ...Array.from(set)];
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat !== "all") list = list.filter((a) => a.category === activeCat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((a) =>
        a.title.toLowerCase().includes(needle) ||
        a.excerpt.toLowerCase().includes(needle) ||
        a.body.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [articles, activeCat, q]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <header className="text-center space-y-3 pb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground inline-flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl">Find answers fast</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Articles, how-tos, and troubleshooting guides curated by the team.
        </p>
        <div className="max-w-xl mx-auto pt-2">
          <div className="flex items-center gap-3 h-12 px-4 rounded-2xl bg-surface border border-border focus-within:border-ring">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search articles…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>
      </header>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
              activeCat === c
                ? "bg-foreground text-background border-foreground"
                : "bg-surface border-border text-muted-foreground hover:border-ring"
            )}
          >
            {c === "all" ? "All topics" : c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
          No articles found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/portal/kb/${a.id}`}
              className="rounded-2xl border border-border bg-surface p-5 hover:border-ring hover:-translate-y-0.5 transition-all"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.category}</div>
              <div className="font-display font-semibold mt-1">{a.title}</div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views}</span>
                <span>·</span>
                <span>{a.helpful}% helpful</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortalKnowledgeArticle() {
  const { id = "" } = useParams();
  const articles = useOrgArticles();
  const voteArticle = useAppStore((s) => s.voteArticle);
  const article = articles.find((a) => a.id === id);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  if (!article) return <Navigate to="/portal/kb" replace />;

  const vote = (helpful: boolean) => {
    if (voted) return;
    voteArticle(article.id, helpful);
    setVoted(helpful ? "up" : "down");
    toast.success("Thanks for the feedback");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <Link to="/portal/kb" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Knowledge base
      </Link>

      <article className="space-y-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{article.category}</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">{article.title}</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{article.author}</span>
          <span>·</span>
          <span>Updated {timeAgo(article.updatedAt)}</span>
          <span>·</span>
          <span>{article.views} views</span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
          <p className="text-base text-muted-foreground italic">{article.excerpt}</p>
          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{article.body}</div>
        </div>
      </article>

      <section className="rounded-2xl border border-border bg-surface p-5 text-center">
        <div className="text-sm font-medium">Was this helpful?</div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => vote(true)}
            disabled={!!voted}
            className={cn(
              "h-9 px-4 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 transition-colors",
              voted === "up" ? "bg-success text-success-foreground border-success" : "border-border hover:border-ring"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <button
            onClick={() => vote(false)}
            disabled={!!voted}
            className={cn(
              "h-9 px-4 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 transition-colors",
              voted === "down" ? "bg-destructive text-destructive-foreground border-destructive" : "border-border hover:border-ring"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> No
          </button>
        </div>
        {voted === "down" && (
          <p className="text-xs text-muted-foreground mt-3">
            Still need help? <Link to="/portal/new" className="text-primary hover:underline">Submit a request</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
