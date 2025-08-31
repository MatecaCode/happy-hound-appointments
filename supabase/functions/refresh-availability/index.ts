
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔧 Starting availability refresh...')

    // Step 1: Clean up past availability records (NEW TABLES ONLY)
    const today = new Date().toISOString().split('T')[0]
    console.log(`🧹 Cleaning up availability records before ${today}`)

    // Delete past staff availability (NEW TABLE)
    const { data: deletedStaffSlots, error: deleteStaffError } = await supabase
      .from('staff_availability')
      .delete()
      .lt('date', today)

    if (deleteStaffError) {
      console.error('Error deleting past staff availability:', deleteStaffError)
      throw deleteStaffError
    }

    console.log(`✅ Cleaned up past staff availability records before ${today}`)

    // Step 2: Fetch all active staff profiles (NEW TABLE)
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, name, can_groom, can_vet, can_bathe')
      .eq('active', true)

    if (staffError) {
      console.error('Error fetching staff profiles:', staffError)
      throw staffError
    }

    console.log(`📋 Found ${staffProfiles?.length || 0} active staff members`)

    // Step 3: Generate time slots from 09:00 to 16:30 (every 30 minutes)
    const timeSlots = []
    for (let hour = 9; hour <= 17; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00:00`)
      if (hour < 17) { // Don't add 17:30 since we stop at 17:00
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30:00`)
      }
    }

    // Calculate target date (today + 90 days for rolling window)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 90)
    const targetDateString = targetDate.toISOString().split('T')[0]

    console.log(`📅 Generating availability for ${targetDateString} with ${timeSlots.length} time slots`)

    let totalSlots = 0

    // Step 4: Generate staff availability for each staff member (NEW TABLE)
    for (const staff of staffProfiles || []) {
      const staffSlots = []
      
      for (const timeSlot of timeSlots) {
        staffSlots.push({
          staff_profile_id: staff.id,
          date: targetDateString,
          time_slot: timeSlot,
          available: true
        })
      }

      // Insert staff availability slots
      const { error: staffAvailabilityError } = await supabase
        .from('staff_availability')
        .upsert(staffSlots, {
          onConflict: 'staff_profile_id,date,time_slot'
        })

      if (staffAvailabilityError) {
        console.error(`Error inserting staff availability for ${staff.id}:`, staffAvailabilityError)
        throw staffAvailabilityError
      }

      totalSlots += staffSlots.length
      console.log(`✅ Generated ${staffSlots.length} slots for staff ${staff.name} (${staff.id})`)
    }

    const successMessage = `✅ Successfully refreshed staff availability! Cleaned up past records and generated ${totalSlots} total slots for ${targetDateString}.`
    console.log(successMessage)

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        totalSlots: totalSlots,
        targetDate: targetDateString,
        cleanupDate: today,
        breakdown: {
          staffMembers: staffProfiles?.length || 0,
          timeSlotsPerStaff: timeSlots.length,
          staffSlots: totalSlots
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in refresh-availability function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})