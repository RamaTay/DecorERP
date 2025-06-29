import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ImportResult {
  productName: string;
  sku: string;
  status: 'success' | 'error';
  message?: string;
  rowNumber?: number;
  timestamp: string;
}

export function useProductImport(onSuccess: () => void) {
  const [importing, setImporting] = useState(false);
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    try {
      const { data: priceLists, error } = await supabase
        .from('price_lists')
        .select('id, name, status')
        .order('name');
      
      if (error) throw error;

      const headers = ['ID', 'Product Name', 'Brand', 'Size', 'SKU', 'Category', 'Min Stock Level'];
      priceLists?.forEach(list => {
        headers.push(`${list.name}${list.status === 'inactive' ? ' (Inactive)' : ''}`);
      });

      const csvContent = [
        headers.join(','),
        ['', 'Example Product', 'Generic', 'Box', 'EXP-BX1', 'Category A', '10', ...priceLists.map(() => '0')].join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const downloadCurrentProducts = async () => {
    try {
      const { data: priceListsData, error: priceListsError } = await supabase
        .from('price_lists')
        .select(`
          id,
          name,
          status,
          items:price_list_items (
            product_id,
            unit_size_id,
            price
          )
        `)
        .order('name');
      if (priceListsError) throw priceListsError;

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          brand:brands (
            name
          ),
          unit_sizes:product_unit_sizes (
            sku,
            min_stock_level,
            unit_size:unit_sizes (
              id,
              name
            )
          )
        `)
        .order('name');
      if (productsError) throw productsError;

      const headers = ['ID', 'Product Name', 'Brand', 'Size', 'SKU', 'Category', 'Min Stock Level'];
      priceListsData?.forEach(list => {
        headers.push(`${list.name}${list.status === 'inactive' ? ' (Inactive)' : ''}`);
      });

      const rows = productsData?.flatMap(product =>
        product.unit_sizes.map(size => {
          const row = [
            product.id,
            product.name,
            product.brand?.name || 'Generic',
            size.unit_size.name,
            size.sku,
            product.category,
            size.min_stock_level.toString()
          ];

          priceListsData?.forEach(list => {
            const priceItem = list.items.find(item =>
              item.product_id === product.id && item.unit_size_id === size.unit_size.id
            );
            row.push(priceItem ? priceItem.price.toString() : '0');
          });

          return row;
        })
      ) || [];
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n').map(line => 
          line.split(',').map(cell => cell.trim())
        );
        const results: ImportResult[] = [];

        const headers = lines[0];
        const requiredColumns = ['Product Name', 'Brand', 'Size', 'SKU', 'Category', 'Min Stock Level'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const idColumnIndex = headers.indexOf('ID');
        const nameColumnIndex = headers.indexOf('Product Name');
        const brandColumnIndex = headers.indexOf('Brand');
        const sizeColumnIndex = headers.indexOf('Size');
        const skuColumnIndex = headers.indexOf('SKU');
        const categoryColumnIndex = headers.indexOf('Category');
        const minStockLevelColumnIndex = headers.indexOf('Min Stock Level');
        const priceListColumns = headers.slice(minStockLevelColumnIndex + 1);

        const { data: priceLists } = await supabase
          .from('price_lists')
          .select('id, name')
          .order('created_at');

        const errors: string[] = [];
        const duplicateSkus = new Set<string>();

        // Check for duplicate SKUs within the CSV
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.length < 5) continue;
          const productId = line[idColumnIndex]?.trim();
          const sku = line[skuColumnIndex]?.trim();
          if (!sku) continue;
          
          const result: ImportResult = {
            productName: line[nameColumnIndex],
            sku,
            status: 'success',
            rowNumber: i + 1,
            timestamp: new Date().toISOString()
          };

          if (duplicateSkus.has(sku)) {
            result.status = 'error';
            result.message = `Duplicate SKU "${sku}" found in the CSV file`;
            results.push(result);
            continue;
          }

          duplicateSkus.add(sku);
        }

        // Check for existing SKUs only for new products (no ID)
        const newProductRows = lines.slice(1).filter(line => !line[idColumnIndex]?.trim());
        if (newProductRows.length > 0) {
          const newSkus = newProductRows.map(line => line[skuColumnIndex]?.trim()).filter(Boolean);
          if (newSkus.length > 0) {
            const { data: existingSkuProducts } = await supabase
              .from('product_unit_sizes')
              .select('sku')
              .in('sku', newSkus);

            if (existingSkuProducts) {
              for (const { sku } of existingSkuProducts) {
                const rowIndex = newProductRows.findIndex(line => line[skuColumnIndex]?.trim() === sku) + 1;
                results.push({
                  productName: newProductRows[rowIndex - 1][nameColumnIndex],
                  sku,
                  status: 'error',
                  message: `SKU "${sku}" already exists in the database`,
                  rowNumber: rowIndex + 1,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }

        // If we found any validation errors, show summary and stop
        if (results.some(r => r.status === 'error')) {
          setImportResults(results);
          setShowSummary(true);
          return;
        }

        const productCache: Record<string, string> = {};

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.length < 5) continue;

          const productId = line[idColumnIndex]?.trim();
          const name = line[nameColumnIndex];
          const brandName = line[brandColumnIndex];
          const sizeName = line[sizeColumnIndex];
          const sku = line[skuColumnIndex];
          const category = line[categoryColumnIndex];
          const minStockLevel = line[minStockLevelColumnIndex];
          const prices = line.slice(minStockLevelColumnIndex + 1);
          
          if (!sku || !name || !sizeName || !category || !minStockLevel) {
            results.push({
              productName: name || 'Unknown',
              sku: sku || 'N/A',
              status: 'error',
              message: `Missing required fields (name: ${name}, size: ${sizeName}, SKU: ${sku}, category: ${category}, min stock: ${minStockLevel})`,
              rowNumber: i + 1,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          // Get or create brand
          const { data: brand } = await supabase
            .from('brands')
            .select('id')
            .eq('name', brandName)
            .single();

          const brandId = brand?.id || (
            await supabase
              .from('brands')
              .insert({ name: brandName })
              .select('id')
              .single()
          ).data?.id;
          const { data: unitSize } = await supabase
            .from('unit_sizes')
            .select('id')
            .eq('name', sizeName)
            .single();

          if (!unitSize) {
            results.push({
              productName: name,
              sku,
              status: 'error',
              message: `Unit size "${sizeName}" not found`,
              rowNumber: i + 1,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          let resolvedProductId: string;

          if (productId) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                name,
                category,
                brand_id: brandId
              })
              .eq('id', productId);

            if (updateError) {
              results.push({
                productName: name,
                sku,
                status: 'error',
                message: `Failed to update product: ${updateError.message}`,
                rowNumber: i + 1,
                timestamp: new Date().toISOString()
              });
              continue;
            }
            resolvedProductId = productId;
          } else {
            // Create new product
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert([{ 
                name,
                category,
                brand_id: brandId
              }])
              .select()
              .single();

            if (productError) {
              results.push({
                productName: name,
                sku,
                status: 'error',
                message: `Failed to create product: ${productError.message}`,
                rowNumber: i + 1,
                timestamp: new Date().toISOString()
              });
              continue;
            }
            resolvedProductId = newProduct.id;
          }

          const { data: existingSize } = await supabase
            .from('product_unit_sizes')
            .select('id')
            .eq('product_id', resolvedProductId)
            .eq('unit_size_id', unitSize.id)
            .eq('sku', sku);

          if (existingSize && existingSize.length > 0) {
            // Update min stock level if changed
            const { error: updateSizeError } = await supabase
              .from('product_unit_sizes')
              .update({ min_stock_level: parseInt(minStockLevel) || 0 })
              .eq('id', existingSize[0].id);

            if (updateSizeError) {
              results.push({
                productName: name,
                sku,
                status: 'error',
                message: `Failed to update min stock level: ${updateSizeError.message}`,
                rowNumber: i + 1,
                timestamp: new Date().toISOString()
              });
              continue;
            }

            // Update prices if changed
            if (priceLists && priceLists.length > 0) {
              for (let j = 0; j < priceLists.length; j++) {
                const list = priceLists[j];
                const newPrice = parseFloat(prices[j]) || 0;

                const { data: existingPriceItem } = await supabase
                  .from('price_list_items')
                  .select('id, price')
                  .eq('price_list_id', list.id)
                  .eq('product_id', resolvedProductId)
                  .eq('unit_size_id', unitSize.id)
                  .single();

                if (existingPriceItem) {
                  if (existingPriceItem.price !== newPrice) {
                    const { error: updatePriceError } = await supabase
                      .from('price_list_items')
                      .update({
                        price: newPrice,
                        previous_price: existingPriceItem.price,
                        price_changed_at: new Date().toISOString()
                      })
                      .eq('id', existingPriceItem.id);

                    if (updatePriceError) {
                      results.push({
                        productName: name,
                        sku,
                        status: 'error',
                        message: `Failed to update price in price list "${list.name}": ${updatePriceError.message}`,
                        rowNumber: i + 1,
                        timestamp: new Date().toISOString()
                      });
                    }
                  }
                } else {
                  // Create new price list item if it doesn't exist
                  const { error: newPriceError } = await supabase
                    .from('price_list_items')
                    .insert({
                      price_list_id: list.id,
                      product_id: resolvedProductId,
                      unit_size_id: unitSize.id,
                      price: newPrice
                    });

                  if (newPriceError) {
                    results.push({
                      productName: name,
                      sku,
                      status: 'error',
                      message: `Failed to create price in price list "${list.name}": ${newPriceError.message}`,
                      rowNumber: i + 1,
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              }
            }
            results.push({
              productName: name,
              sku,
              status: 'success',
              timestamp: new Date().toISOString()
            });
            continue;
          }

          const { error: sizeError } = await supabase
            .from('product_unit_sizes')
            .insert({
              product_id: resolvedProductId,
              unit_size_id: unitSize.id,
              sku: sku,
              min_stock_level: parseInt(minStockLevel) || 0,
              stock_level: 0
            });

          if (sizeError) {
            results.push({
              productName: name,
              sku,
              status: 'error',
              message: `Failed to create size "${sizeName}": ${sizeError.message}`,
              rowNumber: i + 1,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          if (priceLists && priceLists.length > 0) {
            const priceListItems = priceLists.map((list, index) => ({
              price_list_id: list.id,
              product_id: resolvedProductId,
              unit_size_id: unitSize.id,
              price: parseFloat(prices[index]) || 0
            }));

            const { error: priceListError } = await supabase
              .from('price_list_items')
              .insert(priceListItems);

            if (priceListError) {
              results.push({
                productName: name,
                sku,
                status: 'error',
                message: `Failed to set prices: ${priceListError.message}`,
                rowNumber: i + 1,
                timestamp: new Date().toISOString()
              });
              continue;
            }
          }

          results.push({
            productName: name,
            sku,
            status: 'success',
            timestamp: new Date().toISOString()
          });
        }

        setImportResults(results);
        setShowSummary(true);

        if (!results.some(r => r.status === 'error')) {
          toast.success('Products imported successfully');
          onSuccess();
        }
      } catch (error) {
        console.error('Error importing products:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to import products');
      } finally {
        setImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const downloadReport = () => {
    const headers = ['Product Name', 'SKU', 'Status', 'Message', 'Row Number', 'Timestamp'];
    const rows = importResults.map(result => [
      result.productName,
      result.sku,
      result.status,
      result.message || '',
      result.rowNumber || '',
      result.timestamp
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return {
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
  };
}