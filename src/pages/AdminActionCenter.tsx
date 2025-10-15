import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Edit, 
  Users, 
  Plus,
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

          {/* Manage Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Gerencie clientes e usuários do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Visualize, edite e gerencie informações de clientes e usuários.
                  Controle de acesso e permissões.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Disponível</Badge>
                  <Badge variant="outline">Controle completo</Badge>
                </div>
                <Button 
                  onClick={() => navigate('/admin/clients')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Usuários
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manage Staff */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                Gerenciar Staff
              </CardTitle>
              <CardDescription>
                Configuração de sistema e gerenciamento de staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Gerencie staff, serviços, preços e configurações operacionais.
                  Controle completo do sistema.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Disponível</Badge>
                  <Badge variant="outline">Configuração avançada</Badge>
                </div>
                <Button 
                  onClick={() => navigate('/admin/settings')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuração de Sistema
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
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Usuários Gerenciados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Configurações Staff</div>
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