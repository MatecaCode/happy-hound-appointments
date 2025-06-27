
import React from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
import BasicInfoForm from './appointment/BasicInfoForm';
import DateTimeForm from './appointment/DateTimeForm';
import GroomerSelectionForm from './appointment/GroomerSelectionForm';

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
    serviceRequiresGroomer,
  } = useAppointmentForm(serviceType);

  // Fetch appropriate services when service type changes
  React.useEffect(() => {
    fetchServices(serviceType);
  }, [serviceType, fetchServices]);

  // Calculate the step number for the final confirmation based on whether groomer is required
  const finalStepNumber = serviceRequiresGroomer ? 4 : 3;

  console.log('🔍 DEBUG: AppointmentForm render - Service requires groomer:', serviceRequiresGroomer);
  console.log('🔍 DEBUG: Current form step:', formStep, 'Final step:', finalStepNumber);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {formStep === 1 && (
        <BasicInfoForm
          userPets={userPets}
          services={services}
          selectedPet={selectedPet}
          setSelectedPet={setSelectedPet}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          onNext={() => setFormStep(2)}
          serviceType={serviceType}
        />
      )}
      
      {formStep === 2 && (
        <DateTimeForm
          date={date}
          setDate={setDate}
          timeSlots={timeSlots}
          selectedTimeSlotId={selectedTimeSlotId}
          setSelectedTimeSlotId={setSelectedTimeSlotId}
          nextAvailable={nextAvailable}
          handleNextAvailableSelect={handleNextAvailableSelect}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={(tab: 'calendar' | 'next-available') => setActiveTab(tab)}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setFormStep(1)}
          onNext={() => setFormStep(serviceRequiresGroomer ? 3 : 3)} // Go to step 3 for both cases, but step 3 will be different
          showTimeSlots={false}
          showSubmitButton={false}
        />
      )}
      
      {/* Only show groomer selection if service requires groomer */}
      {formStep === 3 && serviceRequiresGroomer && (
        <GroomerSelectionForm
          groomers={groomers}
          selectedGroomerId={selectedGroomerId}
          setSelectedGroomerId={setSelectedGroomerId}
          date={date}
          onNext={() => setFormStep(4)}
          onBack={() => setFormStep(2)}
          serviceType={serviceType}
        />
      )}
      
      {/* Final step - time slot selection and confirmation */}
      {((formStep === 3 && !serviceRequiresGroomer) || (formStep === 4 && serviceRequiresGroomer)) && (
        <DateTimeForm
          date={date}
          setDate={setDate}
          timeSlots={timeSlots}
          selectedTimeSlotId={selectedTimeSlotId}
          setSelectedTimeSlotId={setSelectedTimeSlotId}
          nextAvailable={nextAvailable}
          handleNextAvailableSelect={handleNextAvailableSelect}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={(tab: 'calendar' | 'next-available') => setActiveTab(tab)}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setFormStep(serviceRequiresGroomer ? 3 : 2)}
          onSubmit={handleSubmit}
          showTimeSlots={true}
          showSubmitButton={true}
          stepTitle={`${finalStepNumber}. Confirme o Horário`}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
