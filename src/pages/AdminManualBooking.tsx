import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientCombobox } from '@/components/ClientCombobox';
import { ServiceCombobox } from '@/components/ServiceCombobox';
import { BookingCalendar } from '@/components/calendars/admin/BookingCalendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Search
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { usePricing } from '@/hooks/usePricing';
import { useAdminAvailability } from '@/hooks/useAdminAvailability';
import { toHHMM, toHHMMSS, toLocalISO } from '@/utils/time';


interface Client {
  id: string;
  name: string;
  email: string | null;
  user_id: string;
}

interface Pet {
  id: string;
  name: string;
  breed?: string;
  size?: string;
  client_id: string;
  breed_id?: string;
}

interface Service {
  id: string;
  name: string;
  service_type: string;
  base_price: number;
  default_duration: number;
  description?: string;
  requires_bath?: boolean;
  requires_grooming?: boolean;
  requires_vet?: boolean;
  active?: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  can_bathe?: boolean;
  can_groom?: boolean;
  can_vet?: boolean;
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  hasConflict: boolean;
  conflictDetails?: string;
  status: 'available' | 'occupied' | 'unavailable';
  tooltipMessage: string;
}

type BookingData = {
  clientUserId: string | null;   // claimed client only (guardrail)
  clientId?: string | null;      // always set when a client is selected (claimed or unclaimed)
  petId: string | null;

  date: string | null;           // 'YYYY-MM-DD'
  time: string | null;           // 'HH:mm:ss'
  
  primary?: { 
    service_id: string; 
    staff_id: string; 
  };
  secondary?: { 
    service_id: string; 
    staff_id: string; 
  }; // present only if user picked

  // Legacy fields for backward compatibility during transition
  primaryServiceId: string | null;
  secondaryServiceId: string | null;
  staffByRole: {
    banhista?: string;
    tosador?: string;
    veterinario?: string;
  };
  selectedDateISO: string | null;   // "YYYY-MM-DD"
  selectedTimeHHMM: string | null;  // "HH:MM"

  notes?: string | null;
  extraFee?: number;
  extraFeeReason?: string | null;
};

