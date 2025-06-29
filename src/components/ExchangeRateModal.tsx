import React, { useState } from 'react';
import { X, DollarSign, RefreshCw } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ExchangeRateModal({ isOpen, onClose }: Props) {
  const { exchangeRate, setExchangeRate } = useCurrency();
  const [newRate, setNewRate] = useState(exchangeRate.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newRate);
    
    if (isNaN(rate) || rate <= 0) {
      return;
    }

    setIsSubmitting(true);
    await setExchangeRate(rate);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Update Exchange Rate</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Rate: 1 USD = {exchangeRate.toLocaleString()} SYP
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                min="0.01"
                step="0.01"
                required
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter new rate..."
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter the number of SYP equal to 1 USD
            </p>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Rate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}