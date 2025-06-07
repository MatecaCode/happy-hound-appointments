
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for testing purposes
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  identities: [],
  confirmation_sent_at: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone: null,
  phone_confirmed_at: null,
  last_sign_in_at: new Date().toISOString(),
  recovery_sent_at: null,
  new_email: null,
  new_phone: null,
  invited_at: null,
  action_link: null,
  email_change_sent_at: null,
  phone_change_sent_at: null,
  is_anonymous: false,
} as User;

const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
} as Session;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // For testing: always return a mock authenticated user
  const [user, setUser] = useState<User | null>(mockUser);
  const [session, setSession] = useState<Session | null>(mockSession);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Skip real auth setup for testing
    console.log('🧪 AUTH DISABLED FOR TESTING - Using mock user');
    setLoading(false);
  }, []);

  // Mock auth functions for testing
  const signIn = async (email: string, password: string) => {
    toast.success('Login simulado - auth desabilitado para testes');
    navigate('/');
  };

  const signInWithGoogle = async () => {
    toast.success('Login Google simulado - auth desabilitado para testes');
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'client') => {
    toast.success('Registro simulado - auth desabilitado para testes');
    navigate('/login');
  };

  const signOut = async () => {
    toast.success('Logout simulado - auth desabilitado para testes');
    setTimeout(() => {
      navigate('/');
    }, 0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
