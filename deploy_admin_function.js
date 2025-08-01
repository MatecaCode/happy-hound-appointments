import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://ieotixprkfglummoobkb.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllb3RpeHBya2ZnbHVtbW9vYmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNTE2NSwiZXhwIjoyMDY0OTAxMTY1fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployAdminFunction() {
  try {
    console.log('📦 Deploying admin booking function...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('create_admin_booking_function.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error deploying function:', error);
      return;
    }
    
    console.log('✅ Admin booking function deployed successfully!');
    console.log('🎉 You can now test the admin booking system');
    
  } catch (error) {
    console.error('💥 Failed to deploy function:', error);
  }
}

deployAdminFunction();