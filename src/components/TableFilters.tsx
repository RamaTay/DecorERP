import React from 'react';
import { Search, X } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

interface FilterOption {
  label: string;
  value: string;
  options: { label: string; value: string }[];
}

interface Props {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: {
    from: string;
    to: string;
  };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  filterOptions?: FilterOption[];
  selectedFilters?: Record<string, string>;
  onFilterChange?: (field: string, value: string) => void;
  searchPlaceholder?: string;
}

export function TableFilters({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  filterOptions = [],
  selectedFilters = {},
  onFilterChange,
  searchPlaceholder = "Search..."
}: Props) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      {/* Search */}
      <div className="input-with-icon">
        <Search className="icon w-5 h-5" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Range */}
        <div className="sm:col-span-2">
          <DateRangePicker
            startDate={dateRange.from}
            endDate={dateRange.to}
            onChange={onDateRangeChange}
            placeholder="Filter by date range"
          />
        </div>

        {/* Additional Filters */}
        {filterOptions.map((filter) => (
          <div key={filter.value} className="relative col-span-1">
            <select
              value={selectedFilters[filter.value] || ''}
              onChange={(e) => onFilterChange?.(filter.value, e.target.value)}
              className="w-full py-1.5 pl-3 pr-8 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Filter by {filter.label.toLowerCase()}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedFilters[filter.value] && (
              <button
                onClick={() => onFilterChange?.(filter.value, '')}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}