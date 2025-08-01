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
  isAdmin: boolean;
  isClient: boolean;
  isGroomer: boolean;
  isVet: boolean;
  isStaff: boolean;
  userRole: string | null;
  userRoles: string[];
  hasRole: (role: string) => boolean;
  refreshUserRoles: () => Promise<void>;
  forceRefreshUserRoles: () => Promise<void>;
  isInitialized: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Computed role states based on user_roles table
  const isAdmin = userRoles.includes('admin');
  const isClient = userRoles.includes('client');
  const isGroomer = userRoles.includes('groomer');
  const isVet = userRoles.includes('vet');
  const isStaff = userRoles.includes('staff');
  
  // Primary role priority: admin > staff > groomer > vet > client
  const userRole = isAdmin ? 'admin' : 
                   isStaff ? 'staff' :
                   isGroomer ? 'groomer' : 
                   isVet ? 'vet' : 
                   isClient ? 'client' : null;

  const clearAuthError = () => {
    setAuthError(null);
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      console.log('🎭 Fetching user roles for:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Role fetch timeout')), 10000);
      });

      const fetchPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Failed to fetch user roles:', error);
        setAuthError(`Erro ao buscar roles do usuário: ${error.message}`);
        return ['client']; // Default fallback role
      }

      const roles = data?.map(r => r.role) || ['client'];
      console.log('✅ User roles fetched:', roles);
      console.log('🔍 Raw data from database:', data);
      console.log('👤 User ID being queried:', userId);
      return roles;
    } catch (error) {
      console.error('💥 Error fetching user roles:', error);
      setAuthError('Erro ao buscar roles do usuário');
      return ['client']; // Default fallback role
    }
  };

  const hasRole = (role: string) => {
    return userRoles.includes(role);
  };

  const refreshUserRoles = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Manually refreshing user roles for:', user.id);
      const roles = await fetchUserRoles(user.id);
      setUserRoles(roles);
      console.log('✅ User roles refreshed:', roles);
    } catch (error) {
      console.error('❌ Error refreshing user roles:', error);
      setAuthError('Erro ao atualizar roles do usuário');
    }
  };

  const forceRefreshUserRoles = async () => {
    if (!user) return;
    
    try {
      console.log('🔄🔄 FORCE refreshing user roles for:', user.id);
      // Clear current roles first
      setUserRoles([]);
      // Wait a bit then fetch fresh
      setTimeout(async () => {
        const roles = await fetchUserRoles(user.id);
        setUserRoles(roles);
        console.log('✅✅ User roles force refreshed:', roles);
      }, 100);
    } catch (error) {
      console.error('❌❌ Error force refreshing user roles:', error);
      setAuthError('Erro ao forçar atualização de roles');
    }
  };

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;

    console.log('🔐 Setting up auth state listener...');

    // Set timeout to prevent infinite loading 
    authTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth timeout reached, setting loading to false');
        setLoading(false);
        setIsInitialized(true);
        setAuthError('Timeout ao inicializar autenticação');
      }
    }, 15000); // 15 second timeout

    const initializeAuth = async () => {
      try {
        // Get initial session first
        console.log('🔍 Getting initial session...');
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          if (mounted) {
            setSession(null);
            setUser(null);
            setUserRoles([]);
            setLoading(false);
            setIsInitialized(true);
            setAuthError(`Erro de sessão: ${sessionError.message}`);
          }
          return;
        }

        console.log('🔐 Initial session:', initialSession?.user?.email || 'No session');

        if (initialSession?.user && mounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch roles with error handling and retry logic
          const fetchRolesWithRetry = async (attempt: number = 1): Promise<string[]> => {
            try {
              const roles = await fetchUserRoles(initialSession.user.id);
              return roles;
            } catch (error) {
              if (attempt < maxRetries) {
                console.warn(`⚠️ Role fetch attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                return fetchRolesWithRetry(attempt + 1);
              } else {
                console.error('❌ All role fetch attempts failed');
                setAuthError('Erro ao buscar roles do usuário após múltiplas tentativas');
                return ['client']; // Final fallback
              }
            }
          };

          try {
            const roles = await fetchRolesWithRetry();
            if (mounted) {
              setUserRoles(roles);
            }
          } catch (roleError) {
            console.error('❌ Role fetch failed:', roleError);
            if (mounted) {
              setUserRoles(['client']); // Fallback
              setAuthError('Erro ao buscar roles do usuário');
            }
          }
        } else if (mounted) {
          setSession(null);
          setUser(null);
          setUserRoles([]);
        }

        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }

      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setLoading(false);
          setIsInitialized(true);
          setAuthError('Erro ao inicializar autenticação');
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email || 'No session');
        
        if (!mounted) return;

        clearTimeout(authTimeout);
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setAuthError(null); // Clear any previous errors
          
          // Fetch roles in background with timeout and retry
          setTimeout(async () => {
            if (mounted) {
              try {
                const roles = await fetchUserRoles(session.user.id);
                if (mounted) {
                  setUserRoles(roles);
                }
              } catch (error) {
                console.error('❌ Background role fetch failed:', error);
                if (mounted) {
                  setUserRoles(['client']);
                  setAuthError('Erro ao buscar roles em background');
                }
              }
            }
          }, 0);
        } else {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setAuthError(null);
        }
        
        setLoading(false);
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error.message || 'Erro ao fazer login');
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setAuthError(error.message || 'Erro ao fazer login com Google');
      toast.error(error.message || 'Erro ao fazer login com Google');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'client') => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role, // This will be used by the handle_new_user trigger
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success('Conta criada com sucesso! Verifique seu email.');
      navigate('/login');
    } catch (error: any) {
      console.error('Sign up error:', error);
      setAuthError(error.message || 'Erro ao criar conta');
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting logout process...');
      setAuthError(null);
      
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      setUserRoles([]);

      // Try multiple logout approaches to handle edge cases
      try {
        // First attempt: standard logout
        await supabase.auth.signOut();
        console.log('✅ Standard logout successful');
      } catch (standardError: any) {
        console.warn('⚠️ Standard logout failed, trying global logout:', standardError);
        
        try {
          // Second attempt: global logout
          await supabase.auth.signOut({ scope: 'global' });
          console.log('✅ Global logout successful');
        } catch (globalError: any) {
          console.warn('⚠️ Global logout also failed:', globalError);
          
          // Third attempt: Clear session locally and continue
          // This handles cases where the server session is already invalid
          if (globalError.message?.includes('session_not_found') || 
              globalError.message?.includes('Session not found') ||
              globalError.status === 403) {
            console.log('🔄 Session already invalid on server, proceeding with local cleanup');
          } else {
            throw globalError; // Re-throw if it's a different error
          }
        }
      }

      toast.success('Logout realizado com sucesso!');
      
      // Navigate immediately after clearing state
      navigate('/', { replace: true });
      
    } catch (error: any) {
      console.error('💥 Sign out error:', error);
      setAuthError(error.message || 'Erro ao fazer logout');
      
      // Even if there's an error, ensure we clear state and redirect
      // This prevents users from being stuck in a broken auth state
      setUser(null);
      setSession(null);
      setUserRoles([]);
      
      // Show a gentle message but still navigate
      toast.success('Sessão encerrada');
      navigate('/', { replace: true });
    }
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
        isAdmin,
        isClient,
        isGroomer,
        isVet,
        isStaff,
        userRole,
        userRoles,
        hasRole,
        refreshUserRoles,
        forceRefreshUserRoles,
        isInitialized,
        authError,
        clearAuthError,
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
