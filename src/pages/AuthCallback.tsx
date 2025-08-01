
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
          
          // Log the admin code
          const code = user?.user_metadata?.admin_registration_code;
          console.log("✅ Admin code found:", code);
          
          // If code is found, call the RPC and log the result
          if (code) {
            console.log("🔄 Processing admin registration for user:", user.id);
            console.log("🔄 Admin code:", code);
            
            try {
              // Call the apply_admin_registration function
              const { data: result, error } = await supabase.rpc('apply_admin_registration', {
                p_user_id: user.id,
                p_code: code
              });
              
              console.log("🔄 RPC result:", result);
              console.log("🔄 RPC error:", error);
              
              if (error) {
                console.error("❌ Failed to apply admin registration:", error);
                toast.error(`Erro ao processar registro de administrador: ${error.message}`);
              } else if (result?.success) {
                console.log("✅ Successfully applied admin registration:", result);
                toast.success('Registro de administrador processado com sucesso!');
              } else {
                console.error("❌ Admin registration failed:", result);
                toast.error(result?.error || 'Erro ao processar registro de administrador.');
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
