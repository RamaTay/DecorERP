import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ReturnItemsTable } from './ReturnItemsTable';
import toast from 'react-hot-toast';

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
  isOpen: boolean;
  onClose: () => void;
  type: 'sale' | 'purchase';
  transactionId: string;
  items: any[];
  onComplete: () => void;
}

export function ReturnModal({ isOpen, onClose, type, transactionId, items, onComplete }: Props) {
  const { user } = useAuth();
  const { currency, exchangeRate } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [processingForm, setProcessingForm] = useState(false);
  const [formData, setFormData] = useState({
    return_date: format(new Date(), 'yyyy-MM-dd'),
    return_reason: '',
    notes: '',
    currency: 'USD' as const,
    transaction_exchange_rate: '',
    items: [] as ReturnItem[]
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          unit_sizes:product_unit_sizes (
            id,
            unit_size_id,
            unit_size:unit_sizes (
              id,
              name
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setProcessingForm(true);

    try {
      const returnData = {
        [type === 'sale' ? 'sale_id' : 'purchase_id']: transactionId,
        return_date: formData.return_date,
        return_reason: formData.return_reason,
        notes: formData.notes || null,
        currency: formData.currency,
        transaction_exchange_rate: formData.currency === 'SYP' ? 
          parseFloat(formData.transaction_exchange_rate) || exchangeRate : 
          null,
        created_by: user.id
      };

      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from(type === 'sale' ? 'sale_returns' : 'purchase_returns')
        .insert([returnData])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = formData.items.map(item => ({
        [type === 'sale' ? 'sale_return_id' : 'purchase_return_id']: returnRecord.id,
        [type === 'sale' ? 'sale_item_id' : 'purchase_item_id']: items.find(
          i => i.product_id === item.product_id && i.unit_size_id === item.unit_size_id
        )?.id,
        product_id: item.product_id,
        unit_size_id: item.unit_size_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        return_reason: item.return_reason,
        item_condition: item.item_condition
      }));

      const { error: itemsError } = await supabase
        .from(type === 'sale' ? 'sale_return_items' : 'purchase_return_items')
        .insert(returnItems);

      if (itemsError) throw itemsError;

      toast.success('Return created successfully');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        unit_size_id: null,
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        return_reason: '',
        item_condition: ''
      }]
    }));
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index] };

    if (field === 'product_id') {
      item.product_id = value as string;
      item.unit_size_id = null;
      item.unit_price = 0;
      item.subtotal = 0;
    } else if (field === 'unit_size_id') {
      item.unit_size_id = value as string;
      // Find original item's price
      const originalItem = items.find(
        i => i.product_id === item.product_id && i.unit_size_id === value
      );
      if (originalItem) {
        item.unit_price = originalItem.unit_price;
        item.subtotal = item.quantity * item.unit_price;
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value);
      item.subtotal = item.quantity * item.unit_price;
    } else {
      item[field as keyof typeof item] = value;
    }

    updatedItems[index] = item;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate max quantities for each product-size combination
  const maxQuantities = items.reduce((acc, item) => {
    acc[`${item.product_id}-${item.unit_size_id}`] = item.quantity;
    return acc;
  }, {} as Record<string, number>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Create Return</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                name="return_date"
                required
                max={format(new Date(), 'yyyy-MM-dd')}
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Reason
              </label>
              <input
                type="text"
                name="return_reason"
                required
                value={formData.return_reason}
                onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="General reason for return"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="currency"
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'SYP' })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="SYP">SYP</option>
              </select>
            </div>

            {formData.currency === 'SYP' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Rate
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="transaction_exchange_rate"
                    value={formData.transaction_exchange_rate}
                    onChange={(e) => setFormData({ ...formData, transaction_exchange_rate: e.target.value })}
                    placeholder={`Default: ${exchangeRate}`}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">SYP/USD</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          <ReturnItemsTable
            items={formData.items}
            products={products}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddItem}
            currency={formData.currency}
            maxQuantities={maxQuantities}
            type={type}
          />

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
            >
              {processingForm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Create Return'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}