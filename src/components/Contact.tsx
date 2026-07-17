import React from 'react';
import { MessageCircle, Phone, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '@/src/components/ui';

export default function Contact() {
  const whatsappNumber = '9849165300';
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12 lg:pb-0">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-[var(--accent)]" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] tracking-tight">Get in Touch</h1>
        <p className="text-[var(--text-tertiary)] text-lg max-w-2xl mx-auto">
          Have questions, feedback, or need help with the app? We'd love to hear from you! Chat with us directly on WhatsApp for the fastest response.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <Card level={1} padding="lg" className="rounded-[40px] text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#25D366]/15 flex items-center justify-center mb-8">
            <Phone className="w-12 h-12 text-[#25D366]" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Chat on WhatsApp</h2>
          <p className="text-[var(--text-tertiary)] mb-8">
            Get instant support and answers to your questions
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg transition-all active:scale-[0.98] shadow-[0_12px_32px_-10px_rgba(37,211,102,0.4)]"
          >
            <MessageCircle className="w-6 h-6" />
            Start WhatsApp Chat
          </a>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto"
      >
        <Card level={1} padding="lg">
          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 mb-6 text-center">
            <Sparkles className="w-5 h-5 text-[var(--gold)]" />
            Quick Tips
          </h3>
          <ul className="space-y-4 text-[var(--text-secondary)] list-disc list-inside">
            <li>Include screenshots if reporting a bug</li>
            <li>Describe what you were trying to do when the issue occurred</li>
            <li>Feature requests are always welcome!</li>
          </ul>
          <p className="text-center mt-8 text-sm text-[var(--text-tertiary)]">
            We typically respond within a few hours during business hours (Nepal Time). Your feedback helps make this app better for everyone!
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
