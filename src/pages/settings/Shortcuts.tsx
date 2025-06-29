import React from 'react';
import { Keyboard } from 'lucide-react';

function Shortcuts() {
  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['Alt', 'S'], description: 'Go to Sales' },
        { keys: ['Alt', 'P'], description: 'Go to Purchases' },
        { keys: ['Alt', 'E'], description: 'Go to Expenses' }
      ]
    },
    {
      category: 'Sales',
      items: [
        { keys: ['Alt', 'N'], description: 'New Sale' },
        { keys: ['Alt', 'I'], description: 'Add Item (when creating/editing)' }
      ]
    },
    {
      category: 'Purchases',
      items: [
        { keys: ['Alt', 'N'], description: 'New Purchase' },
        { keys: ['Alt', 'I'], description: 'Add Item (when creating/editing)' }
      ]
    },
    {
      category: 'Expenses',
      items: [
        { keys: ['Alt', 'N'], description: 'New Expense' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <Keyboard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <p className="text-sm text-gray-500">Quick reference for available keyboard shortcuts</p>
        </div>
      </div>

      <div className="grid gap-6">
        {shortcuts.map((category) => (
          <div key={category.category} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{category.category}</h3>
            <div className="space-y-3">
              {category.items.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-600">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="text-gray-400">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Shortcuts;