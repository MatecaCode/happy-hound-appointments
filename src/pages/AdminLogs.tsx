import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Download,
  RefreshCw,
  User,
  Settings,
  DollarSign,
  Users
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface AdminAction {
  id: string;
  action_type: string;
  target_type: string;
  admin_user_id: string;
  admin_name: string;
  timestamp: string;
  details: string;
  status: 'success' | 'error' | 'pending';
}

const AdminLogs = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Placeholder data for admin actions
  const adminActions: AdminAction[] = [
    {
      id: '1',
      action_type: 'manual_booking',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 14:30:00',
      details: 'Criou agendamento manual para cliente João Silva',
      status: 'success'
    },
    {
      id: '2',
      action_type: 'booking_modification',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 13:45:00',
      details: 'Modificou horário do agendamento #1234',
      status: 'success'
    },
    {
      id: '3',
      action_type: 'extra_charge',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 12:20:00',
      details: 'Aplicou taxa extra de R$ 25,00 para serviço adicional',
      status: 'success'
    },
    {
      id: '4',
      action_type: 'staff_reassignment',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 11:15:00',
      details: 'Reatribuiu agendamento de Maria para João',
      status: 'success'
    },
    {
      id: '5',
      action_type: 'service_configuration',
      target_type: 'service',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 10:30:00',
      details: 'Atualizou preço do serviço "Banho Completo"',
      status: 'success'
    },
    {
      id: '6',
      action_type: 'emergency_cancellation',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 09:45:00',
      details: 'Cancelamento de emergência - cliente solicitou',
      status: 'success'
    },
    {
      id: '7',
      action_type: 'system_override',
      target_type: 'availability',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-15 08:20:00',
      details: 'Bypass de regra de disponibilidade para cliente VIP',
      status: 'success'
    },
    {
      id: '8',
      action_type: 'manual_booking',
      target_type: 'booking',
      admin_user_id: 'admin-001',
      admin_name: 'Admin Principal',
      timestamp: '2024-01-14 17:30:00',
      details: 'Tentativa de agendamento manual falhou - horário indisponível',
      status: 'error'
    }
  ];

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'manual_booking':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'booking_modification':
        return <Settings className="h-4 w-4 text-orange-500" />;
      case 'extra_charge':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'staff_reassignment':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'service_configuration':
        return <Settings className="h-4 w-4 text-gray-500" />;
      case 'emergency_cancellation':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'system_override':
        return <Settings className="h-4 w-4 text-yellow-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'manual_booking':
        return 'Agendamento Manual';
      case 'booking_modification':
        return 'Modificação';
      case 'extra_charge':
        return 'Cobrança Extra';
      case 'staff_reassignment':
        return 'Reatribuição';
      case 'service_configuration':
        return 'Configuração';
      case 'emergency_cancellation':
        return 'Cancelamento';
      case 'system_override':
        return 'Override';
      default:
        return actionType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredActions = selectedFilter === 'all' 
    ? adminActions 
    : adminActions.filter(action => action.status === selectedFilter);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Logs de Ações Administrativas</h1>
          <p className="text-gray-600 mt-2">
            Histórico completo de ações administrativas realizadas no sistema
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Ações
              </CardTitle>
              <CardDescription>
                Filtre e exporte logs de ações administrativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <select 
                      value={selectedFilter} 
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="border rounded-md px-3 py-1 text-sm"
                    >
                      <option value="all">Todos</option>
                      <option value="success">Sucesso</option>
                      <option value="error">Erro</option>
                      <option value="pending">Pendente</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Período:</span>
                    <select className="border rounded-md px-3 py-1 text-sm">
                      <option value="today">Hoje</option>
                      <option value="week">Última Semana</option>
                      <option value="month">Último Mês</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
            <CardDescription>
              Lista detalhada de todas as ações administrativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Ação</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.action_type)}
                          <span className="text-sm font-medium">
                            {getActionLabel(action.action_type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{action.admin_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {action.details}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {action.timestamp}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(action.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Ações</CardTitle>
              <CardDescription>
                Estatísticas das ações administrativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {adminActions.length}
                  </div>
                  <div className="text-sm text-gray-600">Total de Ações</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {adminActions.filter(a => a.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {adminActions.filter(a => a.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(adminActions.map(a => a.action_type)).size}
                  </div>
                  <div className="text-sm text-gray-600">Tipos de Ação</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs; 