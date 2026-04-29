import { useEffect, useMemo, useState } from "react";
import { useOrgArticles, useAppStore, useCurrentOrgUser, useOrgSettings } from "@/lib/store";
import { Search, ThumbsUp, Eye, BookOpen, ChevronRight, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { KbArticle } from "@/lib/types";

export default function KnowledgeBase() {
  const articles = useOrgArticles();
  const { addArticle, updateArticle, deleteArticle, voteArticle } = useAppStore();
  const me = useCurrentOrgUser();
  const settings = useOrgSettings();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "admin", "manager", "agent");

  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<KbArticle> | null>(null);

  const list = useMemo(() => articles.filter(a => a.title.toLowerCase().includes(q.toLowerCase())), [articles, q]);
  const cats = Array.from(new Set(articles.map(a => a.category)));
  const sel = selId ? articles.find(a => a.id === selId) : list[0];

  // keep selection valid when org changes
  useEffect(() => {
    if (sel) setSelId(sel.id);
    else setSelId(null);
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNew = () => setEditing({ title: "", category: settings.categories[0] ?? "General", excerpt: "", body: "" });
  const startEdit = () => sel && setEditing({ ...sel });
  const cancel = () => setEditing(null);

  const save = () => {
    if (!editing?.title?.trim() || !editing.body?.trim()) {
      toast.error("Title and body are required");
      return;
    }
    if (editing.id) {
      updateArticle(editing.id, { title: editing.title!, category: editing.category!, excerpt: editing.excerpt ?? "", body: editing.body! });
      toast.success("Article updated");
    } else {
      const a = addArticle({
        title: editing.title!,
        category: editing.category ?? settings.categories[0] ?? "General",
        excerpt: editing.excerpt ?? "",
        body: editing.body!,
        author: me?.name ?? "System",
      });
      setSelId(a.id);
      toast.success("Article published");
    }
    setEditing(null);
  };

  const remove = () => {
    if (!sel) return;
    if (!confirm(`Delete "${sel.title}"?`)) return;
    deleteArticle(sel.id);
    setSelId(null);
    toast.success("Article deleted");
  };

  return (
    <div className="h-full flex">
      <div className="w-[380px] shrink-0 border-r border-border flex flex-col bg-surface/30">
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Knowledge Base</div>
              <h1 className="text-2xl font-display font-bold mt-1">Articles</h1>
            </div>
            {canEdit && (
              <button onClick={startNew} className="h-8 px-2.5 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            )}
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
          {list.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">No articles yet.</div>
          )}
          {list.map(a => (
            <button key={a.id} onClick={() => { setSelId(a.id); setEditing(null); }} className={`w-full text-left px-4 py-3 border-b border-border/60 ticket-row ${sel?.id === a.id ? "active" : ""}`}>
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
          {editing ? (
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{editing.id ? "Edit article" : "New article"}</div>
              <input
                autoFocus
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Article title"
                className="w-full h-12 px-4 rounded-xl bg-surface border border-border outline-none focus:border-ring text-2xl font-display font-bold"
              />
              <div className="flex gap-3">
                <select
                  value={editing.category ?? ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="h-10 px-3 rounded-lg bg-surface border border-border text-sm"
                >
                  {(settings.categories.length ? settings.categories : ["General"]).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <input
                value={editing.excerpt ?? ""}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                placeholder="Short summary (excerpt)"
                className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-ring text-sm"
              />
              <textarea
                rows={14}
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                placeholder="Article body (plain text or markdown)"
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border outline-none focus:border-ring text-sm leading-relaxed resize-none font-mono"
              />
              <div className="flex gap-2">
                <button onClick={save} className="h-10 px-4 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"><Save className="h-4 w-4" /> Save</button>
                <button onClick={cancel} className="h-10 px-4 rounded-lg bg-surface-2 text-sm flex items-center gap-2"><X className="h-4 w-4" /> Cancel</button>
              </div>
            </div>
          ) : sel ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> Knowledge Base <ChevronRight className="h-3 w-3" /> {sel.category}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={startEdit} className="h-8 px-3 rounded-lg bg-surface-2 text-xs flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    <button onClick={remove} className="h-8 px-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </div>
                )}
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
                  <button onClick={() => { voteArticle(sel.id, true); toast.success("Thanks for your feedback!"); }} className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5" /> Yes</button>
                  <button onClick={() => { voteArticle(sel.id, false); toast.message("Thanks - we'll improve this article."); }} className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs font-semibold">No</button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground text-sm">
              No article selected. {canEdit && <button onClick={startNew} className="text-primary underline ml-1">Create one</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
