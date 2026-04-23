import { useState } from "react";
import { articles } from "@/lib/mockData";
import { Search, ThumbsUp, Eye, BookOpen, ChevronRight } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function KnowledgeBase() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(articles[0]);
  const list = articles.filter(a => a.title.toLowerCase().includes(q.toLowerCase()));
  const cats = Array.from(new Set(articles.map(a => a.category)));

  return (
    <div className="h-full flex">
      <div className="w-[380px] shrink-0 border-r border-border flex flex-col bg-surface/30">
        <div className="p-4 space-y-3 border-b border-border">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Knowledge Base</div>
            <h1 className="text-2xl font-display font-bold mt-1">Articles</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles…" className="w-full h-10 pl-10 pr-3 rounded-xl bg-surface-2 text-sm outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map(c => <span key={c} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border">{c}</span>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map(a => (
            <button key={a.id} onClick={() => setSel(a)} className={`w-full text-left px-4 py-3 border-b border-border/60 ticket-row ${sel.id === a.id ? "active" : ""}`}>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-surface-2">{a.category}</span>
                <span>· {timeAgo(a.updatedAt)}</span>
              </div>
              <div className="font-medium text-sm mt-1 line-clamp-2">{a.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {a.helpful}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge Base <ChevronRight className="h-3 w-3" /> {sel.category}
          </div>
          <h1 className="mt-3 font-display font-bold text-3xl lg:text-4xl tracking-tight">{sel.title}</h1>
          <div className="mt-3 text-sm text-muted-foreground">By {sel.author} · Updated {timeAgo(sel.updatedAt)}</div>
          <div className="mt-8 prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">{sel.body}</div>

          <div className="mt-10 panel p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Was this article helpful?</div>
              <div className="text-xs text-muted-foreground">{sel.helpful}% of {sel.views} readers found this useful.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.success("Thanks for your feedback!")} className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5" /> Yes</button>
              <button onClick={() => toast.message("Thanks — we'll improve this article.")} className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs font-semibold">No</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
