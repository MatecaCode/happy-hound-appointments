
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

  atomic_cancel_appointment: {
    Args: {
      p_appointment_id: string;
      p_appointment_date: string;
      p_slots_to_revert: string[];
      p_staff_ids: string[];
    };
    Returns: void;
  };

  create_admin_booking_with_addons: {
    Args: {
      _client_user_id: string;
      _pet_id: string;
      _service_id: string;
      _booking_date: string;
      _time_slot: string;
      _calculated_price: number;
      _notes?: string;
      _provider_ids?: string[];
      _extra_fee?: number;
      _extra_fee_reason?: string;
      _addons?: any[];
      _created_by?: string;
    };
    Returns: string;
  };
}
