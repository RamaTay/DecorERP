import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { List } from 'lucide-react';

function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Outlet />
    </div>
  );
}

export default Settings;