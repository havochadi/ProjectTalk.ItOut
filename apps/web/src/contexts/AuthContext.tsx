import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI } from '../api/client';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  age: number;
  school?: string;
}

interface AuthContextType {
  user: User | null;
  profile: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // Defer database work until the auth callback has released its lock.
      window.setTimeout(() => void refreshUser(), 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setIsLoading(false);
        return;
      }
      const response = await userAPI.getMe();
      setUser(response.data.user);
      setProfile(response.data.profile);
    } catch (error) {
      console.error('Auth check failed:', error);
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user } = response.data;

      setUser(user);
      toast.success('Welcome back!');

      // Fetch profile
      try {
        const profileRes = await userAPI.getMe();
        setProfile(profileRes.data.profile);
      } catch {
        // Profile fetch failure is not critical, user is still logged in
        setProfile(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await authAPI.register(data);
      const { user } = response.data;

      setUser(user);
      toast.success('Account created successfully!');

      // Fetch profile
      try {
        const profileRes = await userAPI.getMe();
        setProfile(profileRes.data.profile);
      } catch {
        setProfile(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      toast.success('Logged out successfully');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await userAPI.getMe();
      setUser(response.data.user);
      setProfile(response.data.profile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
