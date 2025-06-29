import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
}

interface Props {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  selectedCustomer?: Customer;
  placeholder?: string;
}

export function CustomCustomerSelect({
  customers,
  onSelect,
  selectedCustomer,
  placeholder = 'Search customers...',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = (customers || [])
    .filter(
      (customer) =>
        searchTerm === '' ||
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 10);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="relative flex items-center border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 bg-white"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 0);
          }
        }}
      >
        <div className="flex-1 px-4 py-2">
          {selectedCustomer ? (
            <div className="text-gray-900">{selectedCustomer.full_name}</div>
          ) : (
            <div className="text-gray-500">{placeholder}</div>
          )}
        </div>
        <div className="px-4 py-2 border-l border-gray-300">
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type to search..."
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredCustomers.map((customer, index) => (
              <div
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className={`px-4 py-2 cursor-pointer ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{customer.full_name}</div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="px-4 py-2 text-gray-500 text-center">
                No customers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}