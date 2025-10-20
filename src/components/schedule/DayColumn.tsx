import React from 'react';
import StaffLane, { StaffLaneAppointment } from './StaffLane';

export interface DayColumnProps {
  dateLabel: string;
  staff: Array<{ id: string; name: string }>;
  byStaffAppointments: Record<string, StaffLaneAppointment[]>; // staffId -> apts for this day
  compact?: boolean;
  containerHeightPx?: number;
}

const DayColumn: React.FC<DayColumnProps> = ({ dateLabel, staff, byStaffAppointments, compact = false, containerHeightPx = 960 }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b p-2 font-medium">
        {dateLabel}
      </div>
      <div className="flex-1 overflow-auto" style={{ minHeight: containerHeightPx }}>
        {staff.map(s => (
          <div key={s.id} className="border-b">
            <div className="px-2 py-1 text-xs text-gray-700 bg-gray-50 sticky top-0 z-10">
              {s.name}
            </div>
            <div
              className="relative"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 60px)'
              }}
            >
              <StaffLane
                staffId={s.id}
                staffName={s.name}
                appointments={byStaffAppointments[s.id] || []}
                compact={compact}
                containerHeightPx={containerHeightPx}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayColumn;


