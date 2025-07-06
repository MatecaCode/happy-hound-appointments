
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle } from 'lucide-react';
import { Provider } from '@/hooks/useAppointmentForm';

interface StaffCardSelectorProps {
  staff: Provider[];
  selectedStaffIds: string[];
  onStaffSelect: (staffId: string) => void;
  allowMultiple?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

const StaffCardSelector: React.FC<StaffCardSelectorProps> = ({
  staff,
  selectedStaffIds,
  onStaffSelect,
  allowMultiple = false,
  isLoading = false,
  error
}) => {
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'vet': return 'bg-green-100 text-green-800';
      case 'groomer': return 'bg-blue-100 text-blue-800';
      case 'bather': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'vet': return 'Veterinário';
      case 'groomer': return 'Tosador';
      case 'bather': return 'Banhista';
      default: return 'Profissional';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Nenhum profissional disponível
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-red-500">
            Tente selecionar uma data diferente ou um serviço alternativo.
          </p>
        </div>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            Nenhum profissional disponível
          </h3>
          <p className="text-yellow-600 mb-4">
            Não há profissionais disponíveis para este serviço na data selecionada.
          </p>
          <p className="text-sm text-yellow-500">
            Tente selecionar uma data diferente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {allowMultiple ? 
          'Selecione um ou mais profissionais para seu atendimento:' : 
          'Selecione um profissional para seu atendimento:'
        }
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => {
          const isSelected = selectedStaffIds.includes(member.id);
          
          return (
            <Card
              key={member.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => onStaffSelect(member.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header with avatar and basic info */}
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-gray-100">
                        <AvatarImage 
                          src={member.profile_image} 
                          alt={member.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <CheckCircle className="absolute -top-1 -right-1 h-5 w-5 text-primary bg-white rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {member.name}
                      </h3>
                      
                      <Badge 
                        variant="secondary" 
                        className={`text-xs mt-1 ${getRoleColor(member.role)}`}
                      >
                        {getRoleLabel(member.role)}
                      </Badge>
                      
                      <div className="flex items-center gap-1 mt-2">
                        {renderStars(member.rating)}
                        <span className="text-xs text-muted-foreground ml-1">
                          {member.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specialty */}
                  {member.specialty && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Especialidade:</span> {member.specialty}
                    </div>
                  )}

                  {/* About/Bio */}
                  {member.about && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {member.about}
                    </div>
                  )}

                  {/* Selection indicator */}
                  <div className={`text-center py-2 rounded-md text-sm font-medium transition-colors ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}>
                    {isSelected ? '✓ Selecionado' : 'Clique para Selecionar'}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StaffCardSelector;
