export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          billing_status: 'active' | 'suspended' | 'trial' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          billing_status?: 'active' | 'suspended' | 'trial' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          billing_status?: 'active' | 'suspended' | 'trial' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      brand_kits: {
        Row: {
          id: string
          tenant_id: string
          logo_url: string | null
          color_primary: string
          color_secondary: string
          bg_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          logo_url?: string | null
          color_primary?: string
          color_secondary?: string
          bg_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          logo_url?: string | null
          color_primary?: string
          color_secondary?: string
          bg_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          tenant_id: string
          name: string
          starts_at: string
          timezone: string
          mode: 'open' | 'private' | 'invite_only'
          status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
          capacity: number | null
          lead_capture: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          starts_at: string
          timezone?: string
          mode?: 'open' | 'private' | 'invite_only'
          status?: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
          capacity?: number | null
          lead_capture?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          starts_at?: string
          timezone?: string
          mode?: 'open' | 'private' | 'invite_only'
          status?: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
          capacity?: number | null
          lead_capture?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      event_horses: {
        Row: {
          id: string
          event_id: string
          number: number
          name: string
          jockey: string | null
          is_scratched: boolean
          position: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          number: number
          name: string
          jockey?: string | null
          is_scratched?: boolean
          position?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          number?: number
          name?: string
          jockey?: string | null
          is_scratched?: boolean
          position?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      patron_entries: {
        Row: {
          id: string
          event_id: string
          participant_name: string
          email: string | null
          phone: string | null
          marketing_consent: boolean
          join_code: string | null
          entry_method: string
          payment_status: string
          user_agent: string | null
          ip_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          participant_name: string
          email?: string | null
          phone?: string | null
          marketing_consent?: boolean
          join_code?: string | null
          entry_method?: string
          payment_status?: string
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          participant_name?: string
          email?: string | null
          phone?: string | null
          marketing_consent?: boolean
          join_code?: string | null
          entry_method?: string
          payment_status?: string
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          event_id: string
          event_horse_id: string
          patron_entry_id: string
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          event_horse_id: string
          patron_entry_id: string
          assigned_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          event_horse_id?: string
          patron_entry_id?: string
          assigned_by?: string | null
          created_at?: string
        }
      }
      event_results: {
        Row: {
          id: string
          event_id: string
          place: number
          event_horse_id: string | null
          patron_entry_id: string | null
          prize_amount: number | null
          collected: boolean
          collected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          event_id: string
          place: number
          event_horse_id?: string | null
          patron_entry_id?: string | null
          prize_amount?: number | null
          collected?: boolean
        }
        Update: {
          collected?: boolean
          collected_at?: string | null
          prize_amount?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_horses: {
        Args: {
          event_uuid: string
        }
        Returns: undefined
      }
      broadcast_event_update: {
        Args: {
          event_uuid: string
          event_type: string
          payload?: Json
        }
        Returns: undefined
      }
      generate_join_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_event_stats: {
        Args: {
          event_uuid: string
        }
        Returns: {
          total_entries: number
          total_assignments: number
          available_horses: number
          capacity: number
          is_full: boolean
        }[]
      }
      get_user_tenant_ids: {
        Args: {
          user_uuid: string
        }
        Returns: string[]
      }
      user_has_role_in_tenant: {
        Args: {
          user_uuid: string
          tenant_uuid: string
          required_role: 'owner' | 'admin' | 'member'
        }
        Returns: boolean
      }
    }
    Enums: {
      billing_status: 'active' | 'suspended' | 'trial' | 'cancelled'
      user_role: 'owner' | 'admin' | 'member'
      event_mode: 'open' | 'private' | 'invite_only'
      event_status: 'draft' | 'active' | 'drawing' | 'completed' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]