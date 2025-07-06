
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StaffByRole, ServiceRequirements } from '@/hooks/useStaffFiltering';
import RoleBasedStaffSelector from './RoleBasedStaffSelector';

interface SelectedStaff {
  batherId?: string;
  groomerId?: string;
  vetId?: string;
}

interface StaffSelectionFormProps {
  staffByRole: StaffByRole;
  serviceRequirements: ServiceRequirements;
  selectedStaff: SelectedStaff;
  onStaffSelect: (role: 'bather' | 'groomer' | 'vet', staffId: string) => void;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
  isLoading?: boolean;
  error?: string | null;
}

const StaffSelectionForm: React.FC<StaffSelectionFormProps> = ({
  staffByRole,
  serviceRequirements,
  selectedStaff,
  onStaffSelect,
  onNext,
  onBack,
  serviceType,
  isLoading = false,
  error = null
}) => {
  // Check if all required roles have been selected
  const isSelectionComplete = () => {
    const requiredSelections = [];
    
    if (serviceRequirements.requiresBath) {
      requiredSelections.push(!!selectedStaff.batherId);
    }
    if (serviceRequirements.requiresGrooming) {
      requiredSelections.push(!!selectedStaff.groomerId);
    }
    if (serviceRequirements.requiresVet) {
      requiredSelections.push(!!selectedStaff.vetId);
    }
    
    return requiredSelections.length > 0 && requiredSelections.every(Boolean);
  };

  const getRequiredRolesText = () => {
    const roles = [];
    if (serviceRequirements.requiresBath) roles.push('banhista');
    if (serviceRequirements.requiresGrooming) roles.push('tosador');
    if (serviceRequirements.requiresVet) roles.push('veterinário');
    
    if (roles.length === 1) return `um ${roles[0]}`;
    if (roles.length === 2) return `um ${roles[0]} e um ${roles[1]}`;
    return `um ${roles.slice(0, -1).join(', ')} e um ${roles[roles.length - 1]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Seleção de Profissionais</CardTitle>
        <CardDescription>
          Este serviço requer {getRequiredRolesText()}. Selecione os profissionais para cada função.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RoleBasedStaffSelector
          staffByRole={staffByRole}
          serviceRequirements={serviceRequirements}
          selectedStaff={selectedStaff}
          onStaffSelect={onStaffSelect}
          isLoading={isLoading}
          error={error}
        />

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button 
            onClick={onNext}
            disabled={!isSelectionComplete() || isLoading}
            className="flex-1"
          >
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffSelectionForm;
