
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

type AccountType = 'cliente' | 'staff' | 'admin';

interface StaffCapabilities {
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
}

interface RegistrationStatus {
  isProcessing: boolean;
  step: string;
  error: string | null;
  retryCount: number;
}

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('cliente');
  const [staffCapabilities, setStaffCapabilities] = useState<StaffCapabilities>({
    can_bathe: false,
    can_groom: false,
    can_vet: false,
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    isProcessing: false,
    step: '',
    error: null,
    retryCount: 0,
  });
  
  const { signUp, user, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const suggestGroomerRole = location.state?.suggestGroomerRole;
  
  useEffect(() => {
    if (suggestGroomerRole) {
      setAccountType('staff');
      setStaffCapabilities(prev => ({ ...prev, can_groom: true }));
    }
  }, [suggestGroomerRole]);
  
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Clear auth errors when component mounts
  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  // Fetch locations for staff selection
  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (!error && data) {
        setLocations(data);
      }
    };
    
    if (accountType === 'staff') {
      fetchLocations();
    }
  }, [accountType]);

  const requiresCode = accountType === 'staff' || accountType === 'admin';
  
  const validateAndUseRegistrationCode = async (retryCount: number = 0): Promise<boolean> => {
    if (!requiresCode) return true;
    
    try {
      setRegistrationStatus(prev => ({
        ...prev,
        isProcessing: true,
        step: 'Validando código de registro...',
        error: null,
        retryCount,
      }));

      let isValid = false;
      
      if (accountType === 'admin') {
        // For admin, we only validate the code exists and is unused
        // The actual processing will happen after email confirmation
        const { data: adminValid, error: adminError } = await supabase.rpc('validate_admin_registration_code', {
          code_value: registrationCode
        });
        
        if (adminError) {
          console.error('Error validating admin code:', adminError);
          throw new Error(`Erro ao validar código de administrador: ${adminError.message}`);
        }
        
        isValid = adminValid;
        
        if (!isValid) {
          throw new Error('Código de administrador inválido ou já utilizado.');
        }
      } else if (accountType === 'staff') {
        // For staff, validate the code exists and is unused
        const { data: staffValid, error: staffError } = await supabase.rpc('validate_staff_registration_code', {
          code_value: registrationCode,
          account_type_value: 'staff'
        });
        
        if (staffError) {
          console.error('Error validating staff code:', staffError);
          throw new Error(`Erro ao validar código de funcionário: ${staffError.message}`);
        }
        
        isValid = staffValid;
        
        if (!isValid) {
          throw new Error('Código de funcionário inválido ou já utilizado.');
        }
      }

      setRegistrationStatus(prev => ({
        ...prev,
        isProcessing: false,
        step: 'Código validado com sucesso',
        error: null,
      }));

      return true;
    } catch (error: any) {
      console.error('Code validation error:', error);
      
      setRegistrationStatus(prev => ({
        ...prev,
        isProcessing: false,
        step: 'Falha na validação',
        error: error.message,
        retryCount: prev.retryCount + 1,
      }));

      // Retry logic for network errors
      if (retryCount < 3 && (error.message?.includes('network') || error.message?.includes('timeout'))) {
        console.log(`Retrying code validation (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return validateAndUseRegistrationCode(retryCount + 1);
      }

      return false;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearAuthError();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (requiresCode && !registrationCode) {
      const typeText = accountType === 'admin' ? 'administradores' : 'funcionários';
      setError(`Código de registro é obrigatório para ${typeText}.`);
      return;
    }

    if (accountType === 'staff') {
      const hasAtLeastOneCapability = staffCapabilities.can_bathe || staffCapabilities.can_groom || staffCapabilities.can_vet;
      if (!hasAtLeastOneCapability) {
        setError('Selecione pelo menos uma função para funcionários.');
        return;
      }
    }
    
    setIsLoading(true);
    setRegistrationStatus({
      isProcessing: true,
      step: 'Iniciando registro...',
      error: null,
      retryCount: 0,
    });
    
    try {
      // Validate registration code if required
      if (requiresCode) {
        const isValid = await validateAndUseRegistrationCode();
        if (!isValid) {
          setIsLoading(false);
          setError(registrationStatus.error || 'Erro ao validar código de registro.');
          return;
        }
      }
      
      setRegistrationStatus(prev => ({
        ...prev,
        step: 'Criando conta...',
      }));

      // Create the user account with appropriate registration code in metadata
      const signUpData: any = {
        name,
      };

      // Use different registration code fields based on account type
      if (accountType === 'admin') {
        signUpData.admin_registration_code = registrationCode; // New admin system
      } else if (accountType === 'staff') {
        signUpData.registration_code = registrationCode; // Existing staff system
        signUpData.can_groom = staffCapabilities.can_groom;
        signUpData.can_vet = staffCapabilities.can_vet;
        signUpData.can_bathe = staffCapabilities.can_bathe;
        signUpData.location_id = selectedLocation === 'none' ? null : selectedLocation;
        
        // Debug logging for location handling
        console.log('📍 Staff registration location data:', {
          selectedLocation,
          finalLocationId: signUpData.location_id,
          hasLocation: !!signUpData.location_id
        });
      }
      // Client accounts don't need registration codes

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: signUpData,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      setRegistrationStatus(prev => ({
        ...prev,
        step: 'Conta criada com sucesso!',
        isProcessing: false,
      }));

      // For staff accounts: Role assignment and profile creation will be handled automatically by the trigger
      // For admin accounts: Process immediately after signup since trigger doesn't fire with supabase.auth.signUp()
      if (accountType === 'admin' && authData.user) {
        setRegistrationStatus(prev => ({
          ...prev,
          step: 'Processando registro de administrador...',
          isProcessing: true,
        }));

        try {
          console.log('🔄 Processing immediate admin registration for user:', authData.user.id);
          
          const { data: adminResult, error: adminError } = await supabase.rpc('process_immediate_admin_registration', {
            p_user_id: authData.user.id
          });

          if (adminError) {
            console.error('❌ Admin registration error:', adminError);
            throw new Error(`Erro ao processar registro de administrador: ${adminError.message}`);
          }

          if (adminResult && adminResult.success) {
            console.log('✅ Admin registration successful:', adminResult);
            setRegistrationStatus(prev => ({
              ...prev,
              step: 'Registro de administrador concluído!',
              isProcessing: false,
            }));
          } else {
            console.error('❌ Admin registration failed:', adminResult);
            throw new Error(adminResult?.error || 'Erro desconhecido no registro de administrador');
          }
        } catch (adminError: any) {
          console.error('❌ Admin registration error:', adminError);
          setRegistrationStatus(prev => ({
            ...prev,
            step: 'Erro no registro de administrador',
            error: adminError.message,
            isProcessing: false,
          }));
          // Don't throw here - user was created successfully, just admin processing failed
        }
      }
      
      // For staff accounts: Process immediately after signup
      if (accountType === 'staff' && authData.user) {
        setRegistrationStatus(prev => ({
          ...prev,
          step: 'Processando registro de funcionário...',
          isProcessing: true,
        }));

        try {
          console.log('🔄 Processing immediate staff registration for user:', authData.user.id);
          
          // Add a small delay to ensure user metadata is fully saved
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: staffResult, error: staffError } = await supabase.rpc('process_immediate_staff_registration', {
            p_user_id: authData.user.id
          });

          if (staffError) {
            console.error('❌ Staff registration error:', staffError);
            throw new Error(`Erro ao processar registro de funcionário: ${staffError.message}`);
          }

          if (staffResult && staffResult.success) {
            console.log('✅ Staff registration successful:', staffResult);
            setRegistrationStatus(prev => ({
              ...prev,
              step: 'Registro de funcionário concluído!',
              isProcessing: false,
            }));
          } else {
            console.error('❌ Staff registration failed:', staffResult);
            throw new Error(staffResult?.error || 'Erro desconhecido no registro de funcionário');
          }
        } catch (staffError: any) {
          console.error('❌ Staff registration error:', staffError);
          setRegistrationStatus(prev => ({
            ...prev,
            step: 'Erro no registro de funcionário',
            error: staffError.message,
            isProcessing: false,
          }));
          // Don't throw here - user was created successfully, just staff processing failed
        }
      }
      
      // Show success message based on account type
      if (accountType === 'staff') {
        const capabilities = [];
        if (staffCapabilities.can_bathe) capabilities.push('banho');
        if (staffCapabilities.can_groom) capabilities.push('tosa');
        if (staffCapabilities.can_vet) capabilities.push('veterinário');
        
        toast.success(`Registro realizado! Funções: ${capabilities.join(', ')}. Perfil e disponibilidade criados automaticamente.`);
      } else if (accountType === 'admin') {
        toast.success('Registro de administrador realizado! Verifique seu email para confirmar a conta.');
      } else {
        toast.success('Registro realizado! Verifique seu email para confirmar a conta.');
      }
      
      // Clear any previous errors
      setError(null);
      setRegistrationStatus({
        isProcessing: false,
        step: '',
        error: null,
        retryCount: 0,
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      setRegistrationStatus(prev => ({
        ...prev,
        isProcessing: false,
        step: 'Erro no registro',
        error: error.message,
      }));
      
      // Provide specific error messages for common auth errors
      if (error.message?.includes('User already registered')) {
        setError('Este email já está registrado. Tente fazer login ou use outro email.');
      } else if (error.message?.includes('Invalid email')) {
        setError('Email inválido. Verifique o formato do email.');
      } else if (error.message?.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.message?.includes('Signup is disabled')) {
        setError('Registros estão temporariamente desabilitados.');
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(error.message || 'Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffCapabilityChange = (capability: keyof StaffCapabilities, checked: boolean) => {
    setStaffCapabilities(prev => ({
      ...prev,
      [capability]: checked
    }));
  };
  
  return (
    <Layout>
      <div className="flex justify-center items-center py-12">
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para se registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Registration Status Display */}
            {registrationStatus.isProcessing && (
              <Alert className="mb-4">
                <AlertDescription>
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>{registrationStatus.step}</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {registrationStatus.error && !registrationStatus.isProcessing && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>{registrationStatus.error}</span>
                    {registrationStatus.retryCount < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubmit(new Event('submit') as any)}
                        className="ml-2"
                      >
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Tipo de Conta</Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(value: AccountType) => setAccountType(value)}
                    className="grid grid-cols-3 gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cliente" id="cliente" />
                      <Label htmlFor="cliente">Cliente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="staff" id="staff" />
                      <Label htmlFor="staff">Staff</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin">Admin</Label>
                    </div>
                  </RadioGroup>
                </div>

                {accountType === 'staff' && (
                  <>
                    <div className="grid gap-3">
                      <Label>Funções (selecione todas que se aplicam)</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="can_bathe"
                            checked={staffCapabilities.can_bathe}
                            onCheckedChange={(checked) => handleStaffCapabilityChange('can_bathe', checked as boolean)}
                          />
                          <Label htmlFor="can_bathe">Você vai dar banhos?</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="can_groom"
                            checked={staffCapabilities.can_groom}
                            onCheckedChange={(checked) => handleStaffCapabilityChange('can_groom', checked as boolean)}
                          />
                          <Label htmlFor="can_groom">Você vai trabalhar na tosa?</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="can_vet"
                            checked={staffCapabilities.can_vet}
                            onCheckedChange={(checked) => handleStaffCapabilityChange('can_vet', checked as boolean)}
                          />
                          <Label htmlFor="can_vet">Você vai performar como veterinário?</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Local de Trabalho (opcional)</Label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um local (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum local específico</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {(accountType === 'staff' || accountType === 'admin') && (
                  <Alert className="mb-2">
                    <AlertDescription>
                      {accountType === 'staff' && (
                        <>
                          Ao se cadastrar como staff, você terá acesso ao calendário de agendamentos e será listado como 
                          profissional disponível para os clientes com base nas funções selecionadas.
                        </>
                      )}
                      {accountType === 'admin' && (
                        <>
                          Ao se cadastrar como administrador, você terá acesso completo ao sistema, incluindo o painel administrativo 
                          para gerenciar agendamentos, usuários e configurações.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {requiresCode && (
                  <div className="grid gap-2">
                    <Label htmlFor="registrationCode">Código de Registro</Label>
                    <Input
                      id="registrationCode"
                      type="text"
                      placeholder={`Insira o código de registro de ${
                        accountType === 'admin' ? 'administrador' : 'funcionário'
                      }`}
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Código fornecido pelo pet shop para registro de {accountType === 'admin' ? 'administradores' : 'funcionários'}
                    </p>
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="text-center mt-2">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Faça Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Register;
