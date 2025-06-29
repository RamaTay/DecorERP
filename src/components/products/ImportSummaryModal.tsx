import React from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ImportResult {
  productName: string;
  sku: string;
  status: 'success' | 'error';
  message?: string;
  rowNumber?: number;
  timestamp: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  results: ImportResult[];
  onRetryFailed?: () => void;
  onDownloadReport?: () => void;
}

export function ImportSummaryModal({ isOpen, onClose, results, onRetryFailed, onDownloadReport }: Props) {
  if (!isOpen) return null;

  const successfulImports = results.filter(r => r.status === 'success');
  const failedImports = results.filter(r => r.status === 'error');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Import Summary</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Products</div>
              <div className="text-2xl font-bold">{results.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Successfully Imported</div>
              <div className="text-2xl font-bold text-green-700">{successfulImports.length}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-red-600">Failed Imports</div>
              <div className="text-2xl font-bold text-red-700">{failedImports.length}</div>
            </div>
          </div>

          {/* Successful Imports */}
          {successfulImports.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Successfully Imported Products</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {successfulImports.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{result.productName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.sku}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Success
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(result.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Imports */}
          {failedImports.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Failed Imports</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {failedImports.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{result.productName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.sku}</td>
                        <td className="px-6 py-4 text-sm text-red-600">{result.message}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">Row {result.rowNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            {failedImports.length > 0 && onRetryFailed && (
              <button
                onClick={onRetryFailed}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Failed Items
              </button>
            )}
            <button
              onClick={onDownloadReport}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}