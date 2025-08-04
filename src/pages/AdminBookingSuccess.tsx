import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle, ArrowLeft, Calendar, User, PawPrint, Clock, DollarSign, Plus } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface Appointment {
  id: string;
  date: string;
  time: string;
  total_price: number;
  notes?: string;
  client: {
    user: {
      full_name: string;
    };
  };
  pet: {
    name: string;
  };
  service: {
    name: string;
  };
  appointment_staff: Array<{
    staff_profile: {
      full_name: string;
    };
  }>;
}

interface ServiceAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
}

interface AppointmentAddon {
  addon_id: string;
  quantity: number;
  custom_description?: string;
  price: number;
}

const AdminBookingSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const appointmentId = location.state?.appointmentId;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [allAddons, setAllAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AppointmentAddon[]>([]);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeReason, setExtraFeeReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appointmentId) {
      toast({
        title: "Erro",
        description: "ID do agendamento não encontrado",
        variant: "destructive",
      });
      navigate('/admin/manual-booking');
      return;
    }

    fetchAppointmentData();
    fetchAllAddons();
  }, [appointmentId]);

  const fetchAppointmentData = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          total_price,
          notes,
          client:clients!inner(
            user:users!inner(full_name)
          ),
          pet:pets!inner(name),
          service:services!inner(name),
          appointment_staff(
            staff_profile:staff_profiles!inner(full_name)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      setAppointment(data as any);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAddons = async () => {
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllAddons(data || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar add-ons",
        variant: "destructive",
      });
    }
  };

  const handleAddonChange = (addonId: string, quantity: number, customDescription?: string) => {
    const existingIndex = selectedAddons.findIndex(addon => addon.addon_id === addonId);
    
    if (quantity === 0) {
      // Remove addon if quantity is 0
      setSelectedAddons(prev => prev.filter(addon => addon.addon_id !== addonId));
    } else {
      const addon = allAddons.find(a => a.id === addonId);
      if (!addon) return;

      const updatedAddon: AppointmentAddon = {
        addon_id: addonId,
        quantity,
        custom_description: customDescription,
        price: addon.price * quantity
      };

      if (existingIndex >= 0) {
        // Update existing addon
        setSelectedAddons(prev => prev.map((item, index) => 
          index === existingIndex ? updatedAddon : item
        ));
      } else {
        // Add new addon
        setSelectedAddons(prev => [...prev, updatedAddon]);
      }
    }
  };

  const calculateTotal = () => {
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const basePrice = appointment?.total_price || 0;
    return basePrice + addonsTotal + extraFee;
  };

  const handleSave = async () => {
    if (!appointmentId) return;

    setSaving(true);
    try {
      // Update appointment with extra fee
      if (extraFee > 0 || extraFeeReason) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            total_price: calculateTotal(),
            notes: appointment?.notes ? 
              `${appointment.notes}\n\nTaxa Extra: R$ ${extraFee.toFixed(2)}\nMotivo: ${extraFeeReason}` :
              `Taxa Extra: R$ ${extraFee.toFixed(2)}\nMotivo: ${extraFeeReason}`
          })
          .eq('id', appointmentId);

        if (updateError) throw updateError;
      }

      // Insert selected add-ons
      if (selectedAddons.length > 0) {
        const addonInserts = selectedAddons.map(addon => ({
          appointment_id: appointmentId,
          addon_id: addon.addon_id,
          quantity: addon.quantity,
          custom_description: addon.custom_description,
          price: addon.price
        }));

        const { error: addonError } = await supabase
          .from('appointment_addons')
          .insert(addonInserts);

        if (addonError) throw addonError;
      }

      toast({
        title: "Sucesso",
        description: "Add-ons salvos com sucesso!",
      });

      // Navigate back to appointments list
      navigate('/admin/appointments');
    } catch (error) {
      console.error('Error saving add-ons:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar add-ons",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/admin/appointments');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Agendamento não encontrado</p>
          <Button onClick={() => navigate('/admin/manual-booking')} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const staffNames = appointment.appointment_staff
    .map(staff => staff.staff_profile?.full_name || 'N/A')
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/manual-booking')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Agendamento Criado com Sucesso!
          </h1>
          <p className="text-gray-600">
            Agora você pode adicionar add-ons opcionais ao serviço
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appointment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Resumo do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <PawPrint className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Pet:</span>
                <span>{appointment.pet.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Cliente:</span>
                <span>{appointment.client.user.full_name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Serviço:</span>
                <span>{appointment.service.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Profissional:</span>
                <span>{staffNames}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Data:</span>
                <span>{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Horário:</span>
                <span>{formatTime(appointment.time)}</span>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Preço Base:</span>
                <span>R$ {appointment.total_price.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Add-ons Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                + Add-ons Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {allAddons.length === 0 ? (
                <p className="text-gray-500">Nenhum add-on disponível no sistema</p>
              ) : (
                <div className="space-y-4">
                  {allAddons.map((addon) => {
                    const selectedAddon = selectedAddons.find(a => a.addon_id === addon.id);
                    const quantity = selectedAddon?.quantity || 0;
                    
                    return (
                      <div key={addon.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{addon.name}</h4>
                            {addon.description && (
                              <p className="text-sm text-gray-600 mt-1">{addon.description}</p>
                            )}
                            <p className="text-sm text-green-600 font-medium mt-1">
                              R$ {addon.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`quantity-${addon.id}`} className="text-sm">Qtd:</Label>
                            <Select
                              value={quantity.toString()}
                              onValueChange={(value) => handleAddonChange(addon.id, parseInt(value))}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {quantity > 0 && (
                          <div className="space-y-2">
                            <Label htmlFor={`description-${addon.id}`} className="text-sm">
                              Descrição personalizada (opcional):
                            </Label>
                            <Textarea
                              id={`description-${addon.id}`}
                              placeholder="Descreva detalhes específicos para este add-on..."
                              value={selectedAddon?.custom_description || ''}
                              onChange={(e) => handleAddonChange(addon.id, quantity, e.target.value)}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra Fee Section */}
              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium">Taxa Extra (opcional)</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="extra-fee">Valor (R$):</Label>
                    <Input
                      id="extra-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={extraFee}
                      onChange={(e) => setExtraFee(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extra-fee-reason">Motivo:</Label>
                    <Textarea
                      id="extra-fee-reason"
                      placeholder="Explique o motivo da taxa extra..."
                      value={extraFeeReason}
                      onChange={(e) => setExtraFeeReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saving}
          >
            Pular Add-ons
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Add-ons'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingSuccess; 