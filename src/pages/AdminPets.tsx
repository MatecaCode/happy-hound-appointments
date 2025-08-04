import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  PawPrint, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  User,
  Calendar,
  FileText,
  Cake,
  Dog,
  Cat,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  notes: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

const AdminPets = () => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [breedFilter, setBreedFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    age: '',
    client_id: '',
    notes: ''
  });

  // Load pets and clients
  useEffect(() => {
    fetchPets();
    fetchClients();
  }, []);

  const fetchPets = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 [ADMIN_PETS] Fetching pets with client info');
      
             const { data, error } = await supabase
         .from('pets')
         .select(`
           id,
           name,
           breed,
           age,
           notes,
           created_at,
           updated_at,
           client_id,
           clients:client_id (name, email)
         `)
         .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN_PETS] Supabase error:', error);
        throw error;
      }

      const petsWithClientInfo = data?.map(pet => ({
        ...pet,
        client_name: pet.clients?.name,
        client_email: pet.clients?.email
      })) || [];

      setPets(petsWithClientInfo);
      console.log('📊 [ADMIN_PETS] Pets loaded:', petsWithClientInfo);
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name');

      if (error) {
        console.error('❌ [ADMIN_PETS] Error fetching clients:', error);
        throw error;
      }

      setClients(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

     const filteredPets = pets.filter(pet => {
     const matchesSearch = 
       pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       pet.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
     
     const matchesClient = clientFilter === 'all' || pet.client_id === clientFilter;
     const matchesBreed = breedFilter === 'all' || pet.breed === breedFilter;
     
     return matchesSearch && matchesClient && matchesBreed;
   });

     const handleCreatePet = async () => {
     if (!formData.name || !formData.client_id) {
       toast.error('Nome e dono são obrigatórios');
       return;
     }

     try {
       const { data: petData, error: petError } = await supabase
         .from('pets')
         .insert({
           name: formData.name,
           breed: formData.breed,
           age: formData.age,
           notes: formData.notes,
           client_id: formData.client_id
         })
         .select()
         .single();

      if (petError) {
        console.error('❌ [ADMIN_PETS] Pet creation error:', petError);
        toast.error('Erro ao criar pet');
        return;
      }

      toast.success('Pet criado com sucesso');
      setIsCreateModalOpen(false);
      resetForm();
      fetchPets();
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error creating pet:', error);
      toast.error('Erro ao criar pet');
    }
  };

     const handleEditPet = async () => {
     if (!selectedPet || !formData.name) {
       toast.error('Nome é obrigatório');
       return;
     }

     try {
       const { error } = await supabase
         .from('pets')
         .update({
           name: formData.name,
           breed: formData.breed,
           age: formData.age,
           notes: formData.notes,
           client_id: formData.client_id
         })
         .eq('id', selectedPet.id);

      if (error) {
        console.error('❌ [ADMIN_PETS] Update error:', error);
        toast.error('Erro ao atualizar pet');
        return;
      }

      toast.success('Pet atualizado com sucesso');
      setIsEditModalOpen(false);
      setSelectedPet(null);
      resetForm();
      fetchPets();
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error updating pet:', error);
      toast.error('Erro ao atualizar pet');
    }
  };

  const handleDeletePet = async (petId: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) {
        console.error('❌ [ADMIN_PETS] Delete error:', error);
        toast.error('Erro ao deletar pet');
        return;
      }

      toast.success('Pet deletado com sucesso');
      fetchPets();
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error deleting pet:', error);
      toast.error('Erro ao deletar pet');
    }
  };

     const resetForm = () => {
     setFormData({
       name: '',
       breed: '',
       age: '',
       client_id: '',
       notes: ''
     });
   };

     const openEditModal = (pet: Pet) => {
     setSelectedPet(pet);
     setFormData({
       name: pet.name || '',
       breed: pet.breed || '',
       age: pet.age || '',
       client_id: pet.client_id || '',
       notes: pet.notes || ''
     });
     setIsEditModalOpen(true);
   };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

     const getAgeDisplay = (age: string) => {
     if (!age) return 'Idade não informada';
     return age;
   };

     const getBreedIcon = (breed: string) => {
     if (!breed) return <HelpCircle className="h-4 w-4" />;
     
     const breedLower = breed.toLowerCase();
     if (breedLower.includes('retriever') || breedLower.includes('collie') || breedLower.includes('shepherd')) {
       return <Dog className="h-4 w-4" />;
     } else if (breedLower.includes('siamese') || breedLower.includes('persian')) {
       return <Cat className="h-4 w-4" />;
     } else {
       return <HelpCircle className="h-4 w-4" />;
     }
   };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <PawPrint className="h-8 w-8" />
            🐾 Gerenciar Pets
          </h1>
          <p className="text-gray-600 mt-2">Gerencie todos os pets cadastrados no sistema</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome do pet, dono ou raça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por dono" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os donos</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

                         <Select value={breedFilter} onValueChange={setBreedFilter}>
               <SelectTrigger className="w-40">
                 <Filter className="h-4 w-4 mr-2" />
                 <SelectValue placeholder="Raça" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas as raças</SelectItem>
                 <SelectItem value="Golden Retriever">Golden Retriever</SelectItem>
                 <SelectItem value="Border Collie">Border Collie</SelectItem>
                 <SelectItem value="Chihuahua">Chihuahua</SelectItem>
               </SelectContent>
             </Select>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Pet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Pet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do pet"
                    />
                  </div>
                                     <div>
                     <Label htmlFor="age">Idade</Label>
                     <Input
                       id="age"
                       value={formData.age}
                       onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                       placeholder="Ex: 3 anos"
                     />
                   </div>
                  <div>
                    <Label htmlFor="breed">Raça</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="Ex: Golden Retriever"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="client">Dono *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o dono" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observações sobre o pet"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreatePet} className="flex-1">
                      Criar Pet
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pets Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando pets...</p>
          </div>
        ) : filteredPets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <PawPrint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                             <h3 className="text-lg font-semibold text-gray-900 mb-2">
                 {searchTerm || clientFilter !== 'all' || breedFilter !== 'all' ? 'Nenhum pet encontrado' : 'Nenhum pet cadastrado'}
               </h3>
               <p className="text-gray-600 mb-4">
                 {searchTerm || clientFilter !== 'all' || breedFilter !== 'all' 
                   ? 'Tente ajustar os filtros de busca' 
                   : 'Comece criando o primeiro pet do sistema'
                 }
               </p>
               {!searchTerm && clientFilter === 'all' && breedFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Pet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet) => (
              <Card key={pet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pet.name}</CardTitle>
                                             <CardDescription className="flex items-center gap-1 mt-1">
                         {getBreedIcon(pet.breed)}
                         {pet.breed || 'Raça não informada'}
                       </CardDescription>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {pet.client_name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                                     {pet.age && (
                     <div className="flex items-center gap-2 text-sm text-gray-600">
                       <Cake className="h-4 w-4" />
                       Idade: {getAgeDisplay(pet.age)}
                     </div>
                   )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    {pet.client_name}
                    {pet.client_email && (
                      <span className="text-xs text-gray-500">({pet.client_email})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Criado em {formatDate(pet.created_at)}
                  </div>
                  {pet.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{pet.notes}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(pet)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar o pet "{pet.name}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePet(pet.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Deletar Pet
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Pet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do pet"
                />
              </div>
                             <div>
                 <Label htmlFor="edit-age">Idade</Label>
                 <Input
                   id="edit-age"
                   value={formData.age}
                   onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                   placeholder="Ex: 3 anos"
                 />
               </div>
              <div>
                <Label htmlFor="edit-breed">Raça</Label>
                <Input
                  id="edit-breed"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="Ex: Golden Retriever"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-client">Dono</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dono" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o pet"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleEditPet} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPets; 