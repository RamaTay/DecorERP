import React from 'react';
import { format } from 'date-fns';
import { FileText, DollarSign, Clock } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

interface Return {
  id: string;
  return_date: string;
  return_reason: string;
  status: string;
  refund_status: string;
  refund_amount: number | null;
  currency: string;
  syp_amount: number | null;
  exchange_rate: number | null;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface Props {
  returns: Return[];
  type: 'sale' | 'purchase';
  onViewDetails: (returnId: string) => void;
}

export function ReturnsList({ returns, type, onViewDetails }: Props) {
  const { formatAmount } = useCurrency();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRefundStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'bg-green-100 text-green-800';
      case 'credited':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-4">
      {returns.map((returnRecord) => (
        <div
          key={returnRecord.id}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {format(new Date(returnRecord.return_date), 'MMM d, yyyy')}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    getStatusBadgeColor(returnRecord.status)
                  }`}>
                    {returnRecord.status.toUpperCase()}
                  </span>
                  {returnRecord.refund_amount && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      getRefundStatusBadgeColor(returnRecord.refund_status)
                    }`}>
                      {returnRecord.refund_status.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{returnRecord.return_reason}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(returnRecord.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                  <div>By: {returnRecord.user.full_name}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {returnRecord.refund_amount && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Refund Amount</div>
                  <div className="font-medium">
                    {returnRecord.currency === 'USD' ? 
                      formatAmount(returnRecord.refund_amount) :
                      `${Math.round(returnRecord.syp_amount || 0).toLocaleString()} SYP`
                    }
                  </div>
                  {returnRecord.currency === 'SYP' && (
                    <div className="text-xs text-gray-500">
                      Rate: {returnRecord.exchange_rate}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => onViewDetails(returnRecord.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      ))}
      {returns.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          No returns found
        </p>
      )}
    </div>
  );
}