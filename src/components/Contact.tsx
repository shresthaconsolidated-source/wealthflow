import React from 'react';
import { MessageCircle, Phone, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Contact() {
  const whatsappNumber = '9849165300';
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12 lg:pb-0 relative z-10">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight">Get in Touch</h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Have questions, feedback, or need help with the app? We'd love to hear from you! Chat with us directly on WhatsApp for the fastest response.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 rounded-[40px] p-8 lg:p-12 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="w-24 h-24 mx-auto rounded-full bg-[#25D366]/20 flex items-center justify-center mb-8 relative z-10">
            <Phone className="w-12 h-12 text-[#25D366]" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-4 relative z-10">Chat on WhatsApp</h2>
          <p className="text-zinc-400 mb-8 relative z-10">
            Get instant support and answers to your questions
          </p>

          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg transition-transform hover:-translate-y-1 shadow-[0_0_40px_rgba(37,211,102,0.3)] hover:shadow-[0_0_60px_rgba(37,211,102,0.4)] relative z-10"
          >
            <MessageCircle className="w-6 h-6" />
            Start WhatsApp Chat
          </a>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto bg-white/[0.02] border border-white/5 rounded-3xl p-8"
      >
        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2 mb-6 text-center">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Quick Tips
        </h3>
        <ul className="space-y-4 text-zinc-400 list-disc list-inside">
          <li>Include screenshots if reporting a bug</li>
          <li>Describe what you were trying to do when the issue occurred</li>
          <li>Feature requests are always welcome!</li>
        </ul>
        <p className="text-center mt-8 text-sm text-zinc-500">
          We typically respond within a few hours during business hours (Nepal Time). Your feedback helps make this app better for everyone! 🚀
        </p>
      </motion.div>
    </div>
  );
}
