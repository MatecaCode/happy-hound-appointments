import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Eye, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SlotDebugData {
  provider_id: string;
  date: string;
  time: string;
  staff_available: boolean;
  shower_available: boolean;
  change_type: string | null;
  slot_type: string | null;
  trigger_source: string | null;
  appointment_id: string | null;
  created_at: string | null;
}

const AdminDebugAvailability = () => {
  const { providerId, date } = useParams<{ providerId: string; date: string }>();
  const [slots, setSlots] = useState<SlotDebugData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerName, setProviderName] = useState<string>('');
  const [showDoubleBookedOnly, setShowDoubleBookedOnly] = useState(false);

  useEffect(() => {
    const fetchDebugData = async () => {
      if (!providerId || !date) return;
      
      setIsLoading(true);
      try {
        console.log('🔍 [DEBUG_AVAILABILITY] Fetching debug data for provider:', providerId, 'date:', date);
        
        // Get provider name
        const { data: providerData } = await supabase
          .from('staff_profiles')
          .select('name')
          .eq('id', providerId)
          .single();
        
        if (providerData) {
          setProviderName(providerData.name);
        }
        
        // Get debug data
        const { data, error } = await supabase
          .from('slot_debug_view')
          .select('*')
          .eq('provider_id', providerId)
          .eq('date', date)
          .order('time', { ascending: true });

        if (error) {
          console.error('❌ [DEBUG_AVAILABILITY] Error fetching debug data:', error);
          throw error;
        }
        
        console.log('✅ [DEBUG_AVAILABILITY] Debug data:', data);
        setSlots(data || []);
        
      } catch (error) {
        console.error('❌ [DEBUG_AVAILABILITY] Error:', error);
        toast.error('Erro ao carregar dados de debug');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebugData();
  }, [providerId, date]);

  const filteredSlots = showDoubleBookedOnly 
    ? slots.filter(slot => !slot.staff_available && slot.change_type === 'override')
    : slots;

  const exportToCSV = () => {
    const headers = ['Time', 'Staff Available', 'Shower Available', 'Change Type', 'Trigger Source', 'Appointment ID', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredSlots.map(slot => [
        slot.time,
        slot.staff_available,
        slot.shower_available,
        slot.change_type || '',
        slot.trigger_source || '',
        slot.appointment_id || '',
        slot.created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `availability_debug_${providerName}_${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getChangeTypeBadge = (changeType: string | null) => {
    if (!changeType) return null;
    
    const badgeColors = {
      'consume': 'bg-blue-100 text-blue-800',
      'revert': 'bg-green-100 text-green-800',
      'override': 'bg-red-100 text-red-800',
      'edit-shift': 'bg-yellow-100 text-yellow-800',
      'cron': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={badgeColors[changeType as keyof typeof badgeColors] || 'bg-gray-100 text-gray-800'}>
        {changeType}
      </Badge>
    );
  };

  const getAvailabilityStatus = (available: boolean) => {
    return (
      <span className={`font-mono ${available ? 'text-green-600' : 'text-red-500'}`}>
        {String(available)}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/admin/appointments">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Debug de Disponibilidade</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">
            Profissional: <span className="font-semibold">{providerName}</span> | 
            Data: <span className="font-semibold">{date && format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Controles de Visualização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={showDoubleBookedOnly ? "default" : "outline"}
              onClick={() => setShowDoubleBookedOnly(!showDoubleBookedOnly)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {showDoubleBookedOnly ? 'Mostrar Todos' : 'Apenas Duplos Agendamentos'}
            </Button>
            
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Dados de Debug - {filteredSlots.length} slots encontrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Carregando dados de debug...</span>
              </div>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p className="text-gray-600">Não há dados de debug para esta data e profissional.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left border-b">Horário</th>
                    <th className="p-3 text-left border-b">Staff</th>
                    <th className="p-3 text-left border-b">Shower</th>
                    <th className="p-3 text-left border-b">Tipo de Mudança</th>
                    <th className="p-3 text-left border-b">Trigger</th>
                    <th className="p-3 text-left border-b">Agendamento</th>
                    <th className="p-3 text-left border-b">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map((slot, i) => (
                    <tr key={i} className={`border-t ${!slot.staff_available && slot.change_type === 'override' ? 'bg-red-50' : ''}`}>
                      <td className="p-3 border-b font-mono">{slot.time}</td>
                      <td className="p-3 border-b">
                        {getAvailabilityStatus(slot.staff_available)}
                      </td>
                      <td className="p-3 border-b">
                        {getAvailabilityStatus(slot.shower_available)}
                      </td>
                      <td className="p-3 border-b">
                        {getChangeTypeBadge(slot.change_type)}
                      </td>
                      <td className="p-3 border-b text-sm">
                        {slot.trigger_source || '—'}
                      </td>
                      <td className="p-3 border-b">
                        {slot.appointment_id ? (
                          <Link 
                            to={`/admin/appointments`}
                            className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                          >
                            {slot.appointment_id.slice(0, 8)}...
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 border-b text-sm text-gray-600">
                        {slot.created_at ? format(new Date(slot.created_at), 'dd/MM HH:mm:ss') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDebugAvailability; 