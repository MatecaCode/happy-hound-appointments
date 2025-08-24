import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import ClientMicroWizard from '@/components/ClientMicroWizard';
import SmartNudgesBanner from '@/components/SmartNudges';
import { 
  Save, Edit, X, Loader2, User, Mail, Calendar, Phone, MapPin, 
  FileText, Shield, Sparkles, MessageSquare, AlertCircle, Heart,
  Building, Users, Accessibility, TrendingUp, CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Tables } from '@/integrations/supabase/types';

type ClientData = Tables<'clients'>;

interface ContactChannel {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface MarketingSource {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface StaffProfile {
  id: string;
  name: string;
  email: string;
  can_groom: boolean;
  can_vet: boolean;
  can_bathe: boolean;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

interface ProfileProgress {
  percent_complete: number;
  missing_fields: string[];
}

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

  // Client Profile 2.0 state
  const [profileProgress, setProfileProgress] = useState<ProfileProgress>({ percent_complete: 0, missing_fields: [] });
  const [showMicroWizard, setShowMicroWizard] = useState(false);
  const [needsFirstVisitSetup, setNeedsFirstVisitSetup] = useState(false);
  
  // Lookup data
  const [contactChannels, setContactChannels] = useState<ContactChannel[]>([]);
  const [marketingSources, setMarketingSources] = useState<MarketingSource[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // Extended form data for Client Profile 2.0
  const [formData, setFormData] = useState({
    // Original fields
    name: '',
    phone: '',
    address: '',
    notes: '',
    
    // New Client Profile 2.0 fields
    is_whatsapp: false,
    preferred_channel_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    preferred_staff_profile_id: '',
    marketing_source_code: '',
    marketing_source_other: '',
    accessibility_notes: '',
    general_notes: '',
    
    // Consent status (read-only display)
    consent_tos: false,
    consent_privacy: false,
    consent_reminders: false
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchClientData();
      loadLookupData();
      checkFirstVisitSetup();
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
        notes: data.notes || '',
        
        // New fields
        is_whatsapp: data.is_whatsapp || false,
        preferred_channel_code: data.preferred_channel_id ? '' : '', // Will resolve from lookup
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        preferred_staff_profile_id: data.preferred_staff_profile_id || '',
        marketing_source_code: data.marketing_source_id ? '' : '', // Will resolve from lookup  
        marketing_source_other: data.marketing_source_other || '',
        accessibility_notes: data.accessibility_notes || '',
        general_notes: data.general_notes || '',
        
        // Consent status
        consent_tos: data.consent_tos || false,
        consent_privacy: data.consent_privacy || false,
        consent_reminders: data.consent_reminders || false
      });

      // Set birth date if available
      if ((data as any).birth_date) {
        setBirthDate(new Date((data as any).birth_date));
      }

      // Load progress
      await loadProfileProgress();
      
    } catch (error) {
      console.error('Error in fetchClientData:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookupData = async () => {
    try {
      // Load contact channels
      const { data: channels, error: channelError } = await supabase
        .from('contact_channels')
        .select('id, code, name, description')
        .eq('active', true)
        .order('display_order');
      
      if (channelError) {
        console.error('Error loading contact channels:', channelError);
      } else {
        setContactChannels(channels || []);
      }
      
      // Load marketing sources
      const { data: sources, error: sourceError } = await supabase
        .from('marketing_sources')
        .select('id, code, name, description')
        .eq('active', true)
        .order('display_order');
      
      if (sourceError) {
        console.error('Error loading marketing sources:', sourceError);
      } else {
        setMarketingSources(sources || []);
      }
      
      // Load staff profiles
      const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name, email, can_groom, can_vet, can_bathe')
        .eq('active', true)
        .order('name');
      
      if (staffError) {
        console.error('Error loading staff profiles:', staffError);
      } else {
        setStaffProfiles(staff || []);
      }

      // Load clinics
      const { data: clinicsData, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, address, active')
        .eq('active', true)
        .order('name');
      
      if (clinicError) {
        console.error('Error loading clinics:', clinicError);
      } else {
        setClinics(clinicsData || []);
      }
      
    } catch (error) {
      console.error('Error loading lookup data:', error);
    }
  };

  const loadProfileProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('client_get_profile_progress');
      
      if (error) {
        console.error('Error loading profile progress:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setProfileProgress({
          percent_complete: data[0].percent_complete || 0,
          missing_fields: data[0].missing_fields || []
        });
      }
    } catch (error) {
      console.error('Error in loadProfileProgress:', error);
    }
  };

