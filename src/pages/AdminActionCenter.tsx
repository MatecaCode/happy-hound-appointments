import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Edit, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Plus,
  X,
  Settings
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const AdminActionCenter = () => {
  const navigate = useNavigate();
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Centro de Ações</h1>
          <p className="text-gray-600 mt-2">
            Ações administrativas e operacionais do sistema
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Manual Booking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Criar Agendamento Manual
              </CardTitle>
              <CardDescription>
                Área destinada para agendamentos internos (override permitido).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Crie agendamentos em nome dos clientes via telefone ou presencialmente.
                  Permite override de disponibilidade e regras do sistema.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Em desenvolvimento</Badge>
                  <Badge variant="outline">Override permitido</Badge>
                </div>
                <Button 
                  onClick={() => navigate('/admin/manual-booking')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento Manual
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Edit/Cancel Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-orange-500" />
                Editar ou Cancelar Agendamentos
              </CardTitle>
              <CardDescription>
                Visualize, edite e cancele agendamentos do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Modifique agendamentos existentes, altere horários, serviços ou cancele reservas.
                  Histórico completo de alterações mantido.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Disponível</Badge>
                  <Badge variant="outline">Auditoria completa</Badge>
                </div>
                <Button 
                  onClick={() => navigate('/admin/appointments')}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Gerenciar Agendamentos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extra Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Aplicar Cobranças Extras
              </CardTitle>
              <CardDescription>
                Área para adicionar taxas adicionais a um agendamento existente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Adicione taxas extras, descontos ou cobranças especiais a agendamentos.
                  Suporte a múltiplas categorias de cobrança.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Em desenvolvimento</Badge>
                  <Badge variant="outline">Múltiplas categorias</Badge>
                </div>
                <Button disabled className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Adicionar Cobrança Extra
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Staff Reassignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Reatribuir Staff
              </CardTitle>
              <CardDescription>
                Reatribua profissionais para agendamentos existentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Mude o profissional responsável por um agendamento.
                  Útil para emergências ou reorganização de equipe.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Em desenvolvimento</Badge>
                  <Badge variant="outline">Notificação automática</Badge>
                </div>
                <Button disabled className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Reatribuir Profissional
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Ações de Emergência
              </CardTitle>
              <CardDescription>
                Ações críticas para situações de emergência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Cancelamento em massa, bloqueio de horários, ou outras ações críticas.
                  Requer confirmação adicional.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Crítico</Badge>
                  <Badge variant="outline">Confirmação dupla</Badge>
                </div>
                <Button disabled variant="destructive" className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Ações de Emergência
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Overrides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                Overrides do Sistema
              </CardTitle>
              <CardDescription>
                Controles avançados para situações especiais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Bypass de regras do sistema, horários especiais, ou configurações temporárias.
                  Use com cautela.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Em desenvolvimento</Badge>
                  <Badge variant="outline">Acesso restrito</Badge>
                </div>
                <Button disabled variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Overrides
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Ações</CardTitle>
              <CardDescription>
                Resumo das ações administrativas realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Agendamentos Manuais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-gray-600">Modificações</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Cobranças Extras</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Reatribuições</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminActionCenter; 