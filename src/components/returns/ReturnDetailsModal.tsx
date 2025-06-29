import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  returnId: string;
  type: 'sale' | 'purchase';
  onStatusUpdate: () => void;
}

export function ReturnDetailsModal({ isOpen, onClose, returnId, type, onStatusUpdate }: Props) {
  const { formatAmount } = useCurrency();
  const [returnData, setReturnData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (returnId) {
      fetchReturnDetails();
    }
  }, [returnId]);

  const fetchReturnDetails = async () => {
    try {
      // Fetch return details
      const { data: returnDetails, error: returnError } = await supabase
        .from(type === 'sale' ? 'sale_returns' : 'purchase_returns')
        .select(`
          *,
          user:users (
            full_name
          )
        `)
        .eq('id', returnId)
        .single();

      if (returnError) throw returnError;
      setReturnData(returnDetails);

      // Fetch return items
      const { data: returnItems, error: itemsError } = await supabase
        .from(type === 'sale' ? 'sale_return_items' : 'purchase_return_items')
        .select(`
          *,
          product:products (
            name
          ),
          unit_size:unit_sizes (
            name
          )
        `)
        .eq(type === 'sale' ? 'sale_return_id' : 'purchase_return_id', returnId);

      if (itemsError) throw itemsError;
      setItems(returnItems || []);
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('Failed to load return details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from(type === 'sale' ? 'sale_returns' : 'purchase_returns')
        .update({ status })
        .eq('id', returnId);

      if (error) throw error;
      toast.success(`Return ${status}`);
      fetchReturnDetails();
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating return status:', error);
      toast.error('Failed to update return status');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRefundUpdate = async (refundStatus: string, refundMethod: string) => {
    setProcessingAction(true);
    try {
      const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

      const { error } = await supabase
        .from(type === 'sale' ? 'sale_returns' : 'purchase_returns')
        .update({
          refund_status: refundStatus,
          refund_method: refundMethod,
          refund_amount: totalAmount,
          refund_date: new Date().toISOString()
        })
        .eq('id', returnId);

      if (error) throw error;
      toast.success('Refund processed successfully');
      fetchReturnDetails();
      onStatusUpdate();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setProcessingAction(false);
    }
  };

  if (!isOpen || !returnData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Return Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Return Date</label>
              <p className="font-medium">
                {format(new Date(returnData.return_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                returnData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                returnData.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                returnData.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {returnData.status.toUpperCase()}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Created By</label>
              <p className="font-medium">{returnData.user.full_name}</p>
            </div>
          </div>

          {/* Return Reason */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Return Reason</h3>
            <p className="text-sm text-gray-600">{returnData.return_reason}</p>
            {returnData.notes && (
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Notes</h4>
                <p className="text-sm text-gray-600">{returnData.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.unit_size.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {returnData.currency === 'USD' ? 
                        formatAmount(item.unit_price) :
                        `${Math.round(item.unit_price).toLocaleString()} SYP`
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {returnData.currency === 'USD' ? 
                        formatAmount(item.subtotal) :
                        `${Math.round(item.subtotal).toLocaleString()} SYP`
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.item_condition === 'new' ? 'bg-green-100 text-green-800' :
                        item.item_condition === 'opened' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.item_condition.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.return_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          {returnData.status === 'pending' && (
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={processingAction}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                Reject Return
              </button>
              <button
                onClick={() => handleStatusUpdate('approved')}
                disabled={processingAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Approve Return
              </button>
            </div>
          )}

          {returnData.status === 'approved' && returnData.refund_status === 'pending' && (
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleRefundUpdate('credited', 'credit_note')}
                disabled={processingAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Issue Credit Note
              </button>
              <button
                onClick={() => handleRefundUpdate('refunded', 'cash')}
                disabled={processingAction}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Process Refund
              </button>
            </div>
          )}

          {/* Refund Information */}
          {returnData.refund_amount && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Refund Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Amount</label>
                  <p className="font-medium">
                    {returnData.currency === 'USD' ? 
                      formatAmount(returnData.refund_amount) :
                      `${Math.round(returnData.syp_amount || 0).toLocaleString()} SYP`
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Method</label>
                  <p className="font-medium">{returnData.refund_method}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    returnData.refund_status === 'refunded' ? 'bg-green-100 text-green-800' :
                    returnData.refund_status === 'credited' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {returnData.refund_status.toUpperCase()}
                  </p>
                </div>
                {returnData.refund_date && (
                  <div>
                    <label className="text-sm text-gray-500">Date</label>
                    <p className="font-medium">
                      {format(new Date(returnData.refund_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}