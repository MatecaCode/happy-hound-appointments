import React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface StaffAvailabilityDatePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  isDisabledDate: (date: Date) => boolean;
  onMonthChange?: (date: Date) => void;
  className?: string;
}

export function StaffAvailabilityDatePicker({
  value,
  onChange,
  isDisabledDate,
  onMonthChange,
  className,
}: StaffAvailabilityDatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="staff-date-picker">
      <DayPicker
        locale={ptBR}
        mode="single"
        selected={value}
        onSelect={onChange}
        onMonthChange={onMonthChange}
        // Block navigation before today
        fromMonth={today}
        // Hide outside days to reduce confusion
        showOutsideDays={false}
        // Use the disabled predicate directly
        disabled={isDisabledDate}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
          Caption: ({ displayMonth, ...captionProps }) => (
            <div className="flex justify-center pt-1 relative items-center">
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                onClick={() => {
                  console.log('🔍 [CALENDAR] Left arrow clicked');
                  const newMonth = new Date(displayMonth);
                  newMonth.setMonth(displayMonth.getMonth() - 1);
                  console.log('🔍 [CALENDAR] New month will be:', newMonth.toISOString().split('T')[0]);
                  if (onMonthChange) {
                    onMonthChange(newMonth);
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                {displayMonth.toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                onClick={() => {
                  console.log('🔍 [CALENDAR] Right arrow clicked');
                  const newMonth = new Date(displayMonth);
                  newMonth.setMonth(displayMonth.getMonth() + 1);
                  console.log('🔍 [CALENDAR] New month will be:', newMonth.toISOString().split('T')[0]);
                  if (onMonthChange) {
                    onMonthChange(newMonth);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )
        }}
      />
    </div>
  );
}
