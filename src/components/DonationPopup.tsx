import React from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui';

interface DonationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDonate: () => void;
}

export default function DonationPopup({ isOpen, onClose, onDonate }: DonationPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[32px] p-8 md:p-10 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[var(--accent)]/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 text-center space-y-6">
              <div className="w-16 h-16 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Heart className="w-8 h-8 text-[var(--accent)] fill-[var(--accent)]/20" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Enjoying WealthFlow?</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  This app is completely free to use. If it's helping you manage your finances, consider supporting its development with a small donation to keep it running.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Maybe Later
                </Button>
                <Button className="flex-1" onClick={onDonate}>
                  Donate ❤️
                </Button>
              </div>

              <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest pt-2">
                This reminder appears at most once a week
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
