export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null;
          date: string;
          id: string;
          notes: string | null;
          owner_name: string;
          pet_id: string;
          pet_name: string;
          provider_id: string;
          resource_type: string | null;
          service: string;
          service_id: string;
          status: string;
          time: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          // ...
        };
        // ...
      };
    };
    Views: {
      providers: {
        Row: {
          user_id: string;
          provider_type: 'groomer' | 'vet';
          provider_id: string;
          name: string;
          phone?: string | null;
          profile_image?: string | null;
          rating?: number | null;
          specialty?: stri
