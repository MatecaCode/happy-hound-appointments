
import React, { useState, useEffect } from 'react';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Clock, Edit, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Define the Appointment interface explicitly
interface Appointment {
  id: string;
  date: string;
  time: string;
  pet_name: string;
  service: string;
  owner_name: string;
  owner_phone?: string;
  notes?: string;
  status: string;
}

interface Pet {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  service_type: string;
}

const GroomerCalendar = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  // Form states for adding appointment
  const [newAppointment, setNewAppointment] = useState({
    pet_id: '',
    pet_name: '',
    service_id: '',
    service: '',
    time: '',
    owner_name: '',
    owner_phone: '',
    notes: ''
  });
  
  const maxDate = addMonths(new Date(), 3);
  
  // Generate available time slots
  useEffect(() => {
    const generateTimeSlots = () => {
      const times = [];
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const formattedHour = hour.toString().padStart(2, '0');
          const formattedMinute = minute.toString().padStart(2, '0');
          times.push(`${formattedHour}:${formattedMinute}`);
        }
      }
      
      return times;
    };
    
    setAvailableTimes(generateTimeSlots());
  }, []);
  
  // Fetch appointments when date changes or appointments are modified
  useEffect(() => {
    if (!user) return;
    
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        // Only fetch appointments for this groomer, without filtering on service_type
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', user.id);
        
        if (error) {
          throw error;
        }
        
        setAppointments(data || []);
      } catch (error: any) {
        console.error('Error fetching appointments:', error.message);
        toast.error('Erro ao carregar agendamentos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user, date]);
  
  // Fetch pet and service data
  useEffect(() => {
    const fetchPetsAndServices = async () => {
      try {
        // Fetch pets
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name');
          
        if (petsError) throw petsError;
        setPets(petsData || []);
        
        // Fetch grooming services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, service_type')
          .eq('service_type', 'grooming');
          
        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      } catch (error: any) {
        console.error('Error fetching data:', error.message);
      }
    };
    
    fetchPetsAndServices();
  }, []);
  
  // Handle adding a new appointment
  const handleAddAppointment = async () => {
    if (!newAppointment.pet_name || !newAppointment.service || !newAppointment.time || !newAppointment.owner_name) {
      toast.error('Por favor preencha todos os campos obrigatórios');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Format date to ISO string format needed for the database
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const appointmentData = {
        user_id: user?.id || '', // This would be the client user ID in a real scenario
        provider_id: user?.id, // The current logged in groomer
        pet_id: newAppointment.pet_id || null,
        pet_name: newAppointment.pet_name,
        service_id: newAppointment.service_id || null,
        service: newAppointment.service,
        date: formattedDate,
        time: newAppointment.time,
        owner_name: newAppointment.owner_name,
        owner_phone: newAppointment.owner_phone || null,
        notes: newAppointment.notes || null,
        status: 'upcoming'
        // Removed service_type field as it doesn't exist in the database
      };
      
      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);
      
      if (error) throw error;
      
      toast.success('Agendamento adicionado com sucesso!');
      
      // Reset form and refresh appointments
      setNewAppointment({
        pet_id: '',
        pet_name: '',
        service_id: '',
        service: '',
        time: '',
        owner_name: '',
        owner_phone: '',
        notes: ''
      });
      
      setIsAddingAppointment(false);
      
      // Refresh appointments list
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', user?.id);
      
      if (fetchError) throw fetchError;
      setAppointments(data || []);
      
    } catch (error: any) {
      console.error('Error adding appointment:', error.message);
      toast.error('Erro ao adicionar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting an appointment
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Agendamento excluído com sucesso!');
      
      // Update the appointments list
      setAppointments(appointments.filter(apt => apt.id !== id));
    } catch (error: any) {
      console.error('Error deleting appointment:', error.message);
      toast.error('Erro ao excluir agendamento');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle updating appointment status
  const handleUpdateStatus = async (id: string, status: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Status atualizado com sucesso!');
      
      // Update the appointments in state
      setAppointments(appointments.map(apt => 
        apt.id === id ? { ...apt, status } : apt
      ));
    } catch (error: any) {
      console.error('Error updating status:', error.message);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter appointments for the selected date
  const selectedDateAppointments = appointments.filter(
    (apt) => apt.date === format(date, 'yyyy-MM-dd')
  );
  
  // Check if user has groomer role
  if (!user || user.user_metadata?.role !== 'groomer') {
    return (
      <Layout>
        <div className="py-16 px-6 text-center">
          <h1 className="mb-4 text-2xl font-bold">Acesso Restrito</h1>
          <p>Esta página é apenas para tosadores.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <section className="bg-secondary/50 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="mb-4">Calendário de <span className="text-primary">Tosas</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gerencie seus agendamentos de tosa.
          </p>
        </div>
      </section>
      
      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Calendário</CardTitle>
                  <CardDescription>
                    Selecione uma data para ver os agendamentos
                  </CardDescription>
                </div>
                <Dialog open={isAddingAppointment} onOpenChange={setIsAddingAppointment}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-1">
                      <PlusCircle className="h-4 w-4" />
                      <span>Novo</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Adicionar Agendamento</DialogTitle>
                      <DialogDescription>
                        Adicione um novo agendamento manualmente para {format(date, 'dd/MM/yyyy')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="petName">Nome do Pet</Label>
                          <Input
                            id="petName"
                            value={newAppointment.pet_name}
                            onChange={(e) => setNewAppointment({
                              ...newAppointment,
                              pet_name: e.target.value
                            })}
                            placeholder="Nome do pet"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="service">Serviço</Label>
                          <Select
                            value={newAppointment.service_id}
                            onValueChange={(value) => {
                              const selectedService = services.find(s => s.id === value);
                              setNewAppointment({
                                ...newAppointment,
                                service_id: value,
                                service: selectedService?.name || ''
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="time">Horário</Label>
                          <Select
                            value={newAppointment.time}
                            onValueChange={(value) => {
                              setNewAppointment({
                                ...newAppointment,
                                time: value
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o horário" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTimes.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            defaultValue="upcoming"
                            disabled
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upcoming">Agendado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="ownerName">Nome do Cliente</Label>
                          <Input
                            id="ownerName"
                            value={newAppointment.owner_name}
                            onChange={(e) => setNewAppointment({
                              ...newAppointment,
                              owner_name: e.target.value
                            })}
                            placeholder="Nome do cliente"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="ownerPhone">Telefone do Cliente</Label>
                          <Input
                            id="ownerPhone"
                            value={newAppointment.owner_phone}
                            onChange={(e) => setNewAppointment({
                              ...newAppointment,
                              owner_phone: e.target.value
                            })}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={newAppointment.notes}
                          onChange={(e) => setNewAppointment({
                            ...newAppointment,
                            notes: e.target.value
                          })}
                          placeholder="Observações sobre o pet ou serviço"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingAppointment(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddAppointment} disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  className="rounded-md border shadow pointer-events-auto"
                  fromDate={new Date()}
                  toDate={maxDate}
                  locale={ptBR}
                />
              </CardContent>
            </Card>
            
            {/* Profile Update Sheet */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações profissionais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GroomerProfileUpdate />
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Agendamentos para {format(date, 'dd/MM/yyyy')}
                </CardTitle>
                <CardDescription>
                  {selectedDateAppointments.length === 0 
                    ? 'Não há agendamentos para esta data' 
                    : `${selectedDateAppointments.length} agendamento(s) encontrado(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8">Carregando agendamentos...</p>
                ) : (
                  <div className="space-y-4">
                    {selectedDateAppointments.map((appointment) => (
                      <Card key={appointment.id}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-2">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                <p className="font-semibold">{appointment.time}</p>
                              </div>
                              <p className="text-lg font-semibold">{appointment.service}</p>
                              <p className="text-sm">Pet: {appointment.pet_name}</p>
                              <div className="mt-2">
                                <Select
                                  value={appointment.status}
                                  onValueChange={(value) => handleUpdateStatus(appointment.id, value)}
                                >
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="upcoming">Agendado</SelectItem>
                                    <SelectItem value="completed">Concluído</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="col-span-2">
                              <p className="text-sm">Cliente: {appointment.owner_name}</p>
                              {appointment.owner_phone && (
                                <p className="text-sm">Telefone: {appointment.owner_phone}</p>
                              )}
                              {appointment.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <strong>Observações:</strong> {appointment.notes}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex justify-end items-start">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleDeleteAppointment(appointment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Os agendamentos são mostrados no horário local.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Component for updating groomer profile
const GroomerProfileUpdate = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    specialty: ''
  });
  
  // Fetch current profile data
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setProfileData({
            name: data.name || '',
            phone: data.phone || '',
            specialty: user.user_metadata?.specialty || ''
          });
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error.message);
      }
    };
    
    fetchProfile();
  }, [user]);
  
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // Update the user metadata
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
          phone: profileData.phone,
          specialty: profileData.specialty
        }
      });
      
      if (userError) throw userError;
      
      toast.success('Perfil atualizado com sucesso!');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="w-full">
          <Edit className="h-4 w-4 mr-2" /> Atualizar Perfil
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Atualizar Perfil</SheetTitle>
          <SheetDescription>
            Atualize suas informações profissionais
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Select
              value={profileData.specialty}
              onValueChange={(value) => setProfileData(prev => ({ ...prev, specialty: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tosa Higiênica">Tosa Higiênica</SelectItem>
                <SelectItem value="Banho e Tosa">Banho e Tosa</SelectItem>
                <SelectItem value="Tosa Especializada">Tosa Especializada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={handleUpdateProfile}
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GroomerCalendar;
