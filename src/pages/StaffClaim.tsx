import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const StaffClaim: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingSession, setIsProcessingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processSession = async () => {
      try {
        console.log('🔗 [STAFF_CLAIM] Processing session from URL...');
        console.log('🔗 [STAFF_CLAIM] Current URL:', window.location.href);
        console.log('🔗 [STAFF_CLAIM] URL Hash:', window.location.hash);
        console.log('🔗 [STAFF_CLAIM] URL Search:', window.location.search);
        
        // Check for auth errors in URL hash first
        const urlHash = window.location.hash;
        if (urlHash.includes('error=')) {
          const urlParams = new URLSearchParams(urlHash.substring(1));
          const errorCode = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          
          console.error('❌ [STAFF_CLAIM] Auth error in URL:', { errorCode, errorDescription });
          setError(`Erro de autenticação: ${errorDescription || errorCode || 'Link inválido'}`);
          setIsProcessingSession(false);
          return;
        }
        
        // Try multiple methods to get the session
        let sessionData = null;
        let sessionError = null;
        
        // Check if there are auth tokens in the URL
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        console.log('🔍 [STAFF_CLAIM] URL tokens:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          tokenType: urlParams.get('token_type'),
          expiresIn: urlParams.get('expires_in')
        });
        
        if (accessToken) {
          // Method 1: Try setSession with tokens from URL (newer approach)
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            sessionData = data;
            sessionError = error;
            console.log('🔍 [STAFF_CLAIM] setSession result:', { sessionData, sessionError });
          } catch (err) {
            console.log('⚠️ [STAFF_CLAIM] setSession failed, trying getSessionFromUrl:', err);
            sessionError = err;
          }
        }
        
        // Method 2: Try getSessionFromUrl (fallback for older Supabase versions)
        if (!sessionData && !sessionError) {
          try {
            const result = await supabase.auth.getSessionFromUrl({ storeSession: true });
            sessionData = result.data;
            sessionError = result.error;
            console.log('🔍 [STAFF_CLAIM] getSessionFromUrl result:', { sessionData, sessionError });
          } catch (err) {
            console.log('⚠️ [STAFF_CLAIM] getSessionFromUrl failed, trying getSession:', err);
            sessionError = err;
          }
        }
        
        // Method 3: Try getSession (check current session)
        if (!sessionData && !sessionError) {
          try {
            const result = await supabase.auth.getSession();
            sessionData = result.data;
            sessionError = result.error;
            console.log('🔍 [STAFF_CLAIM] getSession result:', { sessionData, sessionError });
          } catch (err) {
            console.error('❌ [STAFF_CLAIM] All session methods failed:', err);
            sessionError = err;
          }
        }

        if (sessionError) {
          console.error('❌ [STAFF_CLAIM] Session processing error:', sessionError);
          setError('Erro ao processar convite. Verifique se o link está correto.');
          setIsProcessingSession(false);
          return;
        }

        if (sessionData?.session) {
          console.log('✅ [STAFF_CLAIM] Session processed successfully');
          console.log('📧 [STAFF_CLAIM] User email:', sessionData.session.user.email);
          console.log('👤 [STAFF_CLAIM] User metadata:', sessionData.session.user.user_metadata);
          
          // Clear URL hash to clean up the URL
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          console.log('⚠️ [STAFF_CLAIM] No session found');
          console.log('🔍 [STAFF_CLAIM] Checking if user is already logged in...');
          
          // Check if user is already authenticated
          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession?.session) {
            console.log('✅ [STAFF_CLAIM] User already authenticated:', currentSession.session.user.email);
            // User is already logged in, they can proceed to set password
          } else {
            console.log('❌ [STAFF_CLAIM] No active session found');
            // Instead of showing an error immediately, let them try to set password
            // The error might be due to session processing, but they might still be able to update password
            console.log('🔄 [STAFF_CLAIM] Allowing password setup attempt despite session issues');
          }
        }
      } catch (err) {
        console.error('❌ [STAFF_CLAIM] Unexpected error:', err);
        setError('Erro inesperado ao processar convite.');
      } finally {
        setIsProcessingSession(false);
      }
    };

    processSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 [STAFF_CLAIM] Updating user password...');
      
      // First check if user is authenticated
      const { data: currentSession } = await supabase.auth.getSession();
      console.log('🔍 [STAFF_CLAIM] Current session before password update:', {
        hasSession: !!currentSession?.session,
        userEmail: currentSession?.session?.user?.email
      });
      
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error('❌ [STAFF_CLAIM] Password update error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('session_not_found') || error.message.includes('not authenticated')) {
          setError('Sessão expirada. Por favor, solicite um novo convite.');
        } else if (error.message.includes('weak_password')) {
          setError('Senha muito fraca. Use pelo menos 8 caracteres com letras e números.');
        } else {
          setError(`Erro ao definir senha: ${error.message}`);
        }
        return;
      }

      console.log('✅ [STAFF_CLAIM] Password updated successfully');
      toast.success('Senha definida com sucesso!');
      
      // Redirect to staff calendar
      navigate('/staff-calendar');
      
    } catch (err) {
      console.error('❌ [STAFF_CLAIM] Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#6BAEDB]" />
              <p className="text-lg font-medium text-[#1A4670]">
                Processando convite...
              </p>
              <p className="text-sm text-gray-600">
                Aguarde enquanto verificamos seu convite.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/vettale-logo-azul.svg" 
              alt="Vettale" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1A4670]">
            Bem-vindo ao Vettale!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Complete seu cadastro definindo sua senha
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-10"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua senha"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#6BAEDB] hover:bg-[#2B70B2] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Definindo senha...
                </>
              ) : (
                'Completar Cadastro'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-[#6BAEDB] hover:text-[#2B70B2]"
                onClick={() => navigate('/login')}
              >
                Faça login
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffClaim;
