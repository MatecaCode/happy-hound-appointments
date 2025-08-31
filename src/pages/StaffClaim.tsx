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
        
        // Get session from URL (handles invite links)
        const { data, error } = await supabase.auth.getSessionFromUrl({ 
          storeSession: true 
        });

        if (error) {
          console.error('❌ [STAFF_CLAIM] Session processing error:', error);
          setError('Erro ao processar convite. Verifique se o link está correto.');
          setIsProcessingSession(false);
          return;
        }

        if (data.session) {
          console.log('✅ [STAFF_CLAIM] Session processed successfully');
          console.log('📧 [STAFF_CLAIM] User email:', data.session.user.email);
          
          // Clear URL hash to clean up the URL
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          console.log('⚠️ [STAFF_CLAIM] No session found in URL');
          setError('Link de convite inválido ou expirado.');
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
      
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error('❌ [STAFF_CLAIM] Password update error:', error);
        setError('Erro ao definir senha. Tente novamente.');
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
