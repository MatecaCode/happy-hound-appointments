
import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
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
  fromYear = 1990,
  toYear = new Date().getFullYear()
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | undefined>(date)
  const [inputValue, setInputValue] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(date || new Date())

  const handleSelect = (selectedDate: Date | undefined) => {
    setTempDate(selectedDate)
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: ptBR }))
      setCalendarMonth(selectedDate)
    }
  }

  const handleConfirm = () => {
    onSelect?.(tempDate)
    setOpen(false)
    setIsTyping(false)
  }

  const handleCancel = () => {
    setTempDate(date)
    setInputValue(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "")
    setOpen(false)
    setIsTyping(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsTyping(true)

    // Try to parse the date
    if (value.length === 10) { // dd/MM/yyyy format
      const parsedDate = parse(value, "dd/MM/yyyy", new Date())
      if (isValid(parsedDate)) {
        setTempDate(parsedDate)
        setCalendarMonth(parsedDate)
        setIsTyping(false)
      }
    }
  }

  const handleInputBlur = () => {
    if (inputValue) {
      const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date())
      if (isValid(parsedDate)) {
        setTempDate(parsedDate)
        setCalendarMonth(parsedDate)
        setIsTyping(false)
      } else {
        // Reset to current date if invalid
        setInputValue(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "")
        setTempDate(date)
        setIsTyping(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Parse the current input value and confirm it
      if (inputValue) {
        const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date())
        if (isValid(parsedDate)) {
          setTempDate(parsedDate)
          setCalendarMonth(parsedDate)
          onSelect?.(parsedDate)
          setInputValue(format(parsedDate, "dd/MM/yyyy", { locale: ptBR }))
          setOpen(false)
          setIsTyping(false)
        } else {
          // Show error for invalid date
          toast.error('Data inválida. Use o formato DD/MM/AAAA')
          // Reset to current date if invalid
          setInputValue(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "")
          setTempDate(date)
          setIsTyping(false)
        }
      }
    }
  }

  React.useEffect(() => {
    setTempDate(date)
    setInputValue(date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "")
    if (date) {
      setCalendarMonth(date)
    }
  }, [date])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "pr-10",
              className
            )}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setOpen(true)}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={handleSelect}
          initialFocus
          fromYear={fromYear}
          toYear={toYear}
          className="pointer-events-auto"
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          captionLayout="buttons"
          viewMode="days"
          onViewModeChange={() => {}} // Prevent view mode changes in date picker
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
