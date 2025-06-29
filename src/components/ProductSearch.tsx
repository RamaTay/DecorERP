import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
interface Product {
  id: string;
  name: string;
  sku: string;
  unit_sizes: {
    id: string;
    unit_size_id: string;
    unit_size: {
      id: string;
      name: string;
    };
  }[];
}

interface Props {
  products: Product[];
  onSelect: (product: Product) => void;
  selectedProduct?: Product;
  placeholder?: string;
}

export function ProductSearch({ products, onSelect, selectedProduct, placeholder = "Search products..." }: Props) {
  const [query, setQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  useEffect(() => {
    // Only focus if this is a newly added item
    if (inputRef.current && query === '') {
      inputRef.current.focus();
      // Don't automatically open dropdown when focusing
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isUserTyping && selectedProduct && selectedProduct.id) {
      setQuery(selectedProduct.name);
    }
  }, [selectedProduct, isUserTyping]);

  const filteredProducts = products.filter(product =>
    query === '' ? products :
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.sku.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10); // Limit to 10 results for performance

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent form submission when selecting from dropdown
    if (isOpen && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Tab':
        if (filteredProducts[selectedIndex]) {
          e.preventDefault();
          handleSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedIndex]) {
          const selectedProduct = filteredProducts[selectedIndex];
          handleSelect(selectedProduct);
          // Focus the size dropdown after selecting a product
          const sizeSelect = containerRef.current?.parentElement?.nextElementSibling?.querySelector('select');
          if (sizeSelect) {
            setTimeout(() => {
              (sizeSelect as HTMLSelectElement).focus();
            }, 0);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    setIsUserTyping(false);
    setQuery(product.name || '');
    setIsOpen(false);
    setSelectedIndex(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          const newValue = e.target.value;
          setIsUserTyping(true);
          setQuery(newValue);
          // Only open dropdown if user is actually typing
          setIsOpen(newValue.length > 0);
          setSelectedIndex(0);
          if (newValue === '') {
            // Don't trigger onSelect with empty product
            return;
          }
        }}
        onFocus={() => {
          // Don't open dropdown just on focus
          setIsOpen(false);
        }}
        className="w-full px-3 py-1.5 border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-3 py-1.5 cursor-pointer ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {product.name}
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="px-3 py-1.5 text-gray-500 text-center">
              {query === '' ? 'Select a product' : 'No products found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}