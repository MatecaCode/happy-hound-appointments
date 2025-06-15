
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const START_HOUR = 9;
const END_HOUR = 17;
const SLOT_INTERVALS = [":00", ":30"];
const SHOWER_SPOTS = 5;

function generateTimeSlots() {
  const slots: string[] = [];
  for(let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (const mins of SLOT_INTERVALS) {
      slots.push(`${hour.toString().padStart(2,"0")}${mins}`);
    }
  }
  return slots;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Calculate target date (today + 90 days)
    const today = new Date();
    const targetDateObj = new Date(today);
    targetDateObj.setHours(0,0,0,0);
    targetDateObj.setDate(today.getDate() + 90);
    const targetDate = targetDateObj.toISOString().split('T')[0];
    const slots = generateTimeSlots();

    // 2. Insert shower_availability for the target date
    let insertedShower = 0;
    for (const slot of slots) {
      // Only insert if not already present (avoid duplicates)
      const { data: existing, error: existErr } = await supabase
        .from('shower_availability')
        .select('id')
        .eq('date', targetDate)
        .eq('time_slot', slot)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase
          .from('shower_availability')
          .insert({
            date: targetDate,
            time_slot: slot,
            available_spots: SHOWER_SPOTS
          });
        if (!insertErr) insertedShower++;
      }
    }

    // 3. Insert provider_availability for all groomers and vets
    // Get all provider_profiles (groomer or vet)
    const { data: providers, error: provErr } = await supabase
      .from('provider_profiles')
      .select('id, type');

    if (provErr) throw provErr;

    let insertedProviderSlots = 0;
    for (const provider of providers || []) {
      for (const slot of slots) {
        // Only insert if not already present
        const { data: existingProvider, error: existProvErr } = await supabase
          .from('provider_availability')
          .select('id')
          .eq('provider_id', provider.id)
          .eq('date', targetDate)
          .eq('time_slot', slot)
          .maybeSingle();

        if (!existingProvider) {
          const { error: insProvErr } = await supabase
            .from('provider_availability')
            .insert({
              provider_id: provider.id,
              date: targetDate,
              time_slot: slot,
              available: true
            });
          if (!insProvErr) insertedProviderSlots++;
        }
      }
    }

    const msg =
      `Rolled new availability for ${targetDate}: ` +
      `${insertedShower} shower slots, ${insertedProviderSlots} provider slots.`;

    console.log(msg);

    return new Response(JSON.stringify({
      success: true,
      message: msg,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error rolling availability:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
