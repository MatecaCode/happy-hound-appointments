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
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refactored openDialog/closeDialog to use minimal state
  const [dialogPet, setDialogPet] = useState<Pet | null>(null);

  // Fetch logic remains the same
  const fetchPets = async () => {
    if (!user) {
      setPets([]);
      return;
    }
    try {
      console.log('🔍 Fetching pets for user:', user.id);
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info('Nenhum pet encontrado para sua conta.');
      }
      setPets(data || []);
      console.log('🐶 Pets fetched:', data);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  };

  const deletePet = async (petId: string) => {
    if (!confirm('Tem certeza que deseja remover este pet?')) return;

    try {
      console.log('❌ Deleting pet:', petId, 'for user:', user?.id);
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Pet removido com sucesso!');
      await fetchPets();
    } catch (error: any) {
      console.error('Error deleting pet:', error);
      toast.error('Erro ao remover pet');
    }
  };

  useEffect(() => {
    if (user) {
      fetchPets();
    }
  }, [user]);

  // For dialog open state:
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = (pet?: Pet) => {
    setDialogPet(pet ?? null);
    setIsDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogPet(null);
    setIsDialogOpen(false);
  };

  if (!user) {
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
          <h1 className="text-3xl font-bold">Meus Pets</h1>
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
                userId={user.id}
                initialPet={dialogPet ?? undefined}
                editing={!!dialogPet}
                onSuccess={() => {
                  fetchPets();
                  closeDialog();
                }}
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

        {pets.length > 0 ? (
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
