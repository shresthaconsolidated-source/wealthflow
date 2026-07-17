import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Calendar,
  Lock,
  TrendingUp,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useApi } from '@/src/hooks/useApi';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { Card, Badge } from '@/src/components/ui';

export default function AdminPulse({ onBack }: { onBack: () => void }) {
  const { fetchWithAuth } = useApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/admin/stats')
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) throw new Error('Access Denied. Internal Admin Only.');
          throw new Error('Failed to load admin stats.');
        }
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchWithAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-[var(--danger-soft)] flex items-center justify-center mb-6">
          <Lock className="text-[var(--danger)] w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Restricted Area</h1>
        <p className="text-[var(--text-tertiary)] text-center max-w-sm mb-8">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-[var(--border-2)] text-[var(--text-primary)] font-bold hover:bg-white/10 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const userChartData = data.users.slice(0, 10).map((u: any) => ({
    name: u.name.split(' ')[0],
    today: u.todayCount,
    total: u.totalCount
  }));

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] p-4 lg:p-12 pb-32">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-white transition-colors text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to App
            </button>
            <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-4">
              <Activity className="text-indigo-400 w-9 h-9" />
              WealthFlow Pulse
            </h1>
            <p className="text-[var(--text-tertiary)]">System-wide performance and user activity monitoring.</p>
          </div>

          <div className="flex gap-4">
            <Card level={1} padding="none" className="px-6 py-4 rounded-[28px] flex flex-col">
              <span className="text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-widest mb-1">Total Users</span>
              <span className="tnum text-3xl font-bold text-[var(--text-primary)]">{data.totalUsers}</span>
            </Card>
            <div className="px-6 py-4 rounded-[28px] bg-indigo-500/10 border border-indigo-500/20 flex flex-col">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Active Today</span>
              <span className="tnum text-3xl font-bold text-indigo-400">{data.activeToday}</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card level={1} padding="lg" className="lg:col-span-2 rounded-[36px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                <BarChart3 className="text-indigo-400 w-5 h-5" />
                Individual Activity (Today)
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b8b94', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#191b21', border: '1px solid #ffffff10', borderRadius: '16px' }}
                  />
                  <Bar dataKey="today" radius={[8, 8, 0, 0]}>
                    {userChartData.map((u: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={u.today > 0 ? '#6366f1' : '#1e1e21'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="p-8 rounded-[36px] bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 flex flex-col justify-between">
            <div className="space-y-4">
              <TrendingUp className="text-indigo-400 w-9 h-9" />
              <h3 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">Growth & Engagement</h3>
              <p className="text-indigo-200/60 text-sm">
                Tracking user conversions and transaction volume.
                Currently seeing {((data.activeToday / data.totalUsers) * 100).toFixed(1)}% daily engagement rate.
              </p>
            </div>
            <div className="pt-8 border-t border-indigo-500/20">
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-300">System Health</span>
                <Badge tone="success">Optimal</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3 px-2">
            <Users className="text-indigo-400 w-5 h-5" />
            User Activity Log
          </h3>
          <Card level={1} padding="none" className="overflow-x-auto rounded-[28px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-1)]">
                  <th className="px-8 py-6 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">User</th>
                  <th className="px-8 py-6 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Joined</th>
                  <th className="px-8 py-6 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Last Active</th>
                  <th className="px-8 py-6 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest text-right whitespace-nowrap">Activity Today</th>
                  <th className="px-8 py-6 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest text-right whitespace-nowrap">Total Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-1)]">
                {data.users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={u.picture} className="w-10 h-10 rounded-full border border-[var(--border-2)]" alt="" />
                        <div className="min-w-0">
                          <p className="text-[var(--text-primary)] font-bold text-sm tracking-tight truncate">{u.name}</p>
                          <p className="text-[var(--text-tertiary)] text-xs truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[var(--text-secondary)] text-sm whitespace-nowrap">
                      {format(new Date(u.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                        <Calendar className="w-4 h-4 opacity-40" />
                        {u.lastActive ? format(new Date(u.lastActive), 'MMM dd, hh:mm a') : 'Never'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right whitespace-nowrap">
                      <Badge tone={u.todayCount > 0 ? 'success' : 'neutral'}>{u.todayCount} TXs</Badge>
                    </td>
                    <td className="px-8 py-5 text-right whitespace-nowrap">
                      <span className="tnum text-[var(--text-secondary)] font-medium">
                        {u.totalCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
