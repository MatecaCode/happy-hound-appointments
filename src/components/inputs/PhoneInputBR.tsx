import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface PhoneInputBRProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
  helperText?: string;
}

const PhoneInputBR: React.FC<PhoneInputBRProps> = ({
  value,
  onChange,
  label,
  placeholder = "(11) 99999-9999",
  className = "",
  error = false,
  helperText
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [showHelper, setShowHelper] = useState(false);

  // Format phone number for display
  const formatPhoneNumber = (digits: string): string => {
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Extract only digits from input
  const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digits = extractDigits(inputValue);
    
    // Limit to 11 digits (Brazilian phone numbers)
    if (digits.length <= 11) {
      const formatted = formatPhoneNumber(digits);
      setDisplayValue(formatted);
      onChange(digits); // Store only digits in parent component
      
      // Show helper text if less than 10 digits
      setShowHelper(digits.length > 0 && digits.length < 10);
    }
  };

  // Handle focus
  const handleFocus = () => {
    if (value.length > 0 && value.length < 10) {
      setShowHelper(true);
    }
  };

  // Handle blur
  const handleBlur = () => {
    setShowHelper(false);
  };

  // Update display value when value prop changes
  useEffect(() => {
    const formatted = formatPhoneNumber(value);
    setDisplayValue(formatted);
    setShowHelper(value.length > 0 && value.length < 10);
  }, [value]);

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium text-gray-700 mb-1 block">
          {label}
        </Label>
      )}
      
      <Input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${error ? 'border-red-500 focus:border-red-500' : ''}`}
        maxLength={15} // (11) 99999-9999 = 15 chars
      />
      
      {(showHelper || helperText) && (
        <div className="flex items-center space-x-1 mt-1">
          <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-600">
            {helperText || "Digite um telefone válido"}
          </span>
        </div>
      )}
    </div>
  );
};

export default PhoneInputBR;
