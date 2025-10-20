import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface ChipProps {
  petName: string;
  serviceName: string;
  staffName?: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  status?: string;
  compact?: boolean;
}

const statusClasses = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'confirmed' || s === 'active') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'completed' || s === 'finished') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export const Chip: React.FC<ChipProps> = ({
  petName,
  serviceName,
  staffName,
  startTime,
  endTime,
  status,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border text-xs ${statusClasses(status)}`}>
        <span className="text-[10px]">•</span>
        <span className="font-medium truncate max-w-[8rem]">{petName}</span>
        <span className="text-gray-700 truncate max-w-[10rem]">{serviceName}</span>
        {staffName && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
            {staffName.split(' ').map(p => p[0]).join('').slice(0, 3)}
          </Badge>
        )}
        <span className="tabular-nums">{startTime}–{endTime}</span>
        {status && (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full p-2 rounded-md border ${statusClasses(status)}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{petName}</div>
        <div className="text-xs tabular-nums">{startTime}–{endTime}</div>
      </div>
      <div className="text-xs text-gray-700 truncate">{serviceName}</div>
      <div className="flex items-center gap-2 mt-1">
        {staffName && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{staffName}</Badge>}
        {status && <Badge variant="outline" className="text-[10px]">{status}</Badge>}
      </div>
    </div>
  );
};

export default Chip;


