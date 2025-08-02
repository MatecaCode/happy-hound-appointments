
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminRegistrationMonitor } from '@/utils/adminRegistrationMonitor';

const AuthCallback = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔄 AuthCallback started");
        
        // Extract error from URL query params if present
        const queryParams = new URLSearchParams(window.location.search);
        const error = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');

        // Handle errors from the URL
        if (error) {
          console.error("❌ Auth error:", error, errorDescription);
          toast.error(errorDescription || 'Authentication error');
          navigate('/login', { replace: true });
          return;
        }

        // Handle session from the hash or cookie
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          throw sessionError;
        }

        if (data?.session) {
          console.log("✅ Session found:", data.session);
          
          // After confirming email, load the user again
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("❌ Error getting user:", userError);
            throw userError;
          }
          
          console.log("✅ Auth callback user:", user);
          
          if (!user) {
            console.error("❌ No user found after session");
            toast.error('Usuário não encontrado após autenticação');
            navigate('/login', { replace: true });
            return;
          }
          
          // Log the metadata
          console.log("✅ Metadata:", user?.user_metadata);
          
          // Check for admin registration code
          const adminCode = user?.user_metadata?.admin_registration_code;
          console.log("✅ Admin code found:", adminCode);
          
          // Process admin registration if code is present
          if (adminCode) {
            console.log("🔄 Processing admin registration for user:", user.id);
            console.log("🔄 Admin code:", adminCode);
            
            try {
              // Use the admin registration monitor for comprehensive handling
              const success = await adminRegistrationMonitor.monitorAdminRegistration(user.id, adminCode);
              
              if (success) {
                console.log("✅ Successfully applied admin registration");
                toast.success('Registro de administrador processado com sucesso!');
              } else {
                console.error("❌ Admin registration failed");
                const status = adminRegistrationMonitor.getStatus();
                
                // Show retry button if retryable
                if (status.retryCount < 3) {
                  toast.error(`Erro no registro: ${status.error}`, {
                    action: {
                      label: 'Tentar Novamente',
                      onClick: () => adminRegistrationMonitor.retryAdminRegistration(),
                    },
                  });
                } else {
                  toast.error(`Erro no registro: ${status.error}`);
                }
              }
            } catch (adminError) {
              console.error("❌ Exception during admin registration:", adminError);
              toast.error('Erro ao processar registro de administrador.');
            }
          } else {
            console.log("ℹ️ No admin code found in metadata - user is not an admin");
          }
          
          toast.success('Autenticação realizada com sucesso!');
          
          // Use setTimeout to avoid the redirect loop
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000); // Increased delay to ensure processing completes
          return;
        }

        // No session found, redirect to login
        console.error("❌ No session found");
        toast.error('Sessão não encontrada');
        navigate('/login', { replace: true });
      } catch (error: any) {
        console.error("❌ Auth callback error:", error);
        toast.error(error.message || 'Erro na autenticação');
        navigate('/login', { replace: true });
      }
    };
    
    handleCallback();
  }, [navigate]);
  
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Processando autenticação...</h2>
        <div className="animate-pulse text-primary">Aguarde um momento</div>
      </div>
    </div>
  );
};

export default AuthCallback;

