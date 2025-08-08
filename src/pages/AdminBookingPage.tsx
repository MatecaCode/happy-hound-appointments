
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { createAdminBooking } from '@/utils/adminBookingUtils';
import { useNavigate } from 'react-router-dom';
import BookingReviewModal from '@/components/admin/BookingReviewModal';
import { AlertCircle } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  user_id: string;
}

interface Pet {
  id: string;
  name: string;
  breed?: string;
}

interface Service {
  id: string;
  name: string;
  default_duration: number;
  base_price: number;
  requires_bath?: boolean;
  requires_grooming?: boolean;
  requires_vet?: boolean;
}

interface Staff {
  id: string;
  name: string;
  can_groom: boolean;
  can_vet: boolean;
  can_bathe?: boolean;
}

interface TimeSlot {
  time_slot: string;
}

const AdminBookingPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  console.log('🔍 [ADMIN_BOOKING] Component initialized');
  console.log('🔍 [ADMIN_BOOKING] User:', user?.email);
  console.log('🔍 [ADMIN_BOOKING] Is Admin:', isAdmin);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  // Updated state for dual-service support
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [selectedPrimaryService, setSelectedPrimaryService] = useState('');
  const [selectedSecondaryService, setSelectedSecondaryService] = useState('');
  const [showSecondaryServiceDropdown, setShowSecondaryServiceDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingData, setReviewBookingData] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (!isAdmin) return;
    
    console.log('🔍 [ADMIN_BOOKING] Loading initial data...');
    
    const loadData = async () => {
      setIsDataLoading(true);
      setDataError(null);
      try {
        // Load clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, user_id')
          .order('name');
        
        if (clientsError) {
          console.error('Error loading clients:', clientsError);
          toast.error('Erro ao carregar clientes');
          return;
        }
        
        console.log('🔍 [ADMIN_BOOKING] Loaded clients:', clientsData);
        setClients(clientsData || []);

        // Load services with additional fields for role requirements
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, default_duration, base_price, requires_bath, requires_grooming, requires_vet')
          .eq('active', true)
          .order('name');
        setServices(servicesData || []);

        // Load available staff (excludes admins)
        const { data: staffData } = await supabase
          .from('available_staff')
          .select('id, name, can_groom, can_vet, can_bathe')
          .order('name');
        setStaff(staffData || []);
        
        console.log('🔍 [ADMIN_BOOKING] Initial data loaded successfully');
        console.log('🔍 [ADMIN_BOOKING] Clients:', clientsData?.length || 0);
        console.log('🔍 [ADMIN_BOOKING] Services:', servicesData?.length || 0);
        console.log('🔍 [ADMIN_BOOKING] Staff:', staffData?.length || 0);
      } catch (error) {
        console.error('Error loading data:', error);
        setDataError('Erro ao carregar dados');
        toast.error('Erro ao carregar dados');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  // Load pets when client changes
  useEffect(() => {
    if (!selectedClient) {
      setPets([]);
      return;
    }

    const loadPets = async () => {
      try {
        console.log('🔍 [ADMIN_BOOKING] Loading pets for client:', selectedClient);
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, breed')
          .eq('client_id', selectedClient)
          .eq('active', true)
          .order('name');
        
        if (petsError) {
          console.error('Error loading pets:', petsError);
          toast.error('Erro ao carregar pets');
          return;
        }
        
        console.log('🔍 [ADMIN_BOOKING] Loaded pets:', petsData);
        setPets(petsData || []);
      } catch (error) {
        console.error('Error loading pets:', error);
        toast.error('Erro ao carregar pets');
      }
    };

    loadPets();
  }, [selectedClient]);

  // Handle primary service selection
  const handlePrimaryServiceChange = (serviceId: string) => {
    setSelectedPrimaryService(serviceId);
    setSelectedSecondaryService(''); // Reset secondary service
    
    const service = services.find(s => s.id === serviceId);
    console.log('🔍 [ADMIN_BOOKING] Selected service:', service);
    
    // More robust check for BANHO services
    const isBanho = service?.name.toLowerCase().includes('banho') || 
                    service?.name.toLowerCase().includes('bath') ||
                    service?.name.toLowerCase().includes('banho completo');
    
    console.log('🔍 [ADMIN_BOOKING] Is BANHO service:', isBanho);
    console.log('🔍 [ADMIN_BOOKING] Service name:', service?.name);
    
    setShowSecondaryServiceDropdown(isBanho);
  };

  // Get TOSA services for secondary dropdown
  const tosaServices = services.filter(service => 
    service.name.toLowerCase().includes('tosa')
  );

  console.log('🔍 [ADMIN_BOOKING] Available TOSA services:', tosaServices.map(s => s.name));
  console.log('🔍 [ADMIN_BOOKING] Show secondary dropdown:', showSecondaryServiceDropdown);

  // Get selected services for calculations
  const primaryService = services.find(s => s.id === selectedPrimaryService);
  const secondaryService = services.find(s => s.id === selectedSecondaryService);

  // Calculate total price and duration
  const totalPrice = (primaryService?.base_price || 0) + (secondaryService?.base_price || 0);
  const totalDuration = (primaryService?.default_duration || 0) + (secondaryService?.default_duration || 0);

  // Calculate required roles for staff filtering
  const requiredRoles = {
    can_bathe: primaryService?.requires_bath || secondaryService?.requires_bath || false,
    can_groom: primaryService?.requires_grooming || secondaryService?.requires_grooming || false,
    can_vet: primaryService?.requires_vet || secondaryService?.requires_vet || false
  };

  // Filter available staff based on combined requirements
  const availableStaff = staff.filter(member => {
    if (requiredRoles.can_bathe && !member.can_bathe) return false;
    if (requiredRoles.can_groom && !member.can_groom) return false;
    if (requiredRoles.can_vet && !member.can_vet) return false;
    return true;
  });

  // Load available time slots when date and service change
  useEffect(() => {
    if (!selectedDate || !selectedPrimaryService) {
      setAvailableSlots([]);
      return;
    }

    const loadTimeSlots = async () => {
      try {
        setIsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        // Manual slot generation for Phase 1 (since RPC may not exist)
        const slots: TimeSlot[] = [];
        
        // Generate 30-minute slots from 9:00 to 16:00 (weekdays) / 12:00 (Saturdays)
        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            slots.push({ time_slot: timeStr });
          }
        }
        
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
        toast.error('Erro ao carregar horários');
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeSlots();
  }, [selectedDate, selectedPrimaryService, selectedSecondaryService, selectedStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !selectedPet || !selectedPrimaryService || !selectedDate || !selectedTimeSlot) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Get client and service data
    const client = clients.find(c => c.id === selectedClient);
    if (!client) {
      toast.error('Cliente não encontrado');
      return;
    }

    const primaryService = services.find(s => s.id === selectedPrimaryService);
    if (!primaryService) {
      toast.error('Serviço primário não encontrado');
      return;
    }

    const staffMember = staff.find(s => s.id === selectedStaff);
    const providerIds = selectedStaff ? [selectedStaff] : [];

    // Prepare booking data for review
    const bookingData = {
      clientName: client.name,
      petName: pets.find(p => p.id === selectedPet)?.name || '',
      primaryServiceName: primaryService.name,
      secondaryServiceName: secondaryService?.name || 'Nenhum',
      totalPrice: totalPrice,
      totalDuration: totalDuration,
      date: selectedDate!,
      time: selectedTimeSlot,
      staffName: staffMember?.name,
      notes: notes || undefined,
      clientUserId: client.id,
      petId: selectedPet,
      primaryServiceId: selectedPrimaryService,
      secondaryServiceId: selectedSecondaryService || null,
      providerIds: providerIds
    };

    setReviewBookingData(bookingData);
    setShowReviewModal(true);
  };

  const handleReviewConfirm = async (bookingData: any) => {
    setIsLoading(true);
    
    try {
      // Calculate total price including addons and extra fee
      const addonsTotal = bookingData.selectedAddons.reduce((sum: number, addon: any) => 
        sum + (addon.price * addon.quantity), 0
      );
      const finalTotalPrice = totalPrice + addonsTotal + bookingData.extraFee;

      // Create the appointment with dual services
      const { data: appointmentId, error } = await supabase.rpc('create_admin_booking_with_dual_services', {
        _client_user_id: bookingData.clientUserId,
        _pet_id: bookingData.petId,
        _primary_service_id: selectedPrimaryService,
        _booking_date: bookingData.bookingDate,
        _time_slot: bookingData.timeSlot,
        _secondary_service_id: selectedSecondaryService || null,
        _calculated_price: finalTotalPrice,
        _calculated_duration: totalDuration,
        _notes: bookingData.notes,
        _provider_ids: bookingData.providerIds,
        _extra_fee: bookingData.extraFee,
        _extra_fee_reason: bookingData.extraFeeReason,
        _addons: bookingData.selectedAddons.length > 0 ? bookingData.selectedAddons : null,
        _created_by: user?.id
      });

      if (error) throw error;

      toast.success('Agendamento criado com sucesso!');
      
      // Reset form
      setSelectedClient('');
      setSelectedPet('');
      setSelectedPrimaryService('');
      setSelectedSecondaryService('');
      setShowSecondaryServiceDropdown(false);
      setSelectedStaff('');
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setNotes('');
      setShowReviewModal(false);
      setReviewBookingData(null);
      
      // Redirect to admin appointments page
      navigate('/admin/appointments');
      
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    console.log('🔍 [ADMIN_BOOKING] Access denied - user is not admin');
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
              <p>Você não tem permissão para acessar esta página.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Agendamento Administrativo</CardTitle>
            <CardDescription>
              Crie agendamentos em nome dos clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDataLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando dados...</p>
              </div>
            )}
            
            {dataError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-700">{dataError}</p>
                </div>
              </div>
            )}
            
            {!isDataLoading && !dataError && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select 
                    value={selectedClient} 
                    onValueChange={(value) => {
                      console.log('🔍 [ADMIN_BOOKING] Client selected:', value);
                      setSelectedClient(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="text-sm text-red-600">Nenhum cliente encontrado</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Clientes carregados: {clients.length} | Cliente selecionado: {selectedClient || 'Nenhum'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet">Pet *</Label>
                  <Select 
                    value={selectedPet} 
                    onValueChange={(value) => {
                      console.log('🔍 [ADMIN_BOOKING] Pet selected:', value);
                      setSelectedPet(value);
                    }}
                    disabled={!selectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} {pet.breed && `(${pet.breed})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient && pets.length === 0 && (
                    <p className="text-sm text-red-600">Nenhum pet encontrado para este cliente</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Pets carregados: {pets.length} | Pet selecionado: {selectedPet || 'Nenhum'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryService">Serviço Principal *</Label>
                  <Select value={selectedPrimaryService} onValueChange={handlePrimaryServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - R$ {service.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Secondary Service Selection */}
                {showSecondaryServiceDropdown && (
                  <div className="space-y-2">
                    <Label htmlFor="secondaryService">Adicionar Tosa (opcional)</Label>
                    <Select value={selectedSecondaryService} onValueChange={setSelectedSecondaryService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tosa adicional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma tosa adicional</SelectItem>
                        {tosaServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - R$ {service.base_price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Debug Section - Remove this after testing */}
                <div className="md:col-span-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <strong>Debug Info:</strong><br/>
                  Selected Primary: {selectedPrimaryService}<br/>
                  Show Secondary Dropdown: {showSecondaryServiceDropdown ? 'YES' : 'NO'}<br/>
                  Primary Service Name: {primaryService?.name}<br/>
                  Available TOSA Services: {tosaServices.length}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff">Profissional (opcional)</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map((staffMember) => (
                        <SelectItem key={staffMember.id} value={staffMember.id}>
                          {staffMember.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Summary */}
                {(primaryService || secondaryService) && (
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Resumo dos Serviços</h3>
                    <div className="space-y-1 text-sm">
                      {primaryService && (
                        <div className="flex justify-between">
                          <span>{primaryService.name}</span>
                          <span>R$ {primaryService.base_price} ({primaryService.default_duration} min)</span>
                        </div>
                      )}
                      {secondaryService && (
                        <div className="flex justify-between">
                          <span>{secondaryService.name}</span>
                          <span>R$ {secondaryService.base_price} ({secondaryService.default_duration} min)</span>
                        </div>
                      )}
                      <div className="border-t pt-1 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>R$ {totalPrice} ({totalDuration} min)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Data do Agendamento *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0; // Disable past dates and Sundays
                  }}
                  className="rounded-md border w-fit"
                />
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label>Horário Disponível *</Label>
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time_slot}
                          type="button"
                          variant={selectedTimeSlot === slot.time_slot ? "default" : "outline"}
                          onClick={() => setSelectedTimeSlot(slot.time_slot)}
                          className="h-10"
                        >
                          {slot.time_slot.substring(0, 5)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum horário disponível para esta data.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o agendamento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !selectedClient || !selectedPet || !selectedPrimaryService || !selectedDate || !selectedTimeSlot}
                className="w-full"
              >
                {isLoading ? 'Criando...' : 'Criar Agendamento'}
              </Button>
            </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Review Modal */}
      {reviewBookingData && (
        <BookingReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewBookingData(null);
          }}
          onConfirm={handleReviewConfirm}
          bookingData={reviewBookingData}
          isLoading={isLoading}
        />
      )}
    </Layout>
  );
};

export default AdminBookingPage;
