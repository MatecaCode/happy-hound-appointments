import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { claimDiag, generateClaimSummary } from '@/utils/claimDiag';

interface ClaimStatus {
  status: 'loading' | 'success' | 'password_setup' | 'error' | 'no_client';
  message: string;
  clientData?: {
    name: string;
    email: string;
    id: string;
  };
}

const Claim = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const TARGET = (import.meta as any).env?.VITE_AFTER_CLAIM_REDIRECT ?? '/';
  
  // Redirect guard - ensures single redirect only
  const redirectedRef = useRef(false);
  const hasProcessedSessionRef = useRef(false);
  
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({
    status: 'loading',
    message: 'Verificando sua conta...'
  });
  
  // Password setup state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Safe navigate - single-fire guard
  const safeNavigate = useCallback(() => {
    if (redirectedRef.current) {
      claimDiag.log('safeNavigate blocked - already redirected');
      (window as any).CLAIM_DIAG?.push({ step: 'navigate_blocked', reason: 'already_redirected' });
      return;
    }
    redirectedRef.current = true;
    
    claimDiag.log('navigate_called', 'target:', TARGET);
    (window as any).CLAIM_DIAG?.push({ step: 'navigate_called', target: TARGET });
    
    // Clean hash before navigating
    if (typeof window !== 'undefined') {
      claimDiag.log('cleaning hash before navigate');
      (window as any).CLAIM_DIAG?.push({ step: 'hash_cleaned', when: 'before_navigate' });
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    try {
      navigate(TARGET, { replace: true });
      claimDiag.log('navigate executed successfully');
    } catch (error) {
      claimDiag.log('navigate ERROR:', error);
      (window as any).CLAIM_DIAG?.push({ step: 'navigate_error', error: String(error) });
    }
  }, [navigate, TARGET]);

  // MOUNT + Process session from URL hash once only
  useEffect(() => {
    // Log mount info
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hasTokens = hash.includes('access_token') || hash.includes('refresh_token');
    
    claimDiag.log('MOUNT', {
      hash: hash.substring(0, 50),
      search: window.location.search,
      path: window.location.pathname,
      hasTokens
    });
    (window as any).CLAIM_DIAG?.push({
      step: 'mount',
      hasTokens,
      hash: hash.substring(0, 50),
      path: window.location.pathname
    });
    
    // INVENTORY REPORT
    if (claimDiag.on) {
      console.group('🔍 CLAIM FLOW INVENTORY');
      console.log('Redirect Target:', TARGET);
      console.log('Files/Components touching claim flow:');
      console.log('  - src/pages/Claim.tsx (this component)');
      console.log('  - src/utils/claimDiag.ts (diagnostic utility)');
      console.log('  - src/hooks/useAuth.ts (auth context)');
      console.log('  - src/integrations/supabase/client.ts (supabase client)');
      console.log('\nEffects & Functions:');
      console.log('  - Session bootstrap: useEffect (line ~75-126)');
      console.log('  - onAuthStateChange: useEffect (line ~128-156)');
      console.log('  - checkClaimStatus: useEffect (line ~158-161)');
      console.log('  - safeNavigate: useCallback (line ~47-73)');
      console.log('  - handlePasswordSubmit: function (line ~285)');
      console.log('\nSupabase Auth Calls:');
      console.log('  - supabase.auth.getSessionFromUrl() (line ~105)');
      console.log('  - supabase.auth.updateUser({ password }) (line ~309)');
      console.log('  - supabase.auth.onAuthStateChange() (line ~132)');
      console.log('\nNavigation Calls:');
      console.log('  - navigate(TARGET, { replace: true }) via safeNavigate() (line ~67)');
      console.log('\nRoute Guards:');
      console.log('  - redirectedRef guard in safeNavigate (line ~49)');
      console.log('  - checkClaimStatus guard (line ~160): if (!user || redirectedRef.current) return');
      console.groupEnd();
    }
    
    const processFromUrl = async () => {
      if (hasProcessedSessionRef.current) {
        claimDiag.log('session already processed, skipping');
        return;
      }
      
      try {
        if (hash && (hash.includes('access_token') || hash.includes('type='))) {
          claimDiag.log('processing session from URL hash');
          hasProcessedSessionRef.current = true;
          
          const { data, error } = await supabase.auth.getSessionFromUrl();
          
          claimDiag.log('getSessionFromUrl result:', { ok: !error, userId: data?.user?.id, error });
          (window as any).CLAIM_DIAG?.push({
            step: 'session_set',
            ok: !error,
            userId: data?.user?.id,
            error: error?.message
          });
          
          // Clean hash immediately after processing
          claimDiag.log('cleaning hash after session processing');
          (window as any).CLAIM_DIAG?.push({ step: 'hash_cleaned', when: 'after_session' });
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        claimDiag.log('session processing error:', err);
        (window as any).CLAIM_DIAG?.push({ step: 'session_error', error: String(err) });
      }
    };
    processFromUrl();
  }, []);

  // Listen for auth state changes and redirect (respect claim gate)
  useEffect(() => {
    claimDiag.log('setting up onAuthStateChange listener');
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      claimDiag.log('auth event:', event, 'userId:', session?.user?.id);
      (window as any).CLAIM_DIAG?.push({
        step: 'auth_event',
        event,
        userId: session?.user?.id
      });
      
      // Gate: while claim_in_progress and on /claim, ignore SIGNED_IN/TOKEN_REFRESHED
      try {
        const claimGate = localStorage.getItem('claim_in_progress') === '1';
        const onClaimRoute = typeof window !== 'undefined' && window.location.pathname === '/claim';
        if (claimGate && onClaimRoute && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          claimDiag.log('auth event ignored due to claim gate:', event);
          return;
        }
      } catch {}

      if (['USER_UPDATED', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
        claimDiag.log('auth event triggers redirect:', event);
        
        // Clean hash and redirect
        if (typeof window !== 'undefined') {
          claimDiag.log('cleaning hash in auth listener');
          (window as any).CLAIM_DIAG?.push({ step: 'hash_cleaned', when: 'auth_event' });
          window.history.replaceState(null, '', window.location.pathname);
        }
        safeNavigate();
      }
    });
    return () => {
      claimDiag.log('cleaning up auth listener');
      sub?.subscription?.unsubscribe?.();
    };
  }, [safeNavigate]);

  // Check claim status only once when user is available and not redirected
  useEffect(() => {
    if (!user || redirectedRef.current) return;
    checkClaimStatus();
  }, [user]);

  const checkClaimStatus = async () => {
    if (!user) {
      setClaimStatus({
        status: 'loading',
        message: 'Aguardando autenticação...'
      });
      return;
    }

    try {
      console.log('🔍 [CLAIM] Checking claim status for user:', user.email);

      // Check if user has a linked client account
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, user_id, admin_created')
        .eq('user_id', user.id)
        .eq('admin_created', true)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        console.error('❌ [CLAIM] Error checking client:', clientError);
        throw clientError;
      }

      if (clientData) {
        console.log('✅ [CLAIM] Client account found and linked:', clientData);
        
        // Update claimed_at timestamp if not already set
        try {
          await supabase
            .from('clients')
            .update({ claimed_at: new Date().toISOString() })
            .eq('id', clientData.id)
            .is('claimed_at', null);
        } catch (updateError) {
          console.error('❌ [CLAIM] Failed to update claimed_at:', updateError);
        }

        // Entering claim mode for client: set transient claim gate
        try {
          localStorage.setItem('claim_in_progress','1');
          claimDiag.log('claim gate SET (linked client)');
        } catch {}

        setClaimStatus({
          status: 'password_setup',
          message: 'Configure sua senha para finalizar',
          clientData: {
            name: clientData.name,
            email: clientData.email,
            id: clientData.id
          }
        });
      } else {
        // Check if there's an unlinked admin-created client
        const { data: unlinkedClient, error: unlinkedError } = await supabase
          .from('clients')
          .select('id, name, email, user_id, admin_created')
          .eq('email', user.email!)
          .eq('admin_created', true)
          .is('user_id', null)
          .single();

        if (unlinkedError && unlinkedError.code !== 'PGRST116') {
          console.error('❌ [CLAIM] Error checking unlinked client:', unlinkedError);
          throw unlinkedError;
        }

        if (unlinkedClient) {
          console.log('⚠️ [CLAIM] Found unlinked client, triggering manual link');
          
          // Use the RPC function to link manually
          const { data: linkResult, error: linkError } = await supabase
            .rpc('link_client_to_auth', {
              _email: user.email!,
              _auth_user_id: user.id
            });

          if (linkError) {
            console.error('❌ [CLAIM] Manual link error:', linkError);
            throw linkError;
          }

          console.log('✅ [CLAIM] Manual link result:', linkResult);

          if (linkResult?.success) {
            // Update claimed_at timestamp
            try {
              await supabase
                .from('clients')
                .update({ claimed_at: new Date().toISOString() })
                .eq('id', unlinkedClient.id);
            } catch (updateError) {
              console.error('❌ [CLAIM] Failed to update claimed_at:', updateError);
            }

            // Entering claim mode for client: set transient claim gate
            try {
              localStorage.setItem('claim_in_progress','1');
              claimDiag.log('claim gate SET (unlinked client)');
            } catch {}

            setClaimStatus({
              status: 'password_setup',
              message: 'Configure sua senha para finalizar',
              clientData: {
                name: unlinkedClient.name,
                email: unlinkedClient.email,
                id: unlinkedClient.id
              }
            });
          } else {
            throw new Error(linkResult?.error || 'Falha na vinculação manual');
          }
        } else {
          console.log('⚠️ [CLAIM] No admin-created client found for this email');
          setClaimStatus({
            status: 'no_client',
            message: 'Nenhuma conta encontrada para reivindicação'
          });
        }
      }
    } catch (error: any) {
      console.error('❌ [CLAIM] Error during claim process:', error);
      setClaimStatus({
        status: 'error',
        message: error.message || 'Erro ao processar reivindicação da conta'
      });
      toast.error('Erro ao processar reivindicação da conta');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      claimDiag.log('password mismatch - early return');
      (window as any).CLAIM_DIAG?.push({ step: 'early_return', reason: 'password_mismatch' });
      return;
    }

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      claimDiag.log('password too short - early return');
      (window as any).CLAIM_DIAG?.push({ step: 'early_return', reason: 'password_too_short' });
      return;
    }

    setIsSettingPassword(true);
    setPasswordError('');

    try {
      claimDiag.log('updateUser START');
      (window as any).CLAIM_DIAG?.push({ step: 'update_user_start' });
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      claimDiag.log('updateUser DONE', { ok: !updateError, error: updateError?.message });
      (window as any).CLAIM_DIAG?.push({
        step: 'update_user_done',
        ok: !updateError,
        error: updateError?.message
      });

      if (updateError) {
        if (updateError.message.includes('session_not_found')) {
          setPasswordError('Sessão expirada. Clique no link do email novamente.');
        } else if (updateError.message.includes('weak_password')) {
          setPasswordError('Senha muito fraca. Use pelo menos 6 caracteres.');
        } else {
          setPasswordError(updateError.message || 'Erro ao definir senha');
        }
        claimDiag.log('updateUser error - early return');
        (window as any).CLAIM_DIAG?.push({ step: 'early_return', reason: 'update_user_error' });
        return;
      }

      // Success - show toast and redirect
      toast.success('Senha definida com sucesso!');
      claimDiag.log('password set success - preparing redirect');
      
      // Clean hash immediately to prevent re-triggering claim mode
      if (typeof window !== 'undefined') {
        claimDiag.log('cleaning hash after password update');
        (window as any).CLAIM_DIAG?.push({ step: 'hash_cleaned', when: 'after_password_update' });
        window.history.replaceState(null, '', window.location.pathname);

        // Clear claim gate as password was successfully set
        try {
          localStorage.removeItem('claim_in_progress');
          claimDiag.log('claim gate CLEARED');
        } catch {}
      }
      
      // Immediate redirect
      claimDiag.log('calling safeNavigate (immediate)');
      safeNavigate();
      
      // Fallback after 1.5s if auth event doesn't fire
      setTimeout(() => {
        claimDiag.log('calling safeNavigate (fallback)');
        safeNavigate();
        
        // Generate summary after fallback
        setTimeout(() => generateClaimSummary(), 100);
      }, 1500);
      
    } catch (error: any) {
      claimDiag.log('unexpected error:', error);
      (window as any).CLAIM_DIAG?.push({ step: 'unexpected_error', error: String(error) });
      setPasswordError('Erro inesperado ao definir senha');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleContinue = () => {
    // Navigate to the main app or dashboard
    navigate('/appointments');
  };

  const handleRetry = () => {
    setClaimStatus({
      status: 'loading',
      message: 'Tentando novamente...'
    });
    checkClaimStatus();
  };

  const getStatusIcon = () => {
    switch (claimStatus.status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'password_setup':
        return <img src="/vettale-logo-azul.svg" alt="Vettale" className="h-8 w-auto" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
      case 'no_client':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (claimStatus.status) {
      case 'loading':
        return 'text-blue-600';
      case 'password_setup':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'no_client':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!user && claimStatus.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Autenticando...
                </h3>
                <p className="text-gray-600 mt-2">
                  Verificando suas credenciais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-xl ${getStatusColor()}`}>
            {claimStatus.status === 'loading' && 'Processando sua conta...'}
            {claimStatus.status === 'password_setup' && 'Bem-vindo ao Vettale!'}
            {claimStatus.status === 'success' && 'Bem-vindo ao Vettale!'}
            {claimStatus.status === 'error' && 'Erro na Reivindicação'}
            {claimStatus.status === 'no_client' && 'Conta não encontrada'}
          </CardTitle>
          <CardDescription>
            {claimStatus.message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {claimStatus.status === 'password_setup' && claimStatus.clientData && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Nome:</span> {claimStatus.clientData.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Email:</span> {claimStatus.clientData.email}
                  </p>
                </div>
              </div>

              {passwordError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {passwordError}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua senha"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSettingPassword || !password || !confirmPassword}
                  size="lg"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    'Definir Senha'
                  )}
                </Button>
              </form>
            </>
          )}

          {claimStatus.status === 'success' && claimStatus.clientData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Nome:</span> {claimStatus.clientData.name}
                </p>
                <p className="text-sm text-green-800">
                  <span className="font-medium">Email:</span> {claimStatus.clientData.email}
                </p>
              </div>
            </div>
          )}

          {claimStatus.status === 'success' && (
            <Button 
              onClick={handleContinue} 
              className="w-full"
              size="lg"
            >
              Continuar para o App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {(claimStatus.status === 'error' || claimStatus.status === 'no_client') && (
            <div className="space-y-3">
              <Button 
                onClick={handleRetry} 
                variant="outline"
                className="w-full"
              >
                Tentar Novamente
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Se o problema persistir, entre em contato com o suporte
              </p>
            </div>
          )}

          {claimStatus.status === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Isso pode levar alguns segundos...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Claim;
