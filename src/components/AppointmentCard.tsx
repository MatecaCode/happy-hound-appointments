
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Dog, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppointmentActions from './appointment/AppointmentActions';
import ServiceStatusDropdown from '@/components/appointments/ServiceStatusDropdown';
import { useAuth } from '@/hooks/useAuth';
import { useCanEditServiceStatus } from '@/hooks/useCanEditServiceStatus';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentCardProps {
  appointment: {
    id: string;
    date: string;
    time: string;
    status: string;
    service_status: string;
    notes?: string;
    service: {
      name: string;
      price: number;
    };
    pet: {
      name: string;
      breed?: string;
    };
    provider?: {
      name: string;
    };
    // ✅ ADD: Add-ons support
    addons?: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
      custom_description?: string;
    }>;
    // ✅ ADD: Service-specific staff assignments
    service_staff?: Array<{
      service_id: string;
      service_name: string;
      staff_name: string;
      role: string;
    }>;
  };
  onUpdate?: () => void;
}

const AppointmentCard = ({ appointment, onUpdate }: AppointmentCardProps) => {
  const { user, isAdmin } = useAuth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Aguardando Aprovação';
      case 'cancelled':
        return 'Cancelado';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  // Calculate total price including add-ons
  const addonsTotal = appointment.addons?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
  const finalTotal = appointment.service.price + addonsTotal;

  // Helper: determine if current user is assigned staff for this appointment
  const canEditService = useCanEditServiceStatus({ appointmentId: appointment.id, isAdmin });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {appointment.service.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(appointment.status)}>
              {getStatusText(appointment.status)}
            </Badge>
            <ServiceStatusDropdown
              appointmentId={appointment.id}
              value={appointment.service_status as any}
              canEdit={canEditService}
            />
            <AppointmentActions 
              appointmentId={appointment.id}
              status={appointment.status}
              onCancel={onUpdate}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(appointment.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{appointment.time}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Dog className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {appointment.pet.name}
              {appointment.pet.breed && ` (${appointment.pet.breed})`}
            </span>
          </div>
          
          {/* Staff Assignment Display */}
          {appointment.service_staff && appointment.service_staff.length > 0 ? (
            <div className="flex items-start space-x-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Profissionais:</p>
                <div className="space-y-1 mt-1">
                  {appointment.service_staff.map((staff, index) => (
                    <div key={staff.service_id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        • {staff.service_name}: {staff.staff_name}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {staff.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : appointment.provider ? (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{appointment.provider.name}</span>
            </div>
          ) : null}
        </div>
        
        {appointment.notes && (
          <div className="flex items-start space-x-2 pt-2 border-t">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Observações:</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          </div>
        )}

        {/* ✅ ADD: Add-ons display */}
        {appointment.addons && appointment.addons.length > 0 && (
          <div className="flex items-start space-x-2 pt-2 border-t">
            <div className="h-4 w-4 text-green-500 mt-0.5">➕</div>
            <div>
              <p className="text-sm font-medium text-green-700">Add-ons:</p>
              <div className="space-y-1">
                {appointment.addons.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      • {addon.name} (x{addon.quantity})
                    </span>
                    <span className="text-green-600 font-medium">
                      R$ {addon.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Preço: R$ {finalTotal.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCard;
