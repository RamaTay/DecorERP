import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetActivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityTimeout, setActivityTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const resetActivityTimer = () => {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    
    // Only set new timeout if user is logged in
    if (user) {
      const timeout = setTimeout(async () => {
        await signOut();
        toast.error('Session expired due to inactivity');
        navigate('/login');
      }, INACTIVITY_TIMEOUT);
      
      setActivityTimeout(timeout);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setIsLoading(true);
      if (error) {
        console.error('Error getting session:', error);
        navigate('/login');
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        resetActivityTimer();
      }
      setIsLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      switch (event) {
      case 'SIGNED_IN':
        toast.success('Signed in successfully');
        resetActivityTimer();
        break;
      case 'SIGNED_OUT':
        if (activityTimeout) {
          clearTimeout(activityTimeout);
          setActivityTimeout(null);
        }
        navigate('/login');
        break;
      case 'TOKEN_REFRESHED':
        console.log('Session refreshed');
        resetActivityTimer();
        break;
      }
    });

    return () => {
      subscription.unsubscribe();
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, []);

  // Set up activity monitoring
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    
    const handleActivity = () => {
      resetActivityTimer();
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: true
        }
      });
      
      if (error) throw error;
      
      return data;
      resetActivityTimer();
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear any existing timeouts
      if (activityTimeout) {
        clearTimeout(activityTimeout);
        setActivityTimeout(null);
      }
      
      // Attempt to sign out, but don't throw on session errors
      await supabase.auth.signOut().catch(error => {
        // Only log session-related errors, throw others
        if (!error.message.includes('session')) {
          throw error;
        }
      });
      
      // Always clear the user state
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      // Show error toast but don't throw
      toast.error('An error occurred while signing out');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading,
      signIn, 
      signOut,
      resetActivityTimer
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}