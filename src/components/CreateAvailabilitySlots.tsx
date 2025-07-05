
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function CreateAvailabilitySlots() {
  const [isCreating, setIsCreating] = useState(false);
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

      // Call the database function to generate 10-minute availability slots
      for (const staff of staffProfiles) {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { error: genError } = await supabase.rpc('ensure_staff_availability_10min', {
          staff_profile_id: staff.id,
          start_date: startDate,
          end_date: endDate
        });

        if (genError) {
          console.error(`Error generating availability for ${staff.name}:`, genError);
          toast.error(`Failed to generate availability for ${staff.name}: ${genError.message}`);
        } else {
          console.log(`✅ Generated availability for ${staff.name}`);
        }
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
