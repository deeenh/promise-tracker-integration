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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      promise_ai_insights: {
        Row: {
          delay_risk: number
          escalation_advice: string
          generated_at: string
          id: string
          miss_probability: number
          promise_id: string
          suggested_action: string
        }
        Insert: {
          delay_risk?: number
          escalation_advice: string
          generated_at?: string
          id?: string
          miss_probability?: number
          promise_id: string
          suggested_action: string
        }
        Update: {
          delay_risk?: number
          escalation_advice?: string
          generated_at?: string
          id?: string
          miss_probability?: number
          promise_id?: string
          suggested_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "promise_ai_insights_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "promises"
            referencedColumns: ["id"]
          },
        ]
      }
      promise_audit_logs: {
        Row: {
          action: string
          actor: string
          actor_role: string
          created_at: string
          details: string | null
          id: string
          promise_code: string | null
        }
        Insert: {
          action: string
          actor: string
          actor_role: string
          created_at?: string
          details?: string | null
          id?: string
          promise_code?: string | null
        }
        Update: {
          action?: string
          actor?: string
          actor_role?: string
          created_at?: string
          details?: string | null
          id?: string
          promise_code?: string | null
        }
        Relationships: []
      }
      promise_categories: {
        Row: {
          accent: string
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          accent?: string
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          accent?: string
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      promise_rules: {
        Row: {
          amount: number
          auto_apply: boolean
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          auto_apply?: boolean
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          rule_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_apply?: boolean
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      promise_settings: {
        Row: {
          auto_escalation: boolean
          auto_reminder: boolean
          escalation_delay_hours: number
          fine_system_enabled: boolean
          id: string
          lock_after_fulfill: boolean
          promise_expiry_days: number
          reminder_before_hours: number
          require_approval: boolean
          singleton: boolean
          tip_system_enabled: boolean
          updated_at: string
          work_end_time: string
          work_start_time: string
          working_hours_only: boolean
        }
        Insert: {
          auto_escalation?: boolean
          auto_reminder?: boolean
          escalation_delay_hours?: number
          fine_system_enabled?: boolean
          id?: string
          lock_after_fulfill?: boolean
          promise_expiry_days?: number
          reminder_before_hours?: number
          require_approval?: boolean
          singleton?: boolean
          tip_system_enabled?: boolean
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          working_hours_only?: boolean
        }
        Update: {
          auto_escalation?: boolean
          auto_reminder?: boolean
          escalation_delay_hours?: number
          fine_system_enabled?: boolean
          id?: string
          lock_after_fulfill?: boolean
          promise_expiry_days?: number
          reminder_before_hours?: number
          require_approval?: boolean
          singleton?: boolean
          tip_system_enabled?: boolean
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
          working_hours_only?: boolean
        }
        Relationships: []
      }
      promise_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "promise_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "promise_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promises: {
        Row: {
          breach_reason: string | null
          category_id: string | null
          code: string
          created_at: string
          deadline: string
          delay_days: number
          description: string | null
          escalated_at: string | null
          escalation_level: number
          escalation_reason: string | null
          escalation_status: string | null
          extended_count: number
          fine_amount: number
          fulfilled_at: string | null
          id: string
          is_locked: boolean
          linked_module: string | null
          nano_category: string | null
          owner: string
          priority: string
          receiver: string
          status: string
          sub_category: string | null
          tip_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          breach_reason?: string | null
          category_id?: string | null
          code: string
          created_at?: string
          deadline: string
          delay_days?: number
          description?: string | null
          escalated_at?: string | null
          escalation_level?: number
          escalation_reason?: string | null
          escalation_status?: string | null
          extended_count?: number
          fine_amount?: number
          fulfilled_at?: string | null
          id?: string
          is_locked?: boolean
          linked_module?: string | null
          nano_category?: string | null
          owner: string
          priority?: string
          receiver: string
          status?: string
          sub_category?: string | null
          tip_amount?: number
          title: string
          updated_at?: string
        }
        Update: {
          breach_reason?: string | null
          category_id?: string | null
          code?: string
          created_at?: string
          deadline?: string
          delay_days?: number
          description?: string | null
          escalated_at?: string | null
          escalation_level?: number
          escalation_reason?: string | null
          escalation_status?: string | null
          extended_count?: number
          fine_amount?: number
          fulfilled_at?: string | null
          id?: string
          is_locked?: boolean
          linked_module?: string | null
          nano_category?: string | null
          owner?: string
          priority?: string
          receiver?: string
          status?: string
          sub_category?: string | null
          tip_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "promise_categories"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
