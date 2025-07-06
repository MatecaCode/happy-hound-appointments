
import React from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
import { useStaffFiltering } from '@/hooks/useStaffFiltering';
import BasicInfoForm from './appointment/BasicInfoForm';
import DateTimeForm from './appointment/DateTimeForm';
import StaffSelectionForm from './appointment/StaffSelectionForm';

interface AppointmentFormProps {
  serviceType: 'grooming' | 'veterinary';
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ serviceType = 'grooming' }) => {
  const {
    date,
    setDate,
    selectedGroomerId,
    setSelectedGroomerId,
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
  } = useAppointmentForm(serviceType);

  // Use the staff filtering hook - no date filtering initially
  const {
    availableStaff,
    isLoading: staffLoading,
    error: staffError
  } = useStaffFiltering({
    service: selectedService,
    serviceDuration: pricing?.duration || selectedService?.default_duration || 60
  });

  // Fetch appropriate services when service type changes
  React.useEffect(() => {
    fetchServices(serviceType);
  }, [serviceType, fetchServices]);

  const getStepTitle = (step: number) => {
    if (step === 1) return "1. Informações Básicas";
    if (step === 2 && serviceRequiresStaff) return "2. Seleção do Profissional";
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

  console.log('🔍 DEBUG: AppointmentForm render - Service requires staff:', serviceRequiresStaff);
  console.log('🔍 DEBUG: Service requirements loaded:', serviceRequirementsLoaded);
  console.log('🔍 DEBUG: Current form step:', formStep);
  console.log('🔍 DEBUG: Available staff count:', availableStaff.length);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
          staff={availableStaff}
          selectedStaffId={selectedGroomerId}
          setSelectedStaffId={setSelectedGroomerId}
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
          onSubmit={handleSubmit}
          showTimeSlots={true}
          showSubmitButton={true}
          stepTitle={getStepTitle(serviceRequiresStaff ? 3 : 2)}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
