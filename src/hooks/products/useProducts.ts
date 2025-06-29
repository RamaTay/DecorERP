import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand_id: string;
  brand: {
    name: string;
  };
  unit_sizes: ProductUnitSize[];
}

export interface UnitSize {
  id: string;
  name: string;
}

export interface ProductUnitSize {
  id: string;
  unit_size_id: string;
  sku: string;
  unit_size: UnitSize;
  stock_level: number;
  min_stock_level: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [unitSizes, setUnitSizes] = useState<UnitSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchUnitSizes();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands (
            name
          ),
          unit_sizes:product_unit_sizes (
            id,
            unit_size_id,
            sku,
            stock_level,
            min_stock_level,
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_sizes')
        .select('*');
      
      if (error) throw error;
      setUnitSizes(data || []);
    } catch (error) {
      console.error('Error fetching unit sizes:', error);
      toast.error('Failed to load unit sizes');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.unit_sizes.some(size => size.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    products,
    unitSizes,
    loading,
    searchTerm,
    setSearchTerm,
    filteredProducts,
    deleteProduct,
    refreshProducts: fetchProducts
  };
}