import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { Card, EmptyState } from '@/src/components/ui';

const WEEKS = 26;
const CELL = 12; // w-3
const GAP = 3; // gap-[3px]
const PITCH = CELL + GAP;

interface DayCell {
  key: string; // YYYY-MM-DD (local)
  date: Date;
  total: number;
  count: number;
  future: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}

interface TooltipState {
  x: number;
  y: number;
  cell: DayCell;
}

function localKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 0 = no spend, 1-4 = quartile steps of --danger alpha
const LEVEL_COLORS = [
  'rgba(255,255,255,0.05)',
  'color-mix(in srgb, var(--danger) 28%, transparent)',
  'color-mix(in srgb, var(--danger) 50%, transparent)',
  'color-mix(in srgb, var(--danger) 74%, transparent)',
  'var(--danger)',
];

export default function SpendingHeatmap({ transactions }: { transactions: any[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { weeks, monthLabels, busiest, activeDays, totalDays } = useMemo(() => {
    // Daily expense totals keyed by local YYYY-MM-DD
    const byDay = new Map<string, { total: number; count: number }>();
    for (const t of transactions || []) {
      if (!t || t.type !== 'expense') continue;
      const key = String(t.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const entry = byDay.get(key) || { total: 0, count: 0 };
      entry.total += Math.abs(Number(t.amount) || 0);
      entry.count += 1;
      byDay.set(key, entry);
    }

    // Trailing ~26 weeks, Monday-start columns, ending at the current week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mondayOffset = (today.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);

    const rawWeeks: Omit<DayCell, 'level'>[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: Omit<DayCell, 'level'>[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = localKey(date);
        const entry = byDay.get(key);
        col.push({
          key,
          date,
          total: entry?.total || 0,
          count: entry?.count || 0,
          future: date.getTime() > today.getTime(),
        });
      }
      rawWeeks.push(col);
    }

    // Adaptive intensity scale: quartiles of nonzero day totals
    const nonzero = rawWeeks
      .flat()
      .filter((c) => !c.future && c.total > 0)
      .map((c) => c.total)
      .sort((a, b) => a - b);
    const q = (p: number) => nonzero[Math.min(nonzero.length - 1, Math.floor(nonzero.length * p))] ?? 0;
    const thresholds = [q(0.25), q(0.5), q(0.75)];

    const weeks: DayCell[][] = rawWeeks.map((col) =>
      col.map((c) => ({
        ...c,
        level: (c.total <= 0
          ? 0
          : c.total <= thresholds[0]
            ? 1
            : c.total <= thresholds[1]
              ? 2
              : c.total <= thresholds[2]
                ? 3
                : 4) as DayCell['level'],
      }))
    );

    // Month labels aligned to the first week column of each month
    const monthLabels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    let lastLabelAt = -3;
    weeks.forEach((col, i) => {
      const m = col[0].date.getMonth();
      if (m !== lastMonth) {
        if (i - lastLabelAt >= 3) {
          monthLabels.push({
            weekIndex: i,
            label: col[0].date.toLocaleDateString('en-US', { month: 'short' }),
          });
          lastLabelAt = i;
        }
        lastMonth = m;
      }
    });

    const past = weeks.flat().filter((c) => !c.future);
    let busiest: DayCell | null = null;
    let activeDays = 0;
    for (const c of past) {
      if (c.total > 0) activeDays += 1;
      if (c.total > 0 && (!busiest || c.total > busiest.total)) busiest = c;
    }

    return { weeks, monthLabels, busiest, activeDays, totalDays: past.length };
  }, [transactions]);

  // Keep the most recent weeks in view on mobile
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  const showTooltip = (e: React.MouseEvent<HTMLDivElement>, cell: DayCell) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cellRect = e.currentTarget.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const x = Math.max(80, Math.min(cellRect.left - wrapRect.left + cellRect.width / 2, wrapRect.width - 80));
    setTooltip({ x, y: cellRect.top - wrapRect.top, cell });
  };

  return (
    <Card level={1} padding="lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">Spending Heatmap</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
          Last {WEEKS} Weeks
        </span>
      </div>

      {activeDays === 0 ? (
        <EmptyState
          icon={Flame}
          title="No spending recorded yet"
          description="Your daily expense activity will show up here."
          bordered
        />
      ) : (
        <div ref={wrapRef} className="relative">
          <div className="flex gap-2">
            {/* Weekday labels (fixed, outside the scroll area) */}
            <div className="flex flex-col gap-[3px] pt-5 shrink-0">
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) => (
                <div
                  key={i}
                  className="h-3 flex items-center text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] leading-none w-7"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Scrollable calendar, right-aligned so recent weeks show first */}
            <div ref={scrollRef} className="overflow-x-auto no-scrollbar flex-1 min-w-0">
              <div className="w-max ml-auto">
                {/* Month labels */}
                <div className="relative h-4 mb-1" style={{ width: WEEKS * PITCH - GAP }}>
                  {monthLabels.map((m) => (
                    <span
                      key={`${m.label}-${m.weekIndex}`}
                      className="absolute top-0 text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] leading-none whitespace-nowrap"
                      style={{ left: m.weekIndex * PITCH }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                {/* Grid: columns = weeks, rows = days */}
                <div className="flex gap-[3px]">
                  {weeks.map((col, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {col.map((cell) =>
                        cell.future ? (
                          <div key={cell.key} className="w-3 h-3" />
                        ) : (
                          <div
                            key={cell.key}
                            className="w-3 h-3 rounded-[3px] cursor-pointer transition-shadow hover:ring-1 hover:ring-white/40"
                            style={{ backgroundColor: LEVEL_COLORS[cell.level] }}
                            onMouseEnter={(e) => showTooltip(e, cell)}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y - 8 }}
            >
              <div className="bg-[var(--surface-3)] border border-[var(--border-2)] rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-0.5">
                  {tooltip.cell.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {tooltip.cell.total > 0 ? (
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    <span className="tnum">{formatCurrency(tooltip.cell.total)}</span>
                    <span className="text-[var(--text-tertiary)] font-medium">
                      {' '}· {tooltip.cell.count} transaction{tooltip.cell.count === 1 ? '' : 's'}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs font-medium text-[var(--text-tertiary)]">No spending</p>
                )}
              </div>
            </div>
          )}

          {/* Legend + summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Less</span>
              {LEVEL_COLORS.map((color, i) => (
                <div key={i} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: color }} />
              ))}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">More</span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {busiest && (
                <>
                  Busiest day{' '}
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {busiest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>{' '}
                  (<span className="tnum font-semibold text-[var(--danger)]">{formatCurrency(busiest.total)}</span>)
                  {' '}·{' '}
                </>
              )}
              <span className="font-semibold text-[var(--text-secondary)]">{activeDays}</span> of {totalDays} days with
              spending
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
