
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fix for google authentication redirect loops
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Use setTimeout to avoid calling navigate during render
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      if (error.message === 'Email not confirmed') {
        toast.error('Por favor, confirme seu email antes de fazer login');
      } else {
        toast.error(error.message || 'Erro ao fazer login');
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login com Google');
    }
  };

  const initializeGroomerAvailability = async (userId: string) => {
    console.log('🔧 Initializing groomer availability for user:', userId);
    
    try {
      // Generate availability for the next 3 months
      const availabilityEntries = [];
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(today.getMonth() + 3);

      // Generate time slots (8am to 5pm, 30-min intervals)
      const timeSlots = [];
      for (let hour = 8; hour < 17; hour++) {
        timeSlots.push(`${hour}:00`);
        if (hour < 16) {
          timeSlots.push(`${hour}:30`);
        }
      }

      // Loop through each day for the next 3 months
      for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip Sundays (day 0)
        if (date.getDay() === 0) continue;

        const dateStr = date.toISOString().split('T')[0];
        
        // Add all time slots for this date
        for (const timeSlot of timeSlots) {
          availabilityEntries.push({
            provider_id: userId,
            date: dateStr,
            time_slot: timeSlot,
            available: true
          });
        }
      }

      console.log(`📊 Creating ${availabilityEntries.length} availability entries for new groomer...`);

      // Insert all availability entries in batches
      const batchSize = 100;
      for (let i = 0; i < availabilityEntries.length; i += batchSize) {
        const batch = availabilityEntries.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(batch);

        if (insertError) {
          console.error('Error inserting availability batch:', insertError);
          // Don't throw here, as we don't want to fail registration
        }
      }

      console.log('✅ Groomer availability initialized successfully');
    } catch (error: any) {
      console.error('❌ Error initializing groomer availability:', error);
      // Don't throw here, as we don't want to fail registration
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'client') => {
    try {
      console.log('🔍 SignUp Debug - Starting registration with:', { email, name, role });
      
      // Validate role to ensure it's one of the allowed values
      if (!['client', 'groomer', 'vet'].includes(role)) {
        role = 'client'; // Default to client if invalid role
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role, // Store role in user metadata
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      console.log('✅ SignUp Debug - User created:', data);
      console.log('📋 SignUp Debug - User metadata:', data.user?.user_metadata);
      
      // Check if profile was created and initialize groomer availability if needed
      if (data.user) {
        setTimeout(async () => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          console.log('👤 SignUp Debug - Profile check:', { profileData, profileError });
          
          // If the user is a groomer, initialize their availability
          if (profileData && profileData.role === 'groomer') {
            console.log('🏥 New groomer detected, initializing availability...');
            await initializeGroomerAvailability(data.user.id);
          }
        }, 3000); // Wait a bit longer for the profile trigger to complete
      }
      
      toast.success('Registro realizado com sucesso! Verifique seu e-mail para confirmar.');
      navigate('/login');
    } catch (error: any) {
      console.error('❌ SignUp Debug - Error:', error);
      toast.error(error.message || 'Erro ao criar conta');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Você saiu com sucesso');
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        navigate('/');
      }, 0);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
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
