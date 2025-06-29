import React from 'react';
import { X, Loader2 } from 'lucide-react';
import type { UnitSize } from '../../hooks/products/useProducts';

interface Props {
  showForm: boolean;
  onClose: () => void;
  brands: { id: string; name: string; }[];
  formData: {
    name: string;
    description: string;
    category: string;
    brand_id: string;
    unit_sizes: {
      unit_size_id: string;
      sku: string;
      min_stock_level: number;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[];
  };
  unitSizes: UnitSize[];
  processingForm: boolean;
  editingProduct: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onAddSize: (sizeId: string) => void;
  onRemoveSize: (sizeId: string) => void;
  onUpdateUnitSize: (index: number, field: string, value: string | number) => void;
}

export function ProductForm({
  showForm,
  onClose,
  brands,
  formData,
  unitSizes,
  processingForm,
  editingProduct,
  onSubmit,
  onInputChange,
  onAddSize,
  onRemoveSize,
  onUpdateUnitSize
}: Props) {
  if (!showForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={onInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                name="brand_id"
                required
                value={formData.brand_id}
                onChange={onInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a brand...</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                required
                value={formData.category}
                onChange={onInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={onInputChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Sizes
            </label>
            <div className="space-y-4">
              <div className="mb-4">
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onChange={(e) => onAddSize(e.target.value)}
                  value=""
                >
                  <option value="">Select a size...</option>
                  {unitSizes
                    .filter(size => !formData.unit_sizes.some(us => us.unit_size_id === size.id))
                    .map(size => (
                      <option key={size.id} value={size.id}>
                        {size.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {formData.unit_sizes.map((sizeData, index) => {
                const size = unitSizes.find(s => s.id === sizeData.unit_size_id);
                return (
                  <div key={sizeData.unit_size_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">{size?.name}</span>
                    </div>
                    <div className="w-48">
                      <label className="block text-sm text-gray-500 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={sizeData.sku}
                        onChange={(e) => onUpdateUnitSize(index, 'sku', e.target.value.toUpperCase())}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="w-48">
                      <label className="block text-sm text-gray-500 mb-1">
                        Min Stock Level
                      </label>
                      <input
                        type="number"
                        value={sizeData.min_stock_level}
                        onChange={(e) => onUpdateUnitSize(index, 'min_stock_level', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => onRemoveSize(sizeData.unit_size_id)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {formData.unit_sizes.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  Please add at least one unit size
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
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
                editingProduct ? 'Update Product' : 'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}