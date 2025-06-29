import React from 'react';
import { X } from 'lucide-react';
import { CustomProductSelect } from '../CustomProductSelect';
import { useCurrency } from '../../contexts/CurrencyContext';

interface Product {
  id: string;
  name: string;
  unit_sizes: {
    id: string;
    unit_size_id: string;
    unit_size: {
      id: string;
      name: string;
    };
  }[];
}

interface ReturnItem {
  product_id: string;
  unit_size_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  return_reason: string;
  item_condition: string;
}

interface Props {
  items: ReturnItem[];
  products: Product[];
  onUpdateItem: (index: number, field: string, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  currency: 'USD' | 'SYP';
  maxQuantities?: Record<string, number>;
  type: 'sale' | 'purchase';
}

export function ReturnItemsTable({
  items,
  products,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  currency,
  maxQuantities,
  type
}: Props) {
  const { formatAmount } = useCurrency();

  const conditions = type === 'sale' 
    ? [
        { value: 'new', label: 'New' },
        { value: 'opened', label: 'Opened' },
        { value: 'damaged', label: 'Damaged' }
      ]
    : [
        { value: 'new', label: 'New' },
        { value: 'damaged', label: 'Damaged' },
        { value: 'incorrect', label: 'Incorrect Item' }
      ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Return Items</h3>
        <button
          type="button"
          onClick={onAddItem}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Add Item
        </button>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-[1fr,160px,100px,120px,120px,200px,160px,auto] gap-4 mb-2 px-3">
          <div className="text-sm font-medium text-gray-500">Product</div>
          <div className="text-sm font-medium text-gray-500">Size</div>
          <div className="text-sm font-medium text-gray-500">Quantity</div>
          <div className="text-sm font-medium text-gray-500">Unit Price</div>
          <div className="text-sm font-medium text-gray-500">Subtotal</div>
          <div className="text-sm font-medium text-gray-500">Reason</div>
          <div className="text-sm font-medium text-gray-500">Condition</div>
          <div></div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr,160px,100px,120px,120px,200px,160px,auto] gap-4 items-start bg-gray-50 p-3 rounded-lg">
            <div>
              <CustomProductSelect
                products={products}
                selectedProduct={products.find(p => p.id === item.product_id)}
                onSelect={(product) => {
                  onUpdateItem(index, 'product_id', product.id);
                }}
                placeholder="Search for a product..."
              />
            </div>

            {item.product_id && (
              <div>
                <select
                  value={item.unit_size_id || ''}
                  onChange={(e) => onUpdateItem(index, 'unit_size_id', e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select size...</option>
                  {products
                    .find(p => p.id === item.product_id)
                    ?.unit_sizes.map(size => (
                      <option key={size.unit_size_id} value={size.unit_size_id}>
                        {size.unit_size.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                min="1"
                max={maxQuantities?.[`${item.product_id}-${item.unit_size_id}`]}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Qty"
              />
            </div>

            <div>
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => onUpdateItem(index, 'unit_price', e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Price"
              />
            </div>

            <div>
              <input
                type="number"
                value={item.subtotal}
                readOnly
                className="w-full rounded-md bg-gray-50 border-gray-300"
              />
            </div>

            <div>
              <input
                type="text"
                value={item.return_reason}
                onChange={(e) => onUpdateItem(index, 'return_reason', e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Reason for return"
              />
            </div>

            <div>
              <select
                value={item.item_condition}
                onChange={(e) => onUpdateItem(index, 'item_condition', e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select condition...</option>
                {conditions.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={() => onRemoveItem(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}