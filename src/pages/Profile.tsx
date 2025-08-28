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
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { DateInputBR } from '@/components/inputs/DateInputBR';
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
import { PREFERRED_CONTACT_OPTIONS, MARKETING_SOURCE_OPTIONS } from '@/constants/profile';
import { debounce } from '@/utils/debounce';
import { log } from '@/utils/logger';

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
  const [draftRestored, setDraftRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [isVisible, setIsVisible] = useState(false);

    // Client Profile 2.0 state
  const [profileProgress, setProfileProgress] = useState<ProfileProgress>({ percent_complete: 0, missing_fields: [] });
  const [showMicroWizard, setShowMicroWizard] = useState(false);
  const [needsFirstVisitSetup, setNeedsFirstVisitSetup] = useState(false);
   
  // UX improvements state
  const [showNudgeBanner, setShowNudgeBanner] = useState(true);
  
  // Consent snapshot state
  const [consentSnapshot, setConsentSnapshot] = useState({
    tos: false,
    privacy: false,
    reminders: false,
    reminders_channel: null as string | null,
    latest_at: null as string | null
  });
  
  // Lookup data
  const [contactChannels, setContactChannels] = useState<ContactChannel[]>([]);
  const [marketingSources, setMarketingSources] = useState<MarketingSource[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // Draft persistence key
  const DRAFT_KEY = `profileDraft:${user?.id}`;

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

  // Client-side progress calculator (fallback when server data not available)
  // Used only when server RPC data is not yet loaded
  const calculateClientProgress = React.useCallback((): { percent_complete: number; missing_fields: string[] } => {
    const fields = [
      { key: 'name', value: formData.name, label: 'nome' },
      { key: 'email', value: user?.email, label: 'email' },
      { key: 'phone', value: formData.phone, label: 'telefone' },
      { key: 'preferred_channel', value: formData.preferred_channel_code, label: 'canal preferido' },
      { key: 'emergency_name', value: formData.emergency_contact_name, label: 'contato de emergência' },
      { key: 'emergency_phone', value: formData.emergency_contact_phone, label: 'telefone de emergência' }
    ];

    const completedFields = fields.filter(field => {
      if (field.key === 'preferred_channel') {
        // "none" counts as completed for preferred channel
        return field.value && (field.value.trim() !== '' || field.value === 'none');
      }
      return field.value && field.value.trim() !== '';
    });
    const missingFields = fields.filter(field => {
      if (field.key === 'preferred_channel') {
        return !field.value || (field.value.trim() === '' && field.value !== 'none');
      }
      return !field.value || field.value.trim() === '';
    }).map(f => f.label);
    
    const percentComplete = Math.round((completedFields.length / fields.length) * 100);
    
    return {
      percent_complete: percentComplete,
      missing_fields: missingFields
    };
  }, [formData, user?.email]);

  // Update progress whenever form data changes (client-side fallback)
  useEffect(() => {
    // Only use client-side calculation if we don't have server data yet
    if (profileProgress.percent_complete === 0) {
      const progress = calculateClientProgress();
      setProfileProgress(progress);
    }
  }, [calculateClientProgress, profileProgress.percent_complete]);

  // Import debounce utility
  const debouncedSaveDraft = React.useMemo(
    () => debounce((draft: any) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 300),
    [DRAFT_KEY]
  );

  // Draft persistence management with debouncing
  useEffect(() => {
    if (isEditing) {
      // Save draft to localStorage only when editing
      const draft = {
        formData,
        isEditing: true,
        updatedAt: new Date().toISOString()
      };
      debouncedSaveDraft(draft);
    } else {
      // When not editing, remove any existing draft
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [isEditing, formData, debouncedSaveDraft]);

  // Load draft on mount if it exists and is less than 10 minutes old
  useEffect(() => {
    if (user) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const draftAge = Date.now() - new Date(draft.updatedAt).getTime();
          const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
          
          if (draftAge <= tenMinutes) {
            // Only restore if the draft was saved while editing
            if (draft.isEditing) {
              setFormData(draft.formData);
              setIsEditing(true);
              setDraftRestored(true);
              toast.success('Rascunho restaurado');
            } else {
              // Draft was saved in view mode, just remove it
              localStorage.removeItem(DRAFT_KEY);
            }
          } else {
            // Draft is too old, remove it
            localStorage.removeItem(DRAFT_KEY);
          }
        } catch (error) {
          log.error('Error parsing saved draft:', error);
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    }
  }, [user, DRAFT_KEY]);

  // Save draft on unmount only if editing
  useEffect(() => {
    return () => {
      if (isEditing && user) {
        const draft = {
          formData,
          isEditing: true,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    };
  }, [isEditing, formData, user, DRAFT_KEY]);

     useEffect(() => {
     if (user) {
       const controller = new AbortController();
       
       fetchUserRole();
       fetchClientData();
       loadLookupData();
       checkFirstVisitSetup();
       loadProfileProgress(); // Load server-side progress
       loadConsentSnapshot(); // Load consent snapshot
       
       return () => {
         controller.abort();
       };
     }
   }, [user]);

  useEffect(() => {
    // Animate in the content
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Add keyboard handler for escape key to close micro-wizard
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMicroWizard) {
        log.debug('Escape key pressed, closing micro-wizard...');
        handleMicroWizardClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMicroWizard]);

  // Cleanup micro-wizard state on unmount
  useEffect(() => {
    return () => {
      if (showMicroWizard) {
        log.debug('Component unmounting, closing micro-wizard...');
        setShowMicroWizard(false);
      }
    };
  }, [showMicroWizard]);

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
        log.error('Error fetching user role:', roleError);
        setRoleLoading(false);
        return;
      }

      setUserRole(roleData?.role || null);
    } catch (error) {
      log.error('Error in fetchUserRole:', error);
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
        log.error('Error fetching client data:', error);
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
      if (data?.birth_date) {
        setBirthDate(new Date(data.birth_date));
      }

      // Load progress
      // await loadProfileProgress(); // This line is now handled by the client-side progress calculator
      
    } catch (error) {
      log.error('Error in fetchClientData:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookupData = async () => {
    try {
      // Load staff profiles (only this exists in DB for now)
      const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, name, email, can_groom, can_vet, can_bathe')
        .eq('active', true)
        .order('name');
      
      if (staffError) {
        log.error('Error loading staff profiles:', staffError);
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
        log.error('Error loading clinics:', clinicError);
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

  const loadConsentSnapshot = async () => {
    try {
      const { data, error } = await supabase.rpc('client_get_consent_snapshot');
      
      if (error) {
        console.error('Error loading consent snapshot:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setConsentSnapshot({
          tos: data[0].tos || false,
          privacy: data[0].privacy || false,
          reminders: data[0].reminders || false,
          reminders_channel: data[0].reminders_channel,
          latest_at: data[0].latest_at
        });
      }
    } catch (error) {
      console.error('Error in loadConsentSnapshot:', error);
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
      if (data && !showMicroWizard) {
        // Show micro-wizard after a short delay for better UX
        setTimeout(() => {
          console.log('Showing micro-wizard...');
          setShowMicroWizard(true);
        }, 1000);
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
          p_preferred_channel_code: formData.preferred_channel_code || 'telefone', // Always save preferred channel
          p_emergency_contact_name: formData.emergency_contact_name || null,
          p_emergency_contact_phone: formData.emergency_contact_phone || null,
          p_preferred_staff_profile_id: formData.preferred_staff_profile_id || null,
          p_marketing_source_code: formData.marketing_source_code || null,
          p_marketing_source_other: formData.marketing_source_other || null,
          p_accessibility_notes: formData.accessibility_notes || null,
          p_general_notes: formData.general_notes || null,
          p_birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null
        });

      if (error) {
        console.error('Error updating client data:', error);
        toast.error('Erro ao salvar alterações');
        return;
      }

      

      // Refresh progress from server
      await loadProfileProgress();
      
      // Check if we should keep banner hidden based on new progress
      const { data: progressData } = await supabase.rpc('client_get_profile_progress');
      if (progressData && progressData.length > 0 && progressData[0].percent_complete >= 80) {
        setShowNudgeBanner(false); // Keep banner hidden if profile is well complete
      }
      
             toast.success('Perfil salvo');
       setIsEditing(false);
       setDraftRestored(false);
       
       // Clear any saved draft on successful save
       localStorage.removeItem(DRAFT_KEY);
      
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
      
      if (clientData?.birth_date) {
        setBirthDate(new Date(clientData.birth_date));
      } else {
        setBirthDate(undefined);
      }
    }
    setIsEditing(false);
    
    // Only show banner again if progress is still low
    if (profileProgress.percent_complete < 80) {
      setShowNudgeBanner(true);
    }
    
         // Clear any saved draft
     localStorage.removeItem(DRAFT_KEY);
     setDraftRestored(false);
  };

  const handleCompletarAgora = () => {
    setIsEditing(true);
    setShowNudgeBanner(false); // Hide banner when entering edit mode
    toast.success('Edição habilitada — complete seu perfil.');
    
    // Focus the first missing field (typically phone)
    setTimeout(() => {
      const phoneInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 100);
    
    // Scroll right card into view with highlight
    setTimeout(() => {
      const rightCard = document.querySelector('[data-right-card]');
      if (rightCard) {
        rightCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        rightCard.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          rightCard.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
        }, 1000);
      }
    }, 200);
  };

  const handleMicroWizardComplete = async () => {
    console.log('Completing micro-wizard...');
    setShowMicroWizard(false);
    setNeedsFirstVisitSetup(false);
    
    // Refresh data after wizard completion
    await fetchClientData();
    await loadConsentSnapshot(); // Refresh consent snapshot
    await loadProfileProgress(); // Refresh progress
    toast.success('Configuração inicial concluída!');
  };

  const handleMicroWizardClose = () => {
    console.log('Closing micro-wizard...');
    setShowMicroWizard(false);
    // Don't reset needsFirstVisitSetup here - let the user complete it later
  };

     const renderProgressMeter = () => {
     // Hide progress section when profile is 100% complete
     if (profileProgress.percent_complete === 100) {
       return null;
     }

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
               {isLoading ? 'Carregando...' : `${profileProgress.percent_complete}% completo`}
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
            <p className="text-sm text-gray-500">
              {loading && 'Verificando autenticação...'}
              {roleLoading && 'Carregando permissões...'}
              {isLoading && 'Carregando dados...'}
            </p>
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
          {showNudgeBanner && (
            <div className={`transition-all duration-1000 delay-350 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <SmartNudgesBanner
                profileProgress={profileProgress}
                lastDismissedAt={clientData?.last_nudge_dismissed_at}
                onRefreshProgress={loadProfileProgress}
                className="mb-6"
              />
            </div>
          )}

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
                       {consentSnapshot.tos ? 
                         <CheckCircle className="w-4 h-4 text-green-500" /> : 
                         <XCircle className="w-4 h-4 text-red-500" />
                       }
                     </div>
                     <div className="flex items-center justify-between text-xs">
                       <span>Política de Privacidade</span>
                       {consentSnapshot.privacy ? 
                         <CheckCircle className="w-4 h-4 text-green-500" /> : 
                         <XCircle className="w-4 h-4 text-red-500" />
                       }
                     </div>
                     <div className="flex items-center justify-between text-xs">
                       <span>Lembretes</span>
                       {consentSnapshot.reminders ? 
                         <CheckCircle className="w-4 h-4 text-green-500" /> : 
                         <XCircle className="w-4 h-4 text-red-500" />
                       }
                     </div>
                     {consentSnapshot.reminders && consentSnapshot.reminders_channel && (
                       <div className="text-xs text-gray-500 mt-1">
                         Canal: {consentSnapshot.reminders_channel}
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Marketing Source */}
                 {clientData?.marketing_source_code && (
                   <div>
                     <div className="flex items-center space-x-3 mb-2">
                       <MessageSquare className="w-4 h-4 text-blue-500" />
                       <Label className="text-sm font-medium text-gray-700">Como nos conheceu</Label>
                     </div>
                     <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                       <p className="text-sm font-medium text-gray-800">
                         {(() => {
                           const source = MARKETING_SOURCE_OPTIONS.find(s => s.code === clientData.marketing_source_code);
                           if (source) {
                             if (clientData.marketing_source_code === 'outro' && clientData.marketing_source_other) {
                               return clientData.marketing_source_other;
                             }
                             return source.label;
                           }
                           return 'Não informado';
                         })()}
                       </p>
                     </div>
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Right Card - Extended Profile (Editable) */}
            <div className="space-y-6" data-right-card>
              {/* Contact & Preferences Section */}
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                                               <CardTitle className="text-lg font-bold text-gray-800">Contato</CardTitle>
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
                      <PhoneInputBR
                        value={formData.phone}
                        onChange={(value) => setFormData({...formData, phone: value})}
                        placeholder="(11) 99999-9999"
                        className="h-10"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.phone ? 
                            (() => {
                              const digits = clientData.phone.replace(/\D/g, '');
                              if (digits.length === 11) {
                                return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                              } else if (digits.length === 10) {
                                return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                              }
                              return clientData.phone;
                            })() : 'Não informado'
                          }
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
                        <Select 
                          value={formData.preferred_channel_code || 'telefone'} 
                          onValueChange={(value) => setFormData({...formData, preferred_channel_code: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione como prefere ser contatado" />
                          </SelectTrigger>
                          <SelectContent>
                            {PREFERRED_CONTACT_OPTIONS.map((option) => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                                             </div>

                       {/* Birth Date */}
                       <div>
                         <div className="flex items-center space-x-3 mb-2">
                           <Calendar className="w-4 h-4 text-purple-500" />
                           <Label htmlFor="birth_date" className="text-sm font-medium text-gray-700">Data de Aniversário (opcional)</Label>
                         </div>
                                                   {isEditing ? (
                            <DateInputBR
                              id="birth_date"
                              value={birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined}
                              onChange={(value) => {
                                if (value) {
                                  try {
                                    const date = new Date(value);
                                    if (!isNaN(date.getTime())) {
                                      setBirthDate(date);
                                    }
                                  } catch (error) {
                                    console.error('Invalid date:', value);
                                  }
                                } else {
                                  setBirthDate(undefined);
                                }
                              }}
                              className="h-10"
                            />
                          ) : (
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                             <p className="text-sm font-medium text-gray-800">
                               {birthDate ? format(birthDate, 'dd/MM/yyyy') : 'Não informado'}
                             </p>
                           </div>
                         )}
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
                      <PhoneInputBR
                        value={formData.emergency_contact_phone}
                        onChange={(value) => setFormData({...formData, emergency_contact_phone: value})}
                        placeholder="(11) 99999-9999"
                        className="mt-1"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-1">
                        <p className="text-sm font-medium text-gray-800">
                          {clientData?.emergency_contact_phone ? 
                            (() => {
                              const digits = clientData.emergency_contact_phone.replace(/\D/g, '');
                              if (digits.length === 11) {
                                return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                              } else if (digits.length === 10) {
                                return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                              }
                              return clientData.emergency_contact_phone;
                            })() : 'Não informado'
                          }
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
                      variant="ghost"
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
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
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
          onClose={handleMicroWizardClose}
          onComplete={handleMicroWizardComplete}
          currentUserName={clientData?.name || ''}
        />
      </div>
    </Layout>
  );
};

export default Profile;
