
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pet, Service } from '@/hooks/useAppointmentForm';
import { usePricing } from '@/hooks/usePricing';

interface BasicInfoFormProps {
  userPets: Pet[];
  services: Service[];
  selectedPet: Pet | null;
  setSelectedPet: (pet: Pet | null) => void;
  selectedService: Service | null;
  setSelectedService: (service: Service | null) => void;
  onNext: () => void;
  serviceType: 'grooming' | 'veterinary';
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  userPets,
  services,
  selectedPet,
  setSelectedPet,
  selectedService,
  setSelectedService,
  onNext,
  serviceType
}) => {
  // Calculate pricing when both pet and service are selected
  const pricingParams = selectedPet && selectedService ? {
    serviceId: selectedService.id,
    breedId: selectedPet.breed_id,
    size: selectedPet.size
  } : null;

  const { pricing, isLoading: pricingLoading } = usePricing(pricingParams);

  const handleNext = () => {
    if (selectedPet && selectedService) {
      onNext();
    }
  };

  const isNextEnabled = selectedPet && selectedService;

  const formatSizeLabel = (size?: string) => {
    if (!size) return size;
    const sizeMap = {
      'small': 'Pequeno',
      'medium': 'Médio', 
      'large': 'Grande',
      'extra_large': 'Extra Grande'
    };
    return sizeMap[size as keyof typeof sizeMap] || size;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Informações Básicas</CardTitle>
        <CardDescription>
          Selecione seu pet e o serviço desejado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pet-select">Selecione seu Pet</Label>
          <Select
            value={selectedPet?.id || ''}
            onValueChange={(value) => {
              const pet = userPets.find(p => p.id === value);
              setSelectedPet(pet || null);
            }}
          >
            <SelectTrigger id="pet-select">
              <SelectValue placeholder="Escolha um pet" />
            </SelectTrigger>
            <SelectContent>
              {userPets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  <div className="flex flex-col items-start">
                    <span>{pet.name}</span>
                    {pet.breed && (
                      <span className="text-xs text-muted-foreground">
                        {pet.breed} - {formatSizeLabel(pet.size)}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {userPets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Você precisa cadastrar um pet primeiro.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-select">Selecione o Serviço</Label>
          <Select
            value={selectedService?.id || ''}
            onValueChange={(value) => {
              const service = services.find(s => s.id === value);
              setSelectedService(service || null);
            }}
          >
            <SelectTrigger id="service-select">
              <SelectValue placeholder="Escolha um serviço" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  <div className="flex flex-col items-start">
                    <span>{service.name}</span>
                    {service.base_price && (
                      <span className="text-xs font-medium text-green-600">
                        A partir de R$ {service.base_price}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum serviço de {serviceType === 'grooming' ? 'tosa' : 'veterinária'} disponível.
            </p>
          )}
        </div>

        {/* Dynamic Pricing Display */}
        {selectedService && selectedPet && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{selectedService.name}</h4>
            <div className="text-sm space-y-1">
              <p>Pet: {selectedPet.name}</p>
              {selectedPet.breed && <p>Raça: {selectedPet.breed}</p>}
              {selectedPet.size && <p>Porte: {formatSizeLabel(selectedPet.size)}</p>}
              
              {pricingLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span>Calculando preço...</span>
                </div>
              ) : pricing ? (
                <div className="space-y-1">
                  <p className="font-medium text-green-600">
                    Preço: R$ {pricing.price.toFixed(2)}
                  </p>
                  <p>Duração estimada: {pricing.duration} minutos</p>
                  {pricing.priceSource !== 'exact_match' && (
                    <p className="text-xs text-muted-foreground">
                      {pricing.priceSource === 'service_size_fallback' && 'Preço baseado no porte do pet'}
                      {pricing.priceSource === 'service_default' && 'Preço padrão do serviço'}
                      {pricing.priceSource === 'system_default' && 'Preço padrão do sistema'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Erro ao calcular preço
                </p>
              )}
            </div>
          </div>
        )}

        {selectedService && !selectedPet && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{selectedService.name}</h4>
            <div className="text-sm space-y-1">
              {selectedService.default_duration && (
                <p>Duração: {selectedService.default_duration} minutos</p>
              )}
              {selectedService.base_price && (
                <p className="font-medium text-green-600">
                  Preço base: R$ {selectedService.base_price}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Selecione um pet para ver o preço personalizado
              </p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleNext}
          disabled={!isNextEnabled}
          className="w-full"
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
};

export default BasicInfoForm;
