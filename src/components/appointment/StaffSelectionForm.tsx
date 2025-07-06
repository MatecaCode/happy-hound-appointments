
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Provider } from '@/hooks/useAppointmentForm';
import StaffCardSelector from './StaffCardSelector';

interface StaffSelectionFormProps {
  staff: Provider[];
  selectedStaffId: string | null;
  setSelectedStaffId: (staffId: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
  isLoading?: boolean;
  error?: string | null;
}

const StaffSelectionForm: React.FC<StaffSelectionFormProps> = ({
  staff,
  selectedStaffId,
  setSelectedStaffId,
  onNext,
  onBack,
  serviceType,
  isLoading = false,
  error = null
}) => {
  const handleStaffSelect = (staffId: string) => {
    // Toggle selection - if already selected, deselect; otherwise select
    if (selectedStaffId === staffId) {
      setSelectedStaffId(null);
    } else {
      setSelectedStaffId(staffId);
    }
  };

  const handleNext = () => {
    if (selectedStaffId) {
      onNext();
    }
  };

  const isNextEnabled = selectedStaffId && !isLoading;
  const selectedStaffIds = selectedStaffId ? [selectedStaffId] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Seleção do Profissional</CardTitle>
        <CardDescription>
          Escolha o {serviceType === 'grooming' ? 'tosador' : 'veterinário'} de sua preferência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StaffCardSelector
          staff={staff}
          selectedStaffIds={selectedStaffIds}
          onStaffSelect={handleStaffSelect}
          allowMultiple={false}
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
            onClick={handleNext}
            disabled={!isNextEnabled}
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
