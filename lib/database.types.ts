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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          calendar_id: string
          created_at: string
          date: string | null
          days_of_week: string[] | null
          description: string | null
          end_time: string | null
          estimated_minutes: number | null
          id: string
          is_recurring: boolean | null
          legacy_task_id: string | null
          priority: string | null
          start_time: string | null
          status: string | null
          tag: string | null
          title: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          date?: string | null
          days_of_week?: string[] | null
          description?: string | null
          end_time?: string | null
          estimated_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          legacy_task_id?: string | null
          priority?: string | null
          start_time?: string | null
          status?: string | null
          tag?: string | null
          title: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          date?: string | null
          days_of_week?: string[] | null
          description?: string | null
          end_time?: string | null
          estimated_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          legacy_task_id?: string | null
          priority?: string | null
          start_time?: string | null
          status?: string | null
          tag?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      dreams: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          status: string
          target_year: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_year?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_year?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      event_completions: {
        Row: {
          created_at: string
          date: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          event_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          completed: boolean
          created_at: string
          goal_id: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          goal_id: string
          id?: string
          position?: number
          title: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          goal_id?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          progress: number | null
          score: number | null
          target_date: string | null
          timeframe: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          progress?: number | null
          score?: number | null
          target_date?: string | null
          timeframe?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          progress?: number | null
          score?: number | null
          target_date?: string | null
          timeframe?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          habit_id: string
          id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id: string
          id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          id: string
          monthly_target_days: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          monthly_target_days?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          monthly_target_days?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          attempts: number
          body: string
          created_at: string
          event_id: string | null
          id: string
          kind: string
          last_error: string | null
          locked_at: string | null
          read_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          event_id?: string | null
          id?: string
          kind: string
          last_error?: string | null
          locked_at?: string | null
          read_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          title: string
          url?: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          locked_at?: string | null
          read_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh_key: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh_key: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh_key?: string
          user_id?: string
        }
        Relationships: []
      }
      support_feedback: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          rating: number | null
          status: string | null
          title: string
          type: string
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          rating?: number | null
          status?: string | null
          title: string
          type?: string
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          rating?: number | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          day_of_week: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          priority: string | null
          scheduled_date: string | null
          status: string | null
          tag: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          tag?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          tag?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          birth_date: string
          daily_frog: string | null
          daily_mission: string | null
          daily_pillar: string | null
          email: string | null
          energy_level: string | null
          preferences: Json | null
          role: string | null
          target_age: number | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date: string
          daily_frog?: string | null
          daily_mission?: string | null
          daily_pillar?: string | null
          email?: string | null
          energy_level?: string | null
          preferences?: Json | null
          role?: string | null
          target_age?: number | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string
          daily_frog?: string | null
          daily_mission?: string | null
          daily_pillar?: string | null
          email?: string | null
          energy_level?: string | null
          preferences?: Json | null
          role?: string | null
          target_age?: number | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_notifications: {
        Args: { batch_size?: number; max_age?: string }
        Returns: Database["public"]["Tables"]["notifications"]["Row"][]
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      register_push_subscription: {
        Args: { p_endpoint: string; p_auth_key: string; p_p256dh_key: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
