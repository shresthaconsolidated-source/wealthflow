import React from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#151518] border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Heart className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Enjoying WealthFlow?</h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  This app is completely free to use. If it's helping you manage your finances, consider supporting its development with a small donation to keep it running.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold transition-all"
                >
                  Maybe Later
                </button>
                <button
                  onClick={onDonate}
                  className="flex-1 px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#0A0A0B] font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Donate ❤️
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest pt-2">
                This reminder appears once per day
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
