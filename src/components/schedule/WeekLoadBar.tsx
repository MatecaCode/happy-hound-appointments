import React from 'react';

export interface LoadDatum {
  dateISO: string; // yyyy-MM-dd
  label: string;   // e.g., Seg 13
  bookedMinutes: number;
  staffedMinutes: number; // visible staff only
  count: number; // total appts
}

const barClass = (util: number) => {
  if (util > 0.8) return 'bg-red-500';
  if (util >= 0.5) return 'bg-yellow-500';
  return 'bg-blue-500';
};

export const WeekLoadBar: React.FC<{ data: LoadDatum[]; onClickDay?: (dateISO: string) => void }>
  = ({ data, onClickDay }) => {
  return (
    <div className="grid grid-cols-7 gap-3">
      {data.map(d => {
        const util = d.staffedMinutes > 0 ? d.bookedMinutes / d.staffedMinutes : 0;
        return (
          <button
            key={d.dateISO}
            onClick={() => onClickDay && onClickDay(d.dateISO)}
            className="group rounded-lg border p-2 text-left hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600">{d.label}</div>
              <div className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100">{d.count}</div>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded">
              <div className={`h-2 rounded ${barClass(util)} transition-all`} style={{ width: `${Math.min(100, Math.round(util * 100))}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gray-600 tabular-nums">
              {Math.round(util * 100)}% · {Math.round(d.bookedMinutes / 60)}h/{Math.round(d.staffedMinutes / 60)}h
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default WeekLoadBar;



