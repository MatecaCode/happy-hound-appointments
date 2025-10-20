import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Edit, Filter, Scissors, Stethoscope, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  id: string;
  name: string;
  service_type: 'grooming' | 'veterinary';
  base_price: number | null;
  default_duration: number | null;
  description: string | null;
  active: boolean;
}

const AdminPricing: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, service_type, base_price, default_duration, description, active')
          .eq('active', true)
          .order('name');
        if (error) throw error;
        setServices(data || []);
      } catch (e) {
        // no toast here to keep page minimal; upstream pages have global handlers
        console.error('[ADMIN_PRICING] Error fetching services', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name?.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(serviceSearchTerm.toLowerCase());
    const matchesType = serviceTypeFilter === 'all' || service.service_type === serviceTypeFilter;
    return matchesSearch && matchesType;
  });

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'grooming':
        return <Scissors className="h-4 w-4" />;
      case 'veterinary':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Scissors className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Serviços & Preços</h1>
              <p className="text-gray-600 mt-2">Gerencie serviços, valores e durações</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Catálogo de Serviços
            </CardTitle>
            <CardDescription>Configure serviços disponíveis e suas tarifas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar serviços por nome ou descrição..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="grooming">Tosa e Banho</SelectItem>
                    <SelectItem value="veterinary">Veterinário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Catálogo de Serviços</h3>
                  <p className="text-sm text-gray-600">
                    {filteredServices.length === services.length
                      ? `Gerencie serviços e preços (${services.length} serviços)`
                      : `Mostrando ${filteredServices.length} de ${services.length} serviços`}
                  </p>
                </div>
                <Button disabled>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando serviços...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                  <p className="text-gray-600">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{service.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {getServiceTypeIcon(service.service_type)}
                            {service.service_type === 'grooming' ? 'Tosa e Banho' : 'Veterinário'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{service.description || 'Sem descrição'}</p>
                        {service.base_price && (
                          <p className="text-xs text-gray-500 mt-1">
                            Preço base: R$ {service.base_price.toFixed(2)} • Duração: {service.default_duration || 0} min
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {service.base_price && (
                          <Badge variant="outline">R$ {service.base_price.toFixed(2)}</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/services/${service.id}/edit-pricing`)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar Preços
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;


