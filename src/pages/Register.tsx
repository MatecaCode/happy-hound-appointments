
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const { signUp, signInWithGoogle } = useAuth();
  
  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError('As senhas não correspondem');
      return false;
    }
    
    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    setPasswordError('');
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await signUp(email, password, name);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="py-16 px-6">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Criar uma Conta</CardTitle>
              <CardDescription className="text-center">
                Registre-se para gerenciar seus agendamentos de tosa
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signInWithGoogle()}
                disabled={isSubmitting}
              >
                <Github className="mr-2 h-4 w-4" />
                Registrar com Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
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
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                </div>
                
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  Criar Conta
                </Button>
              </form>
            </CardContent>
            
            <CardFooter>
              <p className="text-sm text-center w-full text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Entre
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
