import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Loader2, DollarSign, Search, Save, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PriceList {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  unit_sizes: {
    id: string;
    sku: string;
    min_stock_level: number;
    unit_size: {
      id: string;
      name: string;
    };
  }[];
}

interface PriceListItem {
  id: string;
  product_id: string;
  unit_size_id: string;
  price: number;
  previous_price: number | null;
  price_changed_at: string | null;
}

function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processingForm, setProcessingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as const
  });

  useEffect(() => {
    fetchPriceLists();
    fetchProducts();
  }, []);

  const fetchPriceLists = async () => {
    try {
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPriceLists(data || []);
    } catch (error) {
      console.error('Error fetching price lists:', error);
      toast.error('Failed to load price lists');
    } finally {
      setLoading(false);
    }
  };

  const downloadCurrentProducts = async () => {
    try {
      // Get all products with their unit sizes and prices
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          unit_sizes:product_unit_sizes (
            sku,
            min_stock_level,
            unit_size:unit_sizes (
              name
            )
          )
        `);

      if (productsError) throw productsError;

      const rows = productsData?.flatMap(product =>
        product.unit_sizes.map(size => {
          const row = [
            product.name,
            size.unit_size.name,
            size.sku,
            product.category,
            size.min_stock_level.toString()
          ];
          return row;
        })
      );

      // Implement CSV download logic here
    } catch (error) {
      console.error('Error downloading products:', error);
      toast.error('Failed to download products');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          unit_sizes:product_unit_sizes (
            id,
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

  const fetchPriceListItems = async (priceListId: string) => {
    try {
      const { data, error } = await supabase
        .from('price_list_items')
        .select('*')
        .eq('price_list_id', priceListId);
      
      if (error) throw error;
      setPriceListItems(data || []);
    } catch (error) {
      console.error('Error fetching price list items:', error);
      toast.error('Failed to load price list items');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingForm(true);

    try {
      const { data, error } = await supabase
        .from('price_lists')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      // Create price list items for all products
      const items = products.flatMap(product =>
        product.unit_sizes.map(size => ({
          price_list_id: data.id,
          product_id: product.id,
          unit_size_id: size.unit_size.id,
          price: 0
        }))
      );

      const { error: itemsError } = await supabase
        .from('price_list_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success('Price list created successfully');
      setShowForm(false);
      resetForm();
      fetchPriceLists();
    } catch (error) {
      console.error('Error creating price list:', error);
      toast.error('Failed to create price list');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(unsavedChanges).length === 0) return;

    const invalidPrices = Object.values(unsavedChanges).some(price => 
      isNaN(price) || price < 0
    );

    if (invalidPrices) {
      toast.error('All prices must be valid numbers greater than or equal to 0');
      return;
    }

    try {
      const itemsToUpdate = Object.entries(unsavedChanges).map(([id, price]) => ({
        id,
        price,
        previous_price: priceListItems.find(i => i.id === id)?.price || null,
        price_changed_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('price_list_items')
        .upsert(itemsToUpdate);

      if (error) throw error;
      toast.success('Prices updated successfully');
      if (selectedPriceList) {
        fetchPriceListItems(selectedPriceList.id);
        setUnsavedChanges({});
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices');
    }
  };

  const handleStatusChange = async (id: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('price_lists')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated successfully');
      fetchPriceLists();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this price list?')) return;

    try {
      const { data: customers, error: checkError } = await supabase
        .from('customers')
        .select('id, full_name')
        .eq('default_price_list_id', id);

      if (checkError) throw checkError;

      if (customers && customers.length > 0) {
        const confirmMessage = `This price list is set as default for ${customers.length} customer(s). ` +
          'Deleting it will remove it as their default price list. Do you want to continue?';
        
        if (!window.confirm(confirmMessage)) {
          return;
        }

        // Update customers to remove this price list as default
        const { error: updateError } = await supabase
          .from('customers')
          .update({ default_price_list_id: null })
          .eq('default_price_list_id', id);

        if (updateError) throw updateError;
      }

      const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Price list deleted successfully');
      fetchPriceLists();
    } catch (error) {
      console.error('Error deleting price list:', error);
      toast.error('Failed to delete price list');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active'
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.unit_sizes.some(size => size.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <h2 className="text-xl font-semibold">Price Lists</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Price List
        </button>
      </div>

      {/* Price Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {priceLists.map((list) => (
          <div
            key={list.id}
            className="bg-white rounded-lg shadow-sm p-6 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{list.name}</h3>
                <p className="text-sm text-gray-500">{list.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                list.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {list.status}
              </span>
            </div>

            <div className="text-sm text-gray-500">
              Created: {format(new Date(list.created_at), 'MMM d, yyyy')}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => {
                  setSelectedPriceList(list);
                  fetchPriceListItems(list.id);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Manage Prices
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(list.id, list.status === 'active' ? 'inactive' : 'active')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {list.status === 'active' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Price List Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Price List</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
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
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price List Items Modal */}
      {selectedPriceList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">{selectedPriceList.name}</h3>
                <p className="text-sm text-gray-500">{selectedPriceList.description}</p>
              </div>
              <button
                onClick={() => setSelectedPriceList(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Search and Bulk Actions */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <button
                    onClick={handleSaveChanges}
                    disabled={Object.keys(unsavedChanges).length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) =>
                      product.unit_sizes.map((size) => {
                        const priceItem = priceListItems.find(
                          item => item.product_id === product.id && item.unit_size_id === size.unit_size.id
                        );
                        return (
                          <tr key={`${product.id}-${size.unit_size.id}`}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{size.sku}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{size.unit_size.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <input
                                  type="number"
                                  value={priceItem ? (unsavedChanges[priceItem.id] !== undefined ? unsavedChanges[priceItem.id] : priceItem.price) : 0}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    if (priceItem) {
                                      setUnsavedChanges(prev => ({
                                        ...prev,
                                        [priceItem.id]: value
                                      }));
                                    }
                                  }}
                                  min="0"
                                  step="0.01"
                                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {priceItem?.previous_price
                                ? `$${priceItem.previous_price.toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {priceItem?.price_changed_at
                                ? format(new Date(priceItem.price_changed_at), 'MMM d, yyyy HH:mm')
                                : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <button
                                onClick={() => {
                                  if (priceItem) {
                                    setUnsavedChanges(prev => ({
                                      ...prev,
                                      [priceItem.id]: priceItem.previous_price || 0
                                    }));
                                  }
                                }}
                                disabled={!priceItem?.previous_price}
                                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                              >
                                Revert
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceLists;