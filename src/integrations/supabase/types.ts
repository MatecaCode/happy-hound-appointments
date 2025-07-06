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
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      appointment_addons: {
        Row: {
          added_by: string | null
          addon_id: string
          appointment_id: string
          created_at: string | null
          custom_description: string | null
          id: string
          price: number
          quantity: number | null
        }
        Insert: {
          added_by?: string | null
          addon_id: string
          appointment_id: string
          created_at?: string | null
          custom_description?: string | null
          id?: string
          price: number
          quantity?: number | null
        }
        Update: {
          added_by?: string | null
          addon_id?: string
          appointment_id?: string
          created_at?: string | null
          custom_description?: string | null
          id?: string
          price?: number
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "service_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_addons_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_providers_legacy: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          provider_id: string | null
          role: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          role?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_providers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_staff: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          role: string
          staff_profile_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          role: string
          staff_profile_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          role?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_staff_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_staff_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          admin_notes: string | null
          client_id: string
          created_at: string
          date: string
          duration: number | null
          id: string
          is_admin_override: boolean | null
          location_id: string | null
          notes: string | null
          pet_id: string
          provider_id: string | null
          service_id: string
          service_status: string
          status: string
          time: string
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          created_at?: string
          date: string
          duration?: number | null
          id?: string
          is_admin_override?: boolean | null
          location_id?: string | null
          notes?: string | null
          pet_id: string
          provider_id?: string | null
          service_id: string
          service_status?: string
          status?: string
          time: string
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          created_at?: string
          date?: string
          duration?: number | null
          id?: string
          is_admin_override?: boolean | null
          location_id?: string | null
          notes?: string | null
          pet_id?: string
          provider_id?: string | null
          service_id?: string
          service_status?: string
          status?: string
          time?: string
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_legacy"
            referencedColumns: ["id"]
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
      breeds: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          location_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      groomers_legacy: {
        Row: {
          name: string | null
          user_id: string
        }
        Insert: {
          name?: string | null
          user_id: string
        }
        Update: {
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          message: string
          message_type: string
          recipient_id: string
          recipient_type: string
          sent: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          message_type: string
          recipient_id: string
          recipient_type: string
          sent?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string
          recipient_id?: string
          recipient_type?: string
          sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          location_id: string
          open_time: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          location_id: string
          open_time?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          location_id?: string
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
          active: boolean | null
          age: string | null
          birth_date: string | null
          breed: string | null
          breed_id: string | null
          client_id: string
          created_at: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          size: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          active?: boolean | null
          age?: string | null
          birth_date?: string | null
          breed?: string | null
          breed_id?: string | null
          client_id: string
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          size?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          active?: boolean | null
          age?: string | null
          birth_date?: string | null
          breed?: string | null
          breed_id?: string | null
          client_id?: string
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          size?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_breed_id_fkey"
            columns: ["breed_id"]
            isOneToOne: false
            referencedRelation: "breeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      provider_availability_legacy: {
        Row: {
          available: boolean
          date: string
          id: string
          provider_id: string
          time_slot: string
        }
        Insert: {
          available?: boolean
          date: string
          id?: string
          provider_id: string
          time_slot: string
        }
        Update: {
          available?: boolean
          date?: string
          id?: string
          provider_id?: string
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles_legacy: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          photo_url: string | null
          rating: number | null
          type: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          rating?: number | null
          type: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          rating?: number | null
          type?: string
          user_id?: string
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
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          role: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      service_addons: {
        Row: {
          active: boolean | null
          applies_to_service_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          applies_to_service_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          active?: boolean | null
          applies_to_service_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_applies_to_service_id_fkey"
            columns: ["applies_to_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing: {
        Row: {
          breed: string | null
          created_at: string | null
          duration_override: number | null
          id: string
          price: number
          service_id: string
          size: string | null
        }
        Insert: {
          breed?: string | null
          created_at?: string | null
          duration_override?: number | null
          id?: string
          price: number
          service_id: string
          size?: string | null
        }
        Update: {
          breed?: string | null
          created_at?: string | null
          duration_override?: number | null
          id?: string
          price?: number
          service_id?: string
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resources_legacy: {
        Row: {
          created_at: string | null
          id: string
          provider_type: string | null
          required: boolean | null
          resource_type: string
          service_id: string | null
          service_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_type?: string | null
          required?: boolean | null
          resource_type: string
          service_id?: string | null
          service_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_type?: string | null
          required?: boolean | null
          resource_type?: string
          service_id?: string | null
          service_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_resources_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          base_price: number | null
          created_at: string | null
          default_duration: number | null
          description: string | null
          id: string
          name: string
          requires_bath: boolean | null
          requires_grooming: boolean | null
          requires_vet: boolean | null
          service_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_price?: number | null
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          name: string
          requires_bath?: boolean | null
          requires_grooming?: boolean | null
          requires_vet?: boolean | null
          service_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_price?: number | null
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          id?: string
          name?: string
          requires_bath?: boolean | null
          requires_grooming?: boolean | null
          requires_vet?: boolean | null
          service_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shower_availability_legacy: {
        Row: {
          available_spots: number
          date: string
          id: string
          time_slot: string
        }
        Insert: {
          available_spots?: number
          date: string
          id?: string
          time_slot: string
        }
        Update: {
          available_spots?: number
          date?: string
          id?: string
          time_slot?: string
        }
        Relationships: []
      }
      shower_settings: {
        Row: {
          created_at: string | null
          date: string
          id: string
          max_spots: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          max_spots?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          max_spots?: number | null
        }
        Relationships: []
      }
      staff_availability: {
        Row: {
          available: boolean | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          staff_profile_id: string
          time_slot: string
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          staff_profile_id: string
          time_slot: string
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          staff_profile_id?: string
          time_slot?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          active: boolean | null
          bio: string | null
          can_bathe: boolean | null
          can_groom: boolean | null
          can_vet: boolean | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          location_id: string
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          bio?: string | null
          can_bathe?: boolean | null
          can_groom?: boolean | null
          can_vet?: boolean | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          location_id: string
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          bio?: string | null
          can_bathe?: boolean | null
          can_groom?: boolean | null
          can_vet?: boolean | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          location_id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          created_at: string | null
          id: string
          service_id: string
          staff_profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          service_id: string
          staff_profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          service_id?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      veterinarians_legacy: {
        Row: {
          name: string | null
          user_id: string
        }
        Insert: {
          name?: string | null
          user_id: string
        }
        Update: {
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_create_appointment: {
        Args: {
          _user_id: string
          _pet_id: string
          _service_id: string
          _provider_id: string
          _date: string
          _time: string
          _notes?: string
        }
        Returns: string
      }
      create_booking_atomic: {
        Args: {
          _user_id: string
          _pet_id: string
          _service_id: string
          _provider_ids: string[]
          _booking_date: string
          _time_slot: string
          _notes?: string
        }
        Returns: string
      }
      ensure_provider_availability: {
        Args: {
          provider_profile_id: string
          start_date: string
          end_date: string
        }
        Returns: undefined
      }
      ensure_shower_availability: {
        Args: { start_date: string; end_date: string }
        Returns: undefined
      }
      fix_missing_provider_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          provider_type: string
          action: string
        }[]
      }
      generate_time_slots: {
        Args: Record<PropertyKey, never>
        Returns: {
          time_slot: string
        }[]
      }
      get_available_providers: {
        Args: {
          _service_id: string
          _date: string
          _time_slot: string
          _duration?: number
        }
        Returns: {
          provider_id: string
          provider_type: string
          user_id: string
        }[]
      }
      get_available_slots_for_service: {
        Args: { _service_id: string; _date: string; _provider_id?: string }
        Returns: {
          time_slot: string
        }[]
      }
      get_shower_capacity: {
        Args: { target_date: string }
        Returns: number
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      mark_code_as_used: {
        Args: { code_value: string }
        Returns: undefined
      }
      migrate_existing_users_to_roles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      roll_daily_availability: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
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
