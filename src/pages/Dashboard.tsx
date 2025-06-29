import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  Users, 
  Receipt, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalExpenses: number;
  lowStockProducts: number;
  recentSales: {
    id: string;
    total_amount: number;
    created_at: string;
    customer: {
      full_name: string;
    };
  }[];
}

function Dashboard() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    totalExpenses: 0,
    lowStockProducts: 0,
    recentSales: []
  });
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();

  const fetchDashboardStats = async (attempt = 0) => {
    try {
      const maxRetries = 3;
      const [
        { count: productsCount },
        { count: customersCount },
        { data: salesData },
        { data: expensesData },
        { data: lowStockData, error: lowStockError },
        { data: recentSalesData }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('total_amount'),
        supabase.from('expenses').select('amount'),
        supabase.from('product_unit_sizes').select('id').lt('stock_level', 10),
        supabase
          .from('sales')
          .select('id, total_amount, created_at, customer:customers(full_name)')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (lowStockError) throw lowStockError;

      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

      setStats({
        totalProducts: productsCount || 0,
        totalCustomers: customersCount || 0,
        totalSales,
        totalExpenses,
        lowStockProducts: lowStockData?.length || 0,
        recentSales: recentSalesData || []
      });

      setIsConnected(true);
      toast.success('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      
      // Retry logic
      if (attempt < 3) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchDashboardStats(attempt + 1);
        }, delay);
      } else {
        setIsConnected(false);
        toast.error('Failed to load dashboard data');
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user, retryCount]);

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Total Sales',
      value: `$${stats.totalSales.toFixed(2)}`,
      icon: Receipt,
      color: 'indigo'
    },
    {
      title: 'Total Expenses',
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: DollarSign,
      color: 'rose'
    }
  ];

  const profit = stats.totalSales - stats.totalExpenses;
  const isProfitable = profit > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Connection Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isConnected === null
              ? 'bg-gray-100 text-gray-800'
              : isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected === null ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm p-6 transition-transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit/Loss Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Profit/Loss Overview</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center">
            {isProfitable ? (
              <ArrowUpRight className="w-8 h-8 text-green-500 mr-3" />
            ) : (
              <ArrowDownRight className="w-8 h-8 text-red-500 mr-3" />
            )}
            <div>
              <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(profit).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                {isProfitable ? 'Net Profit' : 'Net Loss'}
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Inventory Alert</h2>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-amber-100 mr-3">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockProducts}</p>
              <p className="text-sm text-gray-500">Products with low stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
          <div className="space-y-4">
            {stats.recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sale.customer.full_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  ${sale.total_amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;