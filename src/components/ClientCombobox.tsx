import React, { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  user_id: string;
}

interface ClientComboboxProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  selectedClient?: Client;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ClientCombobox({ clients, onSelect, selectedClient, disabled, isLoading }: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Safety check for undefined clients - ensure we always have an array
  const safeClients = Array.isArray(clients) ? clients : [];

  // ✅ Filter out clients without required fields to prevent crashes
  const validClients = safeClients.filter(client => 
    client && 
    typeof client.id === 'string' && 
    typeof client.name === 'string' &&
    client.id.trim() !== '' && // Ensure ID is not empty
    client.name.trim() !== ''   // Ensure name is not empty
  );

  // ✅ Filter clients based on search term
  const filteredClients = validClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
  if (!safeClients || safeClients.length === 0) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-between"
        disabled={disabled || isLoading}
      >
        {isLoading ? "Carregando..." : "Nenhum cliente disponível"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (validClients.length === 0) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-between"
        disabled={disabled || isLoading}
      >
        {isLoading ? "Carregando..." : "Dados de clientes inválidos"}
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
         selectedClient ? selectedClient.name : "Selecione um cliente"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-3 border-b border-gray-100">
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-0 focus:ring-0 focus:ring-offset-0 p-0"
              autoFocus
            />
          </div>
          
          <div className="py-1">
            {filteredClients.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500 text-center">
                Nenhum cliente encontrado.
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    onSelect(client);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{client.name}</span>
                    {client.email && (
                      <span className="text-xs text-gray-500 mt-0.5">{client.email}</span>
                    )}
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