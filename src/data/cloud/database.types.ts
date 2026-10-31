export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      energy_tariffs: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          id: string
          label: string
          notes: string | null
          price_per_kwh: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          id: string
          label: string
          notes?: string | null
          price_per_kwh: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          id?: string
          label?: string
          notes?: string | null
          price_per_kwh?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'energy_tariffs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      extras: {
        Row: {
          amount: number
          archived_at: string | null
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          unit: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          amount: number
          archived_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id: string
          name: string
          unit: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          archived_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'extras_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      materials: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          failure_rate_bp: number | null
          family: string
          id: string
          name: string
          notes: string | null
          price_per_kg: number
          spool_net_weight_g: number
          supplier: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          failure_rate_bp?: number | null
          family: string
          id: string
          name: string
          notes?: string | null
          price_per_kg: number
          spool_net_weight_g: number
          supplier?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          failure_rate_bp?: number | null
          family?: string
          id?: string
          name?: string
          notes?: string | null
          price_per_kg?: number
          spool_net_weight_g?: number
          supplier?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'materials_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      printers: {
        Row: {
          archived_at: string | null
          build_volume_mm: number[]
          created_at: string
          created_by: string | null
          default_avg_watts: number
          deleted_at: string | null
          energy_tariff_id: string | null
          expected_life_hours: number
          id: string
          maintenance_per_hour: number
          model: string
          multicolor: boolean
          name: string
          notes: string | null
          power_profiles: NonNullable<Json>
          purchase_price: number
          rated_power_w: number
          residual_value_bp: number
          startup_minutes: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          build_volume_mm: number[]
          created_at?: string
          created_by?: string | null
          default_avg_watts: number
          deleted_at?: string | null
          energy_tariff_id?: string | null
          expected_life_hours: number
          id: string
          maintenance_per_hour: number
          model: string
          multicolor?: boolean
          name: string
          notes?: string | null
          power_profiles?: NonNullable<Json>
          purchase_price: number
          rated_power_w: number
          residual_value_bp: number
          startup_minutes: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          build_volume_mm?: number[]
          created_at?: string
          created_by?: string | null
          default_avg_watts?: number
          deleted_at?: string | null
          energy_tariff_id?: string | null
          expected_life_hours?: number
          id?: string
          maintenance_per_hour?: number
          model?: string
          multicolor?: boolean
          name?: string
          notes?: string | null
          power_profiles?: NonNullable<Json>
          purchase_price?: number
          rated_power_w?: number
          residual_value_bp?: number
          startup_minutes?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'printers_energy_tariff_fkey'
            columns: ['workspace_id', 'energy_tariff_id']
            isOneToOne: false
            referencedRelation: 'energy_tariffs'
            referencedColumns: ['workspace_id', 'id']
          },
          {
            foreignKeyName: 'printers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          customer: string | null
          deleted_at: string | null
          engine_version: string | null
          id: string
          job: NonNullable<Json>
          lines: NonNullable<Json>
          locale: string
          name: string
          pricing: NonNullable<Json>
          quote_date: string
          result: Json | null
          schema_version: number
          snapshot: Json | null
          status: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          deleted_at?: string | null
          engine_version?: string | null
          id: string
          job: NonNullable<Json>
          lines: NonNullable<Json>
          locale: string
          name: string
          pricing: NonNullable<Json>
          quote_date: string
          result?: Json | null
          schema_version?: number
          snapshot?: Json | null
          status: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          deleted_at?: string | null
          engine_version?: string | null
          id?: string
          job?: NonNullable<Json>
          lines?: NonNullable<Json>
          locale?: string
          name?: string
          pricing?: NonNullable<Json>
          quote_date?: string
          result?: Json | null
          schema_version?: number
          snapshot?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quotes_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: {
          allocation_mode: string
          created_at: string
          created_by: string | null
          currency: string
          failure_rate_bp: number
          labor_rate_per_hour: number
          locale: string
          margin_bp: number
          markup_bp: number
          onboarding_complete: boolean
          pricing_mode: string
          rounding_mode: string
          rounding_step: number
          time_overhead_bp: number
          updated_at: string
          updated_by: string | null
          vat_mode: string
          vat_rate_bp: number
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          allocation_mode?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          failure_rate_bp?: number
          labor_rate_per_hour?: number
          locale?: string
          margin_bp?: number
          markup_bp?: number
          onboarding_complete?: boolean
          pricing_mode?: string
          rounding_mode?: string
          rounding_step?: number
          time_overhead_bp?: number
          updated_at?: string
          updated_by?: string | null
          vat_mode?: string
          vat_rate_bp?: number
          workspace_id: string
        }
        Update: {
          allocation_mode?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          failure_rate_bp?: number
          labor_rate_per_hour?: number
          locale?: string
          margin_bp?: number
          markup_bp?: number
          onboarding_complete?: boolean
          pricing_mode?: string
          rounding_mode?: string
          rounding_step?: number
          time_overhead_bp?: number
          updated_at?: string
          updated_by?: string | null
          vat_mode?: string
          vat_rate_bp?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string | null
          role: string
          token_hash: string
          used_count: number
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id: string
          max_uses?: number
          revoked_at?: string | null
          role: string
          token_hash: string
          used_count?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          role?: string
          token_hash?: string
          used_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_invites_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          id: string
          kind?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_invite: {
        Args: { p_days: number; p_role: string; p_workspace_id: string }
        Returns: string
      }
      create_workspace: { Args: { p_name: string }; Returns: string }
      ensure_personal_workspace: { Args: Record<PropertyKey, never>; Returns: string }
      get_my_profile: { Args: Record<PropertyKey, never>; Returns: string }
      is_workspace_member: { Args: { target_workspace_id: string }; Returns: boolean }
      is_workspace_owner: { Args: { target_workspace_id: string }; Returns: boolean }
      keepalive: { Args: Record<PropertyKey, never>; Returns: string }
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined }
      list_my_workspaces: {
        Args: Record<PropertyKey, never>
        Returns: {
          joined_at: string
          kind: string
          name: string
          role: string
          workspace_id: string
        }[]
      }
      list_workspace_invites: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string
          role: string
          used_count: number
        }[]
      }
      list_workspace_members: {
        Args: { p_workspace_id: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      max_owned_workspaces: { Args: Record<PropertyKey, never>; Returns: number }
      max_workspace_members: { Args: Record<PropertyKey, never>; Returns: number }
      profile_name_from_user: {
        Args: { p_display_name: string; p_email: string; p_full_name: string; p_name: string }
        Returns: string
      }
      redeem_invite: { Args: { p_token: string }; Returns: string }
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined }
      set_my_profile: { Args: { p_display_name: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
