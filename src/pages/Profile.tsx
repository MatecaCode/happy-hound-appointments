
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import { Save, Edit, X, Loader2, User, Mail, Calendar, Phone, MapPin, FileText, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Tables } from '@/integrations/supabase/types';

type ClientData = Tables<'clients'>;

const Profile = () => {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [isVisible, setIsVisible] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchClientData();
    }
  }, [user]);

  useEffect(() => {
    // Animate in the content
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      setRoleLoading(true);
      
      // Check if user has a staff profile
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (staffData) {
        setIsStaff(true);
        setRoleLoading(false);
        return;
      }

      // Get user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        setRoleLoading(false);
        return;
      }

      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchClientData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching client data:', error);
        toast.error('Erro ao carregar dados do perfil');
        return;
      }

      setClientData(data);
      
      // Set form data for editing
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        notes: data.notes || ''
      });

      // Set birth date if available
      if ((data as any).birth_date) {
        setBirthDate(new Date((data as any).birth_date));
      }
    } catch (error) {
      console.error('Error in fetchClientData:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !clientData) return;

    try {
      setIsSaving(true);
      
      const updateData = {
        name: formData.name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null
      };

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating client data:', error);
        toast.error('Erro ao salvar alterações');
        return;
      }

      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      
      // Refresh client data
      await fetchClientData();
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (clientData) {
      setFormData({
        name: clientData.name || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        notes: clientData.notes || ''
      });
      
      if ((clientData as any).birth_date) {
        setBirthDate(new Date((clientData as any).birth_date));
      } else {
        setBirthDate(undefined);
      }
    }
    setIsEditing(false);
  };

  // Redirect staff users to StaffProfile
  if (isStaff) {
    return <Navigate to="/staff-profile" replace />;
  }

  if (loading || roleLoading || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-[#6BAEDB] border-t-[#2B70B2] mx-auto"></div>
            <p className="text-lg font-medium text-[#1A4670]">Carregando perfil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E7F0FF] via-white to-[#F1F5F9]">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A4670]">Acesso Restrito</h2>
            <p className="text-[#334155]">Você precisa estar logado para ver seu perfil.</p>
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
                 <User className="w-10 h-10 text-white" />
               </div>
               <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] bg-clip-text text-transparent mb-3">
                 Meu Perfil
               </h1>
               <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                 Gerencie suas informações pessoais e mantenha seus dados sempre atualizados
               </p>
               <div className="flex justify-center mt-4">
                 <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                   <Sparkles className="w-4 h-4 text-[#2B70B2]" />
                   <span className="text-sm text-[#334155]">Perfil Completo</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Basic Information Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                                     <div className="w-12 h-12 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                     <Shield className="w-6 h-6 text-white" />
                   </div>
                   <div>
                     <CardTitle className="text-xl font-bold text-[#1A4670]">Informações Básicas</CardTitle>
                     <CardDescription className="text-[#334155]">Seus dados de conta</CardDescription>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email */}
                <div className="group/item">
                                     <div className="flex items-center space-x-3 mb-2">
                     <Mail className="w-4 h-4 text-[#2B70B2]" />
                     <label className="text-sm font-medium text-[#1A4670]">Email</label>
                   </div>
                   <div className="bg-[#F1F5F9] rounded-lg p-3 border border-[#E7F0FF]">
                     <p className="text-sm font-medium text-[#1A4670]">{user.email}</p>
                     <p className="text-xs text-[#334155] mt-1">
                       O email não pode ser alterado pois está vinculado à sua conta
                     </p>
                   </div>
                </div>
                
                {/* Account Type */}
                <div className="group/item">
                                     <div className="flex items-center space-x-3 mb-2">
                     <User className="w-4 h-4 text-[#6BAEDB]" />
                     <label className="text-sm font-medium text-[#1A4670]">Tipo de Conta</label>
                   </div>
                   <div className="flex items-center space-x-2">
                     {userRole ? (
                       <Badge className="bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] text-white border-0 px-3 py-1">
                         {userRole === 'client' ? 'Cliente' : 
                          userRole === 'groomer' ? 'Tosador' : 
                          userRole === 'vet' ? 'Veterinário' : 
                          userRole === 'admin' ? 'Administrador' : 
                          userRole}
                       </Badge>
                     ) : (
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-4 border-2 border-[#2B70B2] border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-sm text-[#334155]">Carregando...</span>
                       </div>
                     )}
                   </div>
                </div>

                {/* Registration Date */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <label className="text-sm font-medium text-gray-700">Data de Cadastro</label>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-800">Informações Pessoais</CardTitle>
                      <CardDescription className="text-gray-600">Seus dados pessoais</CardDescription>
                    </div>
                  </div>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 transition-all duration-200"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 transition-all duration-200"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome Completo</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Digite seu nome completo"
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                        {clientData?.name || 'Não informado'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <Phone className="w-4 h-4 text-green-500" />
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefone</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all duration-200"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                        {clientData?.phone || 'Não informado'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Birth Date */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <Label className="text-sm font-medium text-gray-700">Data de Nascimento</Label>
                  </div>
                  {isEditing ? (
                    <PetDobPicker
                      value={birthDate}
                      onChange={setBirthDate}
                      className="w-full h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                                             {(clientData as any)?.birth_date 
                       ? new Date((clientData as any).birth_date).toLocaleDateString('pt-BR')
                       : 'Não informado'
                     }
                      </p>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">Endereço</Label>
                  </div>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Digite seu endereço completo"
                      rows={3}
                      className="border-gray-200 focus:border-red-500 focus:ring-red-500 transition-all duration-200 resize-none"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                        {clientData?.address || 'Não informado'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="group/item">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Observações</Label>
                  </div>
                  {isEditing ? (
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Informações adicionais, preferências, etc."
                      rows={3}
                      className="border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 resize-none"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                        {clientData?.notes || 'Nenhuma observação'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Spacing */}
          <div className="h-16"></div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
