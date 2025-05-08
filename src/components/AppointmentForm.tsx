
import React from 'react';
import { useAppointmentForm } from '@/hooks/useAppointmentForm';
import BasicInfoForm from './appointment/BasicInfoForm';
import GroomerSelectionForm from './appointment/GroomerSelectionForm';
import DateTimeForm from './appointment/DateTimeForm';

const AppointmentForm = () => {
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
    ownerName, 
    setOwnerName,
    ownerPhone,
    setOwnerPhone,
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
    handleSubmit
  } = useAppointmentForm();

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
          ownerName={ownerName}
          setOwnerName={setOwnerName}
          ownerPhone={ownerPhone}
          setOwnerPhone={setOwnerPhone}
          onNext={() => setFormStep(2)}
        />
      )}
      
      {formStep === 2 && (
        <GroomerSelectionForm
          groomers={groomers}
          selectedGroomerId={selectedGroomerId}
          setSelectedGroomerId={setSelectedGroomerId}
          onNext={() => setFormStep(3)}
          onBack={() => setFormStep(1)}
        />
      )}
      
      {formStep === 3 && (
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
          setActiveTab={setActiveTab}
          notes={notes}
          setNotes={setNotes}
          onBack={() => setFormStep(2)}
          onSubmit={handleSubmit}
        />
      )}
    </form>
  );
};

export default AppointmentForm;
