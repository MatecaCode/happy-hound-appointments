
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

export interface Groomer {
  id: string;
  name: string;
  about?: string;
  rating: number;
  profile_image?: string;
  specialty?: string;
}

interface GroomerSelectorProps {
  groomers: Groomer[];
  selectedGroomerId: string | null;
  onSelect: (groomerId: string) => void;
}

const GroomerSelector = ({ groomers, selectedGroomerId, onSelect }: GroomerSelectorProps) => {
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold">Escolha um Tosador</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groomers.map((groomer) => (
          <Card 
            key={groomer.id}
            className={`cursor-pointer transition-all ${selectedGroomerId === groomer.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-gray-300'}`}
            onClick={() => onSelect(groomer.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-4">
                <Avatar className="h-14 w-14 border">
                  <AvatarImage src={groomer.profile_image} alt={groomer.name} />
                  <AvatarFallback>{groomer.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{groomer.name}</CardTitle>
                  <div className="flex mt-1">
                    {renderStars(groomer.rating)}
                    <span className="ml-2 text-sm text-muted-foreground">{groomer.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groomer.specialty && (
                <div className="mb-2">
                  <span className="font-medium">Especialidade:</span> {groomer.specialty}
                </div>
              )}
              {groomer.about && (
                <CardDescription className="line-clamp-3 mt-1">{groomer.about}</CardDescription>
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-4">
              <div className={`w-full p-1 text-center rounded ${
                selectedGroomerId === groomer.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary'
              }`}>
                {selectedGroomerId === groomer.id ? 'Selecionado' : 'Selecionar'}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroomerSelector;
