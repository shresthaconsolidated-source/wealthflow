import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type?: ToastType;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, opts?: ToastOptions) => void;
}

interface ToastEventDetail {
  message: string;
  type?: ToastType;
}

const TOAST_EVENT = 'wf:toast';

let nextId = 0;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/**
 * Module-level escape hatch so non-hook code (api helpers, event handlers
 * outside the tree) can fire toasts. Dispatches a window CustomEvent that
 * the mounted ToastProvider consumes.
 */
export function toast(message: string, opts?: ToastOptions): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, { detail: { message, type: opts?.type } })
  );
}

const iconByType: Record<ToastType, { Icon: typeof Info; className: string }> = {
  success: { Icon: CheckCircle, className: 'text-[var(--accent)]' },
  error: { Icon: AlertCircle, className: 'text-[var(--danger)]' },
  info: { Icon: Info, className: 'text-[var(--text-secondary)]' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, opts?: ToastOptions) => {
      const item: ToastItem = { id: ++nextId, message, type: opts?.type ?? 'info' };
      setToasts(prev => [...prev, item]);
      timersRef.current.push(setTimeout(() => dismiss(item.id), 3500));
    },
    [dismiss]
  );

  useEffect(() => {
    const onToastEvent = (event: Event) => {
      const { detail } = event as CustomEvent<ToastEventDetail>;
      if (detail?.message) push(detail.message, { type: detail.type });
    };
    window.addEventListener(TOAST_EVENT, onToastEvent);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToastEvent);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [push]);

  const value = useMemo<ToastContextValue>(() => ({ toast: push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex flex-col items-center gap-2.5 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const { Icon, className } = iconByType[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                onClick={() => dismiss(t.id)}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm cursor-pointer items-center gap-3 lg:w-auto lg:min-w-[280px]',
                  'rounded-2xl border border-[var(--border-2)] bg-[var(--surface-2)] px-4 py-3',
                  'shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', className)} />
                <p className="text-sm font-medium text-[var(--text-primary)]">{t.message}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
