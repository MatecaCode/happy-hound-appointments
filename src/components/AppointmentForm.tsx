
import React from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
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
    groomers,
    handleNextAvailableSelect,
    handleSubmit,
    fetchServices,
    serviceRequiresStaff,
    serviceRequirementsLoaded,
  } = useAppointmentForm(serviceType);

  // Fetch appropriate services when service type changes
  React.useEffect(() => {
    fetchServices(serviceType);
  }, [serviceType, fetchServices]);

  // Updated step flow: Pet -> Service -> Staff -> Date/Time
  const getStepTitle = (step: number) => {
    if (step === 1) return "1. Informações Básicas";
    if (step === 2) return "2. Seleção do Profissional";
    if (step === 3) return "3. Escolha da Data e Horário";
    return "";
  };

  const handleNextStep = (currentStep: number) => {
    if (currentStep === 1) {
      // From basic info, always go to staff selection if service requires staff
      if (serviceRequiresStaff) {
        setFormStep(2);
      } else {
        // If no staff required, go directly to date/time
        setFormStep(3);
      }
    } else if (currentStep === 2) {
      // From staff selection, go to date/time
      setFormStep(3);
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
          staff={groomers}
          selectedStaffId={selectedGroomerId}
          setSelectedStaffId={setSelectedGroomerId}
          onNext={() => handleNextStep(2)}
          onBack={() => handleBackStep(2)}
          serviceType={serviceType}
          isLoading={isLoading}
        />
      )}
      
      {/* Step 3: Date/Time Selection */}
      {formStep === 3 && (
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
          onBack={() => handleBackStep(3)}
          onSubmit={handleSubmit}
          showTimeSlots={true}
          showSubmitButton={true}
          stepTitle={getStepTitle(3)}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
