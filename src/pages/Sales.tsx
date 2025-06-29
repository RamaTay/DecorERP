import React, { useEffect, useState, useRef } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { SaleDetailsModal } from '../components/SaleDetailsModal';
import { CustomProductSelect } from '../components/CustomProductSelect';
import { CustomCustomerSelect } from '../components/CustomCustomerSelect';
import { TableFilters } from '../components/TableFilters';
import { useFilters } from '../hooks/useFilters';
import { useCurrency, type Currency } from '../contexts/CurrencyContext';

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
    stock_level: number;
    price: number;
  }[];
}

interface Customer {
  id: string;
  full_name: string;
  default_price_list_id: string | null;
}

interface PriceList {
  id: string;
  name: string;
  items: {
    product_id: string;
    unit_size_id: string;
    price: number;
  }[];
}

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

interface Sale {
  id: string;
  customer: {
    full_name: string;
  };
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  notes: string | null;
}

function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [processingForm, setProcessingForm] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(
    null
  );
  const { exchangeRate } = useCurrency();

  const {
    filteredData: filteredSales,
    searchTerm,
    dateRange,
    selectedFilters,
    handleSearchChange,
    handleDateRangeChange,
    handleFilterChange,
  } = useFilters({
    data: sales,
    searchFields: [
      'payment_method',
      'status',
      'customer.full_name',
      'total_amount',
    ],
    dateField: 'created_at',
  });

  const filterOptions = [
    {
      label: 'Status',
      value: 'status',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ];

  const [showForm, setShowForm] = useState(false);
  const [lastAddedItemIndex, setLastAddedItemIndex] = useState<number | null>(
    null
  );
  const productSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleShortcuts = (e: KeyboardEvent) => {
    // Handle Alt + N for new sale
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleNewSale();
    }
    // Handle Alt + I for add item when form is open
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'i' && showForm) {
      e.preventDefault();
      addSaleItem();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [showForm]);

  useEffect(() => {
    if (lastAddedItemIndex !== null) {
      const searchInput =
        productSearchRefs.current[lastAddedItemIndex]?.querySelector('input');
      if (searchInput) {
        searchInput.focus();
      }
      setLastAddedItemIndex(null);
    }
  }, [lastAddedItemIndex]);
  const [formData, setFormData] = useState({
    customer_id: '',
    price_list_id: '',
    currency: 'USD' as Currency,
    transaction_exchange_rate: '',
    payment_method: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as {
      product_id: string;
      unit_size_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[],
  });

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchProducts();
    fetchPriceLists();
  }, []);

  useEffect(() => {
    if (formData.price_list_id) {
      fetchPriceList(formData.price_list_id);
    }
  }, [formData.price_list_id]);

  // Update prices when price list changes
  useEffect(() => {
    if (selectedPriceList && formData.items.length > 0) {
      const updatedItems = formData.items.map((item) => {
        if (item.product_id && item.unit_size_id) {
          const priceListItem = selectedPriceList.items.find(
            (i) =>
              i.product_id === item.product_id &&
              i.unit_size_id === item.unit_size_id
          );
          if (priceListItem) {
            return {
              ...item,
              unit_price: priceListItem.price,
              subtotal: item.quantity * priceListItem.price,
            };
          }
        }
        return item;
      });

      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
      }));
    }
  }, [selectedPriceList]);
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, default_price_list_id')
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
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
            stock_level,
            unit_size:unit_sizes (
              id,
              name
            )
          )
        `
        )
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchPriceLists = async () => {
    try {
      const { data, error } = await supabase
        .from('price_lists')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setPriceLists(data || []);
    } catch (error) {
      console.error('Error fetching price lists:', error);
      toast.error('Failed to load price lists');
    }
  };

  const fetchPriceList = async (priceListId: string) => {
    try {
      const { data, error } = await supabase
        .from('price_lists')
        .select(
          `
          id,
          name,
          items:price_list_items (
            product_id,
            unit_size_id,
            price
          )
        `
        )
        .eq('id', priceListId)
        .single();

      if (error) throw error;
      setSelectedPriceList(data);
    } catch (error) {
      console.error('Error fetching price list:', error);
      toast.error('Failed to load price list');
    }
  };

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          id,
          total_amount,
          status,
          payment_method,
          sale_date,
          created_at,
          customer:customers (
            full_name
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSale = () => {
    resetForm();
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      currency: 'USD',
      transaction_exchange_rate: '',
      price_list_id: '',
      payment_method: '',
      sale_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [],
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    if (e.target.name === 'customer_id') {
      const customer = customers.find((c) => c.id === e.target.value);
      if (customer) {
        setFormData((prev) => ({
          ...prev,
          customer_id: e.target.value,
          price_list_id: customer.default_price_list_id || '',
        }));
        if (customer.default_price_list_id) {
          fetchPriceList(customer.default_price_list_id);
        } else {
          setSelectedPriceList(null);
        }
      }
      return;
    }
    if (e.target.name === 'price_list_id') {
      setFormData((prev) => ({
        ...prev,
        price_list_id: e.target.value,
      }));
      if (e.target.value) {
        fetchPriceList(e.target.value);
      } else {
        setSelectedPriceList(null);
      }
      return;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addSaleItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          unit_size_id: null,
          quantity: 1,
          unit_price: 0,
          subtotal: 0,
        },
      ],
    }));
    setLastAddedItemIndex(formData.items.length);
  };

  const updateSaleItem = (
    index: number,
    field: string,
    value: string | number | null
  ) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index] };
    const currentProduct = products.find((p) => p.id === item.product_id);
    const rate = formData.currency === 'SYP' ? 
      (parseFloat(formData.transaction_exchange_rate) || exchangeRate) : 1;

    const roundToHundreds = (value: number) => {
      return Math.ceil(value / 100) * 100;
    };

    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.product_id = product.id;
        item.unit_size_id = null;
        item.unit_price = 0.00;
        item.subtotal = 0.00;
      }
    } else if (field === 'unit_size_id') {
      const priceListItem = selectedPriceList?.items.find(
        (i) => i.product_id === item.product_id && i.unit_size_id === value
      );
      if (priceListItem) {
        item.unit_size_id = value;
        item.unit_price = formData.currency === 'SYP' ? 
          roundToHundreds(priceListItem.price * rate) : priceListItem.price;
      } else {
        const unitSize = currentProduct?.unit_sizes.find(
          (size) => size.unit_size_id === value
        );
        if (unitSize) {
          item.unit_size_id = value;
          item.unit_price = formData.currency === 'SYP' ? 
            roundToHundreds(unitSize.price * rate) : unitSize.price;
        }
      }
    } else {
      item[field as keyof typeof item] = Number(value);
    }

    item.subtotal = item.quantity * item.unit_price;
    updatedItems[index] = item;
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  // Update prices when currency or exchange rate changes
  useEffect(() => {
    if (formData.items.length > 0) {
      const rate = formData.currency === 'SYP' ? 
        (parseFloat(formData.transaction_exchange_rate) || exchangeRate) : 1;
      
      const updatedItems = formData.items.map(item => {
        if (item.product_id && item.unit_size_id) {
          const priceListItem = selectedPriceList?.items.find(
            i => i.product_id === item.product_id && i.unit_size_id === item.unit_size_id
          );
          
          let basePrice = priceListItem?.price;
          if (!basePrice) {
            const product = products.find(p => p.id === item.product_id);
            const unitSize = product?.unit_sizes.find(
              size => size.unit_size_id === item.unit_size_id
            );
            basePrice = unitSize?.price || 0;
          }
          
          const newPrice = formData.currency === 'SYP' ? basePrice * rate : basePrice;
          const roundedPrice = formData.currency === 'SYP' ? Math.ceil(newPrice / 100) * 100 : newPrice;
          return {
            ...item,
            unit_price: roundedPrice,
            subtotal: item.quantity * roundedPrice
          };
        }
        return item;
      });
      
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  }, [formData.currency, formData.transaction_exchange_rate]);
  const removeSaleItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
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

    setProcessingForm(true);

    try {
      // Create the sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            customer_id: formData.customer_id,
            payment_method: formData.payment_method,
            price_list_id: formData.price_list_id || null,
            syp_amount: formData.currency === 'SYP' ? calculateTotal() : null,
            total_amount: formData.currency === 'SYP' ? 
              calculateTotal() / (parseFloat(formData.transaction_exchange_rate) || exchangeRate) :
              calculateTotal(),
            currency: formData.currency,
            transaction_exchange_rate: formData.currency === 'SYP' ? 
              parseFloat(formData.transaction_exchange_rate) || exchangeRate : 
              null,
            sale_date: formData.sale_date,
            notes: formData.notes || null,
            status: 'completed',
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = formData.items.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        unit_size_id: item.unit_size_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Update product stock levels
      for (const item of formData.items) {
        const product = products.find((p) => p.id === item.product_id);
        const unitSize = product?.unit_sizes.find(
          (size) => size.unit_size_id === item.unit_size_id
        );
        if (unitSize) {
          const { error: stockError } = await supabase
            .from('product_unit_sizes')
            .update({ stock_level: unitSize.stock_level - item.quantity })
            .eq('id', unitSize.id);

          if (stockError) throw stockError;
        }
      }

      toast.success('Sale created successfully');
      setShowForm(false);
      resetForm();
      fetchSales();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Failed to create sale');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleViewSale = async (sale: Sale) => {
    try {
      // Fetch sale details with payment amount
      const { data: saleDetails, error: saleError } = await supabase
        .from('sales')
        .select(
          `
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
        `
        )
        .eq('id', sale.id)
        .single();

      if (saleError) throw saleError;
      setSelectedSale(saleDetails);

      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select(
          `
          id,
          quantity,
          unit_price,
          subtotal,
          product:products (
            name
          ),
          unit_size:product_unit_sizes (
            sku,
            unit_size:unit_sizes (
              name
            )
          )
        `
        )
        .eq('sale_id', sale.id);

      if (itemsError) throw itemsError;
      setSaleItems(items || []);
    } catch (error) {
      console.error('Error fetching sale items:', error);
      toast.error('Failed to load sale details');
    }
  };

  const handleCancelSale = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this sale?')) return;

    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Sale cancelled successfully');
      fetchSales();
    } catch (error) {
      console.error('Error cancelling sale:', error);
      toast.error('Failed to cancel sale');
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
        <h1 className="text-2xl font-bold">Sales</h1>
        <button
          onClick={handleNewSale}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          New Sale
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
        searchPlaceholder="Search sales by invoice, customer, or status..."
      />

      {showForm && (
  <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
    <div className="flex-1 overflow-y-auto px-6 space-y-4">
      {/* Customer Field */}
      <label>Customer</label>
      <CustomCustomerSelect
        value={customers.find((c) => c.id === formData.customer_id)}
        onSelect={(customer) => {
          setFormData((prev) => ({
            ...prev,
            customer_id: customer.id,
            price_list_id: customer.default_price_list_id || '',
          }));
          if (customer.default_price_list_id) {
            fetchPriceList(customer.default_price_list_id);
          } else {
            setSelectedPriceList(null);
          }
        }}
        placeholder="Search customers..."
      />

      {/* Price List Field */}
      <label>Price List</label>
      <select
        value={formData.price_list_id}
        onChange={(e) => handleInputChange(e)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="">Select a price list...</option>
        {priceLists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>

      {/* Sale Date Field */}
      <label>Sale Date</label>
      <input
        type="date"
        name="sale_date"
        value={formData.sale_date}
        onChange={(e) => handleInputChange(e)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />

      {/* Payment Method Field */}
      <label>Payment Method</label>
      <select
        name="payment_method"
        value={formData.payment_method}
        onChange={(e) => handleInputChange(e)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="">Select payment method...</option>
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>

      {/* Currency Field */}
      <label>Currency</label>
      <select
        name="currency"
        value={formData.currency}
        onChange={(e) => handleInputChange(e)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="USD">USD</option>
        <option value="SYP">SYP</option>
      </select>

      {/* Exchange Rate Field (if SYP is selected) */}
      {formData.currency === 'SYP' && (
        <div>
          <label>Exchange Rate (SYP/USD)</label>
          <input
            type="number"
            name="transaction_exchange_rate"
            value={formData.transaction_exchange_rate}
            onChange={(e) => handleInputChange(e)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter exchange rate"
          />
        </div>
      )}

      {/* Notes Field */}
      <label>Notes</label>
      <textarea
        name="notes"
        value={formData.notes}
        onChange={(e) => handleInputChange(e)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Add notes..."
      />

      {/* Sale Items Section */}
      <div>
        <h3>Sale Items</h3>
        <button type="button" onClick={addSaleItem}>
          Add Item
        </button>
        {formData.items.length > 0 && (
          <div>
            {/* Column Headers */}
            <div className="grid grid-cols-5 gap-4 font-bold">
              <span>Product</span>
              <span>Size</span>
              <span>Quantity</span>
              <span>Unit Price</span>
              <span>Subtotal</span>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center">
                {/* Product Select */}
                <CustomProductSelect
                  ref={(el) => (productSearchRefs.current[index] = el)}
                  value={products.find((p) => p.id === item.product_id)}
                  onSelect={(product) => updateSaleItem(index, 'product_id', product.id)}
                  placeholder="Search for a product..."
                />

                {/* Unit Size Select */}
                {item.product_id && (
                  <select
                    value={item.unit_size_id || ''}
                    onChange={(e) =>
                      updateSaleItem(index, 'unit_size_id', e.target.value)
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select size...</option>
                    {products
                      .find((p) => p.id === item.product_id)
                      ?.unit_sizes.filter((size) => size.stock_level > 0)
                      .map((size) => (
                        <option key={size.id} value={size.unit_size_id}>
                          {size.unit_size.name} - Stock: {size.stock_level}
                        </option>
                      ))}
                  </select>
                )}

                {/* Quantity Input */}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateSaleItem(index, 'quantity', e.target.value)
                  }
                  min="1"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Qty"
                />

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeSaleItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total Amount */}
        {formData.items.length > 0 && (
          <div className="mt-4 font-bold">
            Total:{' '}
            {formData.currency === 'USD'
              ? `$${calculateTotal().toFixed(2)}`
              : `${Math.round(calculateTotal()).toLocaleString()} SYP`}
          </div>
        )}
      </div>
    </div>

    {/* Submit Buttons */}
    <div className="flex justify-end space-x-4">
      <button
        type="button"
        onClick={() => {
          resetForm();
          setShowForm(false);
        }}
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 bg-white"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={processingForm}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {processingForm ? (
          <>
            Processing...
            <Loader2 className="ml-2 animate-spin" />
          </>
        ) : (
          'Create Sale'
        )}
      </button>
    </div>
  </form>
)}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(sale.sale_date), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(sale.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {sale.customer.full_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${Number(sale.total_amount || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : sale.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {sale.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.payment_method}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewSale(sale)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View
                  </button>
                  {sale.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancelSale(sale.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No sales found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default Sales