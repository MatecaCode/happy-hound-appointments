import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { resendConfirmation } from '@/integrations/supabase/resendConfirmation';
import { toast } from 'sonner';

const AuthExpired = () => {
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) return;
    if (cooldown > 0) return;
    try {
      setIsLoading(true);
      await resendConfirmation(email);
      toast.success('E-mail reenviado. Verifique sua caixa de entrada e spam.');
      setCooldown(30);
    } catch (err: any) {
      console.error('[RESEND]', err);
      toast.error(err?.message || 'Falha ao reenviar e-mail');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-[420px]">
          <CardHeader>
            <CardTitle>Link expirado</CardTitle>
            <CardDescription>
              Seu link de confirmação expirou ou é inválido. Reenvie o e-mail abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <label className="text-sm" htmlFor="email">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleResend} disabled={isLoading || cooldown > 0 || !email} className="w-full">
              {isLoading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Reenviar e-mail de confirmação'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default AuthExpired;