  const checkFirstVisitSetup = async () => {
    try {
      const { data, error } = await supabase.rpc('client_needs_first_visit_setup');
      
      if (error) {
        console.error('Error checking first visit setup:', error);
        return;
      }
      
      setNeedsFirstVisitSetup(data || false);
      if (data) {
        // Show micro-wizard after a short delay for better UX
        setTimeout(() => setShowMicroWizard(true), 1000);
      }
    } catch (error) {
      console.error('Error in checkFirstVisitSetup:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !clientData) return;

    try {
      setIsSaving(true);
      
      // Use new client_update_profile RPC
      const { error } = await supabase.rpc('client_update_profile', {
        p_phone: formData.phone || null,
        p_is_whatsapp: formData.is_whatsapp,
        p_preferred_channel_code: formData.preferred_channel_code || null,
        p_emergency_contact_name: formData.emergency_contact_name || null,
        p_emergency_contact_phone: formData.emergency_contact_phone || null,
        p_preferred_staff_profile_id: formData.preferred_staff_profile_id || null,
        p_marketing_source_code: formData.marketing_source_code || null,
        p_marketing_source_other: formData.marketing_source_other || null,
        p_accessibility_notes: formData.accessibility_notes || null,
        p_general_notes: formData.general_notes || null
      });

      if (error) {
        console.error('Error updating client data:', error);
        toast.error('Erro ao salvar alterações');
        return;
      }

      // Update birth_date separately (not in RPC)
      if (birthDate) {
        const { error: birthError } = await supabase
          .from('clients')
          .update({ birth_date: format(birthDate, 'yyyy-MM-dd') })
          .eq('user_id', user.id);

        if (birthError) {
          console.error('Error updating birth date:', birthError);
          toast.error('Erro ao salvar data de nascimento');
          return;
        }
      }

      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      
      // Refresh client data and progress
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
        notes: clientData.notes || '',
        
        is_whatsapp: clientData.is_whatsapp || false,
        preferred_channel_code: '', // Will need lookup resolution
        emergency_contact_name: clientData.emergency_contact_name || '',
        emergency_contact_phone: clientData.emergency_contact_phone || '',
        preferred_staff_profile_id: clientData.preferred_staff_profile_id || '',
        marketing_source_code: '', // Will need lookup resolution
        marketing_source_other: clientData.marketing_source_other || '',
        accessibility_notes: clientData.accessibility_notes || '',
        general_notes: clientData.general_notes || '',
        
        consent_tos: clientData.consent_tos || false,
        consent_privacy: clientData.consent_privacy || false,
        consent_reminders: clientData.consent_reminders || false
      });
      
      if ((clientData as any).birth_date) {
        setBirthDate(new Date((clientData as any).birth_date));
      } else {
        setBirthDate(undefined);
      }
    }
    setIsEditing(false);
  };

  const handleMicroWizardComplete = async () => {
    setShowMicroWizard(false);
    setNeedsFirstVisitSetup(false);
    
    // Refresh data after wizard completion
    await fetchClientData();
    toast.success('Configuração inicial concluída!');
  };

