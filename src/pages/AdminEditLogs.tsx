import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, AlertTriangle, FileText, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminEditLog {
  id: string;
  appointment_id: string;
  edited_by: string;
  edit_timestamp: string;
  operation_type: string;
  old_values: any;
  new_values: any;
  changes_summary: string;
  old_staff_assignments: any;
  new_staff_assignments: any;
  staff_changes_summary: string;
  slots_freed: number;
  slots_blocked: number;
  extension_slots_blocked: number;
  availability_impact: any;
  force_override: boolean;
  override_reason: string;
  conflicts_overridden: any;
  admin_notes: string;
  edit_reason: string;
  client_impact_assessment: string;
  system_info: any;
  appointment_date: string;
  appointment_time: string;
  appointment_status: string;
  pet_name: string;
  client_name: string;
  edited_by_name: string;
}

const AdminEditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminEditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState('all');
  const [overrideFilter, setOverrideFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchEditLogs();
  }, []);

  const fetchEditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_edit_logs_detailed')
        .select('*')
        .order('edit_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching edit logs:', error);
        toast.error('Erro ao carregar logs de edição');
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar logs de edição');
    } finally {
      setLoading(false);
    }
  };

  const getOperationTypeBadge = (operationType: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'edit': { variant: 'default', label: 'Edição' },
      'edit_extend': { variant: 'secondary', label: 'Extensão' },
      'staff_change': { variant: 'outline', label: 'Mudança Staff' },
      'date_change': { variant: 'secondary', label: 'Mudança Data' },
      'time_change': { variant: 'secondary', label: 'Mudança Horário' },
      'duration_change': { variant: 'secondary', label: 'Mudança Duração' },
      'override_edit': { variant: 'destructive', label: 'Override Admin' }
    };

    const config = variants[operationType] || { variant: 'default', label: operationType };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getClientImpactBadge = (impact: string) => {
    if (impact?.includes('HIGH')) {
      return <Badge variant="destructive">Alto Impacto</Badge>;
    } else if (impact?.includes('MEDIUM')) {
      return <Badge variant="secondary">Médio Impacto</Badge>;
    } else {
      return <Badge variant="outline">Baixo Impacto</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.appointment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.edited_by_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOperation = operationFilter === 'all' || log.operation_type === operationFilter;
    const matchesOverride = overrideFilter === 'all' || 
      (overrideFilter === 'override' && log.force_override) ||
      (overrideFilter === 'normal' && !log.force_override);

    return matchesSearch && matchesOperation && matchesOverride;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando logs de edição...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs de Edição Admin</h1>
          <p className="text-gray-600 mt-2">Auditoria detalhada de todas as edições de agendamentos</p>
        </div>
        <Button onClick={fetchEditLogs} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Cliente, pet, ID do agendamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="operation">Tipo de Operação</Label>
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="edit">Edição</SelectItem>
                  <SelectItem value="edit_extend">Extensão</SelectItem>
                  <SelectItem value="staff_change">Mudança Staff</SelectItem>
                  <SelectItem value="date_change">Mudança Data</SelectItem>
                  <SelectItem value="time_change">Mudança Horário</SelectItem>
                  <SelectItem value="duration_change">Mudança Duração</SelectItem>
                  <SelectItem value="override_edit">Override Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="override">Override</Label>
              <Select value={overrideFilter} onValueChange={setOverrideFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="override">Com Override</SelectItem>
                  <SelectItem value="normal">Sem Override</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredLogs.length} de {logs.length} logs
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getOperationTypeBadge(log.operation_type)}
                    {log.force_override && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Override
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(log.edit_timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  {expandedLog === log.id ? 'Ocultar' : 'Detalhes'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{log.client_name}</span>
                  <span className="text-gray-600">({log.pet_name})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{format(new Date(log.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{log.appointment_time}</span>
                </div>
              </div>

              {/* Changes Summary */}
              {log.changes_summary && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Alterações:</p>
                  <p className="text-sm text-blue-800">{log.changes_summary}</p>
                </div>
              )}

              {/* Client Impact */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Impacto no Cliente:</span>
                {getClientImpactBadge(log.client_impact_assessment)}
              </div>

              {/* Availability Impact */}
              {log.availability_impact && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Impacto na Disponibilidade:</span>
                  {' '}Liberados: {log.slots_freed}, Bloqueados: {log.slots_blocked}
                  {log.extension_slots_blocked > 0 && `, Extensão: ${log.extension_slots_blocked}`}
                </div>
              )}

              {/* Admin Info */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Editado por: <span className="font-medium">{log.edited_by_name || 'Admin'}</span></span>
                <span>ID: {log.appointment_id.slice(0, 8)}...</span>
              </div>

              {/* Expanded Details */}
              {expandedLog === log.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Edit Reason */}
                  {log.edit_reason && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Motivo da Edição:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.edit_reason}</p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {log.admin_notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Notas do Admin:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.admin_notes}</p>
                    </div>
                  )}

                  {/* Staff Changes */}
                  {log.staff_changes_summary && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Mudanças de Staff:</p>
                      <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">{log.staff_changes_summary}</p>
                    </div>
                  )}

                  {/* Override Info */}
                  {log.force_override && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">Override Admin:</p>
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <p>Motivo: {log.override_reason || 'Não especificado'}</p>
                        {log.conflicts_overridden && (
                          <p className="mt-1">Conflitos forçados: {JSON.stringify(log.conflicts_overridden)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Before/After Values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Valores Anteriores:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Novos Valores:</p>
                      <pre className="text-xs bg-green-100 p-2 rounded overflow-auto">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* System Info */}
                  {log.system_info && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Informações do Sistema:</p>
                      <pre className="text-xs bg-blue-100 p-2 rounded overflow-auto">
                        {JSON.stringify(log.system_info, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredLogs.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum log de edição encontrado</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchTerm || operationFilter !== 'all' || overrideFilter !== 'all' 
                  ? 'Tente ajustar os filtros' 
                  : 'Logs aparecerão aqui quando edições forem realizadas'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminEditLogs;
