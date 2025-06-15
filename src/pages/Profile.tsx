import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile = () => {
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('client');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      // Only look in provider_profiles for providers, or fallback for clients
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (providerProfile) {
        setProfile(providerProfile);
        setUserRole(providerProfile.type);
        setName('');  // No name in schema
        setPhone(''); // No phone in schema
        return;
      }
      // No profile, must be client
      setProfile(null);
      setUserRole('client');
      setName('');
      setPhone('');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // Just no-op; can't update provider_profiles anyway for name/phone
    toast.info('Atualização de perfil indisponível nesta versão.');
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <p>Você precisa estar logado para ver seu perfil.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Informações pessoais não disponíveis para edição nesta versão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  O email não pode ser alterado
                </p>
              </div>
              
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  disabled
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  disabled
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label>Tipo de Conta</Label>
                <Input
                  value={
                    userRole === 'client' ? 'Cliente' :
                    userRole === 'groomer' ? 'Tosador' :
                    userRole === 'vet' ? 'Veterinário' : userRole
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <Button type="submit" disabled>
                Salvando...
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Gerenciar configurações da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={signOut}
            >
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
