
import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromYear?: number
  toYear?: number
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Selecione a data",
  disabled = false,
  className,
  fromYear = 2000,
  toYear = new Date().getFullYear()
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | undefined>(date)

  const handleSelect = (selectedDate: Date | undefined) => {
    setTempDate(selectedDate)
  }

  const handleConfirm = () => {
    onSelect?.(tempDate)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempDate(date)
    setOpen(false)
  }

  React.useEffect(() => {
    setTempDate(date)
  }, [date])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={handleSelect}
          initialFocus
          fromYear={fromYear}
          toYear={toYear}
          captionLayout="dropdown-buttons"
          className="pointer-events-auto"
        />
        <div className="flex gap-2 p-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!tempDate}
            className="flex-1"
          >
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
