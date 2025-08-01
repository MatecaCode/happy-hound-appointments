import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://ieotixprkfglummoobkb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllb3RpeHBya2ZnbHVtbW9vYmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjUxNjUsImV4cCI6MjA2NDkwMTE2NX0.hWAxW1tBbMQr3BOPSPOR57eiYvzWzDjaUMjigLyUaGQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAdminFunction() {
  try {
    console.log('🧪 Testing admin booking function...');
    
    // Try to call the function with test parameters
    const { data, error } = await supabase.rpc('create_booking_admin', {
      client_id: '00000000-0000-0000-0000-000000000000',
      pet_id: '00000000-0000-0000-0000-000000000000',
      service_id: '00000000-0000-0000-0000-000000000000',
      staff_profile_ids: [],
      booking_date: '2025-01-01',
      time_slot: '09:00:00',
      notes: 'Test booking',
      is_override: false
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('not found')) {
        console.log('❌ Function does not exist yet');
        console.log('📋 You need to run the SQL in your Supabase dashboard:');
        console.log('1. Go to your Supabase project');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy the contents of create_admin_booking_function.sql');
        console.log('4. Click Run');
      } else {
        console.log('✅ Function exists! (Got expected validation error)');
        console.log('Error details:', error.message);
      }
    } else {
      console.log('✅ Function exists and is working!');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testAdminFunction();