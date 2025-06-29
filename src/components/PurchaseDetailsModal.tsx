import React from 'react';
import { X, DollarSign, Calendar, FileText, Tag, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../contexts/CurrencyContext';
import { ReturnModal } from './returns/ReturnModal';
import { ReturnsList } from './returns/ReturnsList';
import { ReturnDetailsModal } from './returns/ReturnDetailsModal';
import { useReturns } from '../hooks/returns/useReturns';

interface PurchaseItem {
  id: string;
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface StatusLog {
  id: string;
  old_status: string;
  new_status: string;
  old_payment_status: string | null;
  new_payment_status: string | null;
  reason: string | null;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchase: {
    id: string;
    invoice_number: string;
    date: string;
    supplier: {
      name: string;
    };
    total_amount: number;
    status: string;
    payment_status: string;
    payment_due_date: string | null;
    payment_date: string | null;
    notes: string | null;
    cancellation_reason: string | null;
  };
  items: PurchaseItem[];
  statusLogs: StatusLog[];
  onUpdateStatus: (status: string, reason?: string) => Promise<void>;
  onUpdatePaymentStatus: (status: string) => Promise<void>;
}

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
  items,
  statusLogs,
  onUpdateStatus,
  onUpdatePaymentStatus
}: Props) {
  const { formatAmount } = useCurrency();
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancellationReason, setCancellationReason] = React.useState('');
  const {
    returns,
    loading: returnsLoading,
    showReturnModal,
    setShowReturnModal,
    selectedReturn,
    handleCreateReturn,
    handleViewReturn,
    handleCloseReturn,
    handleReturnComplete
  } = useReturns('purchase', purchase?.id);

  if (!isOpen) return null;

  const handleCancel = async () => {
    await onUpdateStatus('cancelled', cancellationReason);
    setShowCancelDialog(false);
    setCancellationReason('');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Purchase Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-500">Invoice Number</label>
              <p className="font-medium">{purchase.invoice_number}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Supplier</label>
              <p className="font-medium">{purchase.supplier.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Date</label>
              <p className="font-medium">
                {format(new Date(purchase.date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Total Amount</label>
              <p className="font-medium">{formatAmount(purchase.total_amount)}</p>
            </div>
          </div>

          {/* Returns Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Returns</h3>
              {purchase.status === 'received' && (
                <button
                  onClick={handleCreateReturn}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create Return
                </button>
              )}
            </div>
            
            {!returnsLoading && (
              <ReturnsList
                returns={returns}
                type="purchase"
                onViewDetails={handleViewReturn}
              />
            )}
          </div>
          {/* Status Controls */}
          <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusBadgeColor(purchase.status)
                }`}>
                  {purchase.status.toUpperCase()}
                </span>
                {purchase.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onUpdateStatus('received')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mark as Received
                    </button>
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Payment Status</label>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getPaymentStatusBadgeColor(purchase.payment_status)
                }`}>
                  {purchase.payment_status.toUpperCase()}
                </span>
                {purchase.payment_status !== 'paid' && purchase.status !== 'cancelled' && (
                  <button
                    onClick={() => onUpdatePaymentStatus('paid')}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>

            {purchase.payment_date && (
              <div>
                <label className="block text-sm text-gray-500">Payment Date</label>
                <p className="text-sm font-medium">
                  {format(new Date(purchase.payment_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                      <div className="text-sm text-gray-500">{item.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatAmount(item.unit_price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatAmount(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Status History */}
          <div>
            <h3 className="text-lg font-medium mb-4">Status History</h3>
            <div className="space-y-4">
              {statusLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{log.user.full_name}</span>
                      {log.new_status && (
                        <> changed status from <span className="font-medium">{log.old_status}</span> to <span className="font-medium">{log.new_status}</span></>
                      )}
                      {log.new_payment_status && (
                        <> changed payment status from <span className="font-medium">{log.old_payment_status}</span> to <span className="font-medium">{log.new_payment_status}</span></>
                      )}
                    </p>
                    {log.reason && (
                      <p className="text-sm text-gray-500 mt-1">Reason: {log.reason}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Cancel Purchase</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Please provide a reason..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancellationReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <ReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          type="purchase"
          transactionId={purchase.id}
          items={items}
          onComplete={handleReturnComplete}
        />
      )}

      {selectedReturn && (
        <ReturnDetailsModal
          isOpen={!!selectedReturn}
          onClose={handleCloseReturn}
          returnId={selectedReturn}
          type="purchase"
          onStatusUpdate={handleReturnComplete}
        />
      )}
    </div>
  );
}