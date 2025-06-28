
import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Calendar } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  date: Date;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
}

const GroomerSelectionForm = ({
  groomers,
  selectedGroomerId,
  setSelectedGroomerId,
  date,
  onNext,
  onBack,
  serviceType
}: GroomerSelectionFormProps) => {
  const providerLabel = serviceType === 'grooming' ? 'Tosador' : 'Veterinário';
  const providersLabel = serviceType === 'grooming' ? 'Tosadores' : 'Veterinários';
  
  // Debug logging
  useEffect(() => {
    console.log('🎯 GroomerSelectionForm rendered');
    console.log('📋 Service type:', serviceType);
    console.log('📅 Selected date:', format(date, 'dd/MM/yyyy', { locale: ptBR }));
    console.log('👥 Groomers received:', groomers);
    console.log('📊 Groomers count:', groomers.length);
    console.log('🔍 Selected groomer ID:', selectedGroomerId);
  }, [groomers, selectedGroomerId, serviceType, date]);
  
  // DO NOT auto-select - let user choose
  // Removed the auto-select useEffect

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
        <h2 className="text-xl font-semibold">3. Escolha o {providerLabel}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Disponíveis para {format(date, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione um {providerLabel.toLowerCase()} disponível para a data escolhida
        </p>
      </div>

      {groomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groomers.map((groomer) => (
            <Card 
              key={groomer.id}
              onClick={() => {
                console.log('🎯 Groomer selected:', groomer);
                setSelectedGroomerId(groomer.id);
              }}
              className={`cursor-pointer transition-colors duration-200 ${
                selectedGroomerId === groomer.id 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'hover:border-gray-300 hover:shadow-md'
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
                    <p className="text-xs text-green-600 font-medium">✓ Disponível</p>
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
                
                <div className={`p-2 text-center rounded text-sm font-medium ${
                  selectedGroomerId === groomer.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground'
                }`}>
                  {selectedGroomerId === groomer.id ? '✓ Selecionado' : 'Clique para Selecionar'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-secondary/50 p-6 rounded-lg text-center">
          <p className="font-medium">Nenhum {providerLabel.toLowerCase()} disponível para esta data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente selecionar uma data diferente no passo anterior
          </p>
          
          <div className="bg-blue-50 border border-blue-200 mt-6 p-4 rounded-lg text-left">
            <p className="text-sm font-medium text-blue-800">💡 Dica</p>
            <p className="text-sm text-blue-600 mt-1">
              Volte ao passo anterior e escolha uma data diferente para ver mais opções de profissionais disponíveis.
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
          Continuar para Horário
        </Button>
      </div>
    </div>
  );
};

export default GroomerSelectionForm;
