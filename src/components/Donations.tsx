import React, { useState, useEffect } from 'react';
import { Heart, DollarSign, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';
import { Card } from '@/src/components/ui';

export default function Donations() {
    const [donations, setDonations] = useState<any[]>([]);
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
            })
            .catch(err => {
                console.error('Failed to fetch donations:', err);
            });
    }, [fetchWithAuth]);

    return (
        <div className="max-w-2xl mx-auto pb-12 lg:pb-0 space-y-8">
            {/* Visual Header */}
            <div className="flex flex-col items-center text-center space-y-6 pt-4">
                <div className="relative">
                    <motion.div
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-20 h-20 rounded-full bg-pink-500 flex items-center justify-center shadow-2xl shadow-pink-500/30 relative z-10"
                    >
                        <Heart className="w-10 h-10 text-white fill-white" />
                    </motion.div>
                    <div className="absolute inset-0 bg-pink-500/15 blur-3xl rounded-full scale-150" />
                </div>

                <div className="space-y-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-pink-400" />
                        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Keep This App Alive <span className="text-pink-500">— With Your Support</span>
                        </h1>
                    </div>
                    <p className="text-[var(--text-tertiary)] text-sm lg:text-base leading-relaxed max-w-lg mx-auto">
                        This app is free — no subscriptions, no hidden charges. But running it is not free.
                        Servers, databases, and hours of development all cost real money.
                    </p>
                </div>
            </div>

            {/* Narrative & Prompt */}
            <Card level={1} padding="lg" className="rounded-[40px] space-y-8">
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)] text-sm lg:text-base leading-relaxed">
                        If this app has helped you understand your finances, then don't just use it — support it.
                        Your small donation keeps the app alive, maintained, and improving.
                    </p>

                    <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/15 rounded-2xl p-6 lg:p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--danger)]/50" />
                        <p className="text-[var(--danger)] font-bold leading-relaxed flex gap-3">
                            <span className="text-xl shrink-0">👉</span>
                            No excuses. If you can spend on food or coffee, you can give back here.
                            Scan the QR and donate today — don't be the one who lets this app die.
                        </p>
                    </div>
                </div>

                {/* QR Section */}
                <div className="flex flex-col items-center space-y-6">
                    <h3 className="text-[var(--text-primary)] font-bold tracking-wide flex items-center gap-3">
                        Scan to Donate <span className="text-[var(--text-tertiary)] text-xs font-medium">(eSewa/Fonepay)</span>
                    </h3>

                    <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-black/20 transition-transform hover:scale-[1.02] duration-500">
                        <div className="w-56 h-56 lg:w-64 lg:h-64 bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden border-8 border-white">
                            <img
                                src="/qr.jpeg"
                                alt="eSewa QR Code"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                </div>

                {/* International Support */}
                <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/15 rounded-[32px] p-8 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-[var(--accent)]" />
                        <h4 className="text-[var(--text-primary)] font-bold">Supporting from Abroad?</h4>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[var(--text-secondary)] text-sm">You can use PayPal:</p>
                        <p className="text-[var(--accent)] font-bold text-lg tracking-tight select-all">Ashishoct35@gmail.com</p>
                    </div>
                    <p className="text-[var(--text-tertiary)] text-xs italic font-medium pt-2">
                        Even $1 would help keep the servers running!
                    </p>
                </div>
            </Card>

            {/* History (Optional/Secondary) */}
            {donations.length > 0 && (
                <Card level={1} padding="none" className="overflow-hidden">
                    <div className="w-full p-6 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--text-secondary)]">Your Recent Giving History</h3>
                        <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">{donations.length} Contributions</span>
                    </div>
                    <div className="divide-y divide-[var(--border-1)] border-t border-[var(--border-1)]">
                        {donations.slice(0, 3).map((d) => (
                            <div key={d.id} className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                                        <Heart className="w-4 h-4 text-pink-500" />
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-primary)] text-sm font-bold">{d.note || 'Charitable Donation'}</p>
                                        <p className="text-[var(--text-tertiary)] text-[10px]">{new Date(d.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="tnum text-sm font-bold text-[var(--text-primary)]">{formatCurrency(d.amount)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
