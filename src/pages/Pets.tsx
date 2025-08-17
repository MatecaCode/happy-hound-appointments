
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit, PawPrint, Heart, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  breed?: string;
  age?: string;
  size?: string;
  weight?: number;
  gender?: string;
  notes?: string;
}

const Pets = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const fetchPets = async () => {
    console.log('🔍 fetchPets called:', { 
      user: user?.id, 
      authLoading,
      isLoading 
    });

    if (authLoading) {
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
      console.log('📡 Making pets fetch query...');
      
      // Get client_id first
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !clientData) {
        console.log('No client record found for user:', user.id);
        setPets([]);
        return;
      }

      // Now get pets using client_id with breed information
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          breeds(name)
        `)
        .eq('client_id', clientData.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      console.log('🐶 Fetch pets result:', { 
        data, 
        error, 
        userCount: data?.length || 0,
        clientId: clientData.id
      });

      if (error) {
        console.error('❌ Error fetching pets:', error);
        toast.error('Erro ao carregar pets: ' + error.message);
        return;
      }

      // Transform data to include breed name from join
      const transformedPets = data?.map(pet => ({
        ...pet,
        breed: pet.breeds?.name || pet.breed // Use joined breed name or fallback to existing breed field
      })) || [];
      
      setPets(transformedPets);
      console.log('✅ Pets loaded successfully:', transformedPets?.length || 0, 'pets');
      
    } catch (error: any) {
      console.error('💥 Unexpected error fetching pets:', error);
      if (error.message === 'Fetch timeout') {
        toast.error('Timeout ao carregar pets. Tente novamente.');
      } else {
        toast.error('Erro inesperado ao carregar pets');
      }
    } finally {
      console.log('🔄 Setting fetchPets isLoading to false');
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
        .eq('id', petId);

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
    console.log('🔄 useEffect triggered:', { user: user?.id, authLoading });
    fetchPets();
  }, [user, authLoading]);

  useEffect(() => {
    // Animate in the content
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEditPet = (pet: Pet) => {
    navigate(`/pets/edit/${pet.id}`);
  };

  const handleAddPet = () => {
    navigate('/pets/new');
  };

  console.log('🎨 Pets page render:', { 
    user: user?.id, 
    authLoading, 
    isLoading, 
    petsCount: pets.length
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-[#6BAEDB] border-t-[#2B70B2] mx-auto"></div>
            <p className="text-lg font-medium text-[#1A4670]">Verificando autenticação...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user && !authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A4670]">Acesso Restrito</h2>
            <p className="text-[#334155]">Você precisa estar logado para gerenciar seus pets.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9] py-8">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#6BAEDB] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#2B70B2] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-40 left-40 w-60 h-60 bg-[#8FBF9F] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header Section */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-full mb-6 shadow-lg">
                <PawPrint className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] bg-clip-text text-transparent mb-3">
                Meus Pets
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                Gerencie seus companheiros peludos e mantenha suas informações sempre atualizadas
              </p>
              <div className="flex justify-center mt-4">
                <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                  <Heart className="w-4 h-4 text-[#2B70B2]" />
                  <span className="text-sm text-[#334155]">
                    {isLoading ? 'Carregando...' : `${pets.length} pet(s) encontrado(s)`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className={`flex justify-center mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Button 
              onClick={handleAddPet} 
              className="flex items-center gap-3 bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] hover:from-[#1A4670] hover:to-[#2B70B2] text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <PlusCircle className="h-5 w-5" />
              Adicionar Pet
            </Button>
          </div>

          {/* Content Section */}
          <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#6BAEDB] border-t-[#2B70B2] mx-auto mb-6"></div>
                <p className="text-lg font-medium text-[#1A4670]">Carregando pets...</p>
              </div>
            ) : pets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pets.map((pet, index) => (
                  <Card 
                    key={pet.id} 
                    className={`group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg transform hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${500 + index * 100}ms` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#8FBF9F] to-[#6BAEDB] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <PawPrint className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold text-[#1A4670]">{pet.name}</CardTitle>
                            <CardDescription className="text-[#334155]">Seu companheiro peludo</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPet(pet)}
                            className="bg-white hover:bg-[#E7F0FF] border-[#6BAEDB] hover:border-[#2B70B2] text-[#2B70B2] hover:text-[#1A4670] transition-all duration-200"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePet(pet.id)}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pet.breed && (
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] text-white border-0">
                            {pet.breed}
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-2">
                        {pet.age && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-[#334155] font-medium">Idade:</span>
                            <span className="text-[#1A4670]">{pet.age}</span>
                          </div>
                        )}
                        {pet.size && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-[#334155] font-medium">Porte:</span>
                            <span className="text-[#1A4670]">{pet.size}</span>
                          </div>
                        )}
                        {pet.weight && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-[#334155] font-medium">Peso:</span>
                            <span className="text-[#1A4670]">{pet.weight}kg</span>
                          </div>
                        )}
                        {pet.gender && (
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-[#334155] font-medium">Gênero:</span>
                            <span className="text-[#1A4670]">{pet.gender}</span>
                          </div>
                        )}
                      </div>
                      {pet.notes && (
                        <div className="pt-2 border-t border-[#E7F0FF]">
                          <p className="text-sm text-[#334155] italic">"{pet.notes}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="flex items-center justify-center py-20 text-center">
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#8FBF9F] to-[#6BAEDB] rounded-full flex items-center justify-center mx-auto">
                      <PawPrint className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-[#1A4670]">Nenhum Pet Cadastrado</h3>
                      <p className="text-[#334155] max-w-md mx-auto">
                        Adicione seu primeiro pet para começar a agendar serviços e cuidar da saúde do seu companheiro
                      </p>
                    </div>
                    <Button 
                      onClick={handleAddPet}
                      className="bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] hover:from-[#1A4670] hover:to-[#2B70B2] text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Adicionar Primeiro Pet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bottom Spacing */}
          <div className="h-16"></div>
        </div>
      </div>
    </Layout>
  );
};

export default Pets;
