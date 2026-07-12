import React, { useMemo } from 'react';
import { BookOpen, ClipboardCheck } from 'lucide-react';

type ScheduleBlock = {
  title: string;
  start: string;
  end: string;
  workType?: 'homework' | 'revision';
};

const singaporeDate = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const mondayKey = (date: Date) => {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return dateKey(monday);
};
const fromKey = (key: string) => new Date(`${key}T12:00:00Z`);
const timeLabel = (iso: string) => {
  const date = singaporeDate(iso);
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
};

export const ScheduleTimetable: React.FC<{ blocks: ScheduleBlock[] }> = ({ blocks }) => {
  const weeks = useMemo(() => {
    const grouped = new Map<string, Map<string, ScheduleBlock[]>>();
    blocks.forEach((block) => {
      const date = singaporeDate(block.start);
      const week = mondayKey(date);
      const day = dateKey(date);
      if (!grouped.has(week)) grouped.set(week, new Map());
      const days = grouped.get(week)!;
      days.set(day, [...(days.get(day) || []), block].sort((a, b) => a.start.localeCompare(b.start)));
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [blocks]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/45 sm:hidden">Swipe sideways to see the full week.</p>
      {weeks.map(([weekKey, scheduledDays], weekIndex) => {
        const monday = fromKey(weekKey);
        const days = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(monday);
          date.setUTCDate(monday.getUTCDate() + index);
          return date;
        });
        return (
          <section key={weekKey} className="overflow-hidden rounded-xl border border-[#3A3453] bg-[#13111C]">
            <div className="border-b border-[#3A3453] bg-[#211D32] px-4 py-2.5 text-xs font-bold text-white/70">
              {weekIndex === 0 ? 'This plan' : `Week ${weekIndex + 1}`} · {days[0].toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' })}–{days[6].toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-7">
                {days.map((day) => (
                  <div key={`header-${dateKey(day)}`} className="border-b border-r border-[#3A3453] bg-[#191624] px-2 py-2 text-center last:border-r-0">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">{day.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'UTC' })}</p>
                    <p className="text-sm font-bold text-white">{day.getUTCDate()}</p>
                  </div>
                ))}
                {days.map((day) => {
                  const dayBlocks = scheduledDays.get(dateKey(day)) || [];
                  return (
                    <div key={dateKey(day)} className="min-h-40 space-y-2 border-r border-[#3A3453] p-2 last:border-r-0">
                      {dayBlocks.length ? dayBlocks.map((block) => {
                        const isRevision = block.workType === 'revision';
                        const Icon = isRevision ? BookOpen : ClipboardCheck;
                        return (
                          <div key={`${block.start}-${block.title}`} className={`rounded-lg border p-2 ${isRevision ? 'border-wellness-sky-500/30 bg-wellness-sky-900/45' : 'border-wellness-sage-500/30 bg-wellness-sage-900/45'}`}>
                            <div className={`mb-1 flex items-center gap-1 text-[0.6rem] font-bold uppercase ${isRevision ? 'text-wellness-sky-300' : 'text-wellness-sage-300'}`}>
                              <Icon className="h-3 w-3" /> {isRevision ? 'Revision' : 'Homework'}
                            </div>
                            <p className="break-words text-[0.68rem] font-semibold leading-snug text-white">{block.title}</p>
                            <p className="mt-1 text-[0.6rem] text-white/55">{timeLabel(block.start)}–{timeLabel(block.end)}</p>
                          </div>
                        );
                      }) : (
                        <div className="flex min-h-28 items-center justify-center text-[0.65rem] text-white/25">Free</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};
