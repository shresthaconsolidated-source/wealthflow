import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FABProps {
  onClick: () => void;
}

export default function FAB({ onClick }: FABProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label="Add transaction"
      className="lg:hidden fixed bottom-[92px] right-5 z-50 w-14 h-14 rounded-[20px] bg-[var(--accent)] text-[#04140e] shadow-[0_12px_28px_-8px_var(--accent-ring)] flex items-center justify-center active:bg-[var(--accent-strong)]"
    >
      <Plus className="w-6 h-6" strokeWidth={2.5} />
    </motion.button>
  );
}