  const renderProgressMeter = () => {
    const progressColor = 
      profileProgress.percent_complete >= 80 ? 'bg-green-500' :
      profileProgress.percent_complete >= 60 ? 'bg-yellow-500' :
      'bg-red-500';

    return (
      <Card className="mb-6 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Completude do Perfil</h3>
            </div>
            <Badge variant={profileProgress.percent_complete >= 80 ? 'default' : 'secondary'}>
              {profileProgress.percent_complete}% completo
            </Badge>
          </div>
          
          <Progress value={profileProgress.percent_complete} className="h-2 mb-2" />
          
          {profileProgress.percent_complete < 100 && profileProgress.missing_fields.length > 0 && (
            <p className="text-sm text-gray-600">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Campos pendentes: {profileProgress.missing_fields.join(', ')}
            </p>
          )}
          
          {profileProgress.percent_complete >= 80 && (
            <p className="text-sm text-green-600">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Seu perfil está bem completo!
            </p>
          )}
        </CardContent>
      </Card>
    );
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
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-full mb-6 shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2B70B2] to-[#6BAEDB] bg-clip-text text-transparent mb-3">
                Meu Perfil
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                Gerencie suas informações pessoais e mantenha seus dados sempre atualizados
              </p>
            </div>
          </div>

          {/* Progress Meter */}
          <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {renderProgressMeter()}
          </div>

          {/* Smart Nudges Banner */}
          <div className={`transition-all duration-1000 delay-350 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <SmartNudgesBanner
              profileProgress={profileProgress}
              lastDismissedAt={clientData?.last_nudge_dismissed_at}
              onRefreshProgress={loadProfileProgress}
              className="mb-6"
            />
          </div>

          {/* Cards Grid */}
          <div className={`grid grid-cols-1 xl:grid-cols-2 gap-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            {/* Left Card - Basic Information (Read-Only) */}
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#2B70B2] to-[#6BAEDB] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#1A4670]">Informações da Conta</CardTitle>
                    <CardDescription className="text-[#334155]">Dados básicos e de acesso</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Mail className="w-4 h-4 text-[#2B70B2]" />
                    <Label className="text-sm font-medium text-[#1A4670]">Email</Label>
                  </div>
                  <div className="bg-[#F1F5F9] rounded-lg p-3 border border-[#E7F0FF]">
                    <p className="text-sm font-medium text-[#1A4670]">{user.email}</p>
                    <p className="text-xs text-[#334155] mt-1">
                      O email não pode ser alterado pois está vinculado à sua conta
                    </p>
                  </div>
                </div>
                
                {/* Account Type */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-4 h-4 text-[#6BAEDB]" />
                    <Label className="text-sm font-medium text-[#1A4670]">Tipo de Conta</Label>
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
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <Label className="text-sm font-medium text-gray-700">Data de Cadastro</Label>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Consent Status */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <Label className="text-sm font-medium text-gray-700">Consentimentos</Label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Termos de Uso</span>
                      {formData.consent_tos ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Política de Privacidade</span>
                      {formData.consent_privacy ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Lembretes</span>
                      {formData.consent_reminders ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card - Extended Profile (Editable) */}
            <div className="space-y-6">
              {/* Contact & Preferences Section */}
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-800">Contato & Preferências</CardTitle>
                        <CardDescription className="text-gray-600">Suas informações de contato</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div>
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
                        className="h-10"
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
                  <div>
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
                        className="h-10"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.phone || 'Não informado'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp & Preferred Channel */}
                  {isEditing && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_whatsapp"
                          checked={formData.is_whatsapp}
                          onCheckedChange={(checked) => setFormData({...formData, is_whatsapp: checked as boolean})}
                        />
                        <Label htmlFor="is_whatsapp" className="text-sm">
                          Este número é WhatsApp
                        </Label>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Canal de contato preferido</Label>
                        <Select value={formData.preferred_channel_code} onValueChange={(value) => setFormData({...formData, preferred_channel_code: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione como prefere ser contatado" />
                          </SelectTrigger>
                          <SelectContent>
                            {contactChannels.map((channel) => (
                              <SelectItem key={channel.id} value={channel.code}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contact Section */}
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-800">Contato de Emergência</CardTitle>
                      <CardDescription className="text-gray-600">Para casos de emergência</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Nome do contato</Label>
                    {isEditing ? (
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                        placeholder="Nome completo"
                        className="mt-1"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.emergency_contact_name || 'Não informado'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Telefone de emergência</Label>
                    {isEditing ? (
                      <Input
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                        className="mt-1"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.emergency_contact_phone || 'Não informado'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Preferences Section */}
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-800">Preferências</CardTitle>
                      <CardDescription className="text-gray-600">Personalize sua experiência</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Profissional preferido</Label>
                        <Select value={formData.preferred_staff_profile_id} onValueChange={(value) => setFormData({...formData, preferred_staff_profile_id: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione um profissional (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffProfiles.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                <div>
                                  <div className="font-medium">{staff.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {[
                                      staff.can_groom && 'Tosador',
                                      staff.can_vet && 'Veterinário',
                                      staff.can_bathe && 'Banho'
                                    ].filter(Boolean).join(' • ')}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Preferência, não garantia de disponibilidade
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Como nos conheceu?</Label>
                        <Select value={formData.marketing_source_code} onValueChange={(value) => setFormData({...formData, marketing_source_code: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione como descobriu nossos serviços" />
                          </SelectTrigger>
                          <SelectContent>
                            {marketingSources.map((source) => (
                              <SelectItem key={source.id} value={source.code}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.marketing_source_code === 'other' && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Especifique</Label>
                          <Input
                            value={formData.marketing_source_other}
                            onChange={(e) => setFormData({...formData, marketing_source_other: e.target.value})}
                            placeholder="Como você nos conheceu?"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Necessidades especiais</Label>
                    {isEditing ? (
                      <Textarea
                        value={formData.accessibility_notes}
                        onChange={(e) => setFormData({...formData, accessibility_notes: e.target.value})}
                        placeholder="Descreva qualquer necessidade especial ou observação importante"
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.accessibility_notes || 'Nenhuma observação'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2"
                    data-action="edit-profile"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Spacing */}
          <div className="h-16"></div>
        </div>

        {/* Micro-Wizard Modal */}
        <ClientMicroWizard
          isOpen={showMicroWizard}
          onClose={() => setShowMicroWizard(false)}
          onComplete={handleMicroWizardComplete}
          currentUserName={clientData?.name || ''}
        />
      </div>
    </Layout>
  );
};

export default Profile;