const AdminManualBooking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingPets, setIsLoadingPets] = useState(false);

  // Selected items for comboboxes
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSecondaryService, setSelectedSecondaryService] = useState<Service | null>(null);
  const [showSecondaryServiceDropdown, setShowSecondaryServiceDropdown] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());

  // Handle month change from calendar
  const handleMonthChange = (newMonth: Date) => {
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Calendar month change requested:', newMonth.toISOString().split('T')[0]);
    setVisibleMonth(newMonth);
  };

  // Disable date logic for booking calendar
  const isDisabledDate = (date: Date) => {
    const d0 = new Date(date);
    d0.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (d0 < today) return true;
    
    // Disable Sundays
    if (d0.getDay() === 0) return true;
    
    return false;
  };

  // Optimized staff name mapping for Resumo
  const staffNameById = useMemo(
    () => Object.fromEntries((staffMembers ?? []).map(s => [s.id, s.name ?? ''])),
    [staffMembers]
  );

  // Booking form data
  const [bookingData, setBookingData] = useState<BookingData>({
    clientUserId: null,
    clientId: null,
    petId: null,

    date: null,           // 'YYYY-MM-DD'
    time: null,           // 'HH:mm:ss'
    primary: undefined,
    secondary: undefined,

    // Legacy fields for backward compatibility
    primaryServiceId: null,
    secondaryServiceId: null,
    staffByRole: {},
    selectedDateISO: null,
    selectedTimeHHMM: null,

    notes: null,
    extraFee: 0,
    extraFeeReason: null,
  });

  // Handle primary service selection
  const handlePrimaryServiceChange = (service: Service) => {
    setSelectedService(service);
    setSelectedSecondaryService(null); // Reset secondary service
    
    // Check if this is a BANHO service
    const isBanho = service.name.toLowerCase().includes('banho');
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Selected service:', service.name);
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Is BANHO service:', isBanho);
    
    setShowSecondaryServiceDropdown(isBanho);
    
    setBookingData(prev => ({ 
      ...prev, 
      primary: { service_id: service.id, staff_id: '' }, // Initialize with empty staff_id
      secondary: undefined, // Reset secondary when primary changes
      // Legacy compatibility
      primaryServiceId: service.id,
      secondaryServiceId: null,
      staffByRole: {} // Reset staff when service changes
    }));
  };

  // Get TOSA services for secondary dropdown
  const tosaServices = services.filter(service => 
    service.name.toLowerCase().includes('tosa')
  );

  // Pricing logic - moved before calculations
  const pricingParams = {
    serviceId: bookingData.primaryServiceId,
    breedId: selectedPet?.breed, // Use breed name, not breed_id
    size: selectedPet?.size
  };
  
  console.log('🔍 [ADMIN_MANUAL_BOOKING] Pricing params:', pricingParams);
  console.log('🔍 [ADMIN_MANUAL_BOOKING] Selected pet:', selectedPet);
  
  const { pricing } = usePricing(pricingParams);

  // Calculate combined price and duration
  const primaryServicePrice = selectedService ? (pricing?.price || selectedService.base_price) : 0;
  const primaryServiceDuration = selectedService ? (pricing?.duration || selectedService.default_duration) : 0;
  const secondaryServicePrice = selectedSecondaryService?.base_price || 0;
  const secondaryServiceDuration = selectedSecondaryService?.default_duration || 0;

  const totalPrice = primaryServicePrice + secondaryServicePrice;
  const totalDuration = primaryServiceDuration + secondaryServiceDuration;

  // Update booking data when pricing changes
  useEffect(() => {
    if (pricing && pricing.price > 0 && pricing.duration > 0) {
      setBookingData(prev => ({
        ...prev,
        price: totalPrice, // Use combined price
        duration: totalDuration // Use combined duration
      }));
    }
  }, [pricing, totalPrice, totalDuration]);

  const { fetchAdminTimeSlots, timeSlots: adminTimeSlots, loading: availabilityLoading } = useAdminAvailability();

  // Load initial data
  useEffect(() => {
    loadClients();
    loadServices();
    loadStaffMembers();
  }, []);

  // Load pets when client changes
  useEffect(() => {
    if (selectedClient?.id) {
      loadPets(selectedClient.id);
    } else {
      setPets([]);
    }
  }, [selectedClient]);

  // Load time slots when date or staff changes
  useEffect(() => {
    if (bookingData.selectedDateISO && getStaffIds().length > 0) {
      // Create date without timezone conversion by parsing YYYY-MM-DD locally
      const [year, month, day] = bookingData.selectedDateISO.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-based
      loadTimeSlots(date, getStaffIds());
    }
  }, [bookingData.selectedDateISO, bookingData.staffByRole]);

  // Transform admin time slots when they change
  useEffect(() => {
    console.log('🔄 [ADMIN_MANUAL_BOOKING] Admin time slots changed:', adminTimeSlots);
    
    if (adminTimeSlots.length > 0) {
      // Transform admin time slots to match our interface
      const transformedSlots: TimeSlot[] = adminTimeSlots.map(slot => {
        const label = toHHMM(slot.time);
        
        return {
          id: slot.id,
          time: label, // Use HH:MM format for display
          available: slot.available, // Use the available property from the hook
          hasConflict: false, // Will be determined by validation
          conflictDetails: undefined,
          status: slot.available ? 'available' : 'occupied', // Red for booked/unavailable
          tooltipMessage: slot.available ? 'Horário disponível' : 'Horário ocupado - Clique para override'
        };
      });

      console.log('✅ [ADMIN_MANUAL_BOOKING] Transformed slots:', transformedSlots);
      console.log('🔍 [ADMIN_MANUAL_BOOKING] Available count:', transformedSlots.filter(s => s.available).length);
      console.log('🔍 [ADMIN_MANUAL_BOOKING] Occupied count:', transformedSlots.filter(s => !s.available).length);
      setTimeSlots(transformedSlots);
    }
  }, [adminTimeSlots]);

  // Helper function to get staff IDs from staffByRole
  const getStaffIds = () => {
    return Object.values(bookingData.staffByRole).filter(id => id) as string[];
  };

  const loadClients = async () => {
    try {
      setIsLoadingClients(true);
      console.log('Loading clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, user_id')
        .order('name');

      if (error) {
        console.error('Supabase error loading clients:', error);
        throw error;
      }
      
      console.log('Clients loaded:', data?.length || 0, 'clients');
      console.log('First client sample:', data?.[0]);
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erro ao carregar clientes');
      setClients([]); // Ensure we always have an array
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadPets = async (clientId: string) => {
    try {
      setIsLoadingPets(true);
      console.log('Loading pets for client:', clientId);
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, breed, size, client_id, breed_id')
        .eq('client_id', clientId)
        .order('name');

      if (error) {
        console.error('Supabase error loading pets:', error);
        throw error;
      }
      
      console.log('Pets loaded:', data?.length || 0, 'pets');
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
      toast.error('Erro ao carregar pets');
    } finally {
      setIsLoadingPets(false);
    }
  };

  const loadServices = async () => {
    try {
      console.log('Loading services...');
      const { data, error } = await supabase
        .from('services')
        .select('id, name, service_type, base_price, default_duration, description, requires_bath, requires_grooming, requires_vet, active')
        .order('name');

      if (error) {
        console.error('Supabase error loading services:', error);
        throw error;
      }
      
      console.log('Services loaded:', data?.length || 0, 'services');
      console.log('First service sample:', data?.[0]);
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Erro ao carregar serviços');
      setServices([]); // Ensure we always have an array
    }
  };

  const loadStaffMembers = async () => {
    try {
      console.log('Loading staff members...');
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, name, email, can_bathe, can_groom, can_vet')
        .order('name');

      if (error) {
        console.error('Supabase error loading staff:', error);
        throw error;
      }
      
      console.log('Staff loaded:', data?.length || 0, 'staff members');
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Erro ao carregar profissionais');
      setStaffMembers([]); // Ensure we always have an array
    }
  };

  const loadTimeSlots = async (date: Date, staffIds: string[]) => {
    try {
      console.log('🔧 [ADMIN_MANUAL_BOOKING] Loading admin time slots');
      console.log('📅 [ADMIN_MANUAL_BOOKING] Date:', date);
      console.log('👥 [ADMIN_MANUAL_BOOKING] Staff IDs:', staffIds);

      // Get the selected services
      const primaryService = services.find(s => s.id === bookingData.primaryServiceId);
      const secondaryService = bookingData.secondaryServiceId ? 
        services.find(s => s.id === bookingData.secondaryServiceId) : null;
      
      if (!primaryService) {
        console.log('⚠️ [ADMIN_MANUAL_BOOKING] No primary service selected');
        setTimeSlots([]);
        return;
      }

      console.log('🔧 [ADMIN_MANUAL_BOOKING] Services for time slot loading:', {
        primary: primaryService.name,
        secondary: secondaryService?.name || 'None'
      });

      // Use admin-specific time slot fetching with dual-service support
      await fetchAdminTimeSlots(date, staffIds, primaryService, secondaryService);
      
    } catch (error) {
      console.error('❌ [ADMIN_MANUAL_BOOKING] Error loading time slots:', error);
      toast.error('Erro ao carregar horários');
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTimeSlotSelect = async (slot: TimeSlot) => {
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Time slot selected:', slot);
    setSelectedTimeSlot(slot);
    
    // Always set the timeSlot regardless of status
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Setting timeSlot to:', slot.time);
    setBookingData(prev => {
      const newData = { 
        ...prev, 
        time: toHHMMSS(slot.time), // New state structure (convert to HH:mm:ss)
        selectedTimeHHMM: slot.time // Legacy compatibility
      };
      console.log('🔧 [ADMIN_MANUAL_BOOKING] Updated booking data:', newData);
      return newData;
    });
    
    if (slot.status === 'available') {
      console.log('🔧 [ADMIN_MANUAL_BOOKING] Slot available, proceeding normally');
      return;
    }
    
    // For occupied slots, show override warning
    if (slot.status === 'occupied') {
      console.log('🔧 [ADMIN_MANUAL_BOOKING] Validating unavailable slot for conflicts');
      
      try {
        const staffIds = getStaffIds();
        const primaryStaffId = staffIds[0];
        const secondaryStaffId = staffIds.length > 1 ? staffIds[1] : null;
        
        const { data, error } = await supabase.rpc('validate_dual_service_slot', {
          _date: bookingData.selectedDateISO!,
          _start_time: toHHMMSS(slot.time),
          _primary_staff_id: primaryStaffId,
          _primary_service_id: bookingData.primaryServiceId,
          _secondary_staff_id: secondaryStaffId,
          _secondary_service_id: selectedSecondaryService?.id || null
        });
        
        if (error) {
          console.error('❌ [ADMIN_MANUAL_BOOKING] Validation error:', error);
          toast.error('Erro ao validar horário');
          return;
        }
        
        const validationResult = data?.[0];
        if (!validationResult?.ok) {
          console.log('🔧 [ADMIN_MANUAL_BOOKING] Conflict detected, showing override modal');
          setConflictDetails(validationResult?.reason || 'Conflito detectado');
          setShowConflictModal(true);
          return;
        } else {
          console.log('🔧 [ADMIN_MANUAL_BOOKING] Validation passed, proceeding');
          return;
        }
      } catch (error) {
        console.error('❌ [ADMIN_MANUAL_BOOKING] Validation error:', error);
        toast.error('Erro ao validar horário');
        return;
      }
    }
  };



  const handleStaffSelection = (staffId: string, role: 'banhista' | 'tosador' | 'veterinario') => {
    setBookingData(prev => {
      const currentStaffId = prev.staffByRole[role];
      
      // If clicking the same staff member, unselect them
      if (currentStaffId === staffId) {
        const newStaffByRole = { ...prev.staffByRole };
        delete newStaffByRole[role];
        
        // Update new state structure based on service requirements
        let updatedPrimary = prev.primary;
        let updatedSecondary = prev.secondary;
        
        // Check if this staff was assigned to primary service
        if (prev.primary && prev.primaryServiceId) {
          const primaryService = services.find(s => s.id === prev.primaryServiceId);
          if (primaryService && 
              ((primaryService.requires_bath && role === 'banhista') ||
               (primaryService.requires_grooming && role === 'tosador') ||
               (primaryService.requires_vet && role === 'veterinario'))) {
            updatedPrimary = { ...prev.primary, staff_id: '' };
          }
        }
        
        // Check if this staff was assigned to secondary service
        if (prev.secondary && prev.secondaryServiceId) {
          const secondaryService = services.find(s => s.id === prev.secondaryServiceId);
          if (secondaryService && 
              ((secondaryService.requires_bath && role === 'banhista') ||
               (secondaryService.requires_grooming && role === 'tosador') ||
               (secondaryService.requires_vet && role === 'veterinario'))) {
            updatedSecondary = { ...prev.secondary, staff_id: '' };
          }
        }
        
        return { 
          ...prev, 
          staffByRole: newStaffByRole,
          primary: updatedPrimary,
          secondary: updatedSecondary
        };
      }
      
      // Otherwise, select the new staff member for this role
      const newStaffByRole = {
        ...prev.staffByRole,
        [role]: staffId
      };
      
      // Update new state structure based on service requirements
      let updatedPrimary = prev.primary;
      let updatedSecondary = prev.secondary;
      
      // Check if this staff should be assigned to primary service
      if (prev.primary && prev.primaryServiceId) {
        const primaryService = services.find(s => s.id === prev.primaryServiceId);
        if (primaryService && 
            ((primaryService.requires_bath && role === 'banhista') ||
             (primaryService.requires_grooming && role === 'tosador') ||
             (primaryService.requires_vet && role === 'veterinario'))) {
          updatedPrimary = { ...prev.primary, staff_id: staffId };
        }
      }
      
      // Check if this staff should be assigned to secondary service
      if (prev.secondary && prev.secondaryServiceId) {
        const secondaryService = services.find(s => s.id === prev.secondaryServiceId);
        if (secondaryService && 
            ((secondaryService.requires_bath && role === 'banhista') ||
             (secondaryService.requires_grooming && role === 'tosador') ||
             (secondaryService.requires_vet && role === 'veterinario'))) {
          updatedSecondary = { ...prev.secondary, staff_id: staffId };
        }
      }
      
      return {
        ...prev,
        staffByRole: newStaffByRole,
        primary: updatedPrimary,
        secondary: updatedSecondary
      };
    });
  };

  const checkForConflicts = async () => {
    if (!bookingData.selectedDateISO || !bookingData.selectedTimeHHMM) return null;

    const dateStr = bookingData.selectedDateISO;
    const staffIds = getStaffIds();

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        time,
        duration,
        appointment_staff!inner(staff_profile_id)
      `)
      .eq('date', dateStr)
      .in('appointment_staff.staff_profile_id', staffIds);

    if (error) {
      console.error('Error checking conflicts:', error);
      return null;
    }

    const conflicts = existingAppointments?.filter(appointment => {
      const appointmentStart = new Date(`2000-01-01T${appointment.time}:00`);
      const appointmentEnd = new Date(`2000-01-01T${appointment.time}:00`);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + (appointment.duration || 60));
      
      const bookingStart = new Date(`2000-01-01T${bookingData.selectedTimeHHMM}:00`);
      const bookingEnd = new Date(`2000-01-01T${bookingData.selectedTimeHHMM}:00`);
      bookingEnd.setMinutes(bookingEnd.getMinutes() + (totalDuration || 60));
      
      return (bookingStart < appointmentEnd && bookingEnd > appointmentStart);
    }) || [];

    return conflicts.length > 0 ? conflicts : null;
  };

  const createBooking = async (isOverride = false) => {
    console.log('🔧 [ADMIN_MANUAL_BOOKING] createBooking called with isOverride:', isOverride);
    
    // Safeguard: if timeSlot is missing but selectedTimeSlot exists, use it
    let finalTimeSlot = bookingData.selectedTimeHHMM;
    if (!finalTimeSlot && selectedTimeSlot) {
      console.log('🔧 [ADMIN_MANUAL_BOOKING] Using selectedTimeSlot as fallback:', selectedTimeSlot.time);
      finalTimeSlot = selectedTimeSlot.time;
    }
    
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Validation check:', {
      user: !!user?.id,
      clientId: bookingData.clientId,
      petId: bookingData.petId,
      primaryServiceId: bookingData.primaryServiceId,
      secondaryServiceId: bookingData.secondaryServiceId,
      staffByRole: bookingData.staffByRole,
      date: bookingData.selectedDateISO,
      time: bookingData.selectedTimeHHMM,
    });
    
    const missingUser = !user?.id;
    const missingClientId = !bookingData.clientId;         // allow claimed or unclaimed (clientId always set)
    const missingPetId = !bookingData.petId;
    const missingServiceId = !bookingData.primaryServiceId;
    const missingDate = !bookingData.selectedDateISO;
    const missingTimeSlot = !bookingData.selectedTimeHHMM;
    const missingSecondaryServiceStaff = !!bookingData.secondaryServiceId && Object.keys(bookingData.staffByRole).length < 2;

    if (missingUser || missingClientId || missingPetId || missingServiceId ||
        missingDate || missingTimeSlot || missingSecondaryServiceStaff) {
      console.error('❌ [ADMIN_MANUAL_BOOKING] Validation failed:', {
        missingUser, missingClientId, missingPetId, missingServiceId,
        missingDate, missingTimeSlot, missingSecondaryServiceStaff
      });
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    try {
      const client = bookingData.clientUserId
        ? clients.find(c => c.user_id === bookingData.clientUserId)
        : clients.find(c => c.id === bookingData.clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const service = services.find(s => s.id === bookingData.primaryServiceId);
      if (!service) {
        throw new Error('Serviço não encontrado');
      }

      const dateStr = bookingData.selectedDateISO;
      const staffIds = getStaffIds();

      // 🧠 DETERMINISTIC payload builder with single source of truth
      function buildCreatePayload(): Record<string, any> | null {
        // Validate required fields using new state structure (allow claimed or unclaimed)
        if (!(bookingData.clientUserId || bookingData.clientId) || !bookingData.petId || !bookingData.primary?.service_id || 
            !bookingData.date || !bookingData.time || !user?.id) {
          console.error('❌ [ADMIN_MANUAL_BOOKING] Missing required fields for payload');
          console.error('Missing fields:', {
            clientUserId: !bookingData.clientUserId,
            clientId: !bookingData.clientId,
            petId: !bookingData.petId,
            primaryService: !bookingData.primary?.service_id,
            primaryStaff: !bookingData.primary?.staff_id,
            date: !bookingData.date,
            time: !bookingData.time,
            user: !user?.id
          });
          return null;
        }

        // Determine claimed vs unclaimed for client routing
        const isClaimed = !!bookingData.clientUserId;

        // Build payload for unified RPC (required params first, then optional with defaults)
        const payload = {
          // Required parameters (no defaults)
          _booking_date: bookingData.date,           // 'YYYY-MM-DD'
          _time_slot: bookingData.time,             // 'HH:mm:ss'
          _pet_id: bookingData.petId,
          _primary_service_id: bookingData.primary.service_id,
          _provider_ids: [
            bookingData.primary.staff_id,
            ...(bookingData.secondary?.staff_id ? [bookingData.secondary.staff_id] : [])
          ].filter(Boolean),
          _created_by: user.id,
          // Optional parameters (with defaults)
          _client_user_id: isClaimed ? bookingData.clientUserId : null,
          _client_id: isClaimed ? null : (bookingData.clientId ?? null),
          _secondary_service_id: bookingData.secondary?.service_id ?? null,
          _notes: bookingData.notes ?? null,
          _extra_fee: bookingData.extraFee ?? 0,
          _extra_fee_reason: bookingData.extraFeeReason ?? null,
          _addons: [], // TODO: Add addons support later
          _override_conflicts: false
        };

        console.table(payload);

        // Hard guard: if a secondary service is selected in UI state, both secondary ids must exist
        if (bookingData.secondary && (!payload._secondary_service_id || !bookingData.secondary.staff_id)) {
          throw new Error('[ADMIN_BOOKING] Secondary selected but missing ids');
        }

        console.log('[DEBUG] Final payload structure:', {
          ...payload,
          provider_ids_details: payload._provider_ids.map((id: string, index: number) => ({
            index,
            staff_id: id,
            staff_name: staffMembers.find(s => s.id === id)?.name || 'Unknown'
          }))
        });
        
        return payload;
      }

      const payload = buildCreatePayload();
      if (!payload) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      // Add debugging logs
      console.log('[CREATE_BOOKING] payload keys', payload && Object.keys(payload));
      console.log('[CREATE_BOOKING] payload', payload);

      // Always use unified RPC for all booking scenarios
      const rpcName = 'create_unified_admin_booking';

      console.log(`[ADMIN_BOOKING] Using unified RPC: ${rpcName}`);
      console.log(`[ADMIN_BOOKING] Secondary service exists: ${!!bookingData.secondary}`);

      const { data: appointmentId, error } = await supabase.rpc(rpcName, payload);

      if (error) {
        console.error('[CREATE_BOOKING] rpc error', error);
        throw error;
      }

      console.log('✅ [ADMIN_MANUAL_BOOKING] Booking created successfully:', appointmentId);

      toast.success('Agendamento criado com sucesso!');
      // Redirect to add-ons confirmation page
      navigate('/admin/booking-success', { 
        state: { appointmentId: appointmentId } 
      });
    } catch (error: any) {
      console.error('❌ [ADMIN_MANUAL_BOOKING] Error creating booking:', error);
      
      // Handle specific error messages
      let errorMessage = 'Erro ao criar agendamento';
      if (error.message) {
        if (error.message.includes('Sundays')) {
          errorMessage = 'Agendamentos não são permitidos aos domingos';
        } else if (error.message.includes('not available')) {
          errorMessage = 'Profissional não disponível no horário selecionado';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Dados inválidos - verifique cliente, pet ou serviço';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('🔧 [ADMIN_MANUAL_BOOKING] handleSubmit called with booking data:', bookingData);
    
    if (!bookingData.selectedDateISO || !bookingData.selectedTimeHHMM) {
      console.log('❌ [ADMIN_MANUAL_BOOKING] Missing date or time:', {
        selectedDateISO: bookingData.selectedDateISO,
        selectedTimeHHMM: bookingData.selectedTimeHHMM
      });
      toast.error('Por favor, selecione uma data e horário');
      return;
    }

    // Check if it's Sunday
    const [year, month, day] = bookingData.selectedDateISO.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-based
    const isSunday = selectedDate.getDay() === 0; // 0 = Sunday
    if (isSunday) {
      toast.error('Agendamentos não são permitidos aos domingos');
      return;
    }

    const staffIds = getStaffIds();
    if (staffIds.length === 0) {
      toast.error('Por favor, selecione pelo menos um profissional');
      return;
    }

    // If manual override is enabled, proceed directly with override
    if (manualOverride) {
      console.log('[ADMIN_MANUAL_BOOKING] Manual override enabled, proceeding with override booking');
      await createBooking(true);
      return;
    }

    // Check for conflicts with existing appointments
    const conflicts = await checkForConflicts();
    
    if (conflicts && conflicts.length > 0) {
      // Show override confirmation modal
      setConflictDetails(`Este profissional já possui ${conflicts.length} agendamento(s) neste horário. Deseja prosseguir mesmo assim?`);
      setShowConflictModal(true);
      return;
    }

    // No conflicts, proceed with normal booking
    await createBooking(false);
  };

  const handleOverrideConfirm = async () => {
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Override confirmed, booking data:', bookingData);
    console.log('🔧 [ADMIN_MANUAL_BOOKING] User:', user);
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Staff IDs:', getStaffIds());
    console.log('🔧 [ADMIN_MANUAL_BOOKING] Selected time slot:', selectedTimeSlot);
    console.log('🔧 [ADMIN_MANUAL_BOOKING] All validation fields present:', {
      user: !!user,
      clientUserId: !!bookingData.clientUserId,
      petId: !!bookingData.petId,
      primaryServiceId: !!bookingData.primaryServiceId,
      selectedDateISO: !!bookingData.selectedDateISO,
      selectedTimeHHMM: !!bookingData.selectedTimeHHMM
    });
    await createBooking(true);
    setShowConflictModal(false);
  };

  const canProceedToStep2 = bookingData.clientId && bookingData.petId && bookingData.primaryServiceId;
  const canProceedToStep3 = canProceedToStep2 && Object.keys(bookingData.staffByRole).length > 0;
  const canSubmit = canProceedToStep3 && bookingData.selectedDateISO && bookingData.selectedTimeHHMM;

  // Get required roles for the selected service
  const getRequiredRoles = () => {
    const roles = [];
    
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Determining required roles...');
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Selected primary service:', selectedService);
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Selected secondary service:', selectedSecondaryService);
    
    // Check primary service requirements
    if (selectedService) {
      console.log('🔍 [ADMIN_MANUAL_BOOKING] Primary service requirements:', {
        requires_bath: selectedService.requires_bath,
        requires_grooming: selectedService.requires_grooming,
        requires_vet: selectedService.requires_vet
      });
      
      if (selectedService.requires_bath) roles.push('banhista');
      if (selectedService.requires_grooming) roles.push('tosador');
      if (selectedService.requires_vet) roles.push('veterinario');
    }
    
    // Check secondary service requirements
    if (selectedSecondaryService) {
      console.log('🔍 [ADMIN_MANUAL_BOOKING] Secondary service requirements:', {
        requires_bath: selectedSecondaryService.requires_bath,
        requires_grooming: selectedSecondaryService.requires_grooming,
        requires_vet: selectedSecondaryService.requires_vet
      });
      
      if (selectedSecondaryService.requires_bath) roles.push('banhista');
      if (selectedSecondaryService.requires_grooming) roles.push('tosador');
      if (selectedSecondaryService.requires_vet) roles.push('veterinario');
    }
    
    // Remove duplicates
    const uniqueRoles = [...new Set(roles)];
    console.log('🔍 [ADMIN_MANUAL_BOOKING] Final required roles:', uniqueRoles);
    
    return uniqueRoles;
  };

  // Get staff members for a specific role
  const getStaffForRole = (role: string) => {
    return staffMembers.filter(staff => {
      switch (role) {
        case 'banhista':
          return staff.can_bathe;
        case 'tosador':
          return staff.can_groom;
        case 'veterinario':
          return staff.can_vet;
        default:
          return false;
      }
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/actions')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Agendamento Manual</h1>
          </div>
          <p className="text-gray-600">
            Crie agendamentos em nome dos clientes com permissão de override
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">
            {currentStep === 1 && 'Selecionar Cliente, Pet e Serviço'}
            {currentStep === 2 && 'Selecionar Profissionais'}
            {currentStep === 3 && 'Escolher Data e Horário'}
          </div>
        </div>

        {/* Step 1: Client, Pet, Service Selection */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Passo 1: Informações Básicas
              </CardTitle>
              <CardDescription>
                Selecione o cliente, pet e serviço para o agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client-select">Cliente</Label>
                <ClientCombobox
                  clients={clients ?? []}
                  onSelect={(client) => {
                    setSelectedClient(client);
                    setBookingData(prev => ({ 
                      ...prev, 
                    clientUserId: client.user_id ?? null, 
                    clientId: client.id,
                      petId: null // Reset pet when client changes
                    }));
                  }}
                  selectedClient={selectedClient}
                />
              </div>

              {/* Pet Selection */}
              <div className="space-y-2">
                <Label htmlFor="pet-select">Pet</Label>
                <Select
                  value={bookingData.petId || ''}
                  onValueChange={(value) => {
                    const pet = pets.find(p => p.id === value);
                    setSelectedPet(pet || null);
                    setBookingData(prev => ({ ...prev, petId: value }));
                  }}
                  disabled={!selectedClient?.id || isLoadingPets}
                >
                  <SelectTrigger id="pet-select">
                    <SelectValue placeholder={
                      !selectedClient?.id ? "Selecione um cliente primeiro" :
                      isLoadingPets ? "Carregando..." : "Selecione um pet"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPets ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Carregando pets...</span>
                      </div>
                    ) : pets.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Este cliente não possui pets cadastrados
                      </div>
                    ) : (
                      pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          <div className="flex flex-col items-start">
                            <span>{pet.name}</span>
                            {pet.breed && (
                              <span className="text-xs text-muted-foreground">
                                {pet.breed} - {pet.size}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label htmlFor="service-select">Serviço Principal</Label>
                <ServiceCombobox
                  services={services ?? []}
                  onSelect={handlePrimaryServiceChange}
                  selectedService={selectedService}
                />
              </div>

              {/* Secondary Service Selection (if BANHO is selected) */}
              {showSecondaryServiceDropdown && (
                <div className="space-y-2">
                  <Label htmlFor="secondary-service-select">Serviço Secundário (opcional)</Label>
                  <ServiceCombobox
                    services={tosaServices}
                    onSelect={(service) => {
                      setSelectedSecondaryService(service);
                      setBookingData(prev => ({ 
                        ...prev, 
                        secondary: service ? { service_id: service.id, staff_id: '' } : undefined,
                        // Legacy compatibility
                        secondaryServiceId: service?.id || null
                        // Keep existing staff selections - don't reset when adding secondary service
                      }));
                    }}
                    selectedService={selectedSecondaryService}
                  />
                </div>
              )}

              {/* Service Information Display */}
              {selectedService && (() => {
                // Debug logging for Resumo state
                console.table({
                  primary_staff_id: bookingData.primary?.staff_id,
                  secondary_staff_id: bookingData.secondary?.staff_id
                });

                // Derive names from single source of truth
                const primaryName = bookingData.primary?.staff_id
                  ? (staffNameById[bookingData.primary.staff_id] || 'Não atribuído')
                  : 'Não atribuído';

                const secondaryName = bookingData.secondary?.staff_id
                  ? (staffNameById[bookingData.secondary.staff_id] || 'Não atribuído')
                  : 'Não atribuído';

                return (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3 text-gray-900">Informações do Serviço</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-600">Serviço Principal:</span>
                      <span className="font-medium text-gray-900 ml-1">{selectedService.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600">Preço Principal:</span>
                      <span className="font-semibold text-green-600 ml-1">R$ {primaryServicePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600">Duração Principal:</span>
                      <span className="font-semibold text-blue-600 ml-1">{primaryServiceDuration} minutos</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600">Profissional:</span>
                      <span className="font-medium text-gray-900 ml-1">{primaryName}</span>
                    </div>
                    
                    {/* Secondary Service Information */}
                    {selectedSecondaryService && (
                      <>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center">
                            <span className="text-gray-600">Serviço Secundário:</span>
                            <span className="font-medium text-gray-900 ml-1">{selectedSecondaryService.name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600">Preço Secundário:</span>
                            <span className="font-semibold text-green-600 ml-1">R$ {secondaryServicePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600">Duração Secundária:</span>
                            <span className="font-semibold text-blue-600 ml-1">{secondaryServiceDuration} minutos</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600">Profissional:</span>
                            <span className="font-medium text-gray-900 ml-1">{secondaryName}</span>
                          </div>
                        </div>
                        
                        {/* Combined Total */}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center">
                            <span className="text-gray-600 font-medium">Total Combinado:</span>
                            <span className="font-semibold text-green-600 ml-1">R$ {totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-600">Duração Total:</span>
                            <span className="font-semibold text-blue-600 ml-1">{totalDuration} minutos</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {selectedService.description && (
                      <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                        {selectedService.description}
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}

              {/* Debug Section - Only show in debug mode */}
              {(() => {
                const isDebug =
                  (typeof window !== 'undefined' &&
                   new URLSearchParams(window.location.search).get('debug') === '1') ||
                  (typeof localStorage !== 'undefined' &&
                   localStorage.getItem('debug') === '1');
                
                return isDebug ? (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Debug Info:</strong><br/>
                    Selected Service: {selectedService?.name || 'None'}<br/>
                    Show Secondary Dropdown: {showSecondaryServiceDropdown ? 'YES' : 'NO'}<br/>
                    Available TOSA Services: {tosaServices.length}<br/>
                    TOSA Services: {tosaServices.map(s => s.name).join(', ')}
                  </div>
                ) : null;
              })()}

              {/* Next Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleNextStep}
                  disabled={!canProceedToStep2}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Staff Selection */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Passo 2: Seleção de Profissionais
              </CardTitle>
              <CardDescription>
                Selecione os profissionais que irão realizar o serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {getRequiredRoles().map((role) => {
                const roleStaff = getStaffForRole(role);
                const selectedStaffId = bookingData.staffByRole[role as keyof typeof bookingData.staffByRole];
                const roleLabel = {
                  banhista: 'Banhista',
                  tosador: 'Tosador',
                  veterinario: 'Veterinário'
                }[role];

                return (
                  <div key={role} className="space-y-3">
                    <Label>Selecionar {roleLabel}</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {roleStaff.map((staff) => (
                        <div
                          key={staff.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedStaffId === staff.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleStaffSelection(staff.id, role as any)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{staff.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {staff.email}
                              </span>
                            </div>
                            {selectedStaffId === staff.id && (
                              <CheckCircle className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleNextStep}
                  disabled={!canProceedToStep3}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Date and Time Selection */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Passo 3: Data e Horário
              </CardTitle>
              <CardDescription>
                Escolha a data e horário para o agendamento (override permitido)
              </CardDescription>
            </CardHeader>
                        <CardContent className="space-y-6">
              {/* Desktop Layout: Calendar left, Time slots right */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                {/* Left Column: Calendar + Legend */}
                <div className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <BookingCalendar
                      selected={bookingData.selectedDateISO ? (() => {
                        const [year, month, day] = bookingData.selectedDateISO.split('-').map(Number);
                        return new Date(year, month - 1, day); // month is 0-based
                      })() : null}
                      onSelect={(date) => {
                        const selectedDateISO = date ? toLocalISO(date) : null;
                        console.log('[CALENDAR]', { 
                          clicked: date, 
                          clickedDay: date?.getDate(),
                          selectedDateISO,
                          selectedDay: selectedDateISO?.split('-')[2]
                        });
                        setBookingData(prev => ({ 
                          ...prev, 
                          date: selectedDateISO, // New state structure
                          selectedDateISO // Legacy compatibility
                        }));
                      }}
                      visibleMonth={visibleMonth}
                      onMonthChange={handleMonthChange}
                      disabled={isDisabledDate}
                      className="rounded-md border w-fit"
                    />
                  </div>

                  {/* Color Legend - Only show when date is selected */}
                  {bookingData.selectedDateISO && (
                    <div className="space-y-2">
                      <Label>Legenda</Label>
                      <div className="flex flex-col gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-green-500 rounded"></div>
                          <span>Disponível</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-red-500 bg-red-50 rounded"></div>
                          <span>Ocupado</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Time Slots */}
                {bookingData.selectedDateISO && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Horário</Label>
                      
                      <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-60 overflow-y-auto">
                        {availabilityLoading ? (
                          <div className="col-span-full flex items-center justify-center py-8">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-gray-600">Carregando horários...</span>
                            </div>
                          </div>
                        ) : timeSlots.length > 0 ? (
                          <TooltipProvider>
                            {timeSlots.map((slot) => {
                              let buttonVariant: "default" | "outline" | "secondary" = "outline";
                              let buttonClassName = "h-auto py-2";
                              
                              if (bookingData.selectedTimeHHMM === slot.time) {
                                buttonVariant = "default";
                              } else {
                                switch (slot.status) {
                                  case 'available':
                                    buttonClassName += " border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600";
                                    break;
                                  case 'occupied':
                                    buttonClassName += " border-red-500 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-600";
                                    break;
                                  default:
                                    buttonClassName += " border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed";
                                    break;
                                }
                              }

                              return (
                                <Tooltip key={slot.id}>
                                  <TooltipTrigger asChild>
                                                                    <Button
                                  variant={buttonVariant}
                                  className={buttonClassName}
                                  onClick={() => handleTimeSlotSelect(slot)}
                                  disabled={slot.status === 'unavailable'}
                                >
                                      <div className="flex flex-col items-center">
                                        <span>{slot.time}</span>
                                      </div>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{slot.tooltipMessage}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </TooltipProvider>
                        ) : (
                          <div className="col-span-full flex items-center justify-center py-8">
                            <span className="text-sm text-gray-500">Nenhum horário disponível</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Override Toggle */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="manual-override"
                    checked={manualOverride}
                    onCheckedChange={setManualOverride}
                  />
                  <Label htmlFor="manual-override" className="text-sm font-medium">
                    Forçar Override (Ignorar conflitos)
                  </Label>
                </div>
                {manualOverride && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      O agendamento será criado mesmo com conflitos de horário. 
                      Apenas slots originalmente disponíveis serão consumidos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre o agendamento..."
                  value={bookingData.notes || ''}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Agendamento'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conflict Modal */}
        <Dialog open={showConflictModal} onOpenChange={(open) => {
          console.log('🔧 [ADMIN_MANUAL_BOOKING] Conflict modal onOpenChange:', open);
          console.log('🔧 [ADMIN_MANUAL_BOOKING] Current booking data:', bookingData);
          setShowConflictModal(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirmação de Override
              </DialogTitle>
              <DialogDescription>
                Este horário já possui um agendamento existente. 
                Como administrador, você pode prosseguir com o agendamento mesmo assim.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {conflictDetails}
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🔧 [ADMIN_MANUAL_BOOKING] Conflict modal cancelled');
                  setShowConflictModal(false);
                  // Don't reset selectedTimeSlot to preserve the booking data
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleOverrideConfirm}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirmar Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminManualBooking; 