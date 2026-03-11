import React, { useState, useEffect } from 'react';
import { Heart, TrendingUp, Calendar, ArrowRight, Wallet } from 'lucide-react';
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
                // Filter for transactions that look like donations
                // Usually, these would have a specific category_id, but let's filter by name/keyword for now
                // if the database doesn't have a rigid structure yet.
                const filtered = data.filter((t: any) =>
                    t.category_name?.toLowerCase().includes('donation') ||
                    t.note?.toLowerCase().includes('donation') ||
                    t.category_id === 'donation' // hypothetical specific ID
                );
                setDonations(filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch donations:', err);
                setLoading(false);
            });
    }, [fetchWithAuth]);

    const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
    const monthlyAmount = donations
        .filter(d => new Date(d.date).getMonth() === new Date().getMonth())
        .reduce((sum, d) => sum + d.amount, 0);

    return (
        <div className="space-y-8 lg:space-y-10 max-w-7xl mx-auto pb-12 lg:pb-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-pink-500" />
                        </div>
                        <span className="text-pink-500 text-xs font-bold uppercase tracking-widest">GIVING BACK</span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Philanthropy & Donations</h1>
                    <p className="text-zinc-500 mt-1 text-sm lg:text-base">Track your charitable contributions and their cumulative impact.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-pink-500/10 transition-colors" />
                    <p className="text-zinc-500 text-sm font-medium mb-1">Lifetime Impact</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalAmount)}</h3>
                    <div className="flex items-center gap-2 mt-4 text-pink-400 text-xs font-bold px-2 py-1 bg-pink-500/10 rounded-lg w-fit">
                        <TrendingUp className="w-3 h-3" />
                        <span>Cumulative giving</span>
                    </div>
                </div>

                <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                    <p className="text-zinc-500 text-sm font-medium mb-1">This Month</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(monthlyAmount)}</h3>
                    <div className="flex items-center gap-2 mt-4 text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg w-fit">
                        <Calendar className="w-3 h-3" />
                        <span>Current giving cycle</span>
                    </div>
                </div>

                <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
                    <p className="text-zinc-500 text-sm font-medium mb-1">Charitable Accounts</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{donations.length}</h3>
                    <div className="flex items-center gap-2 mt-4 text-blue-400 text-xs font-bold px-2 py-1 bg-blue-500/10 rounded-lg w-fit">
                        <Heart className="w-3 h-3" />
                        <span>Individual contributions</span>
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="bg-[#151518] border border-white/5 rounded-[32px] overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Donation History</h3>
                </div>

                <div className="divide-y divide-white/5">
                    {loading ? (
                        <div className="p-20 text-center text-zinc-600">
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                            <p>Loading records...</p>
                        </div>
                    ) : donations.length > 0 ? (
                        donations.map((d, i) => (
                            <motion.div
                                key={d.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-6 hover:bg-white/[0.02] transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-pink-500/30 transition-all">
                                            <Heart className="w-5 h-5 text-pink-500" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{d.note || 'Charitable Donation'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-zinc-500">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                <span className="text-xs text-zinc-500">{d.category_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-white">{formatCurrency(d.amount)}</p>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{d.from_account_name}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-20 text-center text-zinc-600">
                            <Heart className="w-12 h-12 mx-auto mb-6 opacity-10" />
                            <p className="text-lg font-medium">No donations found yet.</p>
                            <p className="text-sm mt-2 opacity-60">Tag transactions with "Donation" to see them here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
