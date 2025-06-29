import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (dates: { from: string; to: string }) => void;
  placeholder?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, placeholder = "Select date range" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = () => {
    if (!startDate && !endDate) return placeholder;
    if (startDate && endDate) {
      return `${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`;
    }
    if (startDate) return `From ${format(new Date(startDate), 'MMM d, yyyy')}`;
    return `Until ${format(new Date(endDate), 'MMM d, yyyy')}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex items-center justify-between gap-2 w-64 px-3 py-1.5 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">{formatDisplayDate()}</span>
        </div>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: '', to: '' });
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onChange({ from: e.target.value, to: endDate })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => onChange({ from: startDate, to: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}