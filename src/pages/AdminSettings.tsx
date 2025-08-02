import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Building2,
  Settings,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('staff');

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-2">
            Gerencie staff, serviços, preços e configurações operacionais
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Serviços & Preços
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Locais
            </TabsTrigger>
          </TabsList>

          {/* Staff Management */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Staff
                </CardTitle>
                <CardDescription>
                  Adicione, edite ou remova profissionais da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Profissionais Ativos</h3>
                      <p className="text-sm text-gray-600">Gerencie a equipe de trabalho</p>
                    </div>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Staff
                    </Button>
                  </div>
                  
                  {/* Placeholder Staff List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">João Silva</p>
                        <p className="text-sm text-gray-600">Tosa e Banho</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Ativo</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Maria Santos</p>
                        <p className="text-sm text-gray-600">Veterinária</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Ativo</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services & Pricing */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Serviços e Preços
                </CardTitle>
                <CardDescription>
                  Configure serviços disponíveis e suas tarifas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Catálogo de Serviços</h3>
                      <p className="text-sm text-gray-600">Gerencie serviços e preços</p>
                    </div>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Serviço
                    </Button>
                  </div>
                  
                  {/* Placeholder Services List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Banho Completo</p>
                        <p className="text-sm text-gray-600">Inclui shampoo, condicionador e secagem</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 45,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tosa Higiênica</p>
                        <p className="text-sm text-gray-600">Corte de pelos e unhas</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 60,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Consulta Veterinária</p>
                        <p className="text-sm text-gray-600">Exame clínico e orientações</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">R$ 120,00</Badge>
                        <Button size="sm" variant="outline" disabled>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operating Hours */}
          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários de Funcionamento
                </CardTitle>
                <CardDescription>
                  Configure os horários de atendimento por dia da semana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Configuração de Horários</h3>
                      <p className="text-sm text-gray-600">Defina horários de funcionamento</p>
                    </div>
                    <Button disabled>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Horários
                    </Button>
                  </div>
                  
                  {/* Placeholder Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Segunda a Sexta</h4>
                      <p className="text-sm text-gray-600">08:00 - 18:00</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Sábado</h4>
                      <p className="text-sm text-gray-600">08:00 - 16:00</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Domingo</h4>
                      <p className="text-sm text-gray-600">Fechado</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium">Feriados</h4>
                      <p className="text-sm text-gray-600">Horário especial</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gerenciar Locais
                </CardTitle>
                <CardDescription>
                  Configure múltiplas unidades (desabilitado por enquanto)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Unidades</h3>
                      <p className="text-sm text-gray-600">Gerencie múltiplas localizações</p>
                    </div>
                    <Button disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Unidade
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-600">Suporte Multi-unidade</p>
                        <p className="text-sm text-gray-500">
                          Funcionalidade em desenvolvimento. Por enquanto, apenas uma unidade é suportada.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Placeholder Location */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Unidade Principal</p>
                      <p className="text-sm text-gray-600">Alameda Prof. Lucas Nogueira Garcez, 4245</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Ativo</Badge>
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* System Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>
                Informações sobre a configuração atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-sm text-gray-600">Profissionais Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-gray-600">Serviços Configurados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-600">Unidade Ativa</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings; 