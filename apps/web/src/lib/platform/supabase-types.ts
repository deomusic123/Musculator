export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          owner_user_id: string;
          full_name: string;
          goal: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          full_name: string;
          goal?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          full_name?: string;
          goal?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      muscle_groups: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string;
          recovery_time_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category: string;
          recovery_time_hours?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category?: string;
          recovery_time_hours?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          slug: string;
          name: string;
          primary_muscle_id: string | null;
          movement_pattern: Database["public"]["Enums"]["movement_pattern"];
          stimulus_vector: Database["public"]["Enums"]["stimulus_vector"];
          resistance_profile: Database["public"]["Enums"]["resistance_profile"];
          is_compound: boolean;
          equipment: string | null;
          cns_tax_multiplier: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          primary_muscle_id?: string | null;
          movement_pattern?: Database["public"]["Enums"]["movement_pattern"];
          stimulus_vector: Database["public"]["Enums"]["stimulus_vector"];
          resistance_profile?: Database["public"]["Enums"]["resistance_profile"];
          is_compound?: boolean;
          equipment?: string | null;
          cns_tax_multiplier?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          primary_muscle_id?: string | null;
          movement_pattern?: Database["public"]["Enums"]["movement_pattern"];
          stimulus_vector?: Database["public"]["Enums"]["stimulus_vector"];
          resistance_profile?: Database["public"]["Enums"]["resistance_profile"];
          is_compound?: boolean;
          equipment?: string | null;
          cns_tax_multiplier?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_primary_muscle_id_fkey";
            columns: ["primary_muscle_id"];
            isOneToOne: false;
            referencedRelation: "muscle_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_muscles: {
        Row: {
          exercise_id: string;
          muscle_group_id: string;
          role: Database["public"]["Enums"]["muscle_role"];
          created_at: string;
        };
        Insert: {
          exercise_id: string;
          muscle_group_id: string;
          role?: Database["public"]["Enums"]["muscle_role"];
          created_at?: string;
        };
        Update: {
          exercise_id?: string;
          muscle_group_id?: string;
          role?: Database["public"]["Enums"]["muscle_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercise_muscles_muscle_group_id_fkey";
            columns: ["muscle_group_id"];
            isOneToOne: false;
            referencedRelation: "muscle_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      training_templates: {
        Row: {
          id: string;
          owner_user_id: string | null;
          code: string;
          name: string;
          description: string | null;
          session_kind: Database["public"]["Enums"]["training_session_kind"];
          goal: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          session_kind?: Database["public"]["Enums"]["training_session_kind"];
          goal?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          session_kind?: Database["public"]["Enums"]["training_session_kind"];
          goal?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_templates_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_template_entries: {
        Row: {
          id: string;
          template_id: string;
          exercise_id: string | null;
          raw_exercise_name: string | null;
          sequence_index: number;
          target_sets: number;
          target_reps_min: number | null;
          target_reps_max: number | null;
          target_weight_kg: number | null;
          target_duration_seconds: number | null;
          target_rpe: number | null;
          target_stimulus_vector: Database["public"]["Enums"]["stimulus_vector"] | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          exercise_id?: string | null;
          raw_exercise_name?: string | null;
          sequence_index?: number;
          target_sets?: number;
          target_reps_min?: number | null;
          target_reps_max?: number | null;
          target_weight_kg?: number | null;
          target_duration_seconds?: number | null;
          target_rpe?: number | null;
          target_stimulus_vector?: Database["public"]["Enums"]["stimulus_vector"] | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          exercise_id?: string | null;
          raw_exercise_name?: string | null;
          sequence_index?: number;
          target_sets?: number;
          target_reps_min?: number | null;
          target_reps_max?: number | null;
          target_weight_kg?: number | null;
          target_duration_seconds?: number | null;
          target_rpe?: number | null;
          target_stimulus_vector?: Database["public"]["Enums"]["stimulus_vector"] | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_template_entries_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_template_entries_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "training_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      training_template_sets: {
        Row: {
          id: string;
          template_entry_id: string;
          set_index: number;
          target_reps_min: number | null;
          target_reps_max: number | null;
          target_weight_kg: number | null;
          target_duration_seconds: number | null;
          target_rpe: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_entry_id: string;
          set_index: number;
          target_reps_min?: number | null;
          target_reps_max?: number | null;
          target_weight_kg?: number | null;
          target_duration_seconds?: number | null;
          target_rpe?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_entry_id?: string;
          set_index?: number;
          target_reps_min?: number | null;
          target_reps_max?: number | null;
          target_weight_kg?: number | null;
          target_duration_seconds?: number | null;
          target_rpe?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_template_sets_template_entry_id_fkey";
            columns: ["template_entry_id"];
            isOneToOne: false;
            referencedRelation: "training_template_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      training_protocols: {
        Row: {
          id: string;
          owner_user_id: string | null;
          code: string;
          name: string;
          description: string | null;
          goal: string | null;
          duration_weeks: number;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          goal?: string | null;
          duration_weeks: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string | null;
          code?: string;
          name?: string;
          description?: string | null;
          goal?: string | null;
          duration_weeks?: number;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_protocols_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_protocol_weeks: {
        Row: {
          id: string;
          protocol_id: string;
          week_number: number;
          label: string;
          week_type: Database["public"]["Enums"]["training_protocol_week_type"];
          load_factor: number;
          rpe_offset: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          protocol_id: string;
          week_number: number;
          label: string;
          week_type?: Database["public"]["Enums"]["training_protocol_week_type"];
          load_factor?: number;
          rpe_offset?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          protocol_id?: string;
          week_number?: number;
          label?: string;
          week_type?: Database["public"]["Enums"]["training_protocol_week_type"];
          load_factor?: number;
          rpe_offset?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_protocol_weeks_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "training_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      training_protocol_week_templates: {
        Row: {
          id: string;
          protocol_week_id: string;
          template_id: string;
          day_offset: number;
          order_index: number;
          progression_percent: number;
          target_rpe_delta: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          protocol_week_id: string;
          template_id: string;
          day_offset: number;
          order_index?: number;
          progression_percent?: number;
          target_rpe_delta?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          protocol_week_id?: string;
          template_id?: string;
          day_offset?: number;
          order_index?: number;
          progression_percent?: number;
          target_rpe_delta?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_protocol_week_templates_protocol_week_id_fkey";
            columns: ["protocol_week_id"];
            isOneToOne: false;
            referencedRelation: "training_protocol_weeks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_protocol_week_templates_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "training_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      client_protocol_assignments: {
        Row: {
          id: string;
          client_id: string;
          protocol_id: string;
          status: Database["public"]["Enums"]["training_protocol_assignment_status"];
          starts_at: string;
          ends_at: string | null;
          active_week: number;
          current_day_offset: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          protocol_id: string;
          status?: Database["public"]["Enums"]["training_protocol_assignment_status"];
          starts_at?: string;
          ends_at?: string | null;
          active_week?: number;
          current_day_offset?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          protocol_id?: string;
          status?: Database["public"]["Enums"]["training_protocol_assignment_status"];
          starts_at?: string;
          ends_at?: string | null;
          active_week?: number;
          current_day_offset?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_protocol_assignments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_protocol_assignments_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "training_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          source: Database["public"]["Enums"]["ingestion_source"];
          title: string;
          started_at: string;
          ended_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          client_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source?: Database["public"]["Enums"]["ingestion_source"];
          title?: string;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          client_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: Database["public"]["Enums"]["ingestion_source"];
          title?: string;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          client_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_entries: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string | null;
          raw_exercise_name: string | null;
          source: Database["public"]["Enums"]["ingestion_source"];
          sequence_index: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id?: string | null;
          raw_exercise_name?: string | null;
          source?: Database["public"]["Enums"]["ingestion_source"];
          sequence_index?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          exercise_id?: string | null;
          raw_exercise_name?: string | null;
          source?: Database["public"]["Enums"]["ingestion_source"];
          sequence_index?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_entries_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_entries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sets: {
        Row: {
          id: string;
          entry_id: string;
          set_index: number;
          reps: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          rpe: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          set_index: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          set_index?: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "workout_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      training_ingestions: {
        Row: {
          id: string;
          user_id: string;
          source: Database["public"]["Enums"]["ingestion_source"];
          raw_input: string;
          parsed_payload: Json;
          status: Database["public"]["Enums"]["ingestion_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: Database["public"]["Enums"]["ingestion_source"];
          raw_input: string;
          parsed_payload?: Json;
          status?: Database["public"]["Enums"]["ingestion_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: Database["public"]["Enums"]["ingestion_source"];
          raw_input?: string;
          parsed_payload?: Json;
          status?: Database["public"]["Enums"]["ingestion_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_ingestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_exercise_catalog: {
        Row: {
          id: string;
          slug: string;
          name: string;
          movement_pattern: Database["public"]["Enums"]["movement_pattern"];
          stimulus_vector: Database["public"]["Enums"]["stimulus_vector"];
          resistance_profile: Database["public"]["Enums"]["resistance_profile"];
          is_compound: boolean;
          equipment: string | null;
          cns_tax_multiplier: number;
          primary_muscle_slug: string | null;
          primary_muscle_name: string | null;
          primary_muscle_category: string | null;
          muscle_map: Json;
        };
        Relationships: [];
      };
      v_workout_session_summary: {
        Row: {
          session_id: string;
          user_id: string;
          source: Database["public"]["Enums"]["ingestion_source"];
          started_at: string;
          ended_at: string | null;
          notes: string | null;
          entry_count: number;
          total_sets: number;
          total_reps: number;
          total_load_kg: number;
          total_duration_seconds: number;
          peak_rpe: number;
          average_rpe: number;
          title: string;
        };
        Relationships: [];
      };
      v_workout_muscle_load: {
        Row: {
          session_id: string;
          user_id: string;
          muscle_slug: string;
          muscle_name: string;
          category: string;
          recovery_time_hours: number;
          role_weighted_sets: number;
          average_cns_tax_multiplier: number;
          average_stimulus_factor: number;
          recovery_time_dynamic_hours: number;
          total_sets: number;
          total_reps: number;
          total_load_kg: number;
          average_rpe: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      stimulus_vector:
        | "amplitud"
        | "densidad"
        | "fuerza"
        | "cardio_metabolico"
        | "acondicionamiento"
        | "potencia";
      movement_pattern:
        | "horizontal_push"
        | "vertical_push"
        | "horizontal_pull"
        | "vertical_pull"
        | "knee_dominant"
        | "hip_hinge"
        | "isolation"
        | "core_anti_movement"
        | "rotation_ballistic"
        | "locomotion_metabolic";
      resistance_profile:
        | "bodyweight"
        | "free_weight"
        | "cable"
        | "machine_constant"
        | "machine_variable";
      training_session_kind: "strength" | "conditioning" | "hybrid";
      training_protocol_week_type: "build" | "intensification" | "deload" | "test";
      training_protocol_assignment_status: "draft" | "active" | "paused" | "completed";
      ingestion_source: "manual" | "text" | "audio" | "vision" | "import";
      ingestion_status: "received" | "parsed" | "validated" | "rejected";
      muscle_role: "primary" | "secondary" | "stabilizer";
    };
    CompositeTypes: Record<string, never>;
  };
}