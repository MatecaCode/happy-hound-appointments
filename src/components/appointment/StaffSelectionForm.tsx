
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Provider } from '@/hooks/useAppointmentForm';

interface StaffSelectionFormProps {
  staff: Provider[];
  selectedStaffId: string | null;
  setSelectedStaffId: (staffId: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  serviceType: 'grooming' | 'veterinary';
  isLoading?: boolean;
}

const StaffSelectionForm: React.FC<StaffSelectionFormProps> = ({
  staff,
  selectedStaffId,
  setSelectedStaffId,
  onNext,
  onBack,
  serviceType,
  isLoading = false
}) => {
  const handleNext = () => {
    if (selectedStaffId) {
      onNext();
    }
  };

  const isNextEnabled = selectedStaffId && !isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Seleção do Profissional</CardTitle>
        <CardDescription>
          Escolha o {serviceType === 'grooming' ? 'tosador' : 'veterinário'} de sua preferência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="staff-select">
            Selecione o {serviceType === 'grooming' ? 'Tosador' : 'Veterinário'}
          </Label>
          <Select
            value={selectedStaffId || ''}
            onValueChange={(value) => setSelectedStaffId(value)}
            disabled={isLoading}
          >
            <SelectTrigger id="staff-select">
              <SelectValue 
                placeholder={
                  isLoading 
                    ? "Carregando profissionais..." 
                    : `Escolha um ${serviceType === 'grooming' ? 'tosador' : 'veterinário'}`
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex flex-col items-start">
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Avaliação: {member.rating}/5
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {staff.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              Nenhum {serviceType === 'grooming' ? 'tosador' : 'veterinário'} disponível para este serviço.
            </p>
          )}
        </div>

        {selectedStaffId && (
          <div className="p-4 bg-muted rounded-lg">
            {(() => {
              const selectedStaff = staff.find(s => s.id === selectedStaffId);
              return selectedStaff ? (
                <div>
                  <h4 className="font-medium mb-2">{selectedStaff.name}</h4>
                  <div className="text-sm space-y-1">
                    <p>Avaliação: {selectedStaff.rating}/5</p>
                    {selectedStaff.about && (
                      <p className="text-muted-foreground">{selectedStaff.about}</p>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

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
