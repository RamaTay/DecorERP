import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Receipt, DollarSign } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  sale_id: string | null;
  sale?: {
    total_amount: number;
  };
}

interface Props {
  customerId: string;
}

export function CustomerPaymentHistory({ customerId }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [customerId]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          sale:sales (
            total_amount
          )
        `)
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
      setTotalPaid(data?.reduce((sum, payment) => sum + payment.amount, 0) || 0);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'bank_transfer': return 'Bank Transfer';
      case 'credit_card': return 'Credit Card';
      default: return method;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-blue-900">Payment Summary</h3>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-xl font-bold text-blue-700">
              ${totalPaid.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Receipt className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    <span className="text-sm text-gray-500">
                      via {getPaymentMethodLabel(payment.payment_method)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </div>
                  {payment.reference_number && (
                    <div className="text-sm text-gray-500">
                      Ref: {payment.reference_number}
                    </div>
                  )}
                  {payment.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      {payment.notes}
                    </div>
                  )}
                </div>
              </div>
              {payment.sale && (
                <div className="text-sm text-gray-500">
                  Sale: ${payment.sale.total_amount.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No payment history found
          </p>
        )}
      </div>
    </div>
  );
}