import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import PriceLists from './pages/settings/PriceLists';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Lists from './pages/settings/Lists';
import UnitSizesList from './pages/settings/UnitSizesList';
import ExpenseCategoriesList from './pages/settings/ExpenseCategoriesList';
import BrandsList from './pages/settings/BrandsList';
import Shortcuts from './pages/settings/Shortcuts';
import Purchases from './pages/Purchases';
import Login from './pages/Login';
import CustomerAccount from './pages/CustomerAccount';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isLoading && !user) return null;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerAccount />} />
              <Route path="sales" element={<Sales />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="settings" element={<Settings />}>
                <Route index element={<Navigate to="lists" />} />
                <Route path="lists" element={<Lists />} />
                <Route path="price-lists" element={<PriceLists />} />
                <Route path="lists/unit-sizes" element={<UnitSizesList />} />
                <Route path="lists/brands" element={<BrandsList />} />
                <Route path="lists/expense-categories" element={<ExpenseCategoriesList />} />
                <Route path="shortcuts" element={<Shortcuts />} />
              </Route>
            </Route>
          </Routes>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;