
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

type AccountType = 'cliente' | 'staff' | 'admin';

interface StaffCapabilities {
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
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
  
  const { signUp, user } = useAuth();
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
  
  const validateAndUseRegistrationCode = async () => {
    if (!requiresCode) return true;
    
    try {
      const accountTypeValue = accountType; // 'admin' or 'staff'
      
      const { data: isValid, error: validateError } = await supabase.rpc('validate_staff_registration_code', {
        code_value: registrationCode,
        account_type_value: accountTypeValue
      });
      
      if (validateError) {
        console.error('Error validating code:', validateError);
        setError('Erro ao validar código de registro.');
        return false;
      }
      
      if (!isValid) {
        const typeText = accountType === 'admin' ? 'administrador' : 'funcionário';
        setError(`Código de registro inválido para ${typeText}.`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception during code validation:', error);
      setError('Erro ao validar código de registro.');
      return false;
    }
  };

  const markCodeAsUsed = async () => {
    if (!requiresCode) return;
    
    try {
      await supabase.rpc('mark_staff_code_as_used', {
        code_value: registrationCode
      });
    } catch (error) {
      console.error('Error marking code as used:', error);
    }
  };

  const createStaffProfile = async (userId: string) => {
    if (accountType !== 'staff') return;

    const staffData = {
      user_id: userId,
      name: name,
      email: email,
      location_id: selectedLocation || null,
      can_bathe: staffCapabilities.can_bathe,
      can_groom: staffCapabilities.can_groom,
      can_vet: staffCapabilities.can_vet,
      active: true
    };

    const { error } = await supabase
      .from('staff_profiles')
      .insert([staffData]);

    if (error) {
      console.error('Error creating staff profile:', error);
      throw new Error('Erro ao criar perfil de funcionário.');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
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
    
    try {
      // Validate registration code if required
      if (requiresCode) {
        const isValid = await validateAndUseRegistrationCode();
        if (!isValid) {
          setIsLoading(false);
          return;
        }
      }
      
      // Determine the role for the signUp function
      let userRole = 'client';
      if (accountType === 'admin') {
        userRole = 'admin';
      } else if (accountType === 'staff') {
        userRole = 'staff';
      }
      
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: userRole,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      // Create staff profile if needed
      if (accountType === 'staff' && authData.user) {
        await createStaffProfile(authData.user.id);
      }
      
      // Mark the code as used after successful signup
      if (requiresCode) {
        await markCodeAsUsed();
      }
      
      // Show success message based on account type
      if (accountType === 'staff') {
        const capabilities = [];
        if (staffCapabilities.can_bathe) capabilities.push('banho');
        if (staffCapabilities.can_groom) capabilities.push('tosa');
        if (staffCapabilities.can_vet) capabilities.push('veterinário');
        
        toast.success(`Registro realizado! Funções: ${capabilities.join(', ')}. Verifique seu email para confirmar a conta.`);
      } else if (accountType === 'admin') {
        toast.success('Registro de administrador realizado! Verifique seu email para confirmar a conta.');
      } else {
        toast.success('Registro realizado! Verifique seu email para confirmar a conta.');
      }
      
      navigate('/login');
    } catch (error: any) {
      setError(error.message || 'Erro ao criar conta.');
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
                          <SelectItem value="">Nenhum local específico</SelectItem>
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
