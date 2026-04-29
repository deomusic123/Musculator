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
        } & Record<string, unknown>;
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        } & Record<string, unknown>;
        Update: {
          display_name?: string | null;
          updated_at?: string;
        } & Record<string, unknown>;
        Relationships: [];
      };
      training_ingestions: {
        Row: {
          id: string;
          user_id: string;
          source: "manual" | "text" | "audio" | "vision" | "import";
          raw_input: string;
          parsed_payload: Json;
          status: "received" | "parsed" | "validated" | "rejected";
          created_at: string;
          updated_at: string;
        } & Record<string, unknown>;
        Insert: {
          id?: string;
          user_id: string;
          source: "manual" | "text" | "audio" | "vision" | "import";
          raw_input: string;
          parsed_payload?: Json;
          status?: "received" | "parsed" | "validated" | "rejected";
          created_at?: string;
          updated_at?: string;
        } & Record<string, unknown>;
        Update: {
          parsed_payload?: Json;
          status?: "received" | "parsed" | "validated" | "rejected";
          updated_at?: string;
        } & Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}