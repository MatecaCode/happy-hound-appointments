
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
      // Check clients table first
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (clientData) {
        setProfile(clientData);
        setUserRole('client');
        setName(clientData.name || '');
        setPhone(clientData.phone || '');
        return;
      }
      
      // Check groomers table
      const { data: groomerData } = await supabase
        .from('groomers')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (groomerData) {
        setProfile(groomerData);
        setUserRole('groomer');
        setName(groomerData.name || '');
        setPhone(groomerData.phone || '');
        return;
      }
      
      // Check veterinarians table
      const { data: vetData } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (vetData) {
        setProfile(vetData);
        setUserRole('vet');
        setName(vetData.name || '');
        setPhone(vetData.phone || '');
        return;
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const updateData = {
        name,
        phone,
        updated_at: new Date().toISOString()
      };

      let error;
      if (userRole === 'client') {
        const result = await supabase
          .from('clients')
          .update(updateData)
          .eq('user_id', user.id);
        error = result.error;
      } else if (userRole === 'groomer') {
        const result = await supabase
          .from('groomers')
          .update(updateData)
          .eq('user_id', user.id);
        error = result.error;
      } else if (userRole === 'vet') {
        const result = await supabase
          .from('veterinarians')
          .update(updateData)
          .eq('user_id', user.id);
        error = result.error;
      }

      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
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
              Atualize suas informações pessoais aqui
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
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
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
