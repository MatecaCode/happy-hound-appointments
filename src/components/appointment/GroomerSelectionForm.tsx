
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Provider } from "@/hooks/useAppointmentForm";
import { StarIcon } from "lucide-react";

interface GroomerSelectionFormProps {
  groomers: Provider[];
  selectedGroomerId: string;
  setSelectedGroomerId: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
}

const GroomerSelectionForm: React.FC<GroomerSelectionFormProps> = ({
  groomers,
  selectedGroomerId,
  setSelectedGroomerId,
  onNext,
  onBack,
  serviceType
}) => {
  const providerType = serviceType === 'grooming' ? 'tosador' : 'veterinário';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">2. Selecione o {serviceType === 'grooming' ? 'Tosador' : 'Veterinário'}</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
      </div>
      
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Profissionais Disponíveis</h3>
          <p className="text-sm text-muted-foreground">
            Escolha um {providerType} para realizar o serviço
          </p>
        </CardHeader>
        
        <CardContent>
          {groomers.length > 0 ? (
            <RadioGroup
              value={selectedGroomerId}
              onValueChange={setSelectedGroomerId}
              className="space-y-4"
            >
              {groomers.map((groomer) => (
                <Label
                  key={groomer.id}
                  htmlFor={groomer.id}
                  className="flex items-start space-x-4 border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                >
                  <RadioGroupItem value={groomer.id} id={groomer.id} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{groomer.name}</p>
                        <p className="text-sm text-muted-foreground">{groomer.specialty}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="text-sm font-medium mr-1">{groomer.rating?.toFixed(1)}</p>
                        <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          ) : (
            <div className="text-center py-8">
              <p>Nenhum {providerType} disponível no momento.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Por favor, tente novamente mais tarde.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button 
            onClick={onNext} 
            disabled={!selectedGroomerId}
          >
            Continuar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GroomerSelectionForm;
