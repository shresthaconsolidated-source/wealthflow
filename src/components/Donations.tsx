import React, { useState, useEffect } from 'react';
import { Heart, DollarSign, Mail, Sparkles } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

export default function Donations() {
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { fetchWithAuth } = useApi();

    useEffect(() => {
        fetchWithAuth('/api/transactions')
            .then(res => res.json())
            .then(data => {
                const filtered = data.filter((t: any) =>
                    t.category_name?.toLowerCase().includes('donation') ||
                    t.note?.toLowerCase().includes('donation') ||
                    t.category_id === 'donation'
                );
                setDonations(filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch donations:', err);
                setLoading(false);
            });
    }, [fetchWithAuth]);

    return (
        <div className="max-w-2xl mx-auto pb-12 lg:pb-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Visual Header */}
            <div className="flex flex-col items-center text-center space-y-6 pt-4">
                <div className="relative">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-20 h-20 rounded-full bg-pink-500 flex items-center justify-center shadow-2xl shadow-pink-500/40 relative z-10"
                    >
                        <Heart className="w-10 h-10 text-white fill-white" />
                    </motion.div>
                    <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                </div>

                <div className="space-y-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-pink-400 animate-bounce" />
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                            Keep This App Alive — <span className="text-pink-500">With Your Support</span>
                        </h1>
                    </div>
                    <p className="text-zinc-400 text-sm lg:text-base leading-relaxed max-w-lg mx-auto">
                        This app is free — no subscriptions, no hidden charges. But running it is not free.
                        Servers, databases, and hours of development all cost real money.
                    </p>
                </div>
            </div>

            {/* Narrative & Prompt */}
            <div className="bg-[#151518]/50 border border-white/5 rounded-[40px] p-8 lg:p-10 space-y-8 backdrop-blur-sm">
                <div className="space-y-4">
                    <p className="text-zinc-300 text-sm lg:text-base leading-relaxed">
                        If this app has helped you understand your finances, then don't just use it — support it.
                        Your small donation keeps the app alive, maintained, and improving.
                    </p>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 lg:p-8 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                        <p className="text-red-400 font-bold leading-relaxed flex gap-3 italic">
                            <span className="text-xl shrink-0">👉</span>
                            No excuses. If you can spend on food or coffee, you can give back here.
                            Scan the QR and donate today — don't be the one who lets this app die.
                        </p>
                    </div>
                </div>

                {/* QR Section */}
                <div className="flex flex-col items-center space-y-6">
                    <h3 className="text-white font-bold tracking-wide flex items-center gap-3">
                        Scan to Donate <span className="text-zinc-500 text-xs font-medium">(eSewa/Fonepay)</span>
                    </h3>

                    <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 transition-transform hover:scale-[1.02] duration-500">
                        <div className="w-56 h-56 lg:w-64 lg:h-64 bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden border-8 border-white">
                            {/* Using a placeholder image for the QR code */}
                            <img
                                src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=ashishoct35"
                                alt="eSewa QR Code"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                </div>

                {/* International Support */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[32px] p-8 space-y-4 text-center group transition-colors">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-white font-bold">Supporting from Abroad?</h4>
                    </div>
                    <div className="space-y-2">
                        <p className="text-zinc-400 text-sm">You can use PayPal:</p>
                        <p className="text-emerald-400 font-black text-lg tracking-tight select-all">Ashishoct35@gmail.com</p>
                    </div>
                    <p className="text-zinc-500 text-xs italic font-medium pt-2">
                        Even $1 would help keep the servers running!
                    </p>
                </div>
            </div>

            {/* History (Optional/Secondary) */}
            {donations.length > 0 && (
                <div className="bg-[#151518]/30 border border-white/5 rounded-[32px] overflow-hidden">
                    <button className="w-full p-6 flex items-center justify-between group">
                        <h3 className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">Your Recent Giving History</h3>
                        <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{donations.length} Contributions</span>
                    </button>
                    <div className="divide-y divide-white/5 border-t border-white/5">
                        {donations.slice(0, 3).map((d) => (
                            <div key={d.id} className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                                        <Heart className="w-4 h-4 text-pink-500" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-bold">{d.note || 'Charitable Donation'}</p>
                                        <p className="text-zinc-500 text-[10px]">{new Date(d.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">{formatCurrency(d.amount)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
