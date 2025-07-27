
import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { DayPicker, DropdownProps } from "react-day-picker";
import { format, getYear, differenceInYears } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [calendarViewMode, setCalendarViewMode] = React.useState<'days' | 'months' | 'years'>('days');
  // Define an extended type that includes the properties we need
  interface CustomDropdownProps extends DropdownProps {
    currentMonth: Date;
    fromYear?: number;
    toYear?: number;
    goToMonth: (date: Date) => void;
    onViewModeChange?: (mode: 'days' | 'months' | 'years') => void;
    viewMode?: 'days' | 'months' | 'years';
  }
  
  function CustomDropdowns(props: CustomDropdownProps) {
    const { currentMonth, fromYear, toYear, onViewModeChange, viewMode: externalViewMode } = props;
    const [internalViewMode, setInternalViewMode] = React.useState<'days' | 'months' | 'years'>('days');
    const viewMode = externalViewMode || internalViewMode;
    
    const setViewMode = (mode: 'days' | 'months' | 'years') => {
      if (onViewModeChange) {
        onViewModeChange(mode);
      } else {
        setInternalViewMode(mode);
      }
    };
    
    // Check if currentMonth exists before using it
    if (!currentMonth) {
      return null;
    }
    
    // Years array - ensure we have a good range
    const years = React.useMemo(() => {
      const startYear = fromYear || 1900;
      const endYear = toYear || new Date().getFullYear() + 10;
      return Array.from(
        { length: endYear - startYear + 1 }, 
        (_, i) => startYear + i
      ).reverse(); // Show newest years first
    }, [fromYear, toYear]);
    
    // Months array
    const months = React.useMemo(() => [
      "Janeiro", "Fevereiro", "Março", "Abril", 
      "Maio", "Junho", "Julho", "Agosto", 
      "Setembro", "Outubro", "Novembro", "Dezembro"
    ], []);

    const handleMonthClick = () => {
      setViewMode(viewMode === 'days' ? 'months' : 'days');
    };

    const handleYearClick = () => {
      setViewMode(viewMode === 'days' ? 'years' : 'days');
    };

    const handleMonthSelect = (monthIndex: number) => {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(monthIndex);
      props.goToMonth(newMonth);
      setViewMode('days');
    };

    const handleYearSelect = (year: number) => {
      const newMonth = new Date(currentMonth);
      newMonth.setFullYear(year);
      props.goToMonth(newMonth);
      setViewMode('months');
    };

    if (viewMode === 'months') {
      return (
        <div className="p-3 w-full" style={{ minHeight: '280px', maxHeight: '320px' }}>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('years')}
              className="h-8 px-2"
            >
              {currentMonth.getFullYear()}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('days')}
              className="h-8 px-2"
            >
              ← Voltar
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 px-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant="ghost"
                size="sm"
                onClick={() => handleMonthSelect(index)}
                className={cn(
                  "h-10 text-sm font-medium",
                  currentMonth.getMonth() === index && "bg-primary text-primary-foreground"
                )}
              >
                {month.substring(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    if (viewMode === 'years') {
      return (
        <div className="p-3 w-full" style={{ minHeight: '280px', maxHeight: '320px' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Selecione o ano</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('days')}
              className="h-8 px-2"
            >
              ← Voltar
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 px-2 overflow-y-auto scroll-smooth custom-scrollbar" style={{ maxHeight: '220px' }}>
            {years.map((year) => (
              <Button
                key={year}
                variant="ghost"
                size="sm"
                onClick={() => handleYearSelect(year)}
                className={cn(
                  "h-10 text-sm font-medium",
                  currentMonth.getFullYear() === year && "bg-primary text-primary-foreground"
                )}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex justify-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMonthClick}
          className="h-8 px-3 font-medium hover:bg-accent"
        >
          {months[currentMonth.getMonth()]}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleYearClick}
          className="h-8 px-3 font-medium hover:bg-accent"
        >
          {currentMonth.getFullYear()}
        </Button>
      </div>
    );
  }
  
  // If we're in month or year selection mode, only show that
  if (calendarViewMode !== 'days') {
    return (
      <div className={cn("pointer-events-auto", className)} style={{ minWidth: '280px' }}>
        <CustomDropdowns 
          currentMonth={props.month || new Date()}
          fromYear={props.fromYear}
          toYear={props.toYear}
          goToMonth={(date: Date) => {
            // Use the onMonthChange prop if available
            if (props.onMonthChange) {
              props.onMonthChange(date);
            }
          }}
          onViewModeChange={setCalendarViewMode}
          viewMode={calendarViewMode}
        />
      </div>
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
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
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: ({ displayMonth }) => {
          if (!displayMonth) return null;
          
          return (
            <div className="w-full">
              <CustomDropdowns 
                currentMonth={displayMonth}
                fromYear={props.fromYear}
                toYear={props.toYear}
                goToMonth={(date: Date) => {
                  // Use the onMonthChange prop if available
                  if (props.onMonthChange) {
                    props.onMonthChange(date);
                  }
                }}
                onViewModeChange={setCalendarViewMode}
                viewMode={calendarViewMode}
              />
            </div>
          );
        }
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
