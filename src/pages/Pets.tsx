
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PetForm from '@/components/PetForm';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: string;
}

const Pets = () => {
  const { user, loading: authLoading } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogPet, setDialogPet] = useState<Pet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  // Add timeout for auth loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.log('⏰ Auth loading timeout - proceeding anyway');
        setAuthTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [authLoading]);

  const fetchPets = async () => {
    console.log('🔍 fetchPets called:', { 
      user: user?.id, 
      authLoading,
      authTimeout,
      isLoading 
    });

    if (authLoading && !authTimeout) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('👤 No user found, clearing pets');
      setPets([]);
      setIsLoading(false);
      return;
    }

    console.log('🔍 Fetching pets for user:', user.id);
    setIsLoading(true);
    
    try {
      console.log('📡 Making database query...');
      
      // First, let's check our auth state
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Auth session check:', { 
        user: sessionData.session?.user?.id, 
        error: sessionError 
      });
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('🐶 Fetch pets result:', { 
        data, 
        error, 
        userCount: data?.length || 0,
        userId: user.id,
        query: `SELECT * FROM pets WHERE user_id = '${user.id}'`
      });

      if (error) {
        console.error('❌ Error fetching pets:', error);
        toast.error('Erro ao carregar pets: ' + error.message);
        return;
      }

      setPets(data || []);
      console.log('✅ Pets loaded successfully:', data?.length || 0, 'pets');
      
      // Let's also check if there are any pets in the database for this user
      console.log('🔍 Raw pets data for debugging:', JSON.stringify(data, null, 2));
      
    } catch (error: any) {
      console.error('💥 Unexpected error fetching pets:', error);
      toast.error('Erro inesperado ao carregar pets');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePet = async (petId: string) => {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;

    console.log('🗑️ Deleting pet:', petId, 'for user:', user?.id);
    
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Error deleting pet:', error);
        toast.error('Erro ao remover pet: ' + error.message);
        return;
      }

      console.log('✅ Pet deleted successfully');
      toast.success('Pet removido com sucesso!');
      await fetchPets();
    } catch (error: any) {
      console.error('💥 Unexpected error deleting pet:', error);
      toast.error('Erro inesperado ao remover pet');
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { user: user?.id, authLoading, authTimeout });
    fetchPets();
  }, [user, authLoading, authTimeout]);

  const openDialog = (pet?: Pet) => {
    console.log('🔓 Opening dialog for pet:', pet?.name || 'new pet');
    setDialogPet(pet ?? null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    console.log('🔒 Closing dialog');
    setDialogPet(null);
    setIsDialogOpen(false);
  };

  const handlePetFormSuccess = () => {
    console.log('✅ Pet form success callback');
    fetchPets();
    closeDialog();
  };

  console.log('🎨 Pets page render:', { 
    user: user?.id, 
    authLoading, 
    authTimeout,
    isLoading, 
    petsCount: pets.length,
    isDialogOpen 
  });

  // Show loading only for a short time, then proceed
  if (authLoading && !authTimeout) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <p>Verificando autenticação...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Se demorar muito, recarregue a página
          </p>
        </div>
      </Layout>
    );
  }

  if (!user && !authLoading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center">
          <p>Você precisa estar logado para gerenciar seus pets.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meus Pets</h1>
            <p className="text-muted-foreground">
              {isLoading ? 'Carregando...' : `${pets.length} pet(s) encontrado(s)`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Usuário: {user?.id || 'Não identificado'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Adicionar Pet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogPet ? 'Editar Pet' : 'Adicionar Novo Pet'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do seu pet
                </DialogDescription>
              </DialogHeader>
              <PetForm
                userId={user?.id || ''}
                initialPet={dialogPet ?? undefined}
                editing={!!dialogPet}
                onSuccess={handlePetFormSuccess}
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                >
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p>Carregando pets...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Usuário: {user?.id || 'Não identificado'}
            </p>
          </div>
        ) : pets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <Card key={pet.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{pet.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(pet)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePet(pet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pet.breed && (
                    <p className="text-muted-foreground">
                      <strong>Raça:</strong> {pet.breed}
                    </p>
                  )}
                  {pet.age && (
                    <p className="text-muted-foreground">
                      <strong>Idade:</strong> {pet.age}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-16 text-center">
              <div>
                <PlusCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Nenhum Pet Cadastrado</h3>
                <p className="text-muted-foreground mb-6">
                  Adicione seu primeiro pet para começar a agendar serviços
                </p>
                <Button onClick={() => openDialog()}>
                  Adicionar Primeiro Pet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Pets;
