
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffByRole, ServiceRequirements } from '@/hooks/useStaffFiltering';
import StaffCardSelector from './StaffCardSelector';

interface SelectedStaff {
  batherId?: string;
  groomerId?: string;
  vetId?: string;
}

interface RoleBasedStaffSelectorProps {
  staffByRole: StaffByRole;
  serviceRequirements: ServiceRequirements;
  selectedStaff: SelectedStaff;
  onStaffSelect: (role: 'bather' | 'groomer' | 'vet', staffId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

const RoleBasedStaffSelector: React.FC<RoleBasedStaffSelectorProps> = ({
  staffByRole,
  serviceRequirements,
  selectedStaff,
  onStaffSelect,
  isLoading = false,
  error = null
}) => {
  const getRoleTitle = (role: 'bather' | 'groomer' | 'vet') => {
    switch (role) {
      case 'bather': return 'Banhista';
      case 'groomer': return 'Tosador(a)';
      case 'vet': return 'Veterinário(a)';
    }
  };

  const getRoleDescription = (role: 'bather' | 'groomer' | 'vet') => {
    switch (role) {
      case 'bather': return 'Responsável pelo banho e higiene do seu pet';
      case 'groomer': return 'Responsável pela tosa e estética do seu pet';
      case 'vet': return 'Responsável pelos cuidados veterinários';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Erro ao carregar profissionais
              </h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {serviceRequirements.requiresBath && (
        <Card>
          <CardHeader>
            <CardTitle>{getRoleTitle('bather')}</CardTitle>
            <CardDescription>{getRoleDescription('bather')}</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffCardSelector
              staff={staffByRole.bathers}
              selectedStaffIds={selectedStaff.batherId ? [selectedStaff.batherId] : []}
              onStaffSelect={(staffId) => onStaffSelect('bather', staffId)}
              allowMultiple={false}
              isLoading={isLoading}
              error={staffByRole.bathers.length === 0 ? 'Nenhum banhista disponível' : null}
            />
          </CardContent>
        </Card>
      )}

      {serviceRequirements.requiresGrooming && (
        <Card>
          <CardHeader>
            <CardTitle>{getRoleTitle('groomer')}</CardTitle>
            <CardDescription>{getRoleDescription('groomer')}</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffCardSelector
              staff={staffByRole.groomers}
              selectedStaffIds={selectedStaff.groomerId ? [selectedStaff.groomerId] : []}
              onStaffSelect={(staffId) => onStaffSelect('groomer', staffId)}
              allowMultiple={false}
              isLoading={isLoading}
              error={staffByRole.groomers.length === 0 ? 'Nenhum tosador disponível' : null}
            />
          </CardContent>
        </Card>
      )}

      {serviceRequirements.requiresVet && (
        <Card>
          <CardHeader>
            <CardTitle>{getRoleTitle('vet')}</CardTitle>
            <CardDescription>{getRoleDescription('vet')}</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffCardSelector
              staff={staffByRole.vets}
              selectedStaffIds={selectedStaff.vetId ? [selectedStaff.vetId] : []}
              onStaffSelect={(staffId) => onStaffSelect('vet', staffId)}
              allowMultiple={false}
              isLoading={isLoading}
              error={staffByRole.vets.length === 0 ? 'Nenhum veterinário disponível' : null}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoleBasedStaffSelector;
