import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import PhoneInputBR from '@/components/inputs/PhoneInputBR';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/Chip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PetDobPicker } from '@/components/calendars/pet/PetDobPicker';
import { BreedCombobox } from '@/components/BreedCombobox';
import { PREFERRED_CONTACT_OPTIONS, MARKETING_SOURCE_OPTIONS } from '@/constants/profile';
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
    Cake,
  Phone,
  Mail,
  MapPin,
  FileText,
  Dog,
  Cat,
  HelpCircle,
  Send,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  // Client Profile 2.0 fields
  is_whatsapp?: boolean;
  preferred_channel?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_staff_profile_id?: string;
  accessibility_notes?: string;
  general_notes?: string;
  marketing_source_code?: string;
  marketing_source_other?: string;
  birth_date?: string;
}

interface Location {
  id: string;
  name: string;
}

interface StaffProfile {
  id: string;
  name?: string;
  full_name?: string;
  location_id?: string;
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
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [emailCheckError, setEmailCheckError] = useState<string>('');
  const [clientBirthDate, setClientBirthDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    location_id: '',
    // Client Profile 2.0 fields
    is_whatsapp: false,
    preferred_channel: 'telefone',
    emergency_contact_name: '',
    emergency_contact_phone: '',
          preferred_staff_profile_id: 'none',
      accessibility_notes: '',
      general_notes: '',
      marketing_source_code: 'not_informed',
    marketing_source_other: '',
    birth_date: ''
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
  const [petBirthDate, setPetBirthDate] = useState<Date | undefined>(undefined);
  const [selectedBreed, setSelectedBreed] = useState<Breed | undefined>(undefined);

  // Data integrity state
  const [dataIntegrity, setDataIntegrity] = useState<any>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  type ClaimStatus = { linked?: boolean; verified: boolean; invited: boolean; can_invite: boolean };
  const [claimStatusMap, setClaimStatusMap] = useState<Record<string, ClaimStatus>>({});
  const claimUiDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('claim_ui_debug') === '1';
  const loadingClaimRef = useRef(false);

  // Load clients, locations and breeds
  useEffect(() => {
    fetchClients();
    fetchLocations();
    fetchBreeds();
    checkDataIntegrity();
  }, []);

  // Load staff profiles when modals open or location changes
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      fetchStaffProfiles();
    }
  }, [formData.location_id, isCreateModalOpen, isEditModalOpen]);

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
          is_whatsapp,
          preferred_channel,
          emergency_contact_name,
          emergency_contact_phone,
          preferred_staff_profile_id,
          accessibility_notes,
          general_notes,
          marketing_source_code,
          marketing_source_other,
          birth_date,
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
      // After clients load, fetch claim status via admin RPC
      const clientIds = (clientsWithPetCounts || []).map((c) => c.id);
      if (clientIds.length === 0) { setClaimStatusMap({}); return; }
      if (loadingClaimRef.current) { if (claimUiDebug) console.info('[CLAIM_RPC] skip (already loading)'); return; }
      loadingClaimRef.current = true;
      try {
        const { data: statusRows, error: statusError } = await supabase
          .rpc('admin_get_client_claim_status', { _client_ids: clientIds });
        if (statusError) {
          console.error('[CLAIM_RPC][ERR]', statusError);
          return; // fail loud, do not retry with different signature
        }
        const map: Record<string, ClaimStatus> = {};
        statusRows?.forEach((row: any) => {
          if (!row?.client_id) return;
          map[row.client_id] = {
            linked: typeof row.linked !== 'undefined' ? !!row.linked : undefined,
            verified: !!row.verified,
            invited: !!row.invited,
            can_invite: !!row.can_invite,
          };
        });
        setClaimStatusMap(map);
        if (!statusRows || statusRows.length === 0) {
          console.warn('[CLAIM_RPC][EMPTY]', { idsCount: clientIds.length });
        }
        if (claimUiDebug) {
          console.info('[CLAIM_RPC] ids', clientIds.length, 'rows', statusRows?.length ?? 0);
        }
      } catch (e) {
        console.error('❌ [ADMIN_CLIENTS] Error loading claim status:', e);
      } finally {
        loadingClaimRef.current = false;
      }
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

  const fetchStaffProfiles = async () => {
    try {
      console.log('🔍 [ADMIN_CLIENTS] Fetching staff profiles for location:', formData.location_id);
      
      let query = supabase
        .from('staff_profiles')
        .select('id, name, phone, email, location_id')
        .eq('active', true);
      
      // If a location is selected, filter by that location
      if (formData.location_id) {
        query = query.eq('location_id', formData.location_id);
      }
      
      const { data, error } = await query.order('name');

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Error fetching staff profiles:', error);
        toast.error('Erro ao carregar profissionais');
        setStaffProfiles([]);
        return;
      }

      console.log('✅ [ADMIN_CLIENTS] Staff profiles loaded:', data);
      setStaffProfiles(data || []);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error fetching staff profiles:', error);
      toast.error('Erro ao carregar profissionais');
      setStaffProfiles([]);
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

  const checkDataIntegrity = async () => {
    try {
      const { data, error } = await supabase
        .from('client_data_integrity')
        .select('*');

      if (error) {
        console.error('❌ [ADMIN_CLIENTS] Error checking data integrity:', error);
        return;
      }

      const integrityMap = data?.reduce((acc: any, item: any) => {
        acc[item.metric] = parseInt(item.value);
        return acc;
      }, {});

      setDataIntegrity(integrityMap);
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error checking data integrity:', error);
    }
  };

  const handleCleanupOrphanedClients = async () => {
    const confirmed = window.confirm(
      'Esta ação irá limpar registros de clientes órfãos (que referenciam usuários inexistentes). ' +
      'Os dados do cliente serão preservados, mas a referência ao usuário será removida. Continuar?'
    );

    if (!confirmed) return;

    try {
      setIsCleaningUp(true);
      
      // First run a dry-run to see what will be affected
      const { data: dryRunResult, error: dryRunError } = await supabase
        .rpc('cleanup_orphaned_clients', { _dry_run: true, _delete_orphaned: false });

      if (dryRunError) {
        console.error('❌ [ADMIN_CLIENTS] Dry run error:', dryRunError);
        toast.error('Erro ao verificar registros órfãos');
        return;
      }

      const orphanedCount = dryRunResult?.orphaned_found || 0;
      
      if (orphanedCount === 0) {
        toast.success('Nenhum registro órfão encontrado! Dados já estão íntegros.');
        return;
      }

      // Run the actual cleanup
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_orphaned_clients', { _dry_run: false, _delete_orphaned: false });

      if (cleanupError) {
        console.error('❌ [ADMIN_CLIENTS] Cleanup error:', cleanupError);
        toast.error('Erro ao limpar registros órfãos');
        return;
      }

      const updatedCount = cleanupResult?.records_updated || 0;
      
      if (updatedCount > 0) {
        toast.success(`${updatedCount} registros órfãos foram limpos com sucesso!`);
        // Refresh data
        fetchClients();
        checkDataIntegrity();
      } else {
        toast.info('Nenhum registro foi alterado.');
      }

    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Cleanup error:', error);
      toast.error('Erro inesperado ao limpar registros órfãos');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleCleanupStaffDuplicates = async () => {
    const confirmed = window.confirm(
      'Esta ação irá remover registros de clientes que duplicam funcionários ativos. ' +
      'Funcionários devem aparecer apenas na página de staff, não como clientes. Continuar?'
    );

    if (!confirmed) return;

    try {
      setIsCleaningUp(true);
      
      // First run a dry-run to see what will be affected
      const { data: dryRunResult, error: dryRunError } = await supabase
        .rpc('cleanup_staff_client_duplicates', { _dry_run: true });

      if (dryRunError) {
        console.error('❌ [ADMIN_CLIENTS] Staff duplicates dry run error:', dryRunError);
        toast.error('Erro ao verificar duplicatas de staff');
        return;
      }

      const duplicateCount = dryRunResult?.duplicates_found || 0;
      
      if (duplicateCount === 0) {
        toast.success('Nenhuma duplicata de staff encontrada! Dados já estão corretos.');
        return;
      }

      // Run the actual cleanup
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_staff_client_duplicates', { _dry_run: false });

      if (cleanupError) {
        console.error('❌ [ADMIN_CLIENTS] Staff duplicates cleanup error:', cleanupError);
        toast.error('Erro ao limpar duplicatas de staff');
        return;
      }

      const deletedCount = cleanupResult?.records_deleted || 0;
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} registros duplicados de staff foram removidos com sucesso!`);
        // Refresh data
        fetchClients();
        checkDataIntegrity();
      } else {
        toast.info('Nenhum registro foi alterado.');
      }

    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Staff duplicates cleanup error:', error);
      toast.error('Erro inesperado ao limpar duplicatas de staff');
    } finally {
      setIsCleaningUp(false);
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

  // Defensive helper: compute UI status with fallback when RPC is missing/empty
  const getClaimStatusForClient = (client: Client) => {
    const fbLinked = !!client.user_id; // ignore dirty claimed_at in fallback
    const existing = claimStatusMap[client.id];
    if (existing) return existing;
    return {
      linked: fbLinked,
      verified: false,
      invited: !!client.claim_invited_at,
      can_invite: !fbLinked,
    } as ClaimStatus;
  };

  // Bulk invite count derived from status (uses fallback)
  const bulkEligibleCount = clients.filter((c) => {
    const s = getClaimStatusForClient(c);
    return !!s.can_invite && !s.invited;
  }).length;

  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      const { data: checkResult, error: checkError } = await supabase.functions.invoke(
        'send-client-invite',
        {
          body: {
            email: email,
            checkOnly: true
          }
        }
      );

      if (checkError) {
        console.error('❌ [ADMIN_CLIENTS] Email check error:', checkError);
        setEmailCheckError('Erro ao verificar email');
        return false;
      }

      if (!checkResult?.available) {
        setEmailCheckError('Este e-mail já está cadastrado.');
        return false;
      }

      setEmailCheckError('');
      return true;
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Email check error:', error);
      setEmailCheckError('Erro ao verificar email');
      return false;
    }
  };

  const handleCreateClient = async () => {
    if (!formData.name || !formData.phone || !formData.location_id) {
      toast.error('Nome, telefone e local são obrigatórios');
      return;
    }

    // Check email availability only if email is provided
    if (formData.email && formData.email.trim()) {
      const emailAvailable = await checkEmailAvailability(formData.email);
      if (!emailAvailable) {
        return; // Error already set in emailCheckError state
      }
    }

    try {
      // Debug: Log the data being sent
      const clientDataToInsert = {
        user_id: null, // Will be set when client completes registration
        name: formData.name,
        phone: formData.phone,
        email: formData.email && formData.email.trim() ? formData.email.trim() : null,
        address: formData.address,
        notes: formData.general_notes,
        location_id: formData.location_id,
        admin_created: true,
        created_by: user.id,
        needs_registration: true,
        // Client Profile 2.0 fields
        is_whatsapp: formData.is_whatsapp,
        preferred_channel: formData.preferred_channel,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        preferred_staff_profile_id: formData.preferred_staff_profile_id === 'none' ? null : formData.preferred_staff_profile_id,
        accessibility_notes: formData.accessibility_notes,
        general_notes: formData.general_notes,
        marketing_source_code: formData.marketing_source_code === 'not_informed' ? null : formData.marketing_source_code,
        marketing_source_other: formData.marketing_source_other,
        birth_date: clientBirthDate ? format(clientBirthDate, 'yyyy-MM-dd') : null
      };
      
      console.log('🔍 [ADMIN_CLIENTS] Creating client with data:', clientDataToInsert);
      
      // Create client record with all Client Profile 2.0 fields
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert(clientDataToInsert)
        .select()
        .single();

      if (clientError) {
        console.error('❌ [ADMIN_CLIENTS] Client creation error:', clientError);
        toast.error('Erro ao criar cliente: ' + clientError.message);
        return;
      }

      console.log('✅ [ADMIN_CLIENTS] Client created successfully:', clientData);

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
          toast.error('Cliente criado, mas falha ao enviar convite.', {
            action: {
              label: 'Reenviar convite',
              onClick: () => handleSendClaimEmail(clientData)
            }
          });
        } else if (inviteResult?.status === 'invited') {
          toast.success('Cliente criado com sucesso! Convite enviado para ' + clientData.email);
        } else {
          toast.success('Cliente criado com sucesso! Convite será enviado separadamente.');
        }
      } catch (inviteError) {
        console.error('❌ [ADMIN_CLIENTS] Invite function error:', inviteError);
        toast.error('Cliente criado, mas falha ao enviar convite.', {
          action: {
            label: 'Reenviar convite',
            onClick: () => handleSendClaimEmail(clientData)
          }
        });
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
    if (!selectedClient || !formData.name || !formData.email || !formData.phone) {
      toast.error('Nome, email e telefone são obrigatórios');
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
          notes: formData.general_notes,
          location_id: formData.location_id,
          // Client Profile 2.0 fields
          is_whatsapp: formData.is_whatsapp,
          preferred_channel: formData.preferred_channel,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          preferred_staff_profile_id: formData.preferred_staff_profile_id === 'none' ? null : formData.preferred_staff_profile_id,
          accessibility_notes: formData.accessibility_notes,
          general_notes: formData.general_notes,
          marketing_source_code: formData.marketing_source_code === 'not_informed' ? null : formData.marketing_source_code,
          marketing_source_other: formData.marketing_source_other,
          birth_date: clientBirthDate ? format(clientBirthDate, 'yyyy-MM-dd') : null
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
          const { error: authError } = await supabase.functions.invoke('delete-staff-user', {
            body: { user_id: deletionResult.user_id }
          });
          if (authError) {
            console.error('❌ [ADMIN_CLIENTS] Auth delete error:', authError);
            toast.warning('Cliente deletado, mas erro ao remover conta de autenticação');
          } else {
            console.log('✅ [ADMIN_CLIENTS] Auth user deleted successfully');
          }
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
    // Gate by status with fallback
    const status = getClaimStatusForClient(client);
    if (!status || !status.can_invite) {
      toast.error('Este cliente não é elegível para reivindicação de conta');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-client-invite', {
        body: { clientId: client.id },
      });

      if (error) {
        const reason = (error as any)?.context?.response?.reason ?? error.message;
        console.error('❌ [ADMIN_CLIENTS] Invite error:', error);
        toast.error(`Convite não enviado: ${reason}`);
        return;
      }

      if (data?.skipped) {
        toast.info('Convite duplicado ignorado.');
      } else {
        toast.success('Convite enviado.');
      }

      // Refresh to reflect invited state
      fetchClients();
    } catch (error) {
      console.error('❌ [ADMIN_CLIENTS] Error sending claim email:', error);
      toast.error('Erro ao enviar convite');
    }
  };

  const handleBulkSendClaimEmails = async () => {
    // Filter for eligible clients based on RPC (not claimed/verified and not invited)
    const eligibleClients = clients.filter(client => claimStatusMap[client.id]?.can_invite);

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
        const { data, error } = await supabase.functions.invoke('send-client-invite', {
          body: { clientId: client.id },
        });

        if (error || (!data?.ok && !data?.status)) {
          console.error(`❌ [ADMIN_CLIENTS] Bulk invite error for ${client.email}:`, error);
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
          birth_date: petBirthDate ? format(petBirthDate, 'yyyy-MM-dd') : null,
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
    setPetBirthDate(undefined);
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
      location_id: '',
      // Client Profile 2.0 fields
      is_whatsapp: false,
      preferred_channel: 'telefone',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      preferred_staff_profile_id: 'none',
      accessibility_notes: '',
      general_notes: '',
      marketing_source_code: 'not_informed',
      marketing_source_other: ''
    });
    setClientBirthDate(undefined);
    setEmailCheckError('');
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      location_id: client.location_id || '',
      // Client Profile 2.0 fields
      is_whatsapp: client.is_whatsapp || false,
      preferred_channel: client.preferred_channel || 'telefone',
      emergency_contact_name: client.emergency_contact_name || '',
      emergency_contact_phone: client.emergency_contact_phone || '',
      preferred_staff_profile_id: client.preferred_staff_profile_id || 'none',
      accessibility_notes: client.accessibility_notes || '',
      general_notes: client.general_notes || '',
      marketing_source_code: client.marketing_source_code || 'not_informed',
      marketing_source_other: client.marketing_source_other || ''
    });
    setClientBirthDate(client.birth_date ? new Date(client.birth_date) : undefined);
    setEmailCheckError('');
    setIsEditModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const fmtDatePt = (d?: string | Date) => (d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A');

  const handleResendVerification = async (client: Client) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin_resend_verification', {
        method: 'POST',
        body: { email: client.email }
      });
      if (error) throw error;
      toast.success('E-mail de verificação reenviado.');
    } catch (e: any) {
      console.error('[ADMIN_CLIENTS] resend verification error', e);
      toast.error('Falha ao reenviar verificação.');
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

        {/* Data Integrity Warning */}
        {dataIntegrity && dataIntegrity.orphaned_clients > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-medium text-yellow-800">
                    Problema de Integridade de Dados Detectado
                  </h3>
                  <p className="text-sm text-yellow-700">
                    {dataIntegrity.orphaned_clients} cliente(s) com referências órfãs encontrado(s). 
                    Estes registros referenciam usuários que não existem mais.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCleanupOrphanedClients}
                disabled={isCleaningUp}
                variant="outline"
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                {isCleaningUp ? 'Limpando...' : 'Limpar Registros'}
              </Button>
            </div>
          </div>
        )}


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
              disabled={bulkEligibleCount === 0}
            >
              <Send className="h-4 w-4" />
              Envio em Lote ({bulkEligibleCount})
            </Button>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
                     <Label htmlFor="phone">Telefone *</Label>
                     <PhoneInputBR
                       value={formData.phone}
                       onChange={(value) => setFormData({ ...formData, phone: value })}
                       placeholder="(11) 99999-9999"
                     />
                   </div>
                   
                   {/* WhatsApp Checkbox - moved right after phone */}
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
                     <Label htmlFor="email">Email</Label>
                     <Input
                       id="email"
                       type="email"
                       value={formData.email}
                       onChange={(e) => {
                         setFormData({ ...formData, email: e.target.value });
                         if (emailCheckError) setEmailCheckError(''); // Clear error on change
                       }}
                       placeholder="cliente@email.com"
                       className={emailCheckError ? 'border-red-500' : ''}
                     />
                     {emailCheckError && (
                       <p className="text-red-500 text-sm mt-1">{emailCheckError}</p>
                     )}
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

                   {/* Preferred Channel */}
                  <div>
                    <Label htmlFor="preferred_channel">Canal de contato preferido</Label>
                    <Select value={formData.preferred_channel} onValueChange={(value) => setFormData({ ...formData, preferred_channel: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o canal preferido" />
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

                  {/* Emergency Contact */}
                  <div>
                    <Label htmlFor="emergency_contact_name">Contato de emergência</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Nome do contato de emergência"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Telefone do contato de emergência</Label>
                    <PhoneInputBR
                      value={formData.emergency_contact_phone}
                      onChange={(value) => setFormData({ ...formData, emergency_contact_phone: value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  {/* Preferred Staff */}
                  <div>
                    <Label htmlFor="preferred_staff">Profissional preferido</Label>
                    <Select value={formData.preferred_staff_profile_id} onValueChange={(value) => setFormData({ ...formData, preferred_staff_profile_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma preferência</SelectItem>
                        {staffProfiles.length === 0 ? (
                          <SelectItem value="no_staff_available" disabled>
                            {formData.location_id ? 'Nenhum profissional neste local' : 'Selecione um local primeiro'}
                          </SelectItem>
                        ) : (
                          staffProfiles.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name || 'Sem nome'}
                              {!formData.location_id && staff.location_id && (
                                <span className="text-gray-500 text-xs ml-2">
                                  ({locations.find(loc => loc.id === staff.location_id)?.name || 'Local desconhecido'})
                                </span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Birth Date */}
                  <div>
                    <Label htmlFor="birth_date">Data de nascimento</Label>
                    <PetDobPicker
                      value={clientBirthDate}
                      onChange={setClientBirthDate}
                    />
                  </div>

                  {/* Marketing Source */}
                  <div>
                    <Label htmlFor="marketing_source">Como nos conheceu?</Label>
                    <Select value={formData.marketing_source_code} onValueChange={(value) => setFormData({ ...formData, marketing_source_code: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione como nos conheceu (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_informed">Não informado</SelectItem>
                        {MARKETING_SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option.code} value={option.code}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Marketing Source Other (show only if 'outro' is selected) */}
                  {formData.marketing_source_code === 'outro' && (
                    <div>
                      <Label htmlFor="marketing_source_other">Especificar origem</Label>
                      <Input
                        id="marketing_source_other"
                        value={formData.marketing_source_other}
                        onChange={(e) => setFormData({ ...formData, marketing_source_other: e.target.value })}
                        placeholder="Descreva como nos conheceu"
                      />
                    </div>
                  )}

                  {/* Accessibility Notes */}
                  <div>
                    <Label htmlFor="accessibility_notes">Necessidades especiais</Label>
                    <Textarea
                      id="accessibility_notes"
                      value={formData.accessibility_notes}
                      onChange={(e) => setFormData({ ...formData, accessibility_notes: e.target.value })}
                      placeholder="Observações sobre acessibilidade ou necessidades especiais"
                      rows={2}
                    />
                  </div>

                  {/* General Notes */}
                  <div>
                    <Label htmlFor="general_notes">Observações gerais</Label>
                    <Textarea
                      id="general_notes"
                      value={formData.general_notes}
                      onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                      placeholder="Observações gerais sobre o cliente"
                      rows={3}
                    />
                  </div>

                  {/* Email Error Display */}
                  {emailCheckError && (
                    <div className="text-red-600 text-sm mt-2">
                      {emailCheckError}
                    </div>
                  )}

                                <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateClient} 
                  className="flex-1" 
                  disabled={!!emailCheckError || !formData.name || !formData.phone || !formData.location_id}
                >
                  Criar Cliente
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}>
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
          <div className="grid auto-rows-[1fr] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => {
              // Use RPC-driven claim status as source of truth
              const s = getClaimStatusForClient(client);
              const isLinkedAndVerified = s?.linked === true && s?.verified === true;
              const invited = s?.invited === true;
              const status: 'linked' | 'invited' | 'pending' = isLinkedAndVerified ? 'linked' : (invited ? 'invited' : 'pending');

              return (
                <Card key={client.id} className="h-full rounded-2xl border bg-white transition-shadow hover:shadow-lg">
                  <div className="flex h-full flex-col p-0">
                    <CardHeader className="pb-3">
                      <div className="relative">
                        <div className="pr-28">
                          <CardTitle className="truncate text-lg">{client.name}</CardTitle>
                        </div>
                        <div className="absolute right-0 top-0 z-10 flex flex-col items-end gap-1">
                          <Chip className="cursor-pointer" onClick={() => openPetsModal(client)}>
                            <PawPrint className="mr-1 h-3 w-3" />
                            {client.pet_count ?? 0}
                          </Chip>
                          {status === 'linked' && (
                            <Chip tone="success">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Conta Vinculada
                            </Chip>
                          )}
                          {status === 'invited' && (
                            <Chip tone="warning">
                              <Send className="mr-1 h-3 w-3" />
                              Convite Enviado
                            </Chip>
                          )}
                          {status === 'pending' && (
                            <Chip tone="danger">Pendente Registro</Chip>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1.5 text-sm text-gray-600">
                    <Mail className="h-4 w-4 mt-0.5 text-slate-500" />
                    <span
                      className="text-slate-700 truncate max-w-[19rem] md:max-w-[26rem]"
                      title={client.email || ''}
                    >
                      {client.email && client.email.trim() !== '' ? client.email : 'Email faltando'}
                    </span>

                    {client.phone && (
                      <>
                        <Phone className="h-4 w-4 mt-0.5 text-slate-500" />
                        <span className="text-slate-700">{client.phone}</span>
                      </>
                    )}

                    {client.address && (
                      <>
                        <MapPin className="h-4 w-4 mt-0.5 text-slate-500" />
                        <span className="text-slate-700 truncate max-w-[19rem] md:max-w-[26rem]">{client.address}</span>
                      </>
                    )}

                    {client.location_name && (
                      <>
                        <Building className="h-4 w-4 mt-0.5 text-slate-500" />
                        <span className="text-slate-700">{client.location_name}</span>
                      </>
                    )}

                    <Cake className="h-4 w-4 mt-0.5 text-slate-500" />
                    <span className="text-slate-700">
                      Aniversário do tutor: {fmtDatePt(client.birth_date)}
                    </span>
                  </div>

                  {client.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-3">
                      <FileText className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{client.notes}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(client)}
                        className="flex-1 min-w-[140px]"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    
                    {/* Resend verification when linked && !verified */}
                    {(() => { const s = getClaimStatusForClient(client); return s?.linked === true && s?.verified === false; })() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendVerification(client)}
                        className="flex-1 min-w-[180px] text-amber-700 border-amber-200 hover:text-amber-800 hover:border-amber-300"
                        title="Conta criada. Usuário ainda não confirmou o e-mail."
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reenviar Verificação
                      </Button>
                    )}

                    {getClaimStatusForClient(client).can_invite === true ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendClaimEmail(client)}
                        className="flex-1 min-w-[160px] text-blue-700 border-blue-200 hover:text-blue-800 hover:border-blue-300"
                        title={getClaimStatusForClient(client).invited ? 'Reenviar convite' : 'Enviar convite'}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {getClaimStatusForClient(client).invited ? 'Reenviar Convite' : 'Enviar Convite'}
                      </Button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex-1 min-w-[160px]">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="w-full"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Enviar Convite
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {(() => {
                              const s = getClaimStatusForClient(client);
                              const cooldownMs = 24 * 60 * 60 * 1000;
                              const now = Date.now();
                              const inviteAt = client.claim_invited_at ? new Date(client.claim_invited_at).getTime() : 0;
                              const withinCooldown = !!client.claim_invited_at && (now - inviteAt) < cooldownMs;
                              if (!client.email || client.email.trim() === '') return 'Sem e-mail cadastrado';
                              if (withinCooldown) return 'Aguarde 24h para reenviar';
                              if (s?.linked || s?.verified) return 'Conta criada; aguarde verificação do e-mail';
                              return 'Convite indisponível para este registro';
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[44px] px-3 text-red-600 hover:text-red-700">
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
                  </div>
                </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
                 <Label htmlFor="edit-phone">Telefone *</Label>
                 <PhoneInputBR
                   value={formData.phone}
                   onChange={(value) => setFormData({ ...formData, phone: value })}
                   placeholder="(11) 99999-9999"
                 />
               </div>
               
               {/* WhatsApp Checkbox - moved right after phone */}
               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="edit_is_whatsapp"
                   checked={formData.is_whatsapp}
                   onCheckedChange={(checked) => setFormData({...formData, is_whatsapp: checked as boolean})}
                 />
                 <Label htmlFor="edit_is_whatsapp" className="text-sm">
                   Este número é WhatsApp
                 </Label>
               </div>
               
               <div>
                 <Label htmlFor="edit-email">Email</Label>
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

               {/* Preferred Channel */}
              <div>
                <Label htmlFor="edit_preferred_channel">Canal de contato preferido</Label>
                <Select value={formData.preferred_channel} onValueChange={(value) => setFormData({ ...formData, preferred_channel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal preferido" />
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

              {/* Emergency Contact */}
              <div>
                <Label htmlFor="edit_emergency_contact_name">Contato de emergência</Label>
                <Input
                  id="edit_emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Nome do contato de emergência"
                />
              </div>
              <div>
                <Label htmlFor="edit_emergency_contact_phone">Telefone do contato de emergência</Label>
                <PhoneInputBR
                  value={formData.emergency_contact_phone}
                  onChange={(value) => setFormData({ ...formData, emergency_contact_phone: value })}
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Preferred Staff */}
              <div>
                <Label htmlFor="edit_preferred_staff">Profissional preferido</Label>
                <Select value={formData.preferred_staff_profile_id} onValueChange={(value) => setFormData({ ...formData, preferred_staff_profile_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma preferência</SelectItem>
                    {staffProfiles.length === 0 ? (
                      <SelectItem value="no_staff_available" disabled>
                        {formData.location_id ? 'Nenhum profissional neste local' : 'Selecione um local primeiro'}
                      </SelectItem>
                    ) : (
                      staffProfiles.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name || 'Sem nome'}
                          {!formData.location_id && staff.location_id && (
                            <span className="text-gray-500 text-xs ml-2">
                              ({locations.find(loc => loc.id === staff.location_id)?.name || 'Local desconhecido'})
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Birth Date */}
              <div>
                <Label htmlFor="edit_birth_date">Data de nascimento</Label>
                <PetDobPicker
                  value={clientBirthDate}
                  onChange={setClientBirthDate}
                />
              </div>

              {/* Marketing Source */}
              <div>
                <Label htmlFor="edit_marketing_source">Como nos conheceu?</Label>
                <Select value={formData.marketing_source_code} onValueChange={(value) => setFormData({ ...formData, marketing_source_code: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione como nos conheceu (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_informed">Não informado</SelectItem>
                    {MARKETING_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Marketing Source Other (show only if 'outro' is selected) */}
              {formData.marketing_source_code === 'outro' && (
                <div>
                  <Label htmlFor="edit_marketing_source_other">Especificar origem</Label>
                  <Input
                    id="edit_marketing_source_other"
                    value={formData.marketing_source_other}
                    onChange={(e) => setFormData({ ...formData, marketing_source_other: e.target.value })}
                    placeholder="Descreva como nos conheceu"
                  />
                </div>
              )}

              {/* Accessibility Notes */}
              <div>
                <Label htmlFor="edit_accessibility_notes">Necessidades especiais</Label>
                <Textarea
                  id="edit_accessibility_notes"
                  value={formData.accessibility_notes}
                  onChange={(e) => setFormData({ ...formData, accessibility_notes: e.target.value })}
                  placeholder="Observações sobre acessibilidade ou necessidades especiais"
                  rows={2}
                />
              </div>

              {/* General Notes */}
              <div>
                <Label htmlFor="edit_general_notes">Observações gerais</Label>
                <Textarea
                  id="edit_general_notes"
                  value={formData.general_notes}
                  onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                  placeholder="Observações gerais sobre o cliente"
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
                   value={petBirthDate}
                   onChange={setPetBirthDate}
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