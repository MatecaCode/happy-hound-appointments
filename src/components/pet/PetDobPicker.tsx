import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface PetDobPickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  className?: string;
}

export function PetDobPicker({
  value,
  onChange,
  className,
}: PetDobPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn("pet-dob-picker", className)}>
      <Calendar
        mode="single"
        selected={value}
        onSelect={onChange}
        // DOB: block future dates
        toDate={today}
        disabled={(date) => date > today}
        // Keep arrow-only nav (base sets captionLayout="buttons")
        fromYear={1990}
        toYear={new Date().getFullYear()}
      />
    </div>
  );
}
