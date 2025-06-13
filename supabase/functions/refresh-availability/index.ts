
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AvailabilitySlot {
  resource_type: string;
  provider_id: string | null;
  date: string;
  time_slot: string;
  available_capacity: number;
  max_capacity: number;
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

    // Step 1: Fetch all groomers and veterinarians
    const { data: groomers, error: groomersError } = await supabase
      .from('groomers')
      .select('id, name')

    if (groomersError) {
      console.error('Error fetching groomers:', groomersError)
      throw groomersError
    }

    const { data: veterinarians, error: vetsError } = await supabase
      .from('veterinarians')
      .select('id, name')

    if (vetsError) {
      console.error('Error fetching veterinarians:', vetsError)
      throw vetsError
    }

    console.log(`📋 Found ${groomers?.length || 0} groomers and ${veterinarians?.length || 0} veterinarians`)

    // Step 2: Generate time slots from 09:00 to 17:00 (every 30 minutes)
    const timeSlots = []
    for (let hour = 9; hour < 17; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
    }

    // Generate dates for the next 7 days
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }

    console.log(`📅 Generating slots for ${dates.length} days with ${timeSlots.length} time slots each`)

    // Step 3: Generate availability slots
    const availabilitySlots: AvailabilitySlot[] = []

    // Generate groomer availability
    for (const groomer of groomers || []) {
      for (const date of dates) {
        for (const timeSlot of timeSlots) {
          availabilitySlots.push({
            resource_type: 'groomer',
            provider_id: groomer.id,
            date: date,
            time_slot: timeSlot,
            available_capacity: 1,
            max_capacity: 1
          })
        }
      }
    }

    // Generate veterinarian availability
    for (const vet of veterinarians || []) {
      for (const date of dates) {
        for (const timeSlot of timeSlots) {
          availabilitySlots.push({
            resource_type: 'veterinary',
            provider_id: vet.id,
            date: date,
            time_slot: timeSlot,
            available_capacity: 1,
            max_capacity: 1
          })
        }
      }
    }

    // Step 4: Generate shared shower slots (5 capacity, no specific provider)
    for (const date of dates) {
      for (const timeSlot of timeSlots) {
        availabilitySlots.push({
          resource_type: 'shower',
          provider_id: null,
          date: date,
          time_slot: timeSlot,
          available_capacity: 5,
          max_capacity: 5
        })
      }
    }

    console.log(`📊 Generated ${availabilitySlots.length} total availability slots`)

    // Step 5: Insert all slots using upsert to avoid duplicates
    const { error: insertError } = await supabase
      .from('service_availability')
      .upsert(availabilitySlots, {
        onConflict: 'resource_type,provider_id,date,time_slot'
      })

    if (insertError) {
      console.error('Error inserting availability slots:', insertError)
      throw insertError
    }

    const successMessage = `✅ Successfully refreshed availability! Generated ${availabilitySlots.length} slots for ${dates.length} days.`
    console.log(successMessage)

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        totalSlots: availabilitySlots.length,
        breakdown: {
          groomers: groomers?.length || 0,
          veterinarians: veterinarians?.length || 0,
          daysGenerated: dates.length,
          timeSlotsPerDay: timeSlots.length,
          groomerSlots: (groomers?.length || 0) * dates.length * timeSlots.length,
          vetSlots: (veterinarians?.length || 0) * dates.length * timeSlots.length,
          showerSlots: dates.length * timeSlots.length
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
