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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="lg:hidden fixed bottom-24 right-6 z-50 w-14 h-14 rounded-2xl bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-all duration-300 active:bg-emerald-600"
    >
      <Plus className="w-7 h-7" />
    </motion.button>
  );
}
