import React, { useMemo } from 'react';
import { BookOpen, ClipboardCheck, Coffee, GraduationCap, Moon } from 'lucide-react';

type ScheduleBlock = {
  id?: string;
  title: string;
  start: string;
  end: string;
  workType?: 'homework' | 'revision';
  sequence?: number;
  scheduleStatus?: 'todo' | 'doing' | 'done';
};

type TimetableEvent = {
  id: string;
  type: 'homework' | 'revision' | 'school' | 'break' | 'sleep';
  title: string;
  startMinutes: number;
  endMinutes: number;
  sequence?: number;
  status?: 'todo' | 'doing' | 'done';
};

const SCHOOL_START = 8 * 60;
const SCHOOL_END = 15 * 60;
const LUNCH_START = 12 * 60 + 30;
const LUNCH_END = 13 * 60;
const SLEEP_START = 23 * 60;
const SLEEP_END = 7 * 60;

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
const clockLabel = (minutes: number) => {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hours % 12 || 12}:${String(minute).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const getBreakEvents = (blocks: ScheduleBlock[], day: string): TimetableEvent[] => {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.slice(0, -1).flatMap((block, index) => {
    const next = sorted[index + 1];
    const startMinutes = minutesOfDay(block.end);
    const endMinutes = minutesOfDay(next.start);
    const duration = endMinutes - startMinutes;
    if (duration < 5 || duration > 45) return [];
    return [{
      id: `${day}-break-${startMinutes}`,
      type: 'break' as const,
      title: `${duration} min reset`,
      startMinutes,
      endMinutes,
    }];
  });
};

const eventStyles: Record<TimetableEvent['type'], string> = {
  homework: 'border-[#4D4594] bg-[#211A57] text-[#DCD8FF]',
  revision: 'border-[#31586E] bg-[#122735] text-[#C7EBFF]',
  school: 'border-[#444475] bg-[#20203E] text-[#D7D8FF]',
  break: 'border-[#73551E] bg-[#3A2B16] text-[#FFE1A0]',
  sleep: 'border-[#4B426F] bg-[#28213D] text-[#DDD2FF]',
};

const EventIcon = ({ type }: { type: TimetableEvent['type'] }) => {
  const className = 'h-3.5 w-3.5 shrink-0';
  if (type === 'revision') return <BookOpen className={className} />;
  if (type === 'homework') return <ClipboardCheck className={className} />;
  if (type === 'school') return <GraduationCap className={className} />;
  if (type === 'sleep') return <Moon className={className} />;
  return <Coffee className={className} />;
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
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#6F61CF]" /> Homework</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#4C88A7]" /> Revision</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#6868A7]" /> School</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#B48324]" /> Break</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#7766A8]" /> Sleep</span>
      </div>
      <p className="text-xs text-white/45 sm:hidden">Swipe sideways to view every day.</p>

      {weeks.map(([weekKey, scheduledDays], weekIndex) => {
        const monday = fromKey(weekKey);
        const days = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(monday);
          date.setUTCDate(monday.getUTCDate() + index);
          return date;
        });
        const eventsByDay = new Map<string, TimetableEvent[]>();

        days.forEach((day) => {
          const dayKey = dateKey(day);
          const dayBlocks = scheduledDays.get(dayKey) || [];
          const isSchoolDay = day.getUTCDay() >= 1 && day.getUTCDay() <= 5;
          const fixedEvents: TimetableEvent[] = isSchoolDay ? [
            { id: `${dayKey}-school`, type: 'school', title: 'School day', startMinutes: SCHOOL_START, endMinutes: SCHOOL_END },
            { id: `${dayKey}-lunch`, type: 'break', title: 'Lunch break', startMinutes: LUNCH_START, endMinutes: LUNCH_END },
          ] : [];
          const studyEvents: TimetableEvent[] = dayBlocks.map((block) => ({
            id: block.id || `${block.start}-${block.title}`,
            type: block.workType === 'revision' ? 'revision' : 'homework',
            title: block.title,
            startMinutes: minutesOfDay(block.start),
            endMinutes: minutesOfDay(block.end),
            sequence: block.sequence,
            status: block.scheduleStatus,
          }));
          const dayEvents: TimetableEvent[] = [
            ...fixedEvents,
            ...studyEvents,
            ...getBreakEvents(dayBlocks, dayKey),
            { id: `${dayKey}-sleep`, type: 'sleep', title: 'Recommended sleep', startMinutes: SLEEP_START, endMinutes: SLEEP_END },
          ];
          eventsByDay.set(dayKey, dayEvents.sort((a, b) => a.startMinutes - b.startMinutes));
        });

        const rowTimes = [...new Set(
          [...eventsByDay.values()].flatMap((events) => events.map((event) => event.startMinutes))
        )].sort((a, b) => a - b);

        return (
          <section key={weekKey} className="overflow-hidden rounded-2xl border border-[#3A3453] bg-[#13111C]">
            <div className="border-b border-[#3A3453] bg-[#211D32] px-4 py-3 text-xs font-bold text-white/75">
              {weekIndex === 0 ? 'This plan' : `Week ${weekIndex + 1}`} · {days[0].toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' })}–{days[6].toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="grid grid-cols-[92px_repeat(7,minmax(140px,1fr))]">
                  <div className="sticky left-0 z-30 flex items-center border-b border-r border-[#3A3453] bg-[#211D32] px-3 py-3 text-[0.65rem] font-bold uppercase tracking-wide text-white/45">
                    Time
                  </div>
                  {days.map((day) => (
                    <div key={`header-${dateKey(day)}`} className="border-b border-r border-[#3A3453] bg-[#191624] px-2 py-2.5 text-center last:border-r-0">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">{day.toLocaleDateString('en-SG', { weekday: 'short', timeZone: 'UTC' })}</p>
                      <p className="text-sm font-bold text-white">{day.getUTCDate()}</p>
                    </div>
                  ))}
                </div>

                {rowTimes.map((rowTime) => (
                  <div key={rowTime} className="grid grid-cols-[92px_repeat(7,minmax(140px,1fr))] border-b border-[#2A263B] last:border-b-0">
                    <div className="sticky left-0 z-20 border-r border-[#3A3453] bg-[#191624] px-3 py-3 text-right text-[0.65rem] font-semibold text-white/45">
                      {clockLabel(rowTime)}
                    </div>
                    {days.map((day) => {
                      const dayEvents = (eventsByDay.get(dateKey(day)) || []).filter((event) => event.startMinutes === rowTime);
                      return (
                        <div key={`${dateKey(day)}-${rowTime}`} className="min-h-[76px] border-r border-[#2A263B] p-1.5 last:border-r-0">
                          <div className="space-y-1.5">
                            {dayEvents.map((event) => (
                              <div key={event.id} className={`rounded-lg border px-2 py-2 ${eventStyles[event.type]} ${event.status === 'done' ? 'opacity-55' : ''}`}>
                                <div className="flex items-center gap-1.5 text-[0.58rem] font-bold uppercase tracking-wide opacity-80">
                                  <EventIcon type={event.type} />
                                  <span>{event.type === 'break' ? 'Break' : event.type}</span>
                                  {event.status === 'done' && <span className="ml-auto rounded bg-white/10 px-1 py-0.5 text-[0.48rem]">Done</span>}
                                  {event.status === 'doing' && <span className="ml-auto rounded bg-white/10 px-1 py-0.5 text-[0.48rem]">Doing</span>}
                                </div>
                                <p className="mt-1 break-words text-[0.68rem] font-semibold leading-snug text-white">{event.title}</p>
                                <p className="mt-1 text-[0.57rem] leading-none opacity-65">
                                  {clockLabel(event.startMinutes)}–{clockLabel(event.endMinutes)}
                                  {event.sequence && event.type === 'revision' ? ` · Session ${event.sequence}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};
