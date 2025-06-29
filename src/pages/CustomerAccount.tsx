import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Calendar,
  FileText,
  Download,
  Bell,
  Plus,
  ChevronRight,
  CreditCard,
  Clock,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomerPaymentHistory } from '../components/CustomerPaymentHistory';
import { useCurrency } from '../contexts/CurrencyContext';
import { SaleDetailsModal } from '../components/SaleDetailsModal';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  default_price_list_id: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  customer_id: string;
  sale_date: string;
  total_amount: number;
  payment_amount: number;
  status: string;
  payment_status: string;
  currency: string;
  syp_amount: number | null;
  exchange_rate: number | null;
}

interface AccountSummary {
  total_sales: number;
  total_payments: number;
  current_balance: number;
  last_payment_date: string | null;
}

function CustomerAccount() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<AccountSummary>({
    total_sales: 0,
    total_payments: 0,
    current_balance: 0,
    last_payment_date: null
  });
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (id) {
      fetchCustomerData();
      fetchSales();
      fetchAccountSummary();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer data');
    }
  };

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', id)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales history');
    }
  };

  const fetchAccountSummary = async () => {
    try {
      const { data: accountData, error: accountError } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('customer_id', id)
        .single();

      if (accountError) throw accountError;

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('customer_id', id);

      if (salesError) throw salesError;

      setSummary({
        total_sales: salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0,
        total_payments: accountData?.current_balance || 0,
        current_balance: (salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0) - (accountData?.current_balance || 0),
        last_payment_date: accountData?.last_payment_date
      });
    } catch (error) {
      console.error('Error fetching account summary:', error);
      toast.error('Failed to load account summary');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.success('Export feature coming soon');
  };

  const handleSetReminder = () => {
    // TODO: Implement reminder functionality
    toast.success('Reminder feature coming soon');
  };

  const handleViewSale = async (sale: Sale) => {
    try {
      // Fetch sale details with payment amount
      const { data: saleDetails, error: saleError } = await supabase
        .from('sales')
        .select(`
          id,
          customer_id,
          total_amount,
          payment_amount,
          status,
          payment_method,
          sale_date,
          created_at,
          notes,
          customer:customers (
            full_name
          )
        `)
        .eq('id', sale.id)
        .single();

      if (saleError) throw saleError;
      setSelectedSale(saleDetails);

      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          id,
          quantity,
          unit_price,
          subtotal,
          product:products (
            name,
            sku
          )
        `)
        .eq('sale_id', sale.id);

      if (itemsError) throw itemsError;
      setSaleItems(items || []);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Failed to load sale details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
          <p className="text-sm text-gray-500">Customer since {format(new Date(customer.created_at), 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/sales/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">{customer.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-500">{customer.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Address</p>
              <p className="text-sm text-gray-500">{customer.address || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-xl font-semibold">{formatAmount(summary.total_sales)}</p>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Payments</p>
                <p className="text-xl font-semibold">{formatAmount(summary.total_payments)}</p>
              </div>
            </div>
            {summary.last_payment_date && (
              <div className="text-xs text-gray-500">
                Last payment: {format(new Date(summary.last_payment_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-xl font-semibold">{formatAmount(summary.current_balance)}</p>
              </div>
            </div>
            <button
              onClick={handleSetReminder}
              className="text-gray-400 hover:text-gray-600"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-xl font-semibold">{sales.length}</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="text-gray-400 hover:text-gray-600"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Sales History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(sale.sale_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : sale.payment_status === 'partially_paid'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewSale(sale)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No sales history found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Payment History</h2>
        <CustomerPaymentHistory customerId={id!} />
      </div>

      {selectedSale && (
        <SaleDetailsModal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          sale={selectedSale}
          items={saleItems}
        />
      )}
    </div>
  );
}

export default CustomerAccount;