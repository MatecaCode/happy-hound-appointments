
// Custom type extensions for Supabase functions not in the auto-generated types
export interface CustomDatabaseFunctions {
  reduce_availability_capacity: {
    Args: {
      p_resource_type: string;
      p_provider_id: string;
      p_date: string;
      p_time_slot: string;
    };
    Returns: void;
  };
}
