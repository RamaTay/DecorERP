import { useState, useCallback } from 'react';
import { startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

interface DateRange {
  from: string;
  to: string;
}

interface UseFiltersProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  dateField: keyof T;
}

export function useFilters<T>({ data, searchFields, dateField }: UseFiltersProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: '',
    to: ''
  });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value.toLowerCase());
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const handleFilterChange = useCallback((field: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const filteredData = data.filter(item => {
    // Search term filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchFields.some(field => {
        // Handle nested fields (e.g., 'customer.full_name')
        const fieldParts = String(field).split('.');
        let value = item;
        for (const part of fieldParts) {
          value = value?.[part];
        }

        // Handle numeric values
        if (typeof value === 'number') {
          return String(value).includes(searchTerm);
        }

        return value && String(value).toLowerCase().includes(searchTermLower);
      });
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      const itemDate = parseISO(String(item[dateField]));
      
      if (dateRange.from && dateRange.to) {
        const start = startOfDay(parseISO(dateRange.from));
        const end = endOfDay(parseISO(dateRange.to));
        if (!isWithinInterval(itemDate, { start, end })) return false;
      } else if (dateRange.from) {
        const start = startOfDay(parseISO(dateRange.from));
        if (itemDate < start) return false;
      } else if (dateRange.to) {
        const end = endOfDay(parseISO(dateRange.to));
        if (itemDate > end) return false;
      }
    }

    // Additional filters
    for (const [field, value] of Object.entries(selectedFilters)) {
      if (value && item[field as keyof T] !== value) return false;
    }

    return true;
  });

  return {
    filteredData,
    searchTerm,
    dateRange,
    selectedFilters,
    handleSearchChange,
    handleDateRangeChange,
    handleFilterChange
  };
}