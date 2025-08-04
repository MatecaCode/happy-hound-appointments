import React, { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Breed {
  id: string;
  name: string;
  active: boolean;
}

interface BreedComboboxProps {
  breeds: Breed[];
  onSelect: (breed: Breed) => void;
  selectedBreed?: Breed;
  disabled?: boolean;
  isLoading?: boolean;
}

export function BreedCombobox({ breeds, onSelect, selectedBreed, disabled, isLoading }: BreedComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Safety check for undefined breeds - ensure we always have an array
  const safeBreeds = Array.isArray(breeds) ? breeds : [];

  // ✅ Filter out breeds without required fields to prevent crashes
  const validBreeds = safeBreeds.filter(breed => 
    breed && 
    typeof breed.id === 'string' && 
    typeof breed.name === 'string' &&
    breed.id.trim() !== '' && // Ensure ID is not empty
    breed.name.trim() !== '' && // Ensure name is not empty
    breed.active === true // Only show active breeds
  );

  // ✅ Filter breeds based on search term
  const filteredBreeds = validBreeds.filter(breed =>
    breed.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearchTerm("");
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open]);

  // ✅ Early return if no data
  if (!safeBreeds || safeBreeds.length === 0) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-between"
        disabled={disabled || isLoading}
      >
        {isLoading ? "Carregando..." : "Nenhuma raça disponível"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (validBreeds.length === 0) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-between"
        disabled={disabled || isLoading}
      >
        {isLoading ? "Carregando..." : "Dados de raças inválidos"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button 
        variant="outline" 
        role="combobox" 
        aria-expanded={open}
        className="w-full justify-between"
        disabled={disabled || isLoading}
        onClick={() => setOpen(!open)}
      >
        {isLoading ? "Carregando..." : 
         selectedBreed ? selectedBreed.name : "Selecione uma raça"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-3 border-b border-gray-100">
            <Input
              placeholder="Buscar raça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-0 focus:ring-0 focus:ring-offset-0 p-0"
              autoFocus
            />
          </div>
          
          <div className="py-1">
            {filteredBreeds.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500 text-center">
                Nenhuma raça encontrada.
              </div>
            ) : (
              filteredBreeds.map((breed) => (
                <div
                  key={breed.id}
                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    onSelect(breed);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{breed.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 