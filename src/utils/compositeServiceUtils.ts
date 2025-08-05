import { supabase } from '@/integrations/supabase/client';
import { CompositeService, CompositeServiceWithComponents, CompositeServiceDetails } from '@/types/supabase-extensions';

/**
 * Fetch all active composite services
 */
export const fetchCompositeServices = async (): Promise<CompositeService[]> => {
  try {
    const { data, error } = await supabase
      .from('composite_services')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching composite services:', error);
    throw error;
  }
};

/**
 * Fetch composite service with its components
 */
export const fetchCompositeServiceWithComponents = async (compositeServiceId: string): Promise<CompositeServiceWithComponents[]> => {
  try {
    const { data, error } = await supabase
      .from('composite_services_with_components')
      .select('*')
      .eq('composite_service_id', compositeServiceId)
      .order('order_index');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching composite service components:', error);
    throw error;
  }
};

/**
 * Get composite service details including pricing and duration for specific breed/size
 */
export const getCompositeServiceDetails = async (
  compositeServiceId: string,
  breed?: string,
  size?: string
): Promise<CompositeServiceDetails | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_composite_service_details', {
        p_composite_service_id: compositeServiceId,
        p_breed: breed || null,
        p_size: size || null
      });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting composite service details:', error);
    throw error;
  }
};

/**
 * Fetch all composite services with their basic info
 */
export const fetchCompositeServicesList = async (): Promise<Array<CompositeService & { component_count: number }>> => {
  try {
    const { data, error } = await supabase
      .from('composite_services')
      .select(`
        *,
        composite_service_components(count)
      `)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    
    return (data || []).map(service => ({
      ...service,
      component_count: service.composite_service_components?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Error fetching composite services list:', error);
    throw error;
  }
};

/**
 * Create a new composite service
 */
export const createCompositeService = async (serviceData: {
  name: string;
  slug: string;
  description?: string;
  component_service_ids: string[];
}): Promise<CompositeService> => {
  try {
    // Start a transaction
    const { data: compositeService, error: compositeError } = await supabase
      .from('composite_services')
      .insert({
        name: serviceData.name,
        slug: serviceData.slug,
        description: serviceData.description || null
      })
      .select()
      .single();

    if (compositeError) throw compositeError;

    // Add components
    const components = serviceData.component_service_ids.map((serviceId, index) => ({
      composite_service_id: compositeService.id,
      service_id: serviceId,
      order_index: index + 1
    }));

    const { error: componentsError } = await supabase
      .from('composite_service_components')
      .insert(components);

    if (componentsError) throw componentsError;

    return compositeService;
  } catch (error) {
    console.error('Error creating composite service:', error);
    throw error;
  }
};

/**
 * Update a composite service
 */
export const updateCompositeService = async (
  compositeServiceId: string,
  serviceData: {
    name?: string;
    slug?: string;
    description?: string;
    active?: boolean;
    component_service_ids?: string[];
  }
): Promise<void> => {
  try {
    // Update basic info
    const { error: updateError } = await supabase
      .from('composite_services')
      .update({
        name: serviceData.name,
        slug: serviceData.slug,
        description: serviceData.description,
        active: serviceData.active
      })
      .eq('id', compositeServiceId);

    if (updateError) throw updateError;

    // Update components if provided
    if (serviceData.component_service_ids) {
      // Delete existing components
      const { error: deleteError } = await supabase
        .from('composite_service_components')
        .delete()
        .eq('composite_service_id', compositeServiceId);

      if (deleteError) throw deleteError;

      // Add new components
      const components = serviceData.component_service_ids.map((serviceId, index) => ({
        composite_service_id: compositeServiceId,
        service_id: serviceId,
        order_index: index + 1
      }));

      const { error: insertError } = await supabase
        .from('composite_service_components')
        .insert(components);

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error updating composite service:', error);
    throw error;
  }
};

/**
 * Delete a composite service
 */
export const deleteCompositeService = async (compositeServiceId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('composite_services')
      .delete()
      .eq('id', compositeServiceId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting composite service:', error);
    throw error;
  }
}; 