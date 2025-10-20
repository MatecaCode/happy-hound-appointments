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
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import { ClientCombobox } from '@/components/ClientCombobox';
import { BreedCombobox } from '@/components/BreedCombobox';
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
  breed_id?: string;
  size?: string;
  age: string;
  birth_date?: string;
  notes: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
}

interface Breed {
  id: string;
  name: string;
  active: boolean;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  user_id: string;
}

const AdminPets = () => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
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
    breed_id: '',
    size: '',
    age: '',
    client_id: '',
    notes: '',
    birth_date: ''
  });
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [selectedBreed, setSelectedBreed] = useState<Breed | undefined>(undefined);

  // Load pets, clients and breeds
  useEffect(() => {
    fetchPets();
    fetchClients();
    fetchBreeds();
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
            breed_id,
            size,
            age,
            birth_date,
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
        client_name: (pet.clients as any)?.name,
        client_email: (pet.clients as any)?.email
      })) || [];

      setPets(petsWithClientInfo);
      console.log('📊 [ADMIN_PETS] Pets loaded:', petsWithClientInfo);
      console.log('📊 [ADMIN_PETS] Raw data from database:', data);
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
        .select('id, name, email, user_id')
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

  const fetchBreeds = async () => {
    try {
      const { data, error } = await supabase
        .from('breeds')
        .select('id, name, active')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('❌ [ADMIN_PETS] Error fetching breeds:', error);
        throw error;
      }

      setBreeds(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_PETS] Error fetching breeds:', error);
      toast.error('Erro ao carregar raças');
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

    if (!birthDate) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }

           try {
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .insert({
            name: formData.name,
            breed: selectedBreed?.name || formData.breed,
            breed_id: selectedBreed?.id || null,
            size: formData.size,
            age: formData.age,
            birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
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

    if (!birthDate) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }

     console.log('🔍 [ADMIN_PETS] Updating pet:', selectedPet.id);
     console.log('🔍 [ADMIN_PETS] Form data:', formData);
     console.log('🔍 [ADMIN_PETS] Birth date:', birthDate);

     try {
               const updateData = {
          name: formData.name,
          breed: selectedBreed?.name || formData.breed,
          breed_id: selectedBreed?.id || null,
          size: formData.size,
          age: formData.age,
          birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
          notes: formData.notes,
          client_id: formData.client_id
        };

       console.log('🔍 [ADMIN_PETS] Update data:', updateData);

       const { data, error } = await supabase
         .from('pets')
         .update(updateData)
         .eq('id', selectedPet.id)
         .select();

      if (error) {
        console.error('❌ [ADMIN_PETS] Update error:', error);
        toast.error('Erro ao atualizar pet');
        return;
      }

      console.log('✅ [ADMIN_PETS] Update successful:', data);
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
      breed_id: '',
      size: '',
      age: '',
      client_id: '',
      notes: '',
      birth_date: ''
    });
    setBirthDate(undefined);
    setSelectedClient(undefined);
    setSelectedBreed(undefined);
  };

       const openEditModal = (pet: Pet) => {
    setSelectedPet(pet);
    setFormData({
      name: pet.name || '',
      breed: pet.breed || '',
      breed_id: pet.breed_id || '',
      size: pet.size || '',
      age: pet.age || '',
      client_id: pet.client_id || '',
      notes: pet.notes || '',
      birth_date: pet.birth_date || ''
    });
    setBirthDate(pet.birth_date ? new Date(pet.birth_date) : undefined);
    
    // Find and set the selected client
    const client = clients.find(c => c.id === pet.client_id);
    setSelectedClient(client);
    
    // Find and set the selected breed
    const breed = breeds.find(b => b.id === pet.breed_id);
    setSelectedBreed(breed);
    
    setIsEditModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatPt = (d?: string | Date) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A');

     const getAgeDisplay = (age: string, birth_date?: string) => {
     if (birth_date) {
       try {
         const birthDate = new Date(birth_date);
         const today = new Date();
         const years = differenceInYears(today, birthDate);
         const months = differenceInMonths(today, birthDate) % 12;
         
         if (years > 0) {
           return `${years} ano${years > 1 ? 's' : ''}${months > 0 ? ` e ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
         } else {
           return `${months} mes${months > 1 ? 'es' : ''}`;
         }
       } catch {
         return age || 'Idade não informada';
       }
     }
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

    const getSizeDisplay = (size: string) => {
      switch (size) {
        case 'small': return 'Pequeno';
        case 'medium': return 'Médio';
        case 'large': return 'Grande';
        case 'extra_large': return 'Extra Grande';
        default: return size;
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

            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
              setIsCreateModalOpen(open);
              if (!open) {
                resetForm();
              }
            }}>
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
                      <BreedCombobox
                        breeds={breeds}
                        onSelect={(breed) => {
                          setSelectedBreed(breed);
                          setFormData({ ...formData, breed: breed.name, breed_id: breed.id });
                        }}
                        selectedBreed={selectedBreed}
                        disabled={false}
                        isLoading={false}
                      />
                    </div>
                                         <div>
                       <Label htmlFor="size">Tamanho</Label>
                       <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione o tamanho" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="small">Pequeno</SelectItem>
                           <SelectItem value="medium">Médio</SelectItem>
                           <SelectItem value="large">Grande</SelectItem>
                           <SelectItem value="extra_large">Extra Grande</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                  
                                     <div>
                     <Label htmlFor="birth-date">Data de Nascimento *</Label>
                     <PetDobPicker
                       value={birthDate}
                       onChange={setBirthDate}
                     />
                   </div>

                                     <div>
                     <Label htmlFor="client">Dono *</Label>
                     <ClientCombobox
                       clients={clients}
                       onSelect={(client) => {
                         setSelectedClient(client);
                         setFormData({ ...formData, client_id: client.id });
                       }}
                       selectedClient={selectedClient}
                       disabled={false}
                       isLoading={false}
                     />
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
                      <CardTitle className="text-lg leading-tight mb-1">{pet.name}</CardTitle>
                    </div>
                    <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                      <User className="h-3 w-3 mr-1" />
                      {pet.client_name}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1.5 items-start text-sm text-gray-600">
                    <span>🐶</span>
                    <span className="text-slate-700">{pet.breed || 'Sem Raça Definida'}</span>

                    <span>📏</span>
                    <span className="text-slate-700">{getSizeDisplay(pet.size || '')}</span>

                    <span>⏳</span>
                    <span className="text-slate-700">{getAgeDisplay(pet.age, pet.birth_date)}</span>

                    <span>🎂</span>
                    <span className="text-slate-700">Nascimento: {pet.birth_date ? formatPt(pet.birth_date) : 'N/A'}</span>

                    <span>👤</span>
                    <span className="text-slate-700">{pet.client_name}</span>

                    <span>✉️</span>
                    <a
                      href={pet.client_email ? `mailto:${pet.client_email}` : undefined}
                      className="truncate text-slate-700 max-w-[19rem] md:max-w-[26rem]"
                      title={pet.client_email || ''}
                    >
                      {pet.client_email || 'N/A'}
                    </a>
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
        <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setSelectedPet(null);
            resetForm();
          }
        }}>
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
                  <BreedCombobox
                    breeds={breeds}
                    onSelect={(breed) => {
                      setSelectedBreed(breed);
                      setFormData({ ...formData, breed: breed.name, breed_id: breed.id });
                    }}
                    selectedBreed={selectedBreed}
                    disabled={false}
                    isLoading={false}
                  />
                </div>
                                 <div>
                   <Label htmlFor="edit-size">Tamanho</Label>
                   <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione o tamanho" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="small">Pequeno</SelectItem>
                       <SelectItem value="medium">Médio</SelectItem>
                       <SelectItem value="large">Grande</SelectItem>
                       <SelectItem value="extra_large">Extra Grande</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              
                                               <div>
                    <Label htmlFor="edit-birth-date">Data de Nascimento *</Label>
                    <PetDobPicker
                      value={birthDate}
                      onChange={setBirthDate}
                    />
                  </div>

                             <div>
                 <Label htmlFor="edit-client">Dono</Label>
                 <ClientCombobox
                   clients={clients}
                   onSelect={(client) => {
                     setSelectedClient(client);
                     setFormData({ ...formData, client_id: client.id });
                   }}
                   selectedClient={selectedClient}
                   disabled={false}
                   isLoading={false}
                 />
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