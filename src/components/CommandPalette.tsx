import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  keywords?: string;
  perform: () => void;
}

/** Custom window event name other UI can dispatch to open the palette. */
export const OPEN_PALETTE_EVENT = 'wf:open-palette';

/** Imperative opener for buttons elsewhere in the app (e.g. a search icon). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-white/5 border border-[var(--border-1)] text-[10px] font-bold text-[var(--text-tertiary)] tracking-wide">
      {children}
    </kbd>
  );
}

/**
 * Global command palette. Self-contained: mounts once, listens for
 * Cmd/Ctrl+K (toggle), Escape (close) and the 'wf:open-palette' event.
 */
export default function CommandPalette({ actions }: { actions: PaletteAction[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcuts: Cmd/Ctrl+K toggles, Escape closes.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Open via custom event so any button can trigger the palette.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
  }, []);

  // Reset state on open + make sure the input grabs focus.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fuzzy-ish filter: every whitespace-separated term must appear in label+keywords.
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return actions;
    return actions.filter(action => {
      const haystack = `${action.label} ${action.keywords ?? ''} ${action.hint ?? ''}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    });
  }, [actions, query]);

  // Keep selection in bounds as the result set changes.
  useEffect(() => {
    setSelectedIndex(i => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  // Keep the selected row visible during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filtered, open]);

  const runAction = useCallback((action: PaletteAction | undefined) => {
    if (!action) return;
    setOpen(false);
    action.perform();
  }, []);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAction(filtered[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl bg-[var(--surface-2)] border border-[var(--border-2)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-1)]">
              <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search actions…"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="wf-palette-list"
              />
              <Kbd>esc</Kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              id="wf-palette-list"
              role="listbox"
              className="max-h-[320px] overflow-y-auto custom-scrollbar p-2"
            >
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No matching actions</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Try a different search term.</p>
                </div>
              ) : (
                filtered.map((action, index) => {
                  const selected = index === selectedIndex;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-selected={selected || undefined}
                      onMouseMove={() => setSelectedIndex(index)}
                      onClick={() => runAction(action)}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-left transition-colors',
                        selected
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)]'
                      )}
                    >
                      {Icon && (
                        <span
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                            selected ? 'bg-[var(--accent)]/10' : 'bg-white/5'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                      )}
                      <span className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'block text-sm font-bold truncate',
                            selected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                          )}
                        >
                          {action.label}
                        </span>
                        {action.hint && (
                          <span className="block text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] mt-0.5 truncate">
                            {action.hint}
                          </span>
                        )}
                      </span>
                      {selected && <CornerDownLeft className="w-4 h-4 shrink-0 opacity-70" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-1)] bg-black/10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  <Kbd>↵</Kbd>
                  Select
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  <Kbd>esc</Kbd>
                  Close
                </span>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">
                  <Kbd>⌘K</Kbd>
                  Toggle
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
