import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import styles from "./PetDobCalendar.module.css";

interface PetDobCalendarProps {
  value?: Date;
  onChange: (date?: Date) => void;
  className?: string;
}

export function PetDobCalendar({
  value,
  onChange,
  className,
}: PetDobCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [calendarMonth, setCalendarMonth] = useState<Date>(value || new Date());
  
  // Generate year options (from 1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse();
  
  // Month names in Portuguese
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleYearChange = (year: string) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setFullYear(parseInt(year));
    setCalendarMonth(newMonth);
  };

  const handleMonthChange = (month: string) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(parseInt(month));
    setCalendarMonth(newMonth);
  };

  return (
    <div className={cn("pet-dob-calendar relative", styles.petDobCalendar, className)}>
      {/* Debug tag - always visible but small */}
      <div className="absolute top-1 left-1 z-50 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-md">
        🐕 Pet
      </div>
      
      {/* Year and Month selectors */}
      <div className="flex gap-2 p-3 pb-2">
        <Select value={calendarMonth.getMonth().toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={calendarMonth.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <DayPicker
        locale={ptBR}
        mode="single"
        selected={value}
        onSelect={onChange}
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        // DOB: block future dates
        toDate={today}
        disabled={(date) => date > today}
        fromYear={1900}
        toYear={currentYear}
        showOutsideDays={false}
        className="p-3 pt-0"
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
          // Hide the default caption since we have our own selectors above
          Caption: () => null,
        }}
      />
    </div>
  );
}
