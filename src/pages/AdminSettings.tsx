import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Building2,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Scissors,
  Droplets,
  Stethoscope,
  UserCheck,
  UserX,
  Calendar,
  Clock as ClockIcon
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// Interfaces
interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  can_bathe: boolean;
  can_groom: boolean;
  can_vet: boolean;
  active: boolean;
  bio: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
  assigned_services?: string[];
}

interface Service {
  id: string;
  name: string;
  service_type: 'grooming' | 'veterinary';
  active: boolean;
}



const AdminSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('staff');
  
  // Staff management state
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modal states
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  
  // Form states
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    hourly_rate: 0,
    can_bathe: false,
    can_groom: false,
    can_vet: false
  });

  // Load data on component mount
  useEffect(() => {
    if (user) {
      fetchStaff();
      fetchServices();
    }
  }, [user]);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(`
          id,
          name,
          email,
          phone,
          can_bathe,
          can_groom,
          can_vet,
          active,
          bio,
          hourly_rate,
          created_at,
          updated_at
        `)
        .order('name');

      if (error) {
        console.error('❌ [ADMIN_SETTINGS] Error fetching staff:', error);
        throw error;
      }

      // Get assigned services for each staff member
      const staffWithServices = await Promise.all(
        data?.map(async (staffMember) => {
                     const { data: serviceData } = await supabase
             .from('staff_services')
             .select(`
               services (
                 id,
                 name
               )
             `)
             .eq('staff_profile_id', staffMember.id);

           const assignedServices = serviceData?.map(item => {
             const service = item.services as any;
             return service?.name;
           }).filter(Boolean) || [];
          
          return {
            ...staffMember,
            assigned_services: assignedServices
          };
        }) || []
      );

      setStaff(staffWithServices);
    } catch (error) {
      console.error('❌ [ADMIN_SETTINGS] Error fetching staff:', error);
      toast.error('Erro ao carregar staff');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, service_type, active')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('❌ [ADMIN_SETTINGS] Error fetching services:', error);
        throw error;
      }

      setServices(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_SETTINGS] Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    }
  };

  const handleCreateStaff = async () => {
    if (!staffFormData.name || !staffFormData.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      // Create staff profile
      const { data: staffData, error: staffError } = await supabase
        .from('staff_profiles')
        .insert({
          name: staffFormData.name,
          email: staffFormData.email,
          phone: staffFormData.phone,
          bio: staffFormData.bio,
          hourly_rate: staffFormData.hourly_rate,
          can_bathe: staffFormData.can_bathe,
          can_groom: staffFormData.can_groom,
          can_vet: staffFormData.can_vet,
          active: true
        })
        .select()
        .single();

      if (staffError) {
        console.error('❌ [ADMIN_SETTINGS] Staff creation error:', staffError);
        toast.error('Erro ao criar staff');
        return;
      }

      

      toast.success('Staff criado com sucesso');
      setIsCreateStaffModalOpen(false);
      resetStaffForm();
      fetchStaff();
    } catch (error) {
      console.error('❌ [ADMIN_SETTINGS] Error creating staff:', error);
      toast.error('Erro ao criar staff');
    }
  };

  const handleEditStaff = async () => {
    if (!selectedStaff || !staffFormData.name || !staffFormData.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      // Update staff profile
      const { error: staffError } = await supabase
        .from('staff_profiles')
        .update({
          name: staffFormData.name,
          email: staffFormData.email,
          phone: staffFormData.phone,
          bio: staffFormData.bio,
          hourly_rate: staffFormData.hourly_rate,
          can_bathe: staffFormData.can_bathe,
          can_groom: staffFormData.can_groom,
          can_vet: staffFormData.can_vet
        })
        .eq('id', selectedStaff.id);

      if (staffError) {
        console.error('❌ [ADMIN_SETTINGS] Staff update error:', staffError);
        toast.error('Erro ao atualizar staff');
        return;
      }

      

      toast.success('Staff atualizado com sucesso');
      setIsEditStaffModalOpen(false);
      setSelectedStaff(null);
      resetStaffForm();
      fetchStaff();
    } catch (error) {
      console.error('❌ [ADMIN_SETTINGS] Error updating staff:', error);
      toast.error('Erro ao atualizar staff');
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ active: !currentStatus })
        .eq('id', staffId);

      if (error) {
        console.error('❌ [ADMIN_SETTINGS] Status toggle error:', error);
        toast.error('Erro ao alterar status');
        return;
      }

      toast.success(`Staff ${currentStatus ? 'desativado' : 'ativado'} com sucesso`);
      fetchStaff();
    } catch (error) {
      console.error('❌ [ADMIN_SETTINGS] Error toggling staff status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const openEditModal = (staffMember: StaffProfile) => {
    setSelectedStaff(staffMember);
    setStaffFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || '',
      bio: staffMember.bio || '',
      hourly_rate: staffMember.hourly_rate || 0,
      can_bathe: staffMember.can_bathe,
      can_groom: staffMember.can_groom,
      can_vet: staffMember.can_vet
    });

    setIsEditStaffModalOpen(true);
  };

  const resetStaffForm = () => {
    setStaffFormData({
      name: '',
      email: '',
      phone: '',
      bio: '',
      hourly_rate: 0,
      can_bathe: false,
      can_groom: false,
      can_vet: false
    });
  };

  const getRoleDisplay = (staff: StaffProfile) => {
    const roles = [];
    if (staff.can_bathe) roles.push('Banhista');
    if (staff.can_groom) roles.push('Tosador');
    if (staff.can_vet) roles.push('Veterinário');
    return roles.length > 0 ? roles.join(', ') : 'Sem função definida';
  };

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'grooming':
        return <Scissors className="h-4 w-4" />;
      case 'veterinary':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Scissors className="h-4 w-4" />;
    }
  };

  // Availability Management Functions
  const openAvailabilityPage = (staffMember: StaffProfile) => {
    navigate(`/admin/staff/${staffMember.id}/availability`);
  };



  const filteredStaff = staff.filter(staffMember => {
    const matchesSearch = 
      staffMember.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'grooming' && (staffMember.can_bathe || staffMember.can_groom)) ||
      (roleFilter === 'veterinary' && staffMember.can_vet);
    
    return matchesSearch && matchesRole;
  });

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-2">
            Gerencie staff, serviços, preços e configurações operacionais
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Serviços & Preços
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Locais
            </TabsTrigger>
          </TabsList>

          {/* Staff Management */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Staff
                </CardTitle>
                <CardDescription>
                  Adicione, edite ou remova profissionais da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filtrar por função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as funções</SelectItem>
                          <SelectItem value="grooming">Tosador/Banhista</SelectItem>
                          <SelectItem value="veterinary">Veterinário</SelectItem>
                        </SelectContent>
                      </Select>

                      <Dialog open={isCreateStaffModalOpen} onOpenChange={setIsCreateStaffModalOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Adicionar Staff
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Adicionar Novo Staff</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="staff-name">Nome *</Label>
                                <Input
                                  id="staff-name"
                                  value={staffFormData.name}
                                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                                  placeholder="Nome completo"
                                />
                              </div>
                              <div>
                                <Label htmlFor="staff-email">Email *</Label>
                                <Input
                                  id="staff-email"
                                  type="email"
                                  value={staffFormData.email}
                                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                                  placeholder="email@exemplo.com"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="staff-phone">Telefone</Label>
                                <Input
                                  id="staff-phone"
                                  value={staffFormData.phone}
                                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                                  placeholder="(11) 99999-9999"
                                />
                              </div>
                              <div>
                                <Label htmlFor="staff-hourly-rate">Taxa Horária (R$)</Label>
                                <Input
                                  id="staff-hourly-rate"
                                  type="number"
                                  value={staffFormData.hourly_rate}
                                  onChange={(e) => setStaffFormData({ ...staffFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="staff-bio">Biografia</Label>
                              <Textarea
                                id="staff-bio"
                                value={staffFormData.bio}
                                onChange={(e) => setStaffFormData({ ...staffFormData, bio: e.target.value })}
                                placeholder="Breve descrição sobre o profissional"
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label>Funções</Label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="can-bathe"
                                    checked={staffFormData.can_bathe}
                                    onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_bathe: checked as boolean })}
                                  />
                                  <Label htmlFor="can-bathe" className="flex items-center gap-2">
                                    <Droplets className="h-4 w-4" />
                                    Banhista
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="can-groom"
                                    checked={staffFormData.can_groom}
                                    onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_groom: checked as boolean })}
                                  />
                                  <Label htmlFor="can-groom" className="flex items-center gap-2">
                                    <Scissors className="h-4 w-4" />
                                    Tosador
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="can-vet"
                                    checked={staffFormData.can_vet}
                                    onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_vet: checked as boolean })}
                                  />
                                  <Label htmlFor="can-vet" className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4" />
                                    Veterinário
                                  </Label>
                                </div>
                              </div>
                            </div>

                            

                            <div className="flex gap-2 pt-4">
                              <Button onClick={handleCreateStaff} className="flex-1">
                                Criar Staff
                              </Button>
                              <Button variant="outline" onClick={() => setIsCreateStaffModalOpen(false)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {/* Staff List */}
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Carregando staff...</p>
                    </div>
                  ) : filteredStaff.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {searchTerm || roleFilter !== 'all' ? 'Nenhum staff encontrado' : 'Nenhum staff cadastrado'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {searchTerm || roleFilter !== 'all' 
                            ? 'Tente ajustar os filtros de busca' 
                            : 'Comece adicionando o primeiro profissional'
                          }
                        </p>
                        {!searchTerm && roleFilter === 'all' && (
                          <Button onClick={() => setIsCreateStaffModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Primeiro Staff
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredStaff.map((staffMember) => (
                        <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg">{staffMember.name}</h3>
                                  <Badge variant={staffMember.active ? "secondary" : "destructive"}>
                                    {staffMember.active ? (
                                      <UserCheck className="h-3 w-3 mr-1" />
                                    ) : (
                                      <UserX className="h-3 w-3 mr-1" />
                                    )}
                                    {staffMember.active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p className="flex items-center gap-2">
                                    <span>📧 {staffMember.email}</span>
                                  </p>
                                  {staffMember.phone && (
                                    <p className="flex items-center gap-2">
                                      <span>📞 {staffMember.phone}</span>
                                    </p>
                                  )}
                                  <p className="flex items-center gap-2">
                                    <span>🎯 {getRoleDisplay(staffMember)}</span>
                                  </p>
                                  {staffMember.assigned_services && staffMember.assigned_services.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span>🔧 Serviços: {staffMember.assigned_services.join(', ')}</span>
                                    </div>
                                  )}
                                  {staffMember.hourly_rate > 0 && (
                                    <p className="flex items-center gap-2">
                                      <span>💰 R$ {staffMember.hourly_rate}/hora</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                                                             <div className="flex items-center gap-2">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => openEditModal(staffMember)}
                                 >
                                   <Edit className="h-3 w-3 mr-1" />
                                   Editar
                                 </Button>
                                 
                                                                   <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openAvailabilityPage(staffMember)}
                                  >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Disponibilidade
                                  </Button>
                                 
                                 <AlertDialog>
                                   <AlertDialogTrigger asChild>
                                     <Button
                                       size="sm"
                                       variant={staffMember.active ? "destructive" : "default"}
                                     >
                                       {staffMember.active ? (
                                         <UserX className="h-3 w-3 mr-1" />
                                       ) : (
                                         <UserCheck className="h-3 w-3 mr-1" />
                                       )}
                                       {staffMember.active ? 'Desativar' : 'Ativar'}
                                     </Button>
                                   </AlertDialogTrigger>
                                   <AlertDialogContent>
                                     <AlertDialogHeader>
                                       <AlertDialogTitle>
                                         {staffMember.active ? 'Desativar' : 'Ativar'} Staff
                                       </AlertDialogTitle>
                                       <AlertDialogDescription>
                                         Tem certeza que deseja {staffMember.active ? 'desativar' : 'ativar'} o staff "{staffMember.name}"?
                                         {staffMember.active 
                                           ? ' Eles não poderão mais receber novos agendamentos.'
                                           : ' Eles poderão voltar a receber agendamentos.'
                                         }
                                       </AlertDialogDescription>
                                     </AlertDialogHeader>
                                     <AlertDialogFooter>
                                       <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                       <AlertDialogAction
                                         onClick={() => handleToggleStaffStatus(staffMember.id, staffMember.active)}
                                         className={staffMember.active ? "bg-red-600 hover:bg-red-700" : ""}
                                       >
                                         {staffMember.active ? 'Desativar' : 'Ativar'}
                                       </AlertDialogAction>
                                     </AlertDialogFooter>
                                   </AlertDialogContent>
                                 </AlertDialog>
                               </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Staff Modal */}
          <Dialog open={isEditStaffModalOpen} onOpenChange={setIsEditStaffModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Staff</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-staff-name">Nome *</Label>
                    <Input
                      id="edit-staff-name"
                      value={staffFormData.name}
                      onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-staff-email">Email *</Label>
                    <Input
                      id="edit-staff-email"
                      type="email"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-staff-phone">Telefone</Label>
                    <Input
                      id="edit-staff-phone"
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-staff-hourly-rate">Taxa Horária (R$)</Label>
                    <Input
                      id="edit-staff-hourly-rate"
                      type="number"
                      value={staffFormData.hourly_rate}
                      onChange={(e) => setStaffFormData({ ...staffFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-staff-bio">Biografia</Label>
                  <Textarea
                    id="edit-staff-bio"
                    value={staffFormData.bio}
                    onChange={(e) => setStaffFormData({ ...staffFormData, bio: e.target.value })}
                    placeholder="Breve descrição sobre o profissional"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Funções</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-can-bathe"
                        checked={staffFormData.can_bathe}
                        onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_bathe: checked as boolean })}
                      />
                      <Label htmlFor="edit-can-bathe" className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Banhista
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-can-groom"
                        checked={staffFormData.can_groom}
                        onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_groom: checked as boolean })}
                      />
                      <Label htmlFor="edit-can-groom" className="flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        Tosador
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-can-vet"
                        checked={staffFormData.can_vet}
                        onCheckedChange={(checked) => setStaffFormData({ ...staffFormData, can_vet: checked as boolean })}
                      />
                      <Label htmlFor="edit-can-vet" className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Veterinário
                      </Label>
                    </div>
                  </div>
                </div>

                

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleEditStaff} className="flex-1">
                    Salvar Alterações
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditStaffModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
                     </Dialog>
 

 
           {/* Services & Pricing */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Serviços e Preços
                </CardTitle>
                <CardDescription>
                  Configure serviços disponíveis e suas tarifas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Catálogo de Serviços</h3>
                      <p className="text-sm text-gray-600">Gerencie serviços e preços</p>
                    </div>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Serviço
                    </Button>
                  </div>
                  
                  {/* Placeholder Services List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Banho Completo</p>
                        <p className="text-sm text-gray-600">Inclui shampoo, condicionador e secagem</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 45,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tosa Higiênica</p>
                        <p className="text-sm text-gray-600">Corte de pelos e unhas</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 60,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Consulta Veterinária</p>
                        <p className="text-sm text-gray-600">Exame clínico e orientações</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 120,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operating Hours */}
          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários de Funcionamento
                </CardTitle>
                <CardDescription>
                  Configure os horários de atendimento por dia da semana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Configuração de Horários</h3>
                      <p className="text-sm text-gray-600">Defina horários de funcionamento</p>
                    </div>
                    <Button disabled>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Horários
                    </Button>
                  </div>
                  
                  {/* Placeholder Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Segunda a Sexta</h4>
                      <p className="text-sm text-gray-600">08:00 - 18:00</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Sábado</h4>
                      <p className="text-sm text-gray-600">08:00 - 16:00</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Domingo</h4>
                      <p className="text-sm text-gray-600">Fechado</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Feriados</h4>
                      <p className="text-sm text-gray-600">Horário especial</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gerenciar Locais
                </CardTitle>
                <CardDescription>
                  Configure múltiplas unidades (desabilitado por enquanto)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Unidades</h3>
                      <p className="text-sm text-gray-600">Gerencie múltiplas localizações</p>
                    </div>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Unidade
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-600">Suporte Multi-unidade</p>
                        <p className="text-sm text-gray-500">
                          Funcionalidade em desenvolvimento. Por enquanto, apenas uma unidade é suportada.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Placeholder Location */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Unidade Principal</p>
                      <p className="text-sm text-gray-600">Alameda Prof. Lucas Nogueira Garcez, 4245</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Ativo</Badge>
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* System Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>
                Informações sobre a configuração atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{staff.filter(s => s.active).length}</div>
                  <div className="text-sm text-gray-600">Profissionais Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{services.length}</div>
                  <div className="text-sm text-gray-600">Serviços Configurados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-600">Unidade Ativa</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings; 