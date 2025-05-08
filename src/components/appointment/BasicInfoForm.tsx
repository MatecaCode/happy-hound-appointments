
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  name: string;
  breed: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface BasicInfoFormProps {
  userPets: Pet[];
  services: Service[];
  selectedPet: string;
  setSelectedPet: (value: string) => void;
  selectedService: string;
  setSelectedService: (value: string) => void;
  ownerName: string;
  setOwnerName: (value: string) => void;
  ownerPhone: string;
  setOwnerPhone: (value: string) => void;
  onNext: () => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  userPets,
  services,
  selectedPet,
  setSelectedPet,
  selectedService,
  setSelectedService,
  ownerName,
  setOwnerName,
  ownerPhone,
  setOwnerPhone,
  onNext
}) => {
  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">1. Informações Básicas</h2>
        
        <div>
          <Label htmlFor="pet">Seu Pet</Label>
          <Select value={selectedPet} onValueChange={setSelectedPet}>
            <SelectTrigger id="pet" className="w-full">
              <SelectValue placeholder="Selecione seu pet" />
            </SelectTrigger>
            <SelectContent>
              {userPets.map(pet => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.name} ({pet.breed})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="service">Serviço</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger id="service" className="w-full">
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - R$ {service.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="ownerName">Seu Nome</Label>
          <Input
            id="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        
        <div>
          <Label htmlFor="ownerPhone">Telefone</Label>
          <Input
            id="ownerPhone"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="(XX) XXXXX-XXXX"
          />
        </div>
      </div>
      
      <Button 
        type="button" 
        onClick={onNext} 
        disabled={!selectedPet || !selectedService || !ownerName}
      >
        Próximo
      </Button>
    </>
  );
};

export default BasicInfoForm;
