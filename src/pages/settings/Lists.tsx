import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Tag, ChevronRight, Keyboard, Box } from 'lucide-react';

function Lists() {
  const navigate = useNavigate();
  const lists = [
    {
      name: 'Unit Sizes',
      description: 'Manage product unit sizes',
      icon: Package,
      to: '/settings/lists/unit-sizes'
    },
    {
      name: 'Brands',
      description: 'Manage product brands',
      icon: Box,
      to: '/settings/lists/brands'
    },
    {
      name: 'Expense Categories',
      description: 'Manage expense categories',
      icon: Tag,
      to: '/settings/lists/expense-categories'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Lists</h2>

      <div className="grid grid-cols-1 gap-4">
        {lists.map((list) => {
          const Icon = list.icon;
          return (
            <div
              key={list.name}
              onClick={() => navigate(list.to)}
              className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{list.name}</h3>
                  <p className="text-sm text-gray-500">{list.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Lists;