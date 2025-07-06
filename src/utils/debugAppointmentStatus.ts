
import { supabase } from '@/integrations/supabase/client';

export const debugAppointmentStatus = async () => {
  console.log('🔍 [DEBUG] Checking appointment status constraints...');
  
  // Try a direct approach to test different status values
  const testStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'];
  
  for (const status of testStatuses) {
    console.log(`🧪 [DEBUG] Testing status: ${status}`);
    
    const { error: testError } = await supabase
      .from('appointments')
      .insert({
        client_id: '00000000-0000-0000-0000-000000000000', // Invalid ID to fail before status check
        pet_id: '00000000-0000-0000-0000-000000000000',
        service_id: '00000000-0000-0000-0000-000000000000',
        date: '2025-12-31',
        time: '12:00:00',
        status: status,
        service_status: 'not_started'
      });
      
    if (testError) {
      if (testError.message.includes('status_check') || testError.message.includes('violates check constraint')) {
        console.log(`❌ [DEBUG] Status '${status}' is NOT allowed`);
      } else if (testError.message.includes('foreign key') || testError.message.includes('violates foreign key')) {
        console.log(`✅ [DEBUG] Status '${status}' is allowed (failed on foreign key as expected)`);
      } else {
        console.log(`🤔 [DEBUG] Status '${status}' - other error:`, testError.message);
      }
    }
  }
};

export const debugServiceStatus = async () => {
  console.log('🔍 [DEBUG] Checking service status constraints...');
  
  const testServiceStatuses = ['not_started', 'in_progress', 'completed', 'cancelled'];
  
  for (const serviceStatus of testServiceStatuses) {
    console.log(`🧪 [DEBUG] Testing service_status: ${serviceStatus}`);
    
    const { error: testError } = await supabase
      .from('appointments')
      .insert({
        client_id: '00000000-0000-0000-0000-000000000000', // Invalid ID to fail before status check
        pet_id: '00000000-0000-0000-0000-000000000000',
        service_id: '00000000-0000-0000-0000-000000000000',
        date: '2025-12-31',
        time: '12:00:00',
        status: 'pending',
        service_status: serviceStatus
      });
      
    if (testError) {
      if (testError.message.includes('service_status_check') || testError.message.includes('violates check constraint')) {
        console.log(`❌ [DEBUG] Service status '${serviceStatus}' is NOT allowed`);
      } else if (testError.message.includes('foreign key') || testError.message.includes('violates foreign key')) {
        console.log(`✅ [DEBUG] Service status '${serviceStatus}' is allowed (failed on foreign key as expected)`);
      } else {
        console.log(`🤔 [DEBUG] Service status '${serviceStatus}' - other error:`, testError.message);
      }
    }
  }
};
