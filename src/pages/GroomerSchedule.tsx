import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { generateClientTimeSlots, getRequiredBackendSlots } from '@/utils/timeSlotHelpers';

// Define a type for availability status
type AvailabilityStatus = 'available' | 'unavailable' | 'pending';

const GroomerSchedule = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [schedule, setSchedule] = useState<{ [key: string]: AvailabilityStatus }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const fetchSchedule = async () => {
    if (!selectedDate) return;

    setLoading(true);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Fetch the groomer's availability for the selected date
      const { data, error } = await supabase
        .from('staff_availability')
        .select('time_slot, available')
        .eq('staff_profile_id', 'f44f0947-96a8-48e4-b399-0c634c990c93') // Replace with actual groomer ID
        .eq('date', formattedDate);

      if (error) {
        console.error('Error fetching schedule:', error);
        return;
      }

      // Initialize the schedule with all possible time slots
      const initialSchedule: { [key: string]: AvailabilityStatus } = {};
      generateClientTimeSlots().forEach(slot => {
        initialSchedule[slot] = 'available'; // Default to available
      });

      // Update the schedule based on the fetched data
      data.forEach(item => {
        initialSchedule[item.time_slot] = item.available ? 'available' : 'unavailable';
      });

      setSchedule(initialSchedule);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (timeSlot: string, newStatus: AvailabilityStatus) => {
    if (!selectedDate) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      // Update the availability in the database
      const { error } = await supabase
        .from('staff_availability')
        .update({ available: newStatus === 'available' })
        .eq('staff_profile_id', 'f44f0947-96a8-48e4-b399-0c634c990c93') // Replace with actual groomer ID
        .eq('date', formattedDate)
        .eq('time_slot', timeSlot);

      if (error) {
        console.error('Error updating availability:', error);
        return;
      }

      // Update the local state
      setSchedule(prevSchedule => ({
        ...prevSchedule,
        [timeSlot]: newStatus,
      }));
    } catch (error) {
      console.error('Unexpected error updating availability:', error);
    }
  };

  return (
    <Layout>
      <section className="bg-secondary/50 py-12">
        <div className="container max-w-4xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-medium">Groomer Schedule</CardTitle>
              <Badge variant="secondary">
                <CalendarDays className="mr-2 h-4 w-4" />
                {format(selectedDate || new Date(), 'PPP', { locale: ptBR })}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {generateClientTimeSlots().map(slot => (
                  <Button
                    key={slot}
                    variant="outline"
                    className="flex items-center justify-center"
                    onClick={() => {
                      const currentStatus = schedule[slot] || 'available';
                      const newStatus: AvailabilityStatus =
                        currentStatus === 'available' ? 'unavailable' : 'available';
                      updateAvailability(slot, newStatus);
                    }}
                    disabled={loading}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {slot}
                    {schedule[slot] === 'unavailable' && (
                      <Badge variant="destructive" className="ml-2">
                        Unavailable
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default GroomerSchedule;
