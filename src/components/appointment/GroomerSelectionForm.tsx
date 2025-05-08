
import React from 'react';
import { Button } from "@/components/ui/button";
import GroomerSelector, { Groomer } from '../GroomerSelector';

interface GroomerSelectionFormProps {
  groomers: Groomer[];
  selectedGroomerId: string | null;
  setSelectedGroomerId: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const GroomerSelectionForm: React.FC<GroomerSelectionFormProps> = ({
  groomers,
  selectedGroomerId,
  setSelectedGroomerId,
  onNext,
  onBack
}) => {
  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">2. Escolha de Tosador</h2>
          <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        </div>
        
        <GroomerSelector
          groomers={groomers}
          selectedGroomerId={selectedGroomerId}
          onSelect={setSelectedGroomerId}
        />
      </div>
      
      <Button 
        type="button" 
        onClick={onNext} 
        disabled={!selectedGroomerId}
      >
        Próximo
      </Button>
    </>
  );
};

export default GroomerSelectionForm;
