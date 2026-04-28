export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkingHours = {
  [day: string]: {
    start: string
    end: string
    active: boolean
  }
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          business_name: string | null
          phone: string | null
          avatar_url: string | null
          timezone: string
          currency: string
          working_hours: Json
          slot_duration_minutes: number
          onboarding_completed: boolean
          public_slug: string | null
          accepts_online_booking: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          business_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          currency?: string
          working_hours?: Json
          slot_duration_minutes?: number
          onboarding_completed?: boolean
          public_slug?: string | null
          accepts_online_booking?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          business_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          currency?: string
          working_hours?: Json
          slot_duration_minutes?: number
          onboarding_completed?: boolean
          public_slug?: string | null
          accepts_online_booking?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          sort_order?: number
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      services: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          duration_minutes: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          name: string
          description?: string | null
          price: number
          duration_minutes: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          price?: number
          duration_minutes?: number
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      service_price_history: {
        Row: {
          id: string
          service_id: string
          price: number
          effective_from: string
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          price: number
          effective_from?: string
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          price?: number
          effective_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_price_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      supply_catalog: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: string | null
          unit: string
          unit_size: number | null
          pack_price: number | null
          current_stock: number
          min_stock_alert: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          unit: string
          unit_size?: number | null
          pack_price?: number | null
          current_stock?: number
          min_stock_alert?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          unit?: string
          unit_size?: number | null
          pack_price?: number | null
          current_stock?: number
          min_stock_alert?: number | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_catalog_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      service_supplies: {
        Row: {
          id: string
          service_id: string
          supply_id: string
          quantity_per_session: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          supply_id: string
          quantity_per_session: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          supply_id?: string
          quantity_per_session?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_supplies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_supplies_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          }
        ]
      }
      supply_purchases: {
        Row: {
          id: string
          user_id: string
          supply_id: string
          supplier_name: string | null
          quantity: number
          unit_price: number
          total_price: number
          purchase_date: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          supply_id: string
          supplier_name?: string | null
          quantity: number
          unit_price: number
          total_price: number
          purchase_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          supply_id?: string
          supplier_name?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          purchase_date?: string
          notes?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_purchases_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string | null
          email: string | null
          birth_date: string | null
          notes: string | null
          source: string | null
          tags: string[]
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone?: string | null
          email?: string | null
          birth_date?: string | null
          notes?: string | null
          source?: string | null
          tags?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          birth_date?: string | null
          notes?: string | null
          source?: string | null
          tags?: string[]
          is_active?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          service_id: string
          date: string
          start_time: string
          end_time: string
          status: string
          source: string | null
          booked_via: string | null
          price_charged: number | null
          notes: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          service_id: string
          date: string
          start_time: string
          end_time: string
          status?: string
          source?: string | null
          booked_via?: string | null
          price_charged?: number | null
          notes?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          service_id?: string
          date?: string
          start_time?: string
          end_time?: string
          status?: string
          source?: string | null
          booked_via?: string | null
          price_charged?: number | null
          notes?: string | null
          cancellation_reason?: string | null
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      fixed_costs: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          frequency: string
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          amount: number
          frequency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          amount?: number
          frequency?: string
          is_active?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Omit<Database["public"]["Tables"]["profiles"]["Row"], "working_hours"> & {
  working_hours: WorkingHours
}
export type ServiceCategory = Database["public"]["Tables"]["service_categories"]["Row"]
export type Service = Database["public"]["Tables"]["services"]["Row"]
export type ServicePriceHistory = Database["public"]["Tables"]["service_price_history"]["Row"]
export type SupplyCatalog = Database["public"]["Tables"]["supply_catalog"]["Row"]
export type ServiceSupply = Database["public"]["Tables"]["service_supplies"]["Row"]
export type SupplyPurchase = Database["public"]["Tables"]["supply_purchases"]["Row"]
export type Client = Database["public"]["Tables"]["clients"]["Row"]
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"]
export type FixedCost = Database["public"]["Tables"]["fixed_costs"]["Row"]
