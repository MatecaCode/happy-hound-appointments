import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import { BreedCombobox } from '@/components/BreedCombobox';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  PawPrint,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Dog,
  Cat,
  HelpCircle,
  Send,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  admin_created: boolean;
  created_by: string | null;
  claim_invited_at: string | null;
  claimed_at: string | null;
  location_name?: string;
  pet_count?: number;
  needs_registration?: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
  breed_id?: string;
  size?: string;
  birth_date?: string;
  notes: string;
  created_at: string;
  updated_at: string;
  client_id: string;
}

interface Breed {
  id: string;
  name: string;
  active: boolean;
}

const AdminClients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    location_id: ''
  });

  // Pet management state
  const [isPetsModalOpen, setIsPetsModalOpen] = useState(false);
  const [selectedClientForPets, setSelectedClientForPets] = useState<Client | null>(null);
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [isCreatePetModalOpen, setIsCreatePetModalOpen] = useState(false);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [petFormData, setPetFormData] = useState({
    name: '',
    breed: '',
    breed_id: '',
    size: '',
    notes: '',
    birth_date: ''
  });
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [selectedBreed, setSelectedBreed] = useState<Breed | undefined>(undefined);

  // Load clients and locations
  useEffect(() => {
    fetchClients();
    fetchLocations();
    fetchBreeds();
  }, []);

  const fetchClients = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 [ADMIN_CLIENTS] Fetching clients with pet counts');
      
                   const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          user_id,
          name,
          phone,
          email,
          address,
          notes,
          location_id,
          created_at,
          updated_at,
          admin_created,
          created_by,
          claim_invited_at,
          claimed_at,
          needs_registration,
          locations:location_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Supabase error:', error);
        throw error;
      }

      // Get pet counts for each client
      const clientsWithPetCounts = await Promise.all(
        data?.map(async (client) => {
          const { count: petCount } = await supabase
            .from('pets')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            location_name: client.locations?.name,
            pet_count: petCount || 0
          };
        }) || []
      );

      setClients(clientsWithPetCounts);
      console.log('📊 [ADMIN_CLIENTS] Clients loaded:', clientsWithPetCounts);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Error fetching locations:', error);
        throw error;
      }

      setLocations(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error fetching locations:', error);
      toast.error('Erro ao carregar locais');
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
        console.error('❌ [ADMIN_CLIENTS] Error fetching breeds:', error);
        throw error;
      }

      setBreeds(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error fetching breeds:', error);
      toast.error('Erro ao carregar raças');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === 'all' || client.location_id === locationFilter;
    
    return matchesSearch && matchesLocation;
  });

  const handleCreateClient = async () => {
    if (!formData.name || !formData.email || !formData.location_id) {
      toast.error('Nome, email e local são obrigatórios');
      return;
    }

    try {
      // Create client record without user_id (will be set when client registers)
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: null, // Will be set when client completes registration
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          notes: formData.notes,
          location_id: formData.location_id,
          admin_created: true,
          created_by: user.id,
          needs_registration: true // Flag to indicate client needs to complete registration
        })
        .select()
        .single();

      if (clientError) {
        console.error('❌ [ADMIN_CLIENTS] Client creation error:', clientError);
        toast.error('Erro ao criar cliente: ' + clientError.message);
        return;
      }

      // Send invitation email using Edge Function
      try {
        const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
          'send-client-invite',
          {
            body: {
              email: clientData.email,
              client_id: clientData.id
            }
          }
        );

        if (inviteError) {
          console.error('❌ [ADMIN_CLIENTS] Invite error:', inviteError);
          toast.error('Cliente criado mas falha ao enviar convite: ' + inviteError.message);
        } else if (inviteResult?.status === 'invited') {
          toast.success('Cliente criado com sucesso! Convite enviado para ' + clientData.email);
        } else {
          toast.success('Cliente criado com sucesso! Convite será enviado separadamente.');
        }
      } catch (inviteError) {
        console.error('❌ [ADMIN_CLIENTS] Invite function error:', inviteError);
        toast.success('Cliente criado com sucesso! Convite será enviado manualmente.');
      }

      setIsCreateModalOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error creating client:', error);
      toast.error('Erro ao criar cliente');
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient || !formData.name || !formData.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          notes: formData.notes,
          location_id: formData.location_id
        })
        .eq('id', selectedClient.id);

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Update error:', error);
        toast.error('Erro ao atualizar cliente');
        return;
      }

      toast.success('Cliente atualizado com sucesso');
      setIsEditModalOpen(false);
      setSelectedClient(null);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      console.log('🗑️ [ADMIN_CLIENTS] Starting comprehensive client deletion:', clientId);
      
      // Use the comprehensive deletion function to clean up all related data
      const { data: deletionResult, error: rpcError } = await supabase
        .rpc('delete_client_completely', { _client_id: clientId });

      if (rpcError) {
        console.error('❌ [ADMIN_CLIENTS] RPC delete error:', rpcError);
        toast.error('Erro ao deletar cliente: ' + rpcError.message);
        return;
      }

      if (!deletionResult?.success) {
        console.error('❌ [ADMIN_CLIENTS] Delete failed:', deletionResult);
        toast.error('Erro ao deletar cliente: ' + (deletionResult?.error || 'Unknown error'));
        return;
      }

      // Handle auth.users deletion if needed (requires service role)
      if (deletionResult.user_id) {
        try {
          console.log('🗑️ [ADMIN_CLIENTS] Deleting auth user:', deletionResult.user_id);
          await supabase.auth.admin.deleteUser(deletionResult.user_id);
          console.log('✅ [ADMIN_CLIENTS] Auth user deleted successfully');
        } catch (authError) {
          console.error('❌ [ADMIN_CLIENTS] Auth delete error:', authError);
          // Don't fail the entire operation if auth deletion fails
          toast.warning('Cliente deletado, mas erro ao remover conta de autenticação');
        }
      }

      // Log successful cleanup summary
      const summary = deletionResult.cleanup_summary;
      console.log('🎉 [ADMIN_CLIENTS] Deletion completed:', {
        client: deletionResult.client_email,
        appointments: summary.appointments_deleted,
        pets: summary.pets_deleted,
        userRoles: summary.user_roles_deleted,
        clientRecord: summary.client_deleted
      });

      toast.success(`Cliente "${deletionResult.client_name}" deletado completamente!`);
      fetchClients();
      
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Unexpected error deleting client:', error);
      toast.error('Erro inesperado ao deletar cliente');
    }
  };

  const handleSendClaimEmail = async (client: Client) => {
    if (!client.admin_created || client.claimed_at) {
      toast.error('Este cliente não é elegível para reivindicação de conta');
      return;
    }

    try {
      // Use Edge Function to send invite
      const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
        'send-client-invite',
        {
          body: {
            email: client.email,
            client_id: client.id
          }
        }
      );

      if (inviteError) {
        console.error('❌ [ADMIN_CLIENTS] Invite error:', inviteError);
        toast.error('Erro ao enviar convite: ' + inviteError.message);
        return;
      }

      if (inviteResult?.status === 'invited') {
        toast.success(`Convite enviado para ${client.email}`);
        fetchClients(); // Refresh to show updated claim_invited_at
      } else {
        toast.error('Erro inesperado ao enviar convite');
      }
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error sending claim email:', error);
      toast.error('Erro ao enviar convite');
    }
  };

  const handleBulkSendClaimEmails = async () => {
    // Filter for eligible clients (admin-created, unclaimed, not yet invited)
    const eligibleClients = clients.filter(client => 
      client.admin_created && !client.claimed_at && !client.claim_invited_at
    );

    if (eligibleClients.length === 0) {
      toast.error('Nenhum cliente elegível para reivindicação de conta (sem convites pendentes)');
      return;
    }

    const confirmed = window.confirm(
      `Enviar convites para ${eligibleClients.length} clientes? Esta ação será feita um por vez.`
    );

    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;

    // Process each client individually using the same Edge Function
    for (const client of eligibleClients) {
      try {
        const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
          'send-client-invite',
          {
            body: {
              email: client.email,
              client_id: client.id
            }
          }
        );

        if (inviteError || inviteResult?.status !== 'invited') {
          console.error(`❌ [ADMIN_CLIENTS] Bulk invite error for ${client.email}:`, inviteError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ [ADMIN_CLIENTS] Bulk invite error for ${client.email}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} convites enviados com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} convites falharam`);
    }

    // Refresh client list to show updated invite statuses
    fetchClients();
  };

  // Pet management functions
  const openPetsModal = async (client: Client) => {
    setSelectedClientForPets(client);
    setIsPetsModalOpen(true);
    await fetchClientPets(client.id);
  };

  const fetchClientPets = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          id,
          name,
          breed,
          breed_id,
          size,
          birth_date,
          notes,
          created_at,
          updated_at,
          client_id
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Error fetching pets:', error);
        throw error;
      }

      setClientPets(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error fetching pets:', error);
      toast.error('Erro ao carregar pets');
    }
  };

  const handleCreatePet = async () => {
    if (!selectedClientForPets || !petFormData.name) {
      toast.error('Nome do pet é obrigatório');
      return;
    }

    try {
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .insert({
          name: petFormData.name,
          breed: selectedBreed?.name || petFormData.breed,
          breed_id: selectedBreed?.id || null,
          size: petFormData.size,
          birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
          notes: petFormData.notes,
          client_id: selectedClientForPets.id
        })
        .select()
        .single();

      if (petError) {
        console.error('❌ [ADMIN_CLIENTS] Pet creation error:', petError);
        toast.error('Erro ao criar pet');
        return;
      }

      toast.success('Pet criado com sucesso');
      setIsCreatePetModalOpen(false);
      resetPetForm();
      await fetchClientPets(selectedClientForPets.id);
      fetchClients(); // Refresh client list to update pet count
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error creating pet:', error);
      toast.error('Erro ao criar pet');
    }
  };

  const resetPetForm = () => {
    setPetFormData({
      name: '',
      breed: '',
      breed_id: '',
      size: '',
      notes: '',
      birth_date: ''
    });
    setBirthDate(undefined);
    setSelectedBreed(undefined);
  };

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

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      location_id: ''
    });
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      location_id: client.location_id || ''
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

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8" />
            👥 Gerenciar Clientes
          </h1>
          <p className="text-gray-600 mt-2">Gerencie todos os clientes registrados no sistema</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkSendClaimEmails}
              variant="outline"
              className="flex items-center gap-2"
              disabled={clients.filter(c => c.admin_created && !c.user_id && !c.claim_invited_at).length === 0}
            >
              <Send className="h-4 w-4" />
              Envio em Lote ({clients.filter(c => c.admin_created && !c.user_id && !c.claim_invited_at).length})
            </Button>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <PhoneInputBR
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Local *</Label>
                    <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um local" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
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
                      placeholder="Observações sobre o cliente"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateClient} className="flex-1">
                      Criar Cliente
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

        {/* Clients Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || locationFilter !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || locationFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Comece criando o primeiro cliente do sistema'
                }
              </p>
              {!searchTerm && locationFilter === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </CardDescription>
                    </div>
                                         <div className="flex flex-col gap-1">
                       <Badge 
                         variant="secondary" 
                         className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 transition-colors"
                         onClick={() => openPetsModal(client)}
                       >
                         <PawPrint className="h-3 w-3" />
                         {client.pet_count || 0}
                       </Badge>
                                             {client.admin_created && client.claimed_at && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conta Vinculada
                        </Badge>
                      )}
                      {client.admin_created && client.claim_invited_at && !client.claimed_at && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          <Send className="h-3 w-3 mr-1" />
                          Convite Enviado
                        </Badge>
                      )}
                      {client.admin_created && !client.claim_invited_at && !client.claimed_at && (
                        <Badge variant="destructive" className="text-xs">
                          Aguarda Convite
                        </Badge>
                      )}
                       {client.needs_registration && !client.admin_created && (
                         <Badge variant="destructive" className="text-xs">
                           Pendente Registro
                         </Badge>
                       )}
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                  {client.location_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-4 w-4" />
                      {client.location_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Criado em {formatDate(client.created_at)}
                  </div>
                  {client.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{client.notes}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(client)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    
                    {client.admin_created && !client.claimed_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendClaimEmail(client)}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                        title={client.claim_invited_at ? 'Reenviar convite' : 'Enviar convite'}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    
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
                            Tem certeza que deseja deletar o cliente "{client.name}"? 
                            Esta ação não pode ser desfeita e também deletará a conta do usuário.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteClient(client.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Deletar Cliente
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
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <PhoneInputBR
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Endereço</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Local</Label>
                <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
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
                  placeholder="Observações sobre o cliente"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleEditClient} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
                 </Dialog>

         {/* Pets Modal */}
         <Dialog open={isPetsModalOpen} onOpenChange={setIsPetsModalOpen}>
           <DialogContent className="max-w-2xl">
             <DialogHeader>
               <DialogTitle>
                 Pets de {selectedClientForPets?.name}
               </DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
               {clientPets.length === 0 ? (
                 <div className="text-center py-8">
                   <PawPrint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-semibold text-gray-900 mb-2">
                     Nenhum pet cadastrado
                   </h3>
                   <p className="text-gray-600 mb-4">
                     Este cliente ainda não possui pets cadastrados
                   </p>
                   <Button onClick={() => setIsCreatePetModalOpen(true)}>
                     <Plus className="h-4 w-4 mr-2" />
                     Adicionar Primeiro Pet
                   </Button>
                 </div>
               ) : (
                 <>
                   <div className="space-y-3">
                     {clientPets.map((pet) => (
                       <Card key={pet.id} className="p-4">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             {getBreedIcon(pet.breed)}
                             <div>
                               <h4 className="font-semibold">{pet.name}</h4>
                               <div className="flex items-center gap-2 text-sm text-gray-600">
                                 <span>{pet.breed || 'Raça não informada'}</span>
                                 {pet.size && (
                                   <Badge variant="outline" className="text-xs">
                                     {getSizeDisplay(pet.size)}
                                   </Badge>
                                 )}
                                                                   <span>•</span>
                                  <span>{getAgeDisplay('', pet.birth_date)}</span>
                               </div>
                             </div>
                           </div>
                         </div>
                       </Card>
                     ))}
                   </div>
                   <div className="flex justify-center pt-4">
                     <Button onClick={() => setIsCreatePetModalOpen(true)}>
                       <Plus className="h-4 w-4 mr-2" />
                       Adicionar Novo Pet
                     </Button>
                   </div>
                 </>
               )}
             </div>
           </DialogContent>
         </Dialog>

         {/* Create Pet Modal */}
         <Dialog open={isCreatePetModalOpen} onOpenChange={(open) => {
           setIsCreatePetModalOpen(open);
           if (!open) {
             resetPetForm();
           }
         }}>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Pet</DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
                               <div>
                  <Label htmlFor="pet-name">Nome *</Label>
                  <Input
                    id="pet-name"
                    value={petFormData.name}
                    onChange={(e) => setPetFormData({ ...petFormData, name: e.target.value })}
                    placeholder="Nome do pet"
                  />
                </div>
               <div>
                 <Label htmlFor="pet-breed">Raça</Label>
                 <BreedCombobox
                   breeds={breeds}
                   onSelect={(breed) => {
                     setSelectedBreed(breed);
                     setPetFormData({ ...petFormData, breed: breed.name, breed_id: breed.id });
                   }}
                   selectedBreed={selectedBreed}
                   disabled={false}
                   isLoading={false}
                 />
               </div>
               <div>
                 <Label htmlFor="pet-size">Tamanho</Label>
                 <Select value={petFormData.size} onValueChange={(value) => setPetFormData({ ...petFormData, size: value })}>
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
                 <Label htmlFor="pet-birth-date">Data de Nascimento</Label>
                 <PetDobPicker
                   value={birthDate}
                   onChange={setBirthDate}
                 />
               </div>
               <div>
                 <Label htmlFor="pet-notes">Notas</Label>
                 <Textarea
                   id="pet-notes"
                   value={petFormData.notes}
                   onChange={(e) => setPetFormData({ ...petFormData, notes: e.target.value })}
                   placeholder="Observações sobre o pet"
                   rows={3}
                 />
               </div>
               <div className="flex gap-2 pt-4">
                 <Button onClick={handleCreatePet} className="flex-1">
                   Adicionar Pet
                 </Button>
                 <Button variant="outline" onClick={() => setIsCreatePetModalOpen(false)}>
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

export default AdminClients; 