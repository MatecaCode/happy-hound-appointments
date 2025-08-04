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
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  location_name?: string;
  pet_count?: number;
}

interface Location {
  id: string;
  name: string;
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

  // Load clients and locations
  useEffect(() => {
    fetchClients();
    fetchLocations();
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
      // Create user in auth.users first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: 'tempPassword123!', // Temporary password
        email_confirm: true
      });

      if (authError) {
        console.error('❌ [ADMIN_CLIENTS] Auth error:', authError);
        toast.error('Erro ao criar usuário');
        return;
      }

      // Create client record
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: authData.user.id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          notes: formData.notes,
          location_id: formData.location_id
        })
        .select()
        .single();

      if (clientError) {
        console.error('❌ [ADMIN_CLIENTS] Client creation error:', clientError);
        toast.error('Erro ao criar cliente');
        return;
      }

      // Add user role
      await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'client',
          name: formData.name
        });

      toast.success('Cliente criado com sucesso');
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
      // First, get the user_id to delete from auth
      const { data: client } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      if (client) {
        // Delete from auth.users
        await supabase.auth.admin.deleteUser(client.user_id);
      }

      // Delete from clients table
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Delete error:', error);
        toast.error('Erro ao deletar cliente');
        return;
      }

      toast.success('Cliente deletado com sucesso');
      fetchClients();
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error deleting client:', error);
      toast.error('Erro ao deletar cliente');
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
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <PawPrint className="h-3 w-3" />
                      {client.pet_count || 0}
                    </Badge>
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
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
      </div>
    </AdminLayout>
  );
};

export default AdminClients; 