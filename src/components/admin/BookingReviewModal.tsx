import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  PawPrint, 
  Scissors, 
  DollarSign, 
  Plus, 
  Minus,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ServiceAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  applies_to_service_id?: string;
}

interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface BookingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingData: BookingData) => Promise<void>;
  bookingData: {
    clientName: string;
    petName: string;
    serviceName: string;
    servicePrice: number;
    date: Date;
    time: string;
    staffName?: string;
    notes?: string;
    clientUserId: string;
    petId: string;
    serviceId: string;
    providerIds: string[];
  };
  isLoading?: boolean;
}

interface BookingData {
  clientUserId: string;
  petId: string;
  serviceId: string;
  providerIds: string[];
  bookingDate: string;
  timeSlot: string;
  notes?: string;
  extraFee: number;
  extraFeeReason?: string;
  selectedAddons: SelectedAddon[];
  overrideConflicts: boolean;
}

const BookingReviewModal: React.FC<BookingReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingData,
  isLoading = false
}) => {
  const [availableAddons, setAvailableAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [extraFee, setExtraFee] = useState<string>('0');
  const [extraFeeReason, setExtraFeeReason] = useState<string>('');
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);

  // Load available addons
  useEffect(() => {
    if (isOpen) {
      loadAddons();
    }
  }, [isOpen, bookingData.serviceId]);

  const loadAddons = async () => {
    setIsLoadingAddons(true);
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .select('*')
        .eq('active', true)
        .or(`applies_to_service_id.is.null,applies_to_service_id.eq.${bookingData.serviceId}`)
        .order('name');

      if (error) throw error;
      setAvailableAddons(data || []);
    } catch (error) {
      console.error('Error loading addons:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar add-ons disponíveis",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAddons(false);
    }
  };

  const handleAddonToggle = (addon: ServiceAddon) => {
    const existingIndex = selectedAddons.findIndex(a => a.id === addon.id);
    
    if (existingIndex >= 0) {
      // Remove addon
      setSelectedAddons(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // Add addon
      setSelectedAddons(prev => [...prev, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: 1
      }]);
    }
  };

  const handleAddonQuantityChange = (addonId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAddons(prev => prev.filter(a => a.id !== addonId));
    } else {
      setSelectedAddons(prev => prev.map(a => 
        a.id === addonId ? { ...a, quantity } : a
      ));
    }
  };

  const isAddonSelected = (addonId: string) => {
    return selectedAddons.some(a => a.id === addonId);
  };

  const getSelectedAddon = (addonId: string) => {
    return selectedAddons.find(a => a.id === addonId);
  };

  const calculateTotal = () => {
    const basePrice = bookingData.servicePrice;
    const addonsTotal = selectedAddons.reduce((sum, addon) => 
      sum + (addon.price * addon.quantity), 0
    );
    const extraFeeAmount = parseFloat(extraFee) || 0;
    
    return basePrice + addonsTotal + extraFeeAmount;
  };

  const handleConfirm = async () => {
    const bookingDataToSubmit: BookingData = {
      clientUserId: bookingData.clientUserId,
      petId: bookingData.petId,
      serviceId: bookingData.serviceId,
      providerIds: bookingData.providerIds,
      bookingDate: format(bookingData.date, 'yyyy-MM-dd'),
      timeSlot: bookingData.time,
      notes: bookingData.notes,
      extraFee: parseFloat(extraFee) || 0,
      extraFeeReason: extraFeeReason || undefined,
      selectedAddons,
      overrideConflicts: true
    };

    await onConfirm(bookingDataToSubmit);
  };

  const total = calculateTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Revisão do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Booking Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhes do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client & Pet */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{bookingData.clientName}</p>
                    <p className="text-sm text-gray-600">Cliente</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <PawPrint className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{bookingData.petName}</p>
                    <p className="text-sm text-gray-600">Pet</p>
                  </div>
                </div>

                {/* Service */}
                <div className="flex items-center gap-3">
                  <Scissors className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{bookingData.serviceName}</p>
                    <p className="text-sm text-gray-600">Serviço</p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {format(bookingData.date, 'EEEE, d \'de\' MMMM', { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-600">Data</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{bookingData.time}</p>
                    <p className="text-sm text-gray-600">Horário</p>
                  </div>
                </div>

                {/* Staff */}
                {bookingData.staffName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{bookingData.staffName}</p>
                      <p className="text-sm text-gray-600">Profissional</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {bookingData.notes && (
                  <div className="pt-2">
                    <Label className="text-sm font-medium">Observações</Label>
                    <p className="text-sm text-gray-600 mt-1">{bookingData.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extra Fee */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Taxa Extra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="extraFee">Valor (R$)</Label>
                  <Input
                    id="extraFee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraFee}
                    onChange={(e) => setExtraFee(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraFeeReason">Motivo (opcional)</Label>
                  <Textarea
                    id="extraFeeReason"
                    value={extraFeeReason}
                    onChange={(e) => setExtraFeeReason(e.target.value)}
                    placeholder="Ex: Taxa de urgência, material especial..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Add-ons & Total */}
          <div className="space-y-6">
            {/* Available Add-ons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add-ons Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAddons ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span className="ml-2">Carregando add-ons...</span>
                  </div>
                ) : availableAddons.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {availableAddons.map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isAddonSelected(addon.id)}
                              onCheckedChange={() => handleAddonToggle(addon)}
                            />
                            <div>
                              <p className="font-medium">{addon.name}</p>
                              {addon.description && (
                                <p className="text-sm text-gray-600">{addon.description}</p>
                              )}
                              <p className="text-sm font-medium text-green-600">
                                R$ {addon.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          {isAddonSelected(addon.id) && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddonQuantityChange(addon.id, getSelectedAddon(addon.id)!.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">
                                {getSelectedAddon(addon.id)!.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddonQuantityChange(addon.id, getSelectedAddon(addon.id)!.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum add-on disponível para este serviço
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Selected Add-ons */}
            {selectedAddons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add-ons Selecionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedAddons.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-sm text-gray-600">
                            {addon.quantity}x R$ {addon.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-medium">
                          R$ {(addon.price * addon.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Price */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">Resumo de Preços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Serviço base:</span>
                  <span>R$ {bookingData.servicePrice.toFixed(2)}</span>
                </div>
                
                {selectedAddons.length > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons:</span>
                    <span>R$ {selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0).toFixed(2)}</span>
                  </div>
                )}
                
                {parseFloat(extraFee) > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa extra:</span>
                    <span>R$ {parseFloat(extraFee).toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold text-green-800">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Criando agendamento...' : 'Confirmar Agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingReviewModal; 