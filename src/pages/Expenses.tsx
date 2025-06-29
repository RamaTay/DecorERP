import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  Tag,
  X,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency, type Currency } from '../contexts/CurrencyContext';
import { TableFilters } from '../components/TableFilters';
import { useFilters } from '../hooks/useFilters';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  user: {
    full_name: string;
  };
  currency?: string;
  exchange_rate?: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
}

function Expenses() {
  const { user } = useAuth();
  const {
    currency: globalCurrency,
    exchangeRate,
    getExchangeRateForDate,
  } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const handleShortcuts = (e: KeyboardEvent) => {
    // Handle Ctrl/Cmd + N for new expense
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      setShowForm(true);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [processingForm, setProcessingForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    transaction_exchange_rate: exchangeRate.toString(),
    currency: 'USD' as Currency,
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const {
    filteredData: filteredExpenses,
    searchTerm,
    dateRange,
    selectedFilters,
    handleSearchChange,
    handleDateRangeChange,
    handleFilterChange,
  } = useFilters({
    data: expenses,
    searchFields: ['description', 'category', 'amount'],
    dateField: 'date',
  });

  const filterOptions =
    categories.length > 0
      ? [
          {
            label: 'Category',
            value: 'category',
            options: categories.map((category) => ({
              label: category.name,
              value: category.name,
            })),
          },
        ]
      : [];

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load expense categories');
    }
  }

  async function fetchExpenses() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          `
          id,
          description,
          amount,
          syp_amount,
          category,
          date,
          created_at,
          currency,
          exchange_rate,
          transaction_exchange_rate,
          user:users (
            full_name
          )
        `
        )
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      transaction_exchange_rate: exchangeRate.toString(),
      currency: 'SYP',
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProcessingForm(true);

    try {
      const expenseData = {
        description: formData.description,
        amount:
          formData.currency === 'USD' ? parseFloat(formData.amount) : undefined,
        syp_amount:
          formData.currency === 'SYP' ? parseFloat(formData.amount) : undefined,
        currency: formData.currency,
        transaction_exchange_rate: formData.transaction_exchange_rate
          ? parseFloat(formData.transaction_exchange_rate)
          : undefined,
        category: formData.category,
        date: formData.date,
        user_id: user.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Expense updated successfully');
      } else {
        const { error } = await supabase.from('expenses').insert([expenseData]);

        if (error) throw error;
        toast.success('Expense added successfully');
      }

      resetForm();
      setShowForm(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    const amount =
      expense.currency === 'USD'
        ? expense.amount.toString()
        : expense.syp_amount?.toString() ||
          (expense.amount * (expense.exchange_rate || exchangeRate)).toString();

    const rate =
      expense.currency === 'SYP'
        ? (
            expense.transaction_exchange_rate ||
            expense.exchange_rate ||
            exchangeRate
          ).toString()
        : exchangeRate.toString();

    setFormData({
      description: expense.description,
      amount,
      transaction_exchange_rate: rate,
      currency: expense.currency || 'USD',
      category: expense.category,
      date: expense.date,
    });
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?'))
      return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);

      if (error) throw error;
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const calculateTotalExpenses = () => {
    return filteredExpenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    setFormData((prev) => ({
      ...prev,
      currency: newCurrency,
      transaction_exchange_rate: '', // Reset exchange rate when currency changes
      original_amount: '', // Reset amount when currency changes
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <TableFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        filterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        searchPlaceholder="Search expenses by description or category..."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">
              Total Expenses
            </h3>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">
            ${calculateTotalExpenses().toFixed(2)}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <div className="flex gap-4 items-end">
                  <select
                    name="currency"
                    required
                    value={formData.currency}
                    onChange={handleCurrencyChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="SYP">SYP</option>
                  </select>
                  {formData.currency === 'SYP' && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exchange Rate
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="number"
                          name="transaction_exchange_rate"
                          value={formData.transaction_exchange_rate}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          placeholder={`Default: ${exchangeRate.toLocaleString()}`}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">SYP/USD</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount {formData.currency === 'SYP' ? '(SYP)' : '(USD)'}
                </label>
                <div className="relative input-with-icon">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a category...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="input-with-icon">
                  <DollarSign className="icon w-5 h-5" />
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingForm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                >
                  {processingForm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>{editingExpense ? 'Update' : 'Save'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {expense.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Tag className="w-4 h-4 mr-2" />
                      {expense.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {expense.currency === 'USD' ? (
                        `$${expense.amount.toFixed(2)}`
                      ) : (
                        <>
                          {(
                            expense.amount * (expense.exchange_rate || 0)
                          ).toLocaleString()}{' '}
                          SYP
                          {expense.transaction_exchange_rate && (
                            <span className="ml-1 text-xs text-gray-500">
                              (Rate: {expense.transaction_exchange_rate})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.user.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Expenses;
