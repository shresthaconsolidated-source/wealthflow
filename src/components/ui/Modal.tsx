import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

/**
 * Centered dialog on desktop, slide-up bottom sheet on mobile.
 * Centering is done via flex alignment (not translate-x/y) so it never
 * fights motion's own transform-based enter/exit animation.
 */
export default function Modal({ open, onClose, title, description, children, className, footer }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog on open and back on close.
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Only steal focus if nothing inside the dialog (e.g. an autoFocus input) has claimed it
    requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
        panelRef.current.focus();
      }
    });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'focus:outline-none',
              'relative z-10 w-full lg:max-w-lg max-h-[88vh] flex flex-col',
              'bg-[var(--surface-2)] border border-[var(--border-2)] shadow-2xl',
              'rounded-t-[32px] lg:rounded-[32px] p-6 lg:p-8',
              className
            )}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/10 lg:hidden" />

            {(title || description) && (
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  {title && <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>}
                  {description && <p className="text-sm text-[var(--text-tertiary)] mt-1">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:text-white active:scale-95 transition-all shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="overflow-y-auto custom-scrollbar flex-1">{children}</div>

            {footer && <div className="mt-6 pt-5 border-t border-[var(--border-1)]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
