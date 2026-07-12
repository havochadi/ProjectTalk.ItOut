import React, { useMemo } from 'react';
import { BookOpen, ClipboardCheck, Coffee, GraduationCap, Moon } from 'lucide-react';

type ScheduleBlock = {
  title: string;
  start: string;
  end: string;
  workType?: 'homework' | 'revision';
  sequence?: number;
};

type BreakBlock = {
  startMinutes: number;
  endMinutes: number;
  duration: number;
};

const START_HOUR = 7;
const END_HOUR = 24;
const HOUR_HEIGHT = 48;
const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const SCHOOL_START = 8 * 60;
const SCHOOL_END = 15 * 60;
const SLEEP_START = 23 * 60;

const singaporeDate = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const mondayKey = (date: Date) => {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return dateKey(monday);
};
const fromKey = (key: string) => new Date(`${key}T12:00:00Z`);
const minutesOfDay = (iso: string) => {
  const date = singaporeDate(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};
const clockLabel = (minutes: number, includeMinutes = true) => {
  const hours = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const minuteLabel = includeMinutes ? `:${String(minute).padStart(2, '0')}` : '';
  return `${hours % 12 || 12}${minuteLabel} ${hours >= 12 ? 'PM' : 'AM'}`;
};
const timeLabel = (iso: string) => clockLabel(minutesOfDay(iso));
const positionStyle = (startMinutes: number, endMinutes: number, minimumHeight = 24) => {
  const visibleStart = Math.max(startMinutes, START_HOUR * 60);
  const visibleEnd = Math.min(endMinutes, END_HOUR * 60);
  const top = ((visibleStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const naturalHeight = ((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(minimumHeight, naturalHeight) };
};

const getBreaks = (blocks: ScheduleBlock[]): BreakBlock[] => {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.slice(0, -1).flatMap((block, index) => {
    const next = sorted[index + 1];
    const startMinutes = minutesOfDay(block.end);
    const endMinutes = minutesOfDay(next.start);
    const duration = endMinutes - startMinutes;
    if (duration < 5 || duration > 45) return [];
    return [{ startMinutes, endMinutes, duration }];
  });
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
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[0.65rem] font-semibold text-white/55">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-wellness-sage-500/70" /> Homework</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-wellness-sky-500/70" /> Revision</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-400/60" /> School</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400/70" /> Break</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-400/60" /> Sleep</span>
      </div>
      <p className="text-xs text-white/45 sm:hidden">Swipe sideways and scroll down to explore the full week.</p>
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

            <div className="max-h-[68vh] overflow-auto">
              <div className="grid min-w-[1050px] grid-cols-[72px_repeat(7,minmax(135px,1fr))]">
                <div className="sticky left-0 top-0 z-50 flex items-center justify-center border-b border-r border-[#3A3453] bg-[#211D32] px-2 py-2 text-[0.65rem] font-bold uppercase tracking-wide text-white/45">
                  Time
                </div>
                {days.map((day) => (
                  <div key={`header-${dateKey(day)}`} className="sticky top-0 z-40 border-b border-r border-[#3A3453] bg-[#191624] px-2 py-2 text-center last:border-r-0">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">{day.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'UTC' })}</p>
                    <p className="text-sm font-bold text-white">{day.getUTCDate()}</p>
                  </div>
                ))}

                <div className="sticky left-0 z-30 border-r border-[#3A3453] bg-[#191624]" style={{ height: TIMELINE_HEIGHT }}>
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
                    const hour = START_HOUR + index;
                    return (
                      <span
                        key={hour}
                        className="absolute right-2 -translate-y-1/2 text-[0.6rem] font-medium text-white/40"
                        style={{ top: index * HOUR_HEIGHT }}
                      >
                        {clockLabel(hour * 60, false)}
                      </span>
                    );
                  })}
                </div>

                {days.map((day) => {
                  const dayBlocks = scheduledDays.get(dateKey(day)) || [];
                  const breaks = getBreaks(dayBlocks);
                  const isSchoolDay = day.getUTCDay() >= 1 && day.getUTCDay() <= 5;

                  return (
                    <div
                      key={dateKey(day)}
                      className="relative border-r border-[#3A3453] last:border-r-0"
                      style={{
                        height: TIMELINE_HEIGHT,
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, rgba(255,255,255,0.07) ${HOUR_HEIGHT - 1}px, rgba(255,255,255,0.07) ${HOUR_HEIGHT}px)`,
                      }}
                    >
                      {isSchoolDay && (
                        <div className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-lg border border-indigo-400/25 bg-indigo-500/15 p-2 text-indigo-100" style={positionStyle(SCHOOL_START, SCHOOL_END, 32)}>
                          <div className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-indigo-200">
                            <GraduationCap className="h-3 w-3" /> School
                          </div>
                          <p className="mt-1 text-[0.62rem] text-indigo-100/65">8:00 AM–3:00 PM</p>
                        </div>
                      )}

                      {isSchoolDay && (
                        <div className="absolute left-3 right-3 z-20 rounded-md border border-amber-300/25 bg-[#4A351D] px-1.5 py-1 text-[0.56rem] font-semibold text-amber-100" style={positionStyle(12 * 60 + 30, 13 * 60, 22)}>
                          <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> Lunch break</span>
                        </div>
                      )}

                      {breaks.map((breakBlock) => (
                        <div
                          key={`${dateKey(day)}-break-${breakBlock.startMinutes}`}
                          className="absolute left-2 right-2 z-20 flex items-center justify-center rounded-md border border-amber-300/30 bg-[#4A351D] px-1 text-[0.55rem] font-semibold text-amber-100"
                          style={positionStyle(breakBlock.startMinutes, breakBlock.endMinutes, 18)}
                        >
                          <Coffee className="mr-1 h-3 w-3" /> {breakBlock.duration} min break
                        </div>
                      ))}

                      {dayBlocks.map((block) => {
                        const isRevision = block.workType === 'revision';
                        const Icon = isRevision ? BookOpen : ClipboardCheck;
                        const startMinutes = minutesOfDay(block.start);
                        const endMinutes = minutesOfDay(block.end);
                        return (
                          <div
                            key={`${block.start}-${block.title}`}
                            className={`absolute left-1.5 right-1.5 z-30 overflow-hidden rounded-lg border p-2 shadow-lg ${isRevision ? 'border-wellness-sky-500/35 bg-[#102333]' : 'border-wellness-sage-500/35 bg-[#1B1747]'}`}
                            style={positionStyle(startMinutes, endMinutes)}
                            title={`${block.title} · ${timeLabel(block.start)}–${timeLabel(block.end)}`}
                          >
                            <div className={`flex items-center gap-1 text-[0.56rem] font-bold uppercase ${isRevision ? 'text-wellness-sky-300' : 'text-wellness-sage-300'}`}>
                              <Icon className="h-3 w-3" /> {isRevision ? 'Revision' : 'Homework'}
                            </div>
                            <p className="mt-0.5 truncate text-[0.65rem] font-semibold text-white">{block.title}</p>
                            <p className="mt-0.5 text-[0.56rem] text-white/55">{timeLabel(block.start)}–{timeLabel(block.end)}</p>
                          </div>
                        );
                      })}

                      <div className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-lg border border-violet-400/25 bg-violet-500/15 p-2 text-violet-100" style={positionStyle(SLEEP_START, END_HOUR * 60, 42)}>
                        <div className="flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-wide text-violet-200">
                          <Moon className="h-3 w-3" /> Recommended sleep
                        </div>
                        <p className="mt-0.5 text-[0.56rem] text-violet-100/65">11:00 PM–7:00 AM</p>
                      </div>
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
