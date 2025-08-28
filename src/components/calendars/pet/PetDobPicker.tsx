import React, { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PetDobCalendar } from "./PetDobCalendar";

interface PetDobPickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PetDobPicker({
  value,
  onChange,
  placeholder = "Selecione a data de nascimento",
  disabled = false,
  className,
}: PetDobPickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Internal component identifier: Pet DOB Picker

  // Initialize input value when value changes
  React.useEffect(() => {
    if (value && !isTyping) {
      setInputValue(format(value, "dd/MM/yyyy", { locale: ptBR }));
    } else if (!value && !isTyping) {
      setInputValue("");
    }
  }, [value, isTyping]);

  const handleSelect = (selectedDate: Date | undefined) => {
    onChange?.(selectedDate);
    setOpen(false);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsTyping(true);

    // Try to parse the input as a date
    const parsedDate = parse(newValue, "dd/MM/yyyy", new Date());
    if (isValid(parsedDate) && newValue.length === 10) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only allow past dates for pet DOB
      if (parsedDate <= today) {
        onChange?.(parsedDate);
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (parsedDate <= today) {
          onChange?.(parsedDate);
          setOpen(false);
          setIsTyping(false);
        } else {
          // Show error for future dates
          setInputValue("");
          setIsTyping(false);
        }
      }
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsTyping(false), 100);
  };

  // Use custom calendar with standardized year range
  return (
    <div className={cn("pet-dob-picker-wrapper relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              onFocus={() => setIsTyping(true)}
              placeholder={placeholder}
              className={cn("pl-10", className)}
              disabled={disabled}
            />
            <CalendarIcon 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer" 
              onClick={() => setOpen(true)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <PetDobCalendar
            value={value}
            onChange={handleSelect}
          />
          <div className="flex gap-2 p-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setIsTyping(false);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange?.(value);
                setOpen(false);
                setIsTyping(false);
              }}
              className="flex-1"
            >
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
