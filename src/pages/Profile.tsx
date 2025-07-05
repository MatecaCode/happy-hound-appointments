
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      // Get user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        return;
      }

      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando perfil...</p>
        </div>
      </Layout>
    );
  }

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Seus dados de conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Conta</label>
                <div className="mt-1">
                  {userRole ? (
                    <Badge variant="secondary">
                      {userRole === 'client' ? 'Cliente' : 
                       userRole === 'groomer' ? 'Tosador' : 
                       userRole === 'vet' ? 'Veterinário' : 
                       userRole === 'admin' ? 'Administrador' : 
                       userRole}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Carregando...</Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                <p className="text-sm">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações da Conta</CardTitle>
              <CardDescription>Opções de personalização</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurações adicionais serão adicionadas em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
