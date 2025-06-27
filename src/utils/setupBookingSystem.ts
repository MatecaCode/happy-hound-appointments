
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
            price: 50.00,
            duration: 60,
            duration_minutes: 60,
            service_type: 'grooming'
          },
          {
            name: 'Apenas Banho',
            description: 'Banho completo sem tosa',
            price: 30.00,
            duration: 30,
            duration_minutes: 30,
            service_type: 'grooming'
          }
        ])
        .select();

      if (createServicesError) {
        console.error('❌ Error creating services:', createServicesError);
      } else {
        console.log('✅ Created services:', newServices);
      }
    }

    // 2. Check if we have provider profiles
    const { data: providers, error: providersError } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('type', 'groomer');

    console.log('👥 Existing groomer profiles:', providers);

    if (!providers || providers.length === 0) {
      console.log('➕ Creating default groomer profiles...');
      
      // Create test groomer profiles
      const { data: newProviders, error: createProvidersError } = await supabase
        .from('provider_profiles')
        .insert([
          {
            user_id: 'b13fb65b-2337-4539-aed0-52e29467b79c', // Test user ID
            type: 'groomer',
            bio: 'Tosador experiente especializado em cães de pequeno porte',
            rating: 4.8
          },
          {
            user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Another test user ID
            type: 'groomer',
            bio: 'Especialista em tosa de raças grandes e médias',
            rating: 4.9
          }
        ])
        .select();

      if (createProvidersError) {
        console.error('❌ Error creating provider profiles:', createProvidersError);
      } else {
        console.log('✅ Created provider profiles:', newProviders);
      }
    }

    // 3. Check if we have service resources configured
    const { data: serviceResources, error: resourcesError } = await supabase
      .from('service_resources')
      .select('*');

    console.log('🔧 Existing service resources:', serviceResources);

    if (!serviceResources || serviceResources.length === 0) {
      console.log('➕ Creating service resource mappings...');
      
      // Get all grooming services
      const { data: allServices } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', 'grooming');

      if (allServices && allServices.length > 0) {
        const resourceMappings = [];
        
        for (const service of allServices) {
          // Each grooming service needs both a groomer and a shower
          resourceMappings.push(
            {
              service_id: service.id,
              resource_type: 'provider',
              provider_type: 'groomer',
              required: true
            },
            {
              service_id: service.id,
              resource_type: 'shower',
              required: true
            }
          );
        }

        const { data: newResources, error: createResourcesError } = await supabase
          .from('service_resources')
          .insert(resourceMappings)
          .select();

        if (createResourcesError) {
          console.error('❌ Error creating service resources:', createResourcesError);
        } else {
          console.log('✅ Created service resources:', newResources);
        }
      }
    }

    // 4. Ensure provider availability for the next 90 days
    if (providers && providers.length > 0) {
      for (const provider of providers) {
        console.log(`📅 Ensuring availability for provider ${provider.id}...`);
        
        const { error: availabilityError } = await supabase.rpc('ensure_provider_availability', {
          provider_profile_id: provider.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

        if (availabilityError) {
          console.error(`❌ Error ensuring availability for provider ${provider.id}:`, availabilityError);
        } else {
          console.log(`✅ Ensured availability for provider ${provider.id}`);
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
