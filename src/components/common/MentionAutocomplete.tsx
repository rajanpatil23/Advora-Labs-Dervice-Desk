// Lightweight @mention autocomplete for textareas. Keyboard: ↑/↓/Enter/Tab/Esc.
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Avatar } from "@/components/common/Chips";
import { detectMention, rankMentions, type Mentionable } from "@/lib/mentions";
import { cn } from "@/lib/utils";

export interface MentionAutocompleteHandle {
  /** Returns true if the keystroke was consumed by the autocomplete */
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  /** Recompute matches after value/caret change */
  refresh: () => void;
}

interface Props {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  people: Mentionable[];
  onInsert: (next: string) => void;
}

export const MentionAutocomplete = forwardRef<MentionAutocompleteHandle, Props>(
  function MentionAutocomplete({ value, textareaRef, people, onInsert }, ref) {
    const [open, setOpen] = useState(false);
    const [matches, setMatches] = useState<Mentionable[]>([]);
    const [active, setActive] = useState(0);
    const ctxRef = useRef<{ start: number; query: string } | null>(null);

    const compute = () => {
      const ta = textareaRef.current;
      if (!ta) {
        setOpen(false);
        return;
      }
      const ctx = detectMention(value, ta.selectionStart ?? value.length);
      if (!ctx) {
        setOpen(false);
        ctxRef.current = null;
        return;
      }
      ctxRef.current = ctx;
      const found = rankMentions(people, ctx.query);
      setMatches(found);
      setActive(0);
      setOpen(found.length > 0);
    };

    useEffect(() => {
      compute();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, people]);

    const insert = (m: Mentionable) => {
      const ta = textareaRef.current;
      const ctx = ctxRef.current;
      if (!ta || !ctx) return;
      const caret = ta.selectionStart ?? value.length;
      const before = value.slice(0, ctx.start);
      const after = value.slice(caret);
      const insertText = `@${m.handle} `;
      const next = `${before}${insertText}${after}`;
      onInsert(next);
      setOpen(false);
      // restore caret
      requestAnimationFrame(() => {
        const pos = (before + insertText).length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown: (e) => {
        if (!open) return false;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((a) => (a + 1) % matches.length);
          return true;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => (a - 1 + matches.length) % matches.length);
          return true;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          if (matches[active]) {
            e.preventDefault();
            insert(matches[active]);
            return true;
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
          return true;
        }
        return false;
      },
      refresh: compute,
    }));

    if (!open) return null;

    return (
      <div className="absolute bottom-full left-0 mb-1.5 w-64 rounded-lg border border-border bg-popover shadow-elegant overflow-hidden z-20">
        <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-2/40">
          Mention someone
        </div>
        <ul className="max-h-60 overflow-y-auto py-1">
          {matches.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(m);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[12px]",
                  i === active ? "bg-primary/10 text-primary" : "hover:bg-surface-2",
                )}
              >
                <Avatar initials={m.initials} color={m.avatarColor} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">@{m.handle}{m.role ? ` · ${m.role}` : ""}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
