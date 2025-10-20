import React from 'react';
import DayColumn from './DayColumn';

export interface WeekGridProps {
  hourLabels: string[]; // e.g., ['09:00','09:30',...]
  days: Array<{
    dateISO: string;
    label: string;
    staff: Array<{ id: string; name: string }>;
    byStaffAppointments: Record<string, any[]>; // StaffLaneAppointment[]
  }>;
  compact?: boolean;
}

const WeekGrid: React.FC<WeekGridProps> = ({ hourLabels, days, compact = false }) => {
  // Compute required height per day from max appointment end time to avoid extra blank space
  const computeHeight = (day: WeekGridProps['days'][number]) => {
    const all = Object.values(day.byStaffAppointments || {}).flat() as any[];
    if (all.length === 0) return 960; // default 8h window
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const maxEnd = Math.max(
      ...all.map(a => {
        const start = toMin(a.startHHMM);
        return start + (a.durationMin || 60);
      })
    );
    const dayStart = 9 * 60;
    const visible = Math.max(maxEnd, 17 * 60) - dayStart; // never smaller than 17:00 baseline
    return Math.ceil(visible * 2); // 2px per minute
  };
  return (
    <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
      {/* Hour rail */}
      <div className="border-r">
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b p-2 text-xs font-medium">Horário</div>
        <div className="h-[1200px] overflow-hidden relative">
          {hourLabels.map(h => (
            <div key={h} className="h-12 flex items-center justify-center text-xs text-gray-600 border-b">
              {h}
            </div>
          ))}
        </div>
      </div>

      {days.map(day => {
        const h = computeHeight(day);
        return (
          <div key={day.dateISO} className="border-r">
            <DayColumn
              dateLabel={day.label}
              staff={day.staff}
              byStaffAppointments={day.byStaffAppointments as any}
              compact={compact}
            />
            {/* Pass dynamic height down via CSS var to lanes */}
            <style>{`.day-height-${day.dateISO}{min-height:${h}px}`}</style>
          </div>
        );
      })}
    </div>
  );
};

export default WeekGrid;


