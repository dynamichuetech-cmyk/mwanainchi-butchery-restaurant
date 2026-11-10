export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_access: {
        Row: {
          active: boolean
          user_id: string
        }
        Insert: {
          active?: boolean
          user_id: string
        }
        Update: {
          active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          created_at: string
          id: string
          label: string
          notes: string | null
          street: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          street: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          street?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          kind: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kind?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kind?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          id: string
          latitude: number | null
          longitude: number | null
          order_id: string
          rider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id: string
          rider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id?: string
          rider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          eta: string
          fee: number
          free_threshold: number | null
          id: string
          min_order: number
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          eta?: string
          fee?: number
          free_threshold?: number | null
          id?: string
          min_order?: number
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          eta?: string
          fee?: number
          free_threshold?: number | null
          id?: string
          min_order?: number
          name?: string
          sort?: number
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          kind: string
          min_order: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          kind: string
          min_order?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          kind?: string
          min_order?: number
          value?: number
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          name: string
          options: Json
          order_id: string
          product_id: string | null
          qty: number
          unit: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          name: string
          options?: Json
          order_id: string
          product_id?: string | null
          qty: number
          unit: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          name?: string
          options?: Json
          order_id?: string
          product_id?: string | null
          qty?: number
          unit?: string
          unit_price?: number
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
          address: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          delivery_fee: number
          delivery_notes: string | null
          discount: number
          discount_code: string | null
          fulfilment: string
          id: string
          mpesa_phone: string | null
          order_number: string
          payment_method: string
          payment_status: string
          scheduled_for: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          delivery_fee?: number
          delivery_notes?: string | null
          discount?: number
          discount_code?: string | null
          fulfilment: string
          id?: string
          mpesa_phone?: string | null
          order_number?: string
          payment_method: string
          payment_status?: string
          scheduled_for?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          delivery_fee?: number
          delivery_notes?: string | null
          discount?: number
          discount_code?: string | null
          fulfilment?: string
          id?: string
          mpesa_phone?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          order_id: string
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          bestseller: boolean
          category: string
          created_at: string
          customisations: Json
          description: string
          featured: boolean
          id: string
          image_key: string
          min_qty: number
          name: string
          prep_minutes: number | null
          prep_options: string[]
          price: number
          promo_price: number | null
          section: string
          sell_type: string
          serving_info: string | null
          slug: string
          sort: number
          step: number
          stock: number
          unit: string
        }
        Insert: {
          available?: boolean
          bestseller?: boolean
          category: string
          created_at?: string
          customisations?: Json
          description?: string
          featured?: boolean
          id?: string
          image_key?: string
          min_qty?: number
          name: string
          prep_minutes?: number | null
          prep_options?: string[]
          price: number
          promo_price?: number | null
          section: string
          sell_type?: string
          serving_info?: string | null
          slug: string
          sort?: number
          step?: number
          stock?: number
          unit?: string
        }
        Update: {
          available?: boolean
          bestseller?: boolean
          category?: string
          created_at?: string
          customisations?: Json
          description?: string
          featured?: boolean
          id?: string
          image_key?: string
          min_qty?: number
          name?: string
          prep_minutes?: number | null
          prep_options?: string[]
          price?: number
          promo_price?: number | null
          section?: string
          sell_type?: string
          serving_info?: string | null
          slug?: string
          sort?: number
          step?: number
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rider_profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          announcement: string
          id: number
          kitchen_close: string
          kitchen_open: string
          scheduled_enabled: boolean
        }
        Insert: {
          announcement?: string
          id?: number
          kitchen_close?: string
          kitchen_open?: string
          scheduled_enabled?: boolean
        }
        Update: {
          announcement?: string
          id?: number
          kitchen_close?: string
          kitchen_open?: string
          scheduled_enabled?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_as_rider: { Args: never; Returns: undefined }
      check_discount: {
        Args: { _code: string; _subtotal: number }
        Returns: number
      }
      ensure_my_identity: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: { Args: { p: Json }; Returns: string }
      review_rider: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      update_my_delivery: {
        Args: {
          _id: string
          _latitude?: number
          _longitude?: number
          _status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "rider"
        | "customer"
        | "super_admin"
        | "inventory_manager"
        | "kitchen_staff"
        | "cashier"
        | "delivery_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "staff",
        "rider",
        "customer",
        "super_admin",
        "inventory_manager",
        "kitchen_staff",
        "cashier",
        "delivery_manager",
      ],
    },
  },
} as const
