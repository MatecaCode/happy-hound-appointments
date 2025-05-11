
import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  role: string;
  profile_image?: string;
  rating?: number;
  specialty?: string;
  about?: string;
}

interface GroomerSelectionFormProps {
  groomers: Provider[];
  selectedGroomerId: string;
  setSelectedGroomerId: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
}

const GroomerSelectionForm = ({
  groomers,
  selectedGroomerId,
  setSelectedGroomerId,
  onNext,
  onBack,
  serviceType
}: GroomerSelectionFormProps) => {
  const providerLabel = serviceType === 'grooming' ? 'Tosador' : 'Veterinário';
  const providersLabel = serviceType === 'grooming' ? 'Tosadores' : 'Veterinários';
  
  // Auto-select first groomer if there's only one and none is selected
  useEffect(() => {
    if (groomers.length === 1 && !selectedGroomerId) {
      setSelectedGroomerId(groomers[0].id);
    }
  }, [groomers, selectedGroomerId, setSelectedGroomerId]);

  // Render stars for ratings
  const renderRating = (rating: number = 0) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">2. Escolha o {providerLabel}</h2>
        <p className="text-sm text-muted-foreground">
          Selecione um {providerLabel.toLowerCase()} para realizar o serviço
        </p>
      </div>

      {groomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groomers.map((groomer) => (
            <Card 
              key={groomer.id}
              onClick={() => setSelectedGroomerId(groomer.id)}
              className={`cursor-pointer transition-colors duration-200 ${
                selectedGroomerId === groomer.id 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'hover:border-gray-300'
              }`}
            >
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 border">
                    <AvatarImage src={groomer.profile_image} alt={groomer.name} />
                    <AvatarFallback>{groomer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-lg">{groomer.name}</h3>
                    <div className="flex items-center gap-1">
                      {renderRating(groomer.rating || 4.5)}
                      <span className="text-xs text-muted-foreground ml-1">
                        {groomer.rating?.toFixed(1) || "4.5"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {groomer.specialty && (
                  <div className="text-sm">
                    <Label>Especialidade</Label>
                    <p className="text-muted-foreground">{groomer.specialty}</p>
                  </div>
                )}
                
                {groomer.about && (
                  <div className="text-sm">
                    <Label>Sobre</Label>
                    <p className="text-muted-foreground line-clamp-3">{groomer.about}</p>
                  </div>
                )}
                
                <div className={`p-1 text-center rounded text-sm ${
                  selectedGroomerId === groomer.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary'
                }`}>
                  {selectedGroomerId === groomer.id ? 'Selecionado' : 'Selecionar'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-secondary/50 p-6 rounded-lg text-center">
          <p className="font-medium">Nenhum {providerLabel.toLowerCase()} disponível no momento</p>
          <p className="text-sm text-muted-foreground mt-1">Por favor, tente novamente mais tarde</p>
          
          <div className="bg-secondary/70 mt-6 p-4 rounded-lg text-left">
            <p className="text-sm font-medium">Informação</p>
            <p className="text-sm text-muted-foreground mt-1">
              Se você é um {providerLabel.toLowerCase()} e deseja se cadastrar para atender clientes,{' '}
              <a href="/register" className="text-primary hover:underline">faça login</a> ou registre uma
              nova conta com o perfil de {providerLabel.toLowerCase()}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Você precisará de um código de registro válido fornecido pelo pet shop.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button 
          onClick={onNext} 
          disabled={!selectedGroomerId || groomers.length === 0}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default GroomerSelectionForm;
