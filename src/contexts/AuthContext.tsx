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

  const ensureUserProfile = async (user: User) => {
    try {
      // Check if user profile exists in public.users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error checking user profile:', fetchError);
        return;
      }

      // If user doesn't exist, create profile
      if (!existingUser) {
        const fullName = user.user_metadata?.full_name || 
                        user.email?.split('@')[0] || 
                        'User';

        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            email: user.email!,
            full_name: fullName,
            role: 'staff' // Default role
          }]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          toast.error('Failed to create user profile');
        } else {
          console.log('User profile created successfully');
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

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
      
      if (session?.user) {
        await ensureUserProfile(session.user);
        setUser(session.user);
        resetActivityTimer();
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
      case 'SIGNED_IN':
        if (session?.user) {
          await ensureUserProfile(session.user);
          setUser(session.user);
          toast.success('Signed in successfully');
          resetActivityTimer();
        }
        break;
      case 'SIGNED_OUT':
        setUser(null);
        if (activityTimeout) {
          clearTimeout(activityTimeout);
          setActivityTimeout(null);
        }
        navigate('/login');
        break;
      case 'TOKEN_REFRESHED':
        if (session?.user) {
          setUser(session.user);
          console.log('Session refreshed');
          resetActivityTimer();
        }
        break;
      default:
        setUser(session?.user ?? null);
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
      
      if (data.user) {
        await ensureUserProfile(data.user);
      }
      
      resetActivityTimer();
      return data;
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