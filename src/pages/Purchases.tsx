import React, { useEffect, useState, useRef } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CustomProductSelect } from '../components/CustomProductSelect';
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal';
import { TableFilters } from '../components/TableFilters';
import { useFilters } from '../hooks/useFilters';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_sizes: {
    id: string;
    unit_size_id: string;
    unit_size: {
      id: string;
      name: string;
    };
  }[];
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier: {
    name: string;
  };
  date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_due_date: string;
  payment_date: string | null;
  cancellation_reason: string | null;
}

interface PurchaseItem {
  id: string;
  product_id: string;
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

function Purchases() {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoice | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [lastAddedItemIndex, setLastAddedItemIndex] = useState<number | null>(null);
  const productSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleShortcuts = (e: KeyboardEvent) => {
    // Handle Ctrl/Cmd + N for new purchase
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      setShowForm(true);
    }
    // Handle Ctrl/Cmd + I for add item when form is open
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'i' && showForm) {
      e.preventDefault();
      addPurchaseItem();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [showForm]);

  useEffect(() => {
    if (lastAddedItemIndex !== null) {
      const searchInput = productSearchRefs.current[lastAddedItemIndex]?.querySelector('input');
      if (searchInput) {
        searchInput.focus();
      }
      setLastAddedItemIndex(null);
    }
  }, [lastAddedItemIndex]);
  const [processingForm, setProcessingForm] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    payment_due_date: '',
    notes: '',
    items: [] as { 
      product_id: string;
      unit_size_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number 
    }[]
  });

  const {
    filteredData: filteredPurchases,
    searchTerm,
    dateRange,
    selectedFilters,
    handleSearchChange,
    handleDateRangeChange,
    handleFilterChange
  } = useFilters({
    data: purchases,
    searchFields: ['invoice_number', 'supplier.name', 'total_amount', 'status', 'payment_status'],
    dateField: 'date'
  });

  const filterOptions = [
    {
      label: 'Status',
      value: 'status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Received', value: 'received' },
        { label: 'Cancelled', value: 'cancelled' }
      ]
    },
    {
      label: 'Payment',
      value: 'payment_status',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Partial', value: 'partial' },
        { label: 'Paid', value: 'paid' }
      ]
    }
  ];

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          id,
          invoice_number,
          date,
          total_amount,
          status,
          payment_status,
          payment_due_date,
          supplier:suppliers (
            name
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products').select(`
          id,
          name,
          brand:brands (
            name
          ),
          unit_sizes:product_unit_sizes (
            id,
            unit_size_id,
            sku,
            unit_size:unit_sizes (
              id,
              name
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addPurchaseItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: '',
        unit_size_id: null,
        quantity: 1,
        unit_price: 0,
        subtotal: 0
      }]
    }));
    setLastAddedItemIndex(formData.items.length);
  };

  const updatePurchaseItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index] };
    const currentProduct = products.find(p => p.id === item.product_id);

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.product_id = value as string;
        item.unit_size_id = null;
        item.unit_price = 0;
      }
    } else if (field === 'unit_size_id') {
      item.unit_size_id = value as string;
    } else {
      item[field] = Number(value);
    }

    item.subtotal = item.quantity * item.unit_price;
    updatedItems[index] = item;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const removePurchaseItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Check for duplicate invoice number
    try {
      const { data: existingInvoice, error: checkError } = await supabase
        .from('purchase_invoices')
        .select('id')
        .eq('invoice_number', formData.invoice_number);

      if (checkError) throw checkError;
      if (existingInvoice && existingInvoice.length > 0) {
        toast.error('Invoice number already exists');
        return;
      }
    } catch (error) {
      console.error('Error checking invoice number:', error);
      toast.error('Failed to validate invoice number');
      return;
    }

    setProcessingForm(true);

    try {
      // Create the purchase invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert([{
          supplier_id: formData.supplier_id,
          invoice_number: formData.invoice_number,
          date: formData.date,
          payment_due_date: formData.payment_due_date || null,
          total_amount: calculateTotal(),
          notes: formData.notes,
          payment_status: 'unpaid',
          status: 'pending',
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create purchase items
      const purchaseItemsData = formData.items.map(item => ({
        purchase_invoice_id: invoiceData.id,
        product_id: item.product_id,
        unit_size_id: item.unit_size_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItemsData);

      if (itemsError) throw itemsError;

      toast.success('Purchase invoice created successfully');
      setShowForm(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Failed to create purchase');
    } finally {
      setProcessingForm(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      invoice_number: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_due_date: '',
      notes: ''
    });
    setFormData(prev => ({ ...prev, items: [] }));
  };

  const handleViewPurchase = async (purchase: PurchaseInvoice) => {
    setSelectedPurchase(purchase);
    try {
      // Fetch purchase items
      const { data: items, error: itemsError } = await supabase
        .from('purchase_items')
        .select(`
          id,
          quantity,
          unit_price,
          subtotal,
          product:products (
            name,
            unit_sizes:product_unit_sizes (
              sku,
              unit_size_id
            )
          )
        `)
        .eq('purchase_invoice_id', purchase.id);

      if (itemsError) throw itemsError;
      setPurchaseItems(items || []);

      // Fetch status logs
      const { data: logs, error: logsError } = await supabase
        .from('purchase_status_logs')
        .select(`
          id,
          old_status,
          new_status,
          old_payment_status,
          new_payment_status,
          reason,
          created_at,
          user:users (
            full_name
          )
        `)
        .eq('purchase_invoice_id', purchase.id)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setStatusLogs(logs || []);
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      toast.error('Failed to load purchase details');
    }
  };

  const handleUpdateStatus = async (status: string, reason?: string) => {
    if (!selectedPurchase) return;

    try {
      const { error: updateError } = await supabase
        .from('purchase_invoices')
        .update({
          status,
          cancellation_reason: reason
        })
        .eq('id', selectedPurchase.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('purchase_status_logs')
        .insert([{
          purchase_invoice_id: selectedPurchase.id,
          old_status: selectedPurchase.status,
          new_status: status,
          reason,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (logError) throw logError;

      toast.success(`Purchase ${status === 'cancelled' ? 'cancelled' : 'marked as received'}`);
      fetchPurchases();
      handleViewPurchase({ ...selectedPurchase, status });
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast.error('Failed to update purchase status');
    }
  };

  const handleUpdatePaymentStatus = async (status: string) => {
    if (!selectedPurchase) return;

    try {
      // First update the purchase invoice
      const { error: updateError } = await supabase
        .from('purchase_invoices')
        .update({
          payment_status: status,
          payment_date: status === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', selectedPurchase.id);

      if (updateError) throw updateError;

      // Then create the status log with only payment status changes
      const { error: logError } = await supabase
        .from('purchase_status_logs')
        .insert([{
          purchase_invoice_id: selectedPurchase.id,
          old_status: null,
          new_status: null,
          old_payment_status: selectedPurchase.payment_status,
          new_payment_status: status,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (logError) throw logError;

      toast.success('Payment status updated');
      fetchPurchases();
      handleViewPurchase({ ...selectedPurchase, payment_status: status });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
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
        <h1 className="text-2xl font-bold">Purchases</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Purchase
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
        searchPlaceholder="Search purchases by invoice, supplier, or status..."
      />

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Purchase Invoice</h2>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    name="supplier_id"
                    required
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    required
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    name="payment_due_date"
                    value={formData.payment_due_date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Purchase Items</h3>
                  <button
                    type="button"
                    onClick={addPurchaseItem}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                {formData.items.length > 0 && (
                  <div className="grid grid-cols-[1fr,160px,100px,120px,120px,auto] gap-4 mb-2 px-3">
                    <div className="text-sm font-medium text-gray-500">Product</div>
                    <div className="text-sm font-medium text-gray-500">Size</div>
                    <div className="text-sm font-medium text-gray-500">Quantity</div>
                    <div className="text-sm font-medium text-gray-500">Unit Price</div>
                    <div className="text-sm font-medium text-gray-500">Subtotal</div>
                    <div></div>
                  </div>
                )}

                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr,160px,100px,120px,120px,auto] gap-4 items-start bg-gray-50 p-3 rounded-lg">
                    <div>
                      <div ref={el => productSearchRefs.current[index] = el}>
                        <CustomProductSelect
                          products={products}
                          selectedProduct={products.find(p => p.id === item.product_id)}
                          onSelect={(product) => {
                            updatePurchaseItem(index, 'product_id', product.id);
                          }}
                          placeholder="Search for a product..."
                        />
                      </div>
                    </div>
                    {item.product_id && (
                      <div className="w-40">
                        <select
                          value={item.unit_size_id || ''}
                          onChange={(e) => updatePurchaseItem(index, 'unit_size_id', e.target.value)}
                          required
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select size...</option>
                          {products
                            .find(p => p.id === item.product_id)
                            ?.unit_sizes
                            .map(size => (
                              <option key={size.unit_size_id} value={size.unit_size_id}>
                                {size.unit_size.name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                    <div className="w-24">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updatePurchaseItem(index, 'quantity', e.target.value)}
                        min="1"
                        required
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updatePurchaseItem(index, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Price"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.subtotal}
                        readOnly
                        className="w-full rounded-md bg-gray-50 border-gray-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePurchaseItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {formData.items.length > 0 && (
                  <div className="flex justify-end text-lg font-semibold">
                    Total: ${calculateTotal().toFixed(2)}
                  </div>
                )}
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
                    'Create Purchase'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPurchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {purchase.invoice_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(purchase.date), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {purchase.supplier.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${purchase.total_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    purchase.status === 'received'
                      ? 'bg-green-100 text-green-800'
                      : purchase.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {purchase.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    purchase.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : purchase.payment_status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {purchase.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewPurchase(purchase)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View
                  </button>
                  <button className="text-red-600 hover:text-red-900">Cancel</button>
                </td>
              </tr>
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No purchases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPurchase && (
        <PurchaseDetailsModal
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          purchase={selectedPurchase}
          items={purchaseItems}
          statusLogs={statusLogs}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
        />
      )}
    </div>
  );
}

export default Purchases;