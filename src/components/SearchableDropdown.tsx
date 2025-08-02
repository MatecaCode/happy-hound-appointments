import React, { useState } from 'react';
import { Search, XCircle } from 'lucide-react';

interface SearchableDropdownProps {
  placeholder: string;
  onSelect: (item: any) => void;
  items: any[];
  isLoading?: boolean;
  disabled?: boolean;
  getItemLabel: (item: any) => string;
  getItemSubLabel?: (item: any) => string;
  filterItems: (items: any[], searchTerm: string) => any[];
  selectedItem?: any;
  onClear?: () => void;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  placeholder,
  onSelect,
  items,
  isLoading = false,
  disabled = false,
  getItemLabel,
  getItemSubLabel,
  filterItems,
  selectedItem,
  onClear
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Simple filtering - only show results when typing
  const filteredItems = searchTerm.length > 0 ? filterItems(items, searchTerm) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleItemClick = (item: any) => {
    onSelect(item);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSearchTerm('');
    onClear?.();
  };

  return (
    <div className="relative">
      {/* Input */}
      <div className="flex items-center border rounded-md px-3 py-2 bg-white">
        <Search className="h-4 w-4 mr-2 text-muted-foreground" />
        <input
          placeholder={isLoading ? "Carregando..." : placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          className="flex-1 bg-transparent outline-none text-sm"
          disabled={disabled || isLoading}
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="ml-2 p-1 hover:bg-gray-100 rounded"
            type="button"
          >
            <XCircle className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results List */}
      {searchTerm.length > 0 && filteredItems.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              type="button"
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{getItemLabel(item)}</span>
                {getItemSubLabel && (
                  <span className="text-xs text-muted-foreground">{getItemSubLabel(item)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Item Display */}
      {selectedItem && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">{getItemLabel(selectedItem)}</span>
              {getItemSubLabel && (
                <span className="text-xs text-muted-foreground block">{getItemSubLabel(selectedItem)}</span>
              )}
            </div>
            <button
              onClick={handleClear}
              className="text-red-500 hover:text-red-700"
              type="button"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown; 