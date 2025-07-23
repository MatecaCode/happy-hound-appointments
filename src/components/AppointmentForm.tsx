
import React from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
import { useStaffFiltering } from '@/hooks/useStaffFiltering';
import BasicInfoForm from './appointment/BasicInfoForm';
import DateTimeForm from './appointment/DateTimeForm';
import StaffSelectionForm from './appointment/StaffSelectionForm';

interface SelectedStaff {
  batherId?: string;
  groomerId?: string;
  vetId?: string;
}

interface AppointmentFormProps {
  serviceType: 'grooming' | 'veterinary';
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ serviceType = 'grooming' }) => {
  const {
    date,
    setDate,
    selectedTimeSlotId, 
    setSelectedTimeSlotId,
    selectedPet,
    setSelectedPet,
    selectedService,
    setSelectedService,
    notes,
    setNotes,
    timeSlots,
    isLoading,
    nextAvailable,
    activeTab,
    setActiveTab,
    formStep,
    setFormStep,
    userPets,
    services,
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
    serviceRequiresStaff,
    serviceRequirementsLoaded,
    pricing,
    // Use the hook's staff state instead of local state
    selectedStaff,
    setSelectedStaff,
  } = useAppointmentForm(serviceType);

  // Use the staff filtering hook
  const {
    staffByRole,
    serviceRequirements,
    isLoading: staffLoading,
    error: staffError
  } = useStaffFiltering({
    service: selectedService
  });

  // Fetch appropriate services when service type changes
  React.useEffect(() => {
    fetchServices(serviceType);
  }, [fetchServices, serviceType]);

  // Reset selected staff when service changes
  React.useEffect(() => {
    if (selectedService) {
      setSelectedStaff({});
    }
  }, [selectedService, setSelectedStaff]);

  const handleStaffSelect = (role: 'bather' | 'groomer' | 'vet', staffId: string) => {
    setSelectedStaff(prev => {
      const newSelection = { ...prev };
      
      // Toggle selection - if already selected, deselect; otherwise select
      const currentSelection = role === 'bather' ? prev.batherId : 
                              role === 'groomer' ? prev.groomerId : 
                              prev.vetId;
      
      if (currentSelection === staffId) {
        // Deselect
        if (role === 'bather') delete newSelection.batherId;
        else if (role === 'groomer') delete newSelection.groomerId;
        else delete newSelection.vetId;
      } else {
        // Select
        if (role === 'bather') newSelection.batherId = staffId;
        else if (role === 'groomer') newSelection.groomerId = staffId;
        else newSelection.vetId = staffId;
      }
      
      return newSelection;
    });
  };

  const getStepTitle = (step: number) => {
    if (step === 1) return "1. Informações Básicas";
    if (step === 2 && serviceRequiresStaff) return "2. Seleção de Profissionais";
    if (step === 2 && !serviceRequiresStaff) return "2. Escolha da Data e Horário";
    if (step === 3) return "3. Escolha da Data e Horário";
    return "";
  };

  const handleNextStep = (currentStep: number) => {
    if (currentStep === 1) {
      // From basic info, go to staff selection if service requires staff, otherwise go to date/time
      if (serviceRequiresStaff) {
        setFormStep(2);
      } else {
        setFormStep(2); // This will be date/time step when no staff required
      }
    } else if (currentStep === 2) {
      // From staff selection (when required), go to date/time
      if (serviceRequiresStaff) {
        setFormStep(3);
      }
      // If no staff required, this step is already date/time, so no next step needed
    }
  };

  const handleBackStep = (currentStep: number) => {
    if (currentStep === 2) {
      setFormStep(1);
    } else if (currentStep === 3) {
      // Go back to staff selection if service requires staff, otherwise to basic info
      setFormStep(serviceRequiresStaff ? 2 : 1);
    }
  };

  // Convert selected staff to the format expected by the form submission
  const getSelectedStaffForSubmission = () => {
    const staffIds = [];
    if (selectedStaff.batherId) staffIds.push(selectedStaff.batherId);
    if (selectedStaff.groomerId) staffIds.push(selectedStaff.groomerId);
    if (selectedStaff.vetId) staffIds.push(selectedStaff.vetId);
    return staffIds;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set the selected staff for the main form handler
    const staffIds = getSelectedStaffForSubmission();
    
    // Call the original submit handler with the staff selection
    await handleSubmit(e, staffIds);
  };

  console.log('🔍 DEBUG: AppointmentForm render - Service requires staff:', serviceRequiresStaff);
  console.log('🔍 DEBUG: Service requirements loaded:', serviceRequirementsLoaded);
  console.log('🔍 DEBUG: Current form step:', formStep);
  console.log('🔍 DEBUG: Selected staff:', selectedStaff);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      {/* Step 1: Basic Info (Pet + Service) */}
      {formStep === 1 && (
        <BasicInfoForm
          userPets={userPets}
          services={services}
          selectedPet={selectedPet}
          setSelectedPet={setSelectedPet}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          onNext={() => handleNextStep(1)}
          serviceType={serviceType}
        />
      )}
      
      {/* Step 2: Staff Selection (only if service requires staff) */}
      {formStep === 2 && serviceRequiresStaff && (
        <StaffSelectionForm
          staffByRole={staffByRole}
          serviceRequirements={serviceRequirements}
          selectedStaff={selectedStaff}
          onStaffSelect={handleStaffSelect}
          onNext={() => handleNextStep(2)}
          onBack={() => handleBackStep(2)}
          serviceType={serviceType}
          isLoading={staffLoading}
          error={staffError}
        />
      )}
      
      {/* Step 2/3: Date/Time Selection */}
      {((formStep === 2 && !serviceRequiresStaff) || (formStep === 3 && serviceRequiresStaff)) && (
        <DateTimeForm
          date={date}
          setDate={setDate}
          timeSlots={timeSlots}
          selectedTimeSlotId={selectedTimeSlotId}
          setSelectedTimeSlotId={setSelectedTimeSlotId}
          nextAvailable={nextAvailable ? {
            date: nextAvailable.date,
            time: nextAvailable.time,
            provider_name: nextAvailable.staff_name || 'Profissional'
          } : null}
          handleNextAvailableSelect={handleNextAvailableSelect}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={(tab: 'calendar' | 'next-available') => setActiveTab(tab)}
          notes={notes}
          setNotes={setNotes}
          onBack={() => handleBackStep(serviceRequiresStaff ? 3 : 2)}
          onSubmit={handleFormSubmit}
          showTimeSlots={true}
          showSubmitButton={true}
          stepTitle={getStepTitle(serviceRequiresStaff ? 3 : 2)}
          selectedStaff={getSelectedStaffForSubmission()}
          serviceDuration={pricing?.duration || selectedService?.default_duration || 60}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
