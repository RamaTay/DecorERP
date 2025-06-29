import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Upload } from 'lucide-react';
import { ProductForm } from '../components/products/ProductForm';
import { ProductTable } from '../components/products/ProductTable';
import { TemplateOptionsModal } from '../components/products/TemplateOptionsModal';
import { ImportSummaryModal } from '../components/products/ImportSummaryModal';
import { useProducts } from '../hooks/products/useProducts';
import { useProductForm } from '../hooks/products/useProductForm';
import { useProductImport } from '../hooks/products/useProductImport';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

function Products() {
  const [brands, setBrands] = useState<{ id: string; name: string; }[]>([]);
  const {
    products,
    unitSizes,
    loading,
    searchTerm,
    setSearchTerm,
    filteredProducts,
    deleteProduct,
    refreshProducts
  } = useProducts();

  const {
    showForm,
    setShowForm,
    editingProduct,
    processingForm,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleAddSize,
    handleRemoveSize,
    resetForm
  } = useProductForm(refreshProducts);

  const {
    importing,
    showTemplateOptions,
    setShowTemplateOptions,
    showSummary,
    setShowSummary,
    importResults,
    fileInputRef,
    downloadTemplate,
    downloadCurrentProducts,
    handleFileUpload,
    downloadReport
  } = useProductImport(refreshProducts);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error('Failed to load brands');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateUnitSize = (index: number, field: string, value: string | number) => {
    const newUnitSizes = [...formData.unit_sizes];
    newUnitSizes[index] = {
      ...newUnitSizes[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      unit_sizes: newUnitSizes
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
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTemplateOptions(true)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Template Options
          </button>
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import Products'}
            </button>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <ProductForm
        showForm={showForm}
        onClose={() => {
          resetForm();
          setShowForm(false);
        }}
        brands={brands}
        formData={formData}
        unitSizes={unitSizes}
        processingForm={processingForm}
        editingProduct={!!editingProduct}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
        onAddSize={(sizeId) => handleAddSize(sizeId, unitSizes)}
        onRemoveSize={handleRemoveSize}
        onUpdateUnitSize={handleUpdateUnitSize}
      />

      <ProductTable
        products={filteredProducts}
        onEdit={handleEdit}
        onDelete={deleteProduct}
      />

      <TemplateOptionsModal
        show={showTemplateOptions}
        onClose={() => setShowTemplateOptions(false)}
        onDownloadTemplate={downloadTemplate}
        onDownloadCurrent={downloadCurrentProducts}
      />

      <ImportSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        results={importResults}
        onDownloadReport={downloadReport}
      />
    </div>
  );
}

export default Products;