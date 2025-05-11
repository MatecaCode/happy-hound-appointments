
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'client' | 'groomer' | 'vet'>('client');
  const [registrationCode, setRegistrationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeRequired, setCodeRequired] = useState(false);
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const suggestGroomerRole = location.state?.suggestGroomerRole;
  
  useEffect(() => {
    if (suggestGroomerRole) {
      setRole('groomer');
      setCodeRequired(true);
    }
  }, [suggestGroomerRole]);
  
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Update code requirement when role changes
  useEffect(() => {
    setCodeRequired(role === 'groomer' || role === 'vet');
  }, [role]);
  
  const validateRegistrationCode = async () => {
    if (!codeRequired) return true;
    
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('code', registrationCode)
        .eq('role', role)
        .eq('is_used', false)
        .single();
      
      if (error || !data) {
        setError(`Código de registro inválido para ${role === 'groomer' ? 'tosador' : 'veterinário'}.`);
        return false;
      }
      
      // Mark code as used
      await supabase
        .from('registration_codes')
        .update({
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', data.id);
      
      return true;
    } catch (error) {
      setError('Erro ao validar código de registro.');
      return false;
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
    
    if (codeRequired && !registrationCode) {
      setError(`Código de registro é obrigatório para ${role === 'groomer' ? 'tosadores' : 'veterinários'}.`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate registration code if required
      if (codeRequired) {
        const isValid = await validateRegistrationCode();
        if (!isValid) {
          setIsLoading(false);
          return;
        }
      }
      
      await signUp(email, password, name, role);
      toast.success('Registro realizado! Verifique seu email para confirmar a conta.');
      // Signup function will navigate to login
    } catch (error: any) {
      setError(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="flex justify-center items-center py-12">
        <Card className="w-[450px]">
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
                    value={role}
                    onValueChange={(value: 'client' | 'groomer' | 'vet') => setRole(value)}
                    className="grid grid-cols-3 gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client">Cliente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="groomer" id="groomer" />
                      <Label htmlFor="groomer">Tosador</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vet" id="vet" />
                      <Label htmlFor="vet">Veterinário</Label>
                    </div>
                  </RadioGroup>
                  
                  {role !== 'client' && (
                    <Alert className="mt-2">
                      <AlertDescription>
                        Ao se cadastrar como {role === 'groomer' ? 'tosador' : 'veterinário'}, 
                        você terá acesso ao calendário de agendamentos e será listado como 
                        profissional disponível para os clientes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {codeRequired && (
                  <div className="grid gap-2">
                    <Label htmlFor="registrationCode">Código de Registro</Label>
                    <Input
                      id="registrationCode"
                      type="text"
                      placeholder={`Insira o código de registro de ${role === 'groomer' ? 'tosador' : 'veterinário'}`}
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Código fornecido pelo pet shop para registro de profissionais
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
