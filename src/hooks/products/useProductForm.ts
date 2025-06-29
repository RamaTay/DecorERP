import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import type { Product, UnitSize } from './useProducts';

interface FormData {
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
}

export function useProductForm(onSuccess: () => void) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [processingForm, setProcessingForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    brand_id: '',
    unit_sizes: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingForm(true);

    try {
      const productData = { 
        name: formData.name,
        description: formData.description,
        category: formData.category,
        brand_id: formData.brand_id
      };

      if (editingProduct) {
        const { error: productError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (productError) throw productError;

        // First, get existing unit sizes
        const { data: existingSizes } = await supabase
          .from('product_unit_sizes')
          .select('id, unit_size_id')
          .eq('product_id', editingProduct.id);

        // Determine which sizes to add, update, or delete
        const existingSizeIds = existingSizes?.map(size => size.unit_size_id) || [];
        const newSizeIds = formData.unit_sizes.map(size => size.unit_size_id);

        // Delete removed sizes
        const sizesToDelete = existingSizes?.filter(
          size => !newSizeIds.includes(size.unit_size_id)
        );
        if (sizesToDelete?.length) {
          const { error: deleteError } = await supabase
            .from('product_unit_sizes')
            .delete()
            .in('id', sizesToDelete.map(size => size.id));
          if (deleteError) throw deleteError;
        }

        // Update existing and add new sizes
        const sizesToUpsert = formData.unit_sizes.map(size => ({
          product_id: editingProduct.id,
          unit_size_id: size.unit_size_id,
          sku: size.sku,
          min_stock_level: size.min_stock_level || 0,
          stock_level: existingSizes?.find(es => es.unit_size_id === size.unit_size_id)?.stock_level || 0
        }));

        const { error: sizesError } = await supabase
          .from('product_unit_sizes')
          .upsert(sizesToUpsert, {
            onConflict: 'product_id,unit_size_id'
          });

        if (sizesError) throw sizesError;

        toast.success('Product updated successfully');
      } else {
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (productError) throw productError;
        
        const { data: priceLists, error: priceListsError } = await supabase
          .from('price_lists')
          .select('id');

        if (priceListsError) throw priceListsError;

        const { error: sizesError } = await supabase
          .from('product_unit_sizes')
          .insert(
            formData.unit_sizes.map(size => ({
              product_id: newProduct.id,
              unit_size_id: size.unit_size_id,
              sku: size.sku,
              min_stock_level: 0,
              stock_level: 0,
            }))
          );

        if (sizesError) throw sizesError;

        if (priceLists && priceLists.length > 0) {
          const priceListItems = priceLists.flatMap(list => 
            formData.unit_sizes.map(size => ({
              price_list_id: list.id,
              product_id: newProduct.id,
              unit_size_id: size.unit_size_id,
              price: 0,
              created_at: new Date().toISOString()
            }))
          );

          const { error: priceListItemsError } = await supabase
            .from('price_list_items')
            .insert(priceListItems);
            
          if (priceListItemsError) throw priceListItemsError;
        }

        toast.success('Product added successfully. Remember to set prices in your price lists.');
      }

      setShowForm(false);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      brand_id: product.brand_id,
      unit_sizes: product.unit_sizes.map(size => ({
        unit_size_id: size.unit_size_id,
        sku: size.sku || '',
        min_stock_level: size.min_stock_level || 0,
        quantity: 1,
        unit_price: 0,
        subtotal: 0
      }))
    });
    setShowForm(true);
  };

  const handleAddSize = (sizeId: string, unitSizes: UnitSize[]) => {
    if (!formData.unit_sizes.some(size => size.unit_size_id === sizeId)) {
      const size = unitSizes.find(s => s.id === sizeId);
      const generatedSku = `${formData.name.substring(0, 3).toUpperCase()}-${size?.name.substring(0, 2).toUpperCase()}`;
      
      setFormData(prev => ({
        ...prev,
        unit_sizes: [...prev.unit_sizes, { 
          unit_size_id: sizeId,
          sku: generatedSku,
          min_stock_level: 0,
          quantity: 1,
          unit_price: 0,
          subtotal: 0 
        }]
      }));
    }
  };

  const handleRemoveSize = (sizeId: string) => {
    setFormData(prev => ({
      ...prev,
      unit_sizes: prev.unit_sizes.filter(size => size.unit_size_id !== sizeId)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      brand_id: '',
      unit_sizes: []
    });
    setEditingProduct(null);
  };

  return {
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
  };
}