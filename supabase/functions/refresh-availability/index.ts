
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

    // Step 1: Fetch all active provider profiles
    const { data: providers, error: providersError } = await supabase
      .from('provider_profiles')
      .select('id, type')

    if (providersError) {
      console.error('Error fetching providers:', providersError)
      throw providersError
    }

    console.log(`📋 Found ${providers?.length || 0} active providers`)

    // Step 2: Generate time slots from 09:00 to 16:30 (every 30 minutes)
    const timeSlots = []
    for (let hour = 9; hour < 17; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00:00`)
      if (hour < 16) { // Don't add 16:30 since we stop at 16:30
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30:00`)
      }
    }

    // Calculate target date (today + 90 days for rolling window)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 90)
    const targetDateString = targetDate.toISOString().split('T')[0]

    console.log(`📅 Generating availability for ${targetDateString} with ${timeSlots.length} time slots`)

    let totalSlots = 0

    // Step 3: Generate provider availability for each provider
    for (const provider of providers || []) {
      const providerSlots = []
      
      for (const timeSlot of timeSlots) {
        providerSlots.push({
          provider_id: provider.id,
          date: targetDateString,
          time_slot: timeSlot,
          available: true
        })
      }

      // Insert provider availability slots
      const { error: providerError } = await supabase
        .from('provider_availability')
        .upsert(providerSlots, {
          onConflict: 'provider_id,date,time_slot'
        })

      if (providerError) {
        console.error(`Error inserting provider availability for ${provider.id}:`, providerError)
        throw providerError
      }

      totalSlots += providerSlots.length
      console.log(`✅ Generated ${providerSlots.length} slots for provider ${provider.id} (${provider.type})`)
    }

    // Step 4: Generate shower availability (shared resource, no specific provider)
    const showerSlots = []
    for (const timeSlot of timeSlots) {
      showerSlots.push({
        date: targetDateString,
        time_slot: timeSlot,
        available_spots: 5 // 5 shower spots available per time slot
      })
    }

    // Insert shower availability slots
    const { error: showerError } = await supabase
      .from('shower_availability')
      .upsert(showerSlots, {
        onConflict: 'date,time_slot'
      })

    if (showerError) {
      console.error('Error inserting shower availability:', showerError)
      throw showerError
    }

    totalSlots += showerSlots.length
    console.log(`✅ Generated ${showerSlots.length} shower availability slots`)

    const successMessage = `✅ Successfully refreshed availability for ${targetDateString}! Generated ${totalSlots} total slots.`
    console.log(successMessage)

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        totalSlots: totalSlots,
        targetDate: targetDateString,
        breakdown: {
          providers: providers?.length || 0,
          timeSlotsPerProvider: timeSlots.length,
          providerSlots: (providers?.length || 0) * timeSlots.length,
          showerSlots: showerSlots.length
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
