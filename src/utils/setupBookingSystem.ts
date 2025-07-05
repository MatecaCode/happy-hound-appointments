
import { supabase } from '@/integrations/supabase/client';

export async function setupBookingSystemData() {
  console.log('🔧 Setting up booking system data...');
  
  try {
    // 1. Check if we have grooming services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('service_type', 'grooming');

    console.log('📋 Existing grooming services:', services);

    if (!services || services.length === 0) {
      console.log('➕ Creating default grooming services...');
      
      // Create basic grooming services
      const { data: newServices, error: createServicesError } = await supabase
        .from('services')
        .insert([
          {
            name: 'Banho e Tosa',
            description: 'Banho completo com tosa higiênica',
            base_price: 50.00,
            default_duration: 60,
            service_type: 'grooming',
            requires_grooming: true,
            requires_bath: true
          },
          {
            name: 'Apenas Banho',
            description: 'Banho completo sem tosa',
            base_price: 30.00,
            default_duration: 30,
            service_type: 'grooming',
            requires_bath: true
          }
        ])
        .select();

      if (createServicesError) {
        console.error('❌ Error creating services:', createServicesError);
      } else {
        console.log('✅ Created services:', newServices);
      }
    }

    // 2. Check if we have staff profiles
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('can_groom', true);

    console.log('👥 Existing groomer staff profiles:', staffProfiles);

    if (!staffProfiles || staffProfiles.length === 0) {
      console.log('➕ No groomer staff profiles found. Staff profiles should be created through user registration.');
    }

    // 3. Ensure staff availability for existing staff
    if (staffProfiles && staffProfiles.length > 0) {
      for (const staff of staffProfiles) {
        console.log(`📅 Checking availability for staff ${staff.id}...`);
        
        // Check if staff has availability records
        const { data: existingAvailability } = await supabase
          .from('staff_availability')
          .select('id')
          .eq('staff_profile_id', staff.id)
          .limit(1);
        
        if (!existingAvailability || existingAvailability.length === 0) {
          console.log(`Creating availability records for staff ${staff.id}`);
          
          // Create basic availability for the next 30 days
          const availabilityRecords = [];
          const startDate = new Date();
          
          for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            // Skip Sundays
            if (currentDate.getDay() !== 0) {
              const dateStr = currentDate.toISOString().split('T')[0];
              
              // Create slots from 9:00 to 17:00
              const timeSlots = [
                '09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00',
                '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00',
                '15:00:00', '15:30:00', '16:00:00', '16:30:00'
              ];
              
              for (const timeSlot of timeSlots) {
                availabilityRecords.push({
                  staff_profile_id: staff.id,
                  date: dateStr,
                  time_slot: timeSlot,
                  available: true
                });
              }
            }
          }
          
          if (availabilityRecords.length > 0) {
            const { error: availabilityError } = await supabase
              .from('staff_availability')
              .insert(availabilityRecords);
            
            if (availabilityError) {
              console.error(`❌ Error creating availability for staff ${staff.id}:`, availabilityError);
            } else {
              console.log(`✅ Created availability records for staff ${staff.id}`);
            }
          }
        } else {
          console.log(`✅ Staff ${staff.id} already has availability records`);
        }
      }
    }

    console.log('✅ Booking system setup complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up booking system:', error);
    return false;
  }
}
