import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting daily availability roll...');

    // Generate staff availability for the target date (today + 90 days)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 90);
    const dateString = targetDate.toISOString().split('T')[0];

    console.log(`📅 Adding staff availability for ${dateString}`);

    // Fetch all active staff profiles
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, name, can_groom, can_vet, can_bathe')
      .eq('active', true);

    if (staffError) {
      console.error('❌ Error fetching staff profiles:', staffError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Staff profiles error: ${staffError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`👥 Found ${staffProfiles?.length || 0} active staff members`);

    // Generate time slots (09:00-16:30 every 30 minutes)
    const timeSlots = [];
    for (let hour = 9; hour < 17; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
      if (hour < 16) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
      }
    }

    let totalSlotsCreated = 0;

    // Create availability entries for each staff member
    for (const staff of staffProfiles || []) {
      const staffSlots = timeSlots.map((time) => ({
        staff_profile_id: staff.id,
        date: dateString,
        time_slot: time,
        available: true,
      }));

      console.log(`📋 Inserting ${staffSlots.length} slots for staff ${staff.name}`);

      // Insert staff availability slots
      const { error: staffAvailabilityError } = await supabase
        .from('staff_availability')
        .upsert(staffSlots, {
          onConflict: 'staff_profile_id,date,time_slot'
        });

      if (staffAvailabilityError) {
        console.error(`❌ Error inserting staff availability for ${staff.name}:`, staffAvailabilityError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Staff availability error for ${staff.name}: ${staffAvailabilityError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      totalSlotsCreated += staffSlots.length;
      console.log(`✅ Created ${staffSlots.length} slots for ${staff.name}`);
    }

    // Clean up old availability (older than today)
    const today = new Date().toISOString().split('T')[0];
    const { error: cleanupError } = await supabase
      .from('staff_availability')
      .delete()
      .lt('date', today);

    if (cleanupError) {
      console.warn('⚠️ Warning: Could not clean up old availability records:', cleanupError.message);
    } else {
      console.log(`🧹 Cleaned up old availability records before ${today}`);
    }

    console.log('🎉 Daily availability roll completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily availability rolled successfully',
        details: {
          staffAvailability: `Added ${totalSlotsCreated} slots for ${staffProfiles?.length || 0} staff members`,
          targetDate: dateString,
          cleanupDate: today
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('💥 Unexpected error in roll-availability:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});