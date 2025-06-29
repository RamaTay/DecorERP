import React from 'react';
import { X, Download } from 'lucide-react';

interface Props {
  show: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onDownloadCurrent: () => void;
}

export function TemplateOptionsModal({ show, onClose, onDownloadTemplate, onDownloadCurrent }: Props) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Download Options</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => {
              onDownloadTemplate();
              onClose();
            }}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <div className="text-left">
                <div className="font-medium">Empty Template</div>
                <div className="text-sm text-gray-500">Download a blank template file</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onDownloadCurrent();
              onClose();
            }}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              <div className="text-left">
                <div className="font-medium">Export Current Products</div>
                <div className="text-sm text-gray-500">Download template with current product data</div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}