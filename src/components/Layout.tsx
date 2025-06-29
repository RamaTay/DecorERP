import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  DollarSign,
  LogOut,
  Store,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight, 
  List,
  Settings,
  ShoppingCart,
  Keyboard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { ExchangeRateModal } from './ExchangeRateModal';

function Layout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { currency, setCurrency, exchangeRate, isLoadingRate } = useCurrency();
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  interface NavigationItem {
    name: string;
    to: string;
    icon: React.ElementType;
    submenu?: NavigationItem[];
    isParent?: boolean;
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if Alt is pressed
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            navigate('/sales');
            break;
          case 'p':
            e.preventDefault();
            navigate('/purchases');
            break;
          case 'e':
            e.preventDefault();
            navigate('/expenses');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Sales', to: '/sales', icon: Receipt },
    { name: 'Purchases', to: '/purchases', icon: ShoppingCart },
    { name: 'Expenses', to: '/expenses', icon: DollarSign },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Suppliers', to: '/suppliers', icon: Store },
    { 
      name: 'Settings', 
      to: '/settings', 
      icon: SettingsIcon,
      isParent: true,
      submenu: [
        { name: 'Products', to: '/products', icon: Package },
        { name: 'Price Lists', to: '/settings/price-lists', icon: DollarSign },
        { name: 'Lists', to: '/settings/lists', icon: List },
        { name: 'Shortcuts', to: '/settings/shortcuts', icon: Keyboard }
      ]
    },
  ];

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'SYP' : 'USD');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm fixed top-0 left-0 right-0 h-16 z-50">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">Shop Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                1 USD = {isLoadingRate ? '...' : exchangeRate.toLocaleString()} SYP
              </span>
              <button
                onClick={() => setShowExchangeRateModal(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              <span>{currency}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 flex">
        <aside 
          className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="flex justify-end p-2">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
          <nav className="p-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.to || 
                (item.submenu?.some(sub => location.pathname.startsWith(sub.to)) ?? false);

              const handleClick = (e: React.MouseEvent) => {
                if (item.isParent) {
                  e.preventDefault();
                  setIsSettingsOpen(!isSettingsOpen);
                }
              };

              const Icon = item.icon;
              return (
                <React.Fragment key={item.name}>
                  <NavLink
                    to={item.to}
                    onClick={handleClick}
                    className={({ isActive: linkActive }) =>
                      `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        linkActive || isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'} ${
                          isSidebarCollapsed ? '' : 'mr-3'
                        }`} />
                        {!isSidebarCollapsed && item.name}
                      </div>
                      {!isSidebarCollapsed && item.isParent && (
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </NavLink>
                  
                  {/* Submenu */}
                  {!isSidebarCollapsed && item.submenu && isSettingsOpen && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.submenu.map(subItem => {
                        const SubIcon = subItem.icon;
                        return (
                          <NavLink
                            key={subItem.name}
                            to={subItem.to}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`
                            }
                          >
                            <SubIcon className="w-4 h-4 mr-3 text-gray-400" />
                            {subItem.name}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

        <main className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        } p-8`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ExchangeRateModal 
        isOpen={showExchangeRateModal}
        onClose={() => setShowExchangeRateModal(false)}
      />
    </div>
  );
}

export default Layout;