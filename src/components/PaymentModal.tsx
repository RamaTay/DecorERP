import React, { useState } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useCurrency, type Currency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: {
    id: string;
    customer_id: string;
    total_amount: number;
    payment_amount: number;
    sale_date: string;
  };
  onPaymentComplete: () => void;
}

export function PaymentModal({ isOpen, onClose, sale, onPaymentComplete }: Props) {
  const [processingPayment, setProcessingPayment] = useState(false);
  const { exchangeRate } = useCurrency();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: ((sale.total_amount || 0) - (sale.payment_amount || 0)).toFixed(2),
    payment_date: format(new Date(sale.sale_date), 'yyyy-MM-dd'),
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    currency: 'USD' as Currency,
    transaction_exchange_rate: ''
  });

  if (!isOpen) return null;

  const remainingAmount = sale.total_amount - sale.payment_amount;
  const isFullPayment = parseFloat(formData.amount) === remainingAmount;

  const getUsdAmount = (amount: number) => {
    if (formData.currency === 'USD') return amount;
    return amount / (parseFloat(formData.transaction_exchange_rate) || exchangeRate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);

    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    if (getUsdAmount(amount) > remainingAmount) {
      toast.error('Payment amount cannot exceed the remaining balance');
      return;
    }

    const paymentDate = new Date(formData.payment_date);
    const saleDate = new Date(sale.sale_date);
    
    // Set time to midnight for proper date comparison
    paymentDate.setHours(0, 0, 0, 0);
    saleDate.setHours(0, 0, 0, 0);
    
    if (paymentDate < saleDate) {
      toast.error('Payment date cannot be before the sale date');
      return;
    }
    
    // Ensure payment date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (paymentDate > today) {
      toast.error('Payment date cannot be in the future');
      return;
    }

    setProcessingPayment(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('customer_payments')
        .insert([{
          customer_id: sale.customer_id,
          sale_id: sale.id,
          amount: getUsdAmount(amount),
          syp_amount: formData.currency === 'SYP' ? amount : null,
          currency: formData.currency,
          transaction_exchange_rate: formData.currency === 'SYP' ? 
            parseFloat(formData.transaction_exchange_rate) || exchangeRate : 
            null,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          created_by: user.id
        }]);

      if (error) throw error;

      toast.success('Payment recorded successfully');
      onPaymentComplete();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Total Amount: ${sale.total_amount.toFixed(2)} USD</span>
              <span>Remaining: ${remainingAmount.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount
            </label>
            <div className="input-with-icon">
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                step="0.01"
                min="0.01"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder={formData.currency === 'USD' ? 'USD' : 'SYP'}
              />
            </div>
            {formData.currency === 'SYP' && (
              <p className="mt-1 text-sm text-gray-500">
                ≈ ${getUsdAmount(parseFloat(formData.amount) || 0).toFixed(2)} USD
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              min={sale.sale_date}
              max={format(new Date(), 'yyyy-MM-dd')}
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

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
              disabled={processingPayment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                isFullPayment ? 'Pay in Full' : 'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}