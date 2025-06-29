import React from 'react';
import { Package } from 'lucide-react';

function ProductSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Products Settings</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium">Product Management</h3>
            <p className="text-sm text-gray-500">Configure product settings and defaults</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Add product settings here */}
          <p className="text-gray-500">Product settings coming soon...</p>
        </div>
      </div>
    </div>
  );
}

export default ProductSettings;