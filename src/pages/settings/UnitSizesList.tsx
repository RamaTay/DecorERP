import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Loader2, Hand as DragHandle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface UnitSize {
  id: string;
  name: string;
  created_at: string;
}

function UnitSizesList() {
  const [unitSizes, setUnitSizes] = useState<UnitSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processingForm, setProcessingForm] = useState(false);
  const [newUnitSize, setNewUnitSize] = useState('');

  useEffect(() => {
    fetchUnitSizes();
  }, []);

  const fetchUnitSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_sizes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUnitSizes(data || []);
    } catch (error) {
      console.error('Error fetching unit sizes:', error);
      toast.error('Failed to load unit sizes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnitSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitSize.trim()) return;
    
    const sizeExists = unitSizes.some(
      size => size.name.toLowerCase() === newUnitSize.trim().toLowerCase()
    );
    
    if (sizeExists) {
      toast.error('This unit size already exists');
      return;
    }

    setProcessingForm(true);
    try {
      const { error } = await supabase
        .from('unit_sizes')
        .insert([{ name: newUnitSize.trim() }]);

      if (error) throw error;

      toast.success('Unit size added successfully');
      setNewUnitSize('');
      setShowForm(false);
      fetchUnitSizes();
    } catch (error) {
      console.error('Error adding unit size:', error);
      toast.error('Failed to add unit size');
    } finally {
      setProcessingForm(false);
    }
  };

  const handleDeleteUnitSize = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this unit size? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('unit_sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Unit size deleted successfully');
      fetchUnitSizes();
    } catch (error) {
      console.error('Error deleting unit size:', error);
      toast.error('Failed to delete unit size');
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
        <h2 className="text-xl font-semibold">Unit Sizes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Unit Size
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 space-y-2">
          {unitSizes.map((size) => (
            <div
              key={size.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
            >
              <div className="flex items-center gap-3">
                <DragHandle className="w-5 h-5 text-gray-400" />
                <span>{size.name}</span>
              </div>
              <button
                onClick={() => handleDeleteUnitSize(size.id)}
                className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
          {unitSizes.length === 0 && (
            <p className="text-center text-gray-500 py-4">No unit sizes found</p>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Unit Size</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setNewUnitSize('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUnitSize} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newUnitSize}
                  onChange={(e) => setNewUnitSize(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Box, Bottle, Pack"
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewUnitSize('');
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
    </div>
  );
}

export default UnitSizesList;