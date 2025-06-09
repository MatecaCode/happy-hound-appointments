export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          owner_name: string
          pet_id: string
          pet_name: string
          provider_id: string
          resource_type: string | null
          service: string
          service_id: string
          status: string
          time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          owner_name: string
          pet_id: string
          pet_name: string
          provider_id: string
          resource_type?: string | null
          service: string
          service_id: string
          status?: string
          time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          owner_name?: string
          pet_id?: string
          pet_name?: string
          provider_id?: string
          resource_type?: string | null
          service?: string
          service_id?: string
          status?: string
          time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_resource_type_fkey"
            columns: ["resource_type"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_capacity: {
        Row: {
          appointment_id: string
          created_at: string | null
          date: string
          id: string
          provider_id: string | null
          resource_type: string
          time_slot: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          date: string
          id?: string
          provider_id?: string | null
          resource_type: string
          time_slot: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          date?: string
          id?: string
          provider_id?: string | null
          resource_type?: string
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_capacity_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_capacity_resource_type_fkey"
            columns: ["resource_type"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["name"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      groomers: {
        Row: {
          about: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          profile_image: string | null
          rating: number | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          shipping_address: string
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shipping_address: string
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shipping_address?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          age: string | null
          breed: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: string | null
          breed?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: string | null
          breed?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          available: boolean
          created_at: string
          date: string
          id: string
          provider_id: string
          provider_type: string | null
          time_slot: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          date: string
          id?: string
          provider_id: string
          provider_type?: string | null
          time_slot: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          date?: string
          id?: string
          provider_id?: string
          provider_type?: string | null
          time_slot?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_used: boolean | null
          role: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          role: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          role?: string
        }
        Relationships: []
      }
      resource_types: {
        Row: {
          capacity_per_slot: number
          created_at: string | null
          description: string | null
          id: string
          name: string
          slot_duration_minutes: number
        }
        Insert: {
          capacity_per_slot?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slot_duration_minutes?: number
        }
        Update: {
          capacity_per_slot?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slot_duration_minutes?: number
        }
        Relationships: []
      }
      service_availability: {
        Row: {
          available_capacity: number
          created_at: string | null
          date: string
          id: string
          max_capacity: number
          provider_id: string | null
          resource_type: string
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          available_capacity?: number
          created_at?: string | null
          date: string
          id?: string
          max_capacity?: number
          provider_id?: string | null
          resource_type: string
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          available_capacity?: number
          created_at?: string | null
          date?: string
          id?: string
          max_capacity?: number
          provider_id?: string | null
          resource_type?: string
          time_slot?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_resource_type_fkey"
            columns: ["resource_type"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["name"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number
          id: string
          name: string
          price: number
          service_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          name: string
          price: number
          service_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          name?: string
          price?: number
          service_type?: string
        }
        Relationships: []
      }
      veterinarians: {
        Row: {
          about: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          profile_image: string | null
          rating: number | null
          specialty: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_image?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_availability_slots: {
        Args: {
          p_resource_type: string
          p_date: string
          p_provider_id?: string
          p_start_time?: string
          p_end_time?: string
        }
        Returns: undefined
      }
      get_available_capacity: {
        Args: {
          p_resource_type: string
          p_provider_id: string
          p_date: string
          p_time_slot: string
        }
        Returns: number
      }
      mark_code_as_used: {
        Args: { code_value: string }
        Returns: undefined
      }
      validate_registration_code: {
        Args: { code_value: string; role_value: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
