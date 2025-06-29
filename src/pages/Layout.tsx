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

       submenu: [
         { name: 'Products', to: '/products', icon: Package },
         { name: 'Price Lists', to: '/settings/price-lists', icon: DollarSign },
         { name: 'Lists', to: '/settings/lists', icon: List },
         { name: 'Shortcuts', to: '/settings/shortcuts', icon: Keyboard }
       ]