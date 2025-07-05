
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function CreateAvailabilitySlots() {
  const [isGeneratingStaff, setIsGeneratingStaff] = useState(false);

  const generateStaffAvailability = async () => {
    setIsGeneratingStaff(true);
    try {
      // Get all active staff profiles (Phase 1)
      const { data: staffProfiles, error } = await supabase
        .from('staff_profiles')
        .select('id, name')
        .eq('active', true);

      if (error) throw error;

      if (!staffProfiles || staffProfiles.length === 0) {
        toast.error('No active staff found. Please create staff profiles first.');
        return;
      }

      console.log('📅 Generating availability for staff:', staffProfiles);

      // Manually create 10-minute availability slots since the RPC doesn't exist
      const today = new Date();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      for (const staff of staffProfiles) {
        const availabilitySlots = [];
        
        // Generate dates for next 90 days
        for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Skip Sundays
          if (d.getDay() === 0) continue;
          
          // Generate 10-minute slots from 9:00 to 17:00
          for (let hour = 9; hour < 17; hour++) {
            for (let min = 0; min < 60; min += 10) {
              const timeSlot = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
              availabilitySlots.push({
                staff_profile_id: staff.id,
                date: dateStr,
                time_slot: timeSlot,
                available: true
              });
            }
          }
        }

        // Insert availability in batches
        const batchSize = 100;
        for (let i = 0; i < availabilitySlots.length; i += batchSize) {
          const batch = availabilitySlots.slice(i, i + batchSize);
          const { error: batchError } = await supabase
            .from('staff_availability')
            .upsert(batch, { onConflict: 'staff_profile_id,date,time_slot' });

          if (batchError) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, batchError);
          }
        }

        console.log(`✅ Generated availability for ${staff.name}`);
      }

      toast.success(`Generated 10-minute availability slots for ${staffProfiles.length} staff members`);
      
    } catch (error: any) {
      console.error('Error generating staff availability:', error);
      toast.error('Failed to generate staff availability: ' + error.message);
    } finally {
      setIsGeneratingStaff(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Phase 1 Availability Management</CardTitle>
        <CardDescription>
          Generate 10-minute availability slots for staff members using the new Phase 1 schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800">Phase 1 Changes</h4>
          <ul className="text-sm text-blue-700 mt-1 space-y-1">
            <li>• Uses staff_profiles instead of provider_profiles</li>
            <li>• Generates 10-minute time slots for precise booking</li>
            <li>• Clients see 30-minute slots, backend uses 10-minute logic</li>
          </ul>
        </div>

        <Button 
          onClick={generateStaffAvailability}
          disabled={isGeneratingStaff}
          className="w-full"
        >
          {isGeneratingStaff ? 'Generating Staff Availability...' : 'Generate Staff Availability (10min slots)'}
        </Button>

        <div className="text-sm text-gray-600">
          <p>
            This will create 10-minute availability slots for all active staff members 
            for the next 90 days, using the new Phase 1 database schema.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
