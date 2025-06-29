import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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

export function useReturns(type: 'sale' | 'purchase', transactionId?: string) {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);

  useEffect(() => {
    if (transactionId) {
      fetchReturns();
    }
  }, [transactionId]);

  const fetchReturns = async () => {
    if (!transactionId) return;

    try {
      const { data, error } = await supabase
        .from(type === 'sale' ? 'sale_returns' : 'purchase_returns')
        .select(`
          *,
          user:users (
            full_name
          )
        `)
        .eq(type === 'sale' ? 'sale_id' : 'purchase_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = () => {
    setShowReturnModal(true);
  };

  const handleViewReturn = (returnId: string) => {
    setSelectedReturn(returnId);
  };

  const handleCloseReturn = () => {
    setSelectedReturn(null);
  };

  const handleReturnComplete = () => {
    fetchReturns();
  };

  return {
    returns,
    loading,
    showReturnModal,
    setShowReturnModal,
    selectedReturn,
    handleCreateReturn,
    handleViewReturn,
    handleCloseReturn,
    handleReturnComplete,
    refreshReturns: fetchReturns
  };
}