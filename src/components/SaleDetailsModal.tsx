import React from 'react';
import { X, DollarSign, Calendar, FileText, Tag, User, CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentModal } from './PaymentModal';
import { ReturnModal } from './returns/ReturnModal';
import { ReturnsList } from './returns/ReturnsList';
import { ReturnDetailsModal } from './returns/ReturnDetailsModal';
import { useReturns } from '../hooks/returns/useReturns';

interface SaleItem {
  id: string;
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: {
    id: string;
    customer_id: string;
    customer: {
      full_name: string;
    };
    total_amount: number;
    payment_amount: number;
    status: string;
    payment_method: string;
    sale_date: string;
    created_at: string;
    notes: string | null;
  };
  items: SaleItem[];
}

export function SaleDetailsModal({ isOpen, onClose, sale, items }: Props) {
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [refreshSale, setRefreshSale] = React.useState(false);
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
  } = useReturns('sale', sale?.id);

  if (!isOpen) return null;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Sale Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header Information */}
          <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Customer</label>
              <p className="font-medium">{sale.customer.full_name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Date</label>
              <p className="font-medium">
                {format(new Date(sale.sale_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Total Amount</label>
              <p className="font-medium">${sale.total_amount.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-500">Payment Method</label>
              <p className="font-medium">{sale.payment_method}</p>
            </div>
          </div>

          {/* Status and Payment */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusBadgeColor(sale.status)
                }`}>
                  {sale.status.toUpperCase()}
                </span>
                {sale.status === 'completed' && (
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Paid: </span>
                      <span className="font-medium">
                        {sale.currency === 'USD' ? 
                          `$${(sale.payment_amount || 0).toFixed(2)}` :
                          `${Math.round(sale.payment_amount || 0).toLocaleString()} SYP`}
                      </span>
                      <span className="text-gray-500"> / </span>
                      <span className="font-medium">
                        {sale.currency === 'USD' ? 
                          `$${sale.total_amount.toFixed(2)}` :
                          `${Math.round(sale.total_amount).toLocaleString()} SYP`}
                      </span>
                    </div>
                    {(!sale.payment_amount || sale.payment_amount < sale.total_amount) && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                      <div className="text-sm text-gray-500">
                        {item.unit_size?.sku} - {item.unit_size?.unit_size?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sale.currency === 'USD' ? 
                        `$${item.unit_price.toFixed(2)}` :
                        `${Math.round(item.unit_price).toLocaleString()} SYP`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.currency === 'USD' ? 
                        `$${item.subtotal.toFixed(2)}` :
                        `${Math.round(item.subtotal).toLocaleString()} SYP`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sale.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Returns Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Returns</h3>
            {sale.status === 'completed' && (
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
              type="sale"
              onViewDetails={handleViewReturn}
            />
          )}
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          sale={sale}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setRefreshSale(true);
          }}
        />
      )}

      {showReturnModal && (
        <ReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          type="sale"
          transactionId={sale.id}
          items={items}
          onComplete={handleReturnComplete}
        />
      )}

      {selectedReturn && (
        <ReturnDetailsModal
          isOpen={!!selectedReturn}
          onClose={handleCloseReturn}
          returnId={selectedReturn}
          type="sale"
          onStatusUpdate={handleReturnComplete}
        />
      )}
    </div>
  );
}