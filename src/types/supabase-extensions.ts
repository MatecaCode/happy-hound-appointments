
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
  log_cancellation_debug: {
    Args: {
      p_appointment_id: string;
      p_message: string;
      p_data: any;
    };
    Returns: void;
  };
  atomic_cancel_appointment: {
    Args: {
      p_appointment_id: string;
      p_appointment_date: string;
      p_slots_to_revert: string[];
      p_staff_ids: string[];
    };
    Returns: void;
  };
}
