import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquareQuote, Plus, Search, Star, Copy, Trash2, ThumbsUp, ThumbsDown,
  ClipboardCheck, Sparkles, Variable, BarChart3, Clipboard, Pencil, Languages,
} from "lucide-react";
import { cannedApi, renderTemplate, VARIABLE_TOKENS, type CannedResponse } from "@/lib/api/cannedResponses";
import { cn } from "@/lib/utils";

const LANG_LABEL: Record<string, string> = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch", pt: "Português", ja: "日本語",
};

export default function CannedResponses() {
  const { user } = useAuth();
  const role = (user as any)?.role as string | undefined;
  const allowed = ["owner","admin","manager","agent","resolver"].includes(role ?? "");

  const [list, setList] = useState<CannedResponse[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [favOnly, setFavOnly] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const refresh = () => {
    const all = cannedApi.list();
    setList(all);
    if (!activeId && all[0]) setActiveId(all[0].id);
  };
  useEffect(() => { refresh(); }, []);

  const categories = useMemo(() => ["All", ...cannedApi.categories(), "Favorites"], [list]);
  const filtered = useMemo(() => {
    let out = list;
    if (activeCategory === "Favorites" || favOnly) out = out.filter((c) => c.isFavorite);
    else if (activeCategory !== "All") out = out.filter((c) => c.category === activeCategory);
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.shortcut.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return out.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || b.usageCount - a.usageCount);
  }, [list, activeCategory, favOnly, query]);

  const active = useMemo(() => list.find((c) => c.id === activeId) ?? null, [list, activeId]);

  if (!allowed) return <Navigate to="/app" replace />;

  // Quick stats
  const totalUses = list.reduce((a, c) => a + c.usageCount, 0);
  const topUsed = [...list].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3);

  const handleCreate = () => {
    const c = cannedApi.create({
      title: "Untitled snippet",
      shortcut: `/snippet-${Math.floor(Math.random() * 999)}`,
      body: "Hi {{customer.name}},\n\n",
      createdBy: (user as any)?.email ?? "You",
    });
    setActiveId(c.id);
    refresh();
    toast.success("Snippet created");
  };

  const patch = (p: Partial<CannedResponse>) => {
    if (!active) return;
    cannedApi.update(active.id, p);
    refresh();
  };

  const handleDelete = (id: string) => {
    cannedApi.remove(id);
    if (activeId === id) setActiveId(null);
    refresh();
    toast.success("Deleted");
  };

  const handleDuplicate = (id: string) => {
    const c = cannedApi.duplicate(id);
    refresh();
    if (c) setActiveId(c.id);
    toast.success("Duplicated");
  };

  const handleCopy = async (c: CannedResponse) => {
    try {
      await navigator.clipboard.writeText(renderTemplate(c.body));
      cannedApi.recordUse(c.id);
      refresh();
      toast.success("Copied with sample variables");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const insertVariable = (token: string) => {
    if (!active || !bodyRef.current) return;
    const ta = bodyRef.current;
    const start = ta.selectionStart ?? active.body.length;
    const end = ta.selectionEnd ?? active.body.length;
    const next = active.body.slice(0, start) + token + active.body.slice(end);
    patch({ body: next });
    setTimeout(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <header className="border-b bg-background px-6 py-4 flex items-center gap-4 shrink-0">
        <MessageSquareQuote className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display font-bold text-lg">Canned responses</h1>
          <p className="text-xs text-muted-foreground">Reusable replies with variable substitution and shortcuts</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, shortcut, body…" className="h-8 pl-8 text-sm" />
          </div>
          <Button onClick={handleCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" /> New snippet</Button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-6 text-xs shrink-0">
        <div className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /> <span className="font-mono tabular-nums font-bold">{list.length}</span> <span className="text-muted-foreground">snippets</span></div>
        <div className="flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /> <span className="font-mono tabular-nums font-bold">{totalUses}</span> <span className="text-muted-foreground">total uses</span></div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Top used:
          {topUsed.map((c, i) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className="font-mono text-foreground hover:text-primary">
              {c.shortcut}{i < topUsed.length - 1 && ","}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Categories */}
        <aside className="col-span-2 border-r p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Categories</div>
          {categories.map((c) => {
            const count = c === "All" ? list.length : c === "Favorites" ? list.filter((x) => x.isFavorite).length : list.filter((x) => x.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeCategory === c ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span className="truncate">{c}</span>
                <span className="font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </aside>

        {/* Snippet list */}
        <section className="col-span-4 border-r flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No snippets match</p>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 transition-colors",
                      activeId === c.id ? "bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {c.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
                      <span className="font-medium text-sm truncate">{c.title}</span>
                      <Badge variant="outline" className="ml-auto h-4 text-[10px] font-mono">{c.shortcut}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {c.body.replace(/\n/g, " ")}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="h-4 text-[9px]">{c.category}</Badge>
                      <Badge variant="outline" className="h-4 text-[9px]">{LANG_LABEL[c.language] ?? c.language}</Badge>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><ClipboardCheck className="h-2.5 w-2.5" /> {c.usageCount}</span>
                        <span className="flex items-center gap-0.5 text-emerald-600"><ThumbsUp className="h-2.5 w-2.5" /> {c.ratingUp}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </section>

        {/* Editor / preview */}
        <section className="col-span-6 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a snippet</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    value={active.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    className="h-9 font-bold text-base border-0 px-0 focus-visible:ring-0 shadow-none bg-transparent"
                  />
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Input
                      value={active.shortcut}
                      onChange={(e) => patch({ shortcut: e.target.value })}
                      className="h-6 w-32 font-mono text-xs"
                    />
                    <Select value={active.category} onValueChange={(v) => patch({ category: v })}>
                      <SelectTrigger className="h-6 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set([...cannedApi.categories(), "General", "Greetings", "Billing", "Account", "Closings", "Internal", "Product", "Incidents"])).map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={active.language} onValueChange={(v) => patch({ language: v })}>
                      <SelectTrigger className="h-6 w-28 text-xs"><Languages className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANG_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => { cannedApi.toggleFavorite(active.id); refresh(); }}>
                    <Star className={cn("h-4 w-4", active.isFavorite && "fill-amber-400 text-amber-400")} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(active.id)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(active.id)}><Trash2 className="h-4 w-4" /></Button>
                  <Button size="sm" onClick={() => handleCopy(active)}><Clipboard className="h-3.5 w-3.5 mr-1.5" /> Copy filled</Button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-12 min-h-0">
                {/* Editor */}
                <div className="col-span-7 flex flex-col overflow-hidden">
                  <Tabs defaultValue="edit" className="flex-1 flex flex-col">
                    <div className="px-6 pt-3">
                      <TabsList className="h-8">
                        <TabsTrigger value="edit" className="text-xs"><Pencil className="h-3 w-3 mr-1" /> Edit</TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> Preview</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="edit" className="flex-1 px-6 pb-4 mt-3">
                      <Textarea
                        ref={bodyRef}
                        value={active.body}
                        onChange={(e) => patch({ body: e.target.value })}
                        className="font-mono text-sm h-full min-h-[300px] resize-none"
                      />
                      <div className="mt-2">
                        <Label className="text-xs">Tags</Label>
                        <Input
                          value={active.tags.join(", ")}
                          onChange={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                          placeholder="comma, separated"
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="preview" className="flex-1 px-6 pb-4 mt-3 overflow-y-auto">
                      <Card>
                        <CardContent className="p-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {renderTemplate(active.body)}
                          </pre>
                        </CardContent>
                      </Card>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Variables substituted with sample data. In live tickets, real customer/agent values are used.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right rail */}
                <div className="col-span-5 border-l flex flex-col overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <div className="text-xs font-semibold flex items-center gap-1.5"><Variable className="h-3.5 w-3.5" /> Insert variable</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Click to insert at the cursor.</p>
                  </div>
                  <ScrollArea className="flex-1 px-4 pb-4">
                    {Array.from(new Set(VARIABLE_TOKENS.map((v) => v.group))).map((group) => (
                      <div key={group} className="mb-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{group}</div>
                        <div className="flex flex-wrap gap-1">
                          {VARIABLE_TOKENS.filter((v) => v.group === group).map((v) => (
                            <button
                              key={v.token}
                              onClick={() => insertVariable(v.token)}
                              className="text-[10px] font-mono px-2 py-1 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                              title={v.label}
                            >
                              {v.token}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Separator className="my-3" />
                    <div className="text-xs font-semibold mb-2">Snippet stats</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Uses" value={active.usageCount} />
                      <Stat label="👍" value={active.ratingUp} tone="good" />
                      <Stat label="👎" value={active.ratingDown} tone="bad" />
                      <Stat label="Created by" value={active.createdBy} small />
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => { cannedApi.rate(active.id, true); refresh(); }}>
                        <ThumbsUp className="h-3 w-3 mr-1" /> Useful
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => { cannedApi.rate(active.id, false); refresh(); }}>
                        <ThumbsDown className="h-3 w-3 mr-1" /> Not useful
                      </Button>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string | number; tone?: "good" | "bad"; small?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn(
        "font-bold tabular-nums",
        small ? "text-xs truncate" : "text-base",
        tone === "good" && "text-emerald-600",
        tone === "bad" && "text-rose-600",
      )}>{value}</div>
    </div>
  );
}
