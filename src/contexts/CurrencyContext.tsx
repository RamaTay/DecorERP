import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

type Currency = 'USD' | 'SYP';

interface ExchangeRate {
  id: string;
  rate: number;
  created_at: string;
  is_default: boolean;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number, currency?: Currency, customRate?: number) => string;
  exchangeRate: number;
  setExchangeRate: (rate: number) => Promise<void>;
  isLoadingRate: boolean;
  convertAmount: (amount: number, fromCurrency: Currency, toCurrency: Currency, customRate?: number) => number;
  getExchangeRateForDate: (date: string) => Promise<number>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const { user } = useAuth();
  const [exchangeRate, setExchangeRateState] = useState<number>(13000);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLatestExchangeRate();
    }
  }, [user]);

  const fetchLatestExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setExchangeRateState(data.rate);
      }
    } catch (error) {
      toast.error('Failed to load exchange rate');
    } finally {
      setIsLoadingRate(false);
    }
  };

  const setExchangeRate = async (rate: number) => {
    if (rate <= 0) {
      toast.error('Exchange rate must be greater than zero');
      return;
    }

    try {
      // Update current default to false
      await supabase
        .from('exchange_rates')
        .update({ is_default: false })
        .eq('is_default', true);

      // Insert new default rate
      const { error } = await supabase
        .from('exchange_rates')
        .insert([
          {
            rate,
            is_default: true
          }
        ]);

      if (error) throw error;

      setExchangeRateState(rate);
      toast.success('Exchange rate updated successfully');
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error('Failed to update exchange rate');
    }
  };

  const convertAmount = (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    customRate?: number
  ): number => {
    const rate = customRate || exchangeRate;
    
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'USD' && toCurrency === 'SYP') return amount * rate;
    return amount / rate;
  };

  const formatAmount = (amount: number, displayCurrency?: Currency, customRate?: number): string => {
    const currencyToUse = displayCurrency || currency;
    if (currencyToUse === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    const syp = convertAmount(amount, 'USD', 'SYP', customRate || exchangeRate);
    return `${Math.round(syp).toLocaleString()} SYP`;
  };

  const getExchangeRateForDate = async (date: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .lte('created_at', date)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data?.rate || exchangeRate;
    } catch (error) {
      console.error('Error fetching historical exchange rate:', error);
      return exchangeRate;
    }
  };

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        setCurrency, 
        formatAmount, 
        exchangeRate, 
        setExchangeRate,
        isLoadingRate,
        convertAmount,
        getExchangeRateForDate
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}