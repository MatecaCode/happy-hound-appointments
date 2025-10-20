import React, { useMemo } from 'react';
import Chip from './Chip';

export interface StaffLaneAppointment {
  id: string;
  pet_name: string;
  service_name: string;
  status: string;
  startHHMM: string; // HH:MM
  durationMin: number;
}

export interface StaffLaneProps {
  staffId: string;
  staffName: string;
  appointments: StaffLaneAppointment[];
  compact?: boolean;
  containerHeightPx?: number;
}

// Layout constants matching daily grid: 30 minutes ~ 60px in AdminAgendaHoje
const PIXELS_PER_MINUTE = 2; // 30 min = 60px
const DAY_START_MINUTE = 9 * 60;  // 09:00
const DAY_END_MINUTE = 17 * 60;   // 17:00

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const StaffLane: React.FC<StaffLaneProps> = ({ staffId, staffName, appointments, compact = false, containerHeightPx = 960 }) => {
  const positioned = useMemo(() => {
    return appointments.map(apt => {
      const start = Math.max(toMinutes(apt.startHHMM), DAY_START_MINUTE);
      const end = Math.min(start + apt.durationMin, DAY_END_MINUTE);
      const top = (start - DAY_START_MINUTE) * PIXELS_PER_MINUTE;
      const height = Math.max((end - start) * PIXELS_PER_MINUTE - 4, 20);
      const endHH = Math.floor(end / 60).toString().padStart(2, '0');
      const endMM = (end % 60).toString().padStart(2, '0');
      return {
        ...apt,
        top,
        height,
        endHHMM: `${endHH}:${endMM}`,
      };
    });
  }, [appointments]);

  return (
    <div className="relative border-l" style={{ minHeight: containerHeightPx }}>
      {positioned.map(apt => (
        <div
          key={apt.id}
          className="absolute left-1 right-1"
          style={{ top: apt.top, height: apt.height }}
        >
          <Chip
            petName={apt.pet_name}
            serviceName={apt.service_name}
            staffName={staffName}
            startTime={apt.startHHMM}
            endTime={apt.endHHMM}
            status={apt.status}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
};

export default StaffLane;


