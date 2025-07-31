export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      companions: {
        Row: {
          author: string | null;
          created_at: string;
          duration: number | null;
          gender: boolean | null;
          id: string;
          name: string | null;
          photoUrl: string | null;
          style: boolean | null;
          subject: string | null;
          topic: string | null;
          voiceId: string | null;
        };
        Insert: {
          author?: string | null;
          created_at?: string;
          duration?: number | null;
          gender?: boolean | null;
          id?: string;
          name?: string | null;
          photoUrl?: string | null;
          style?: boolean | null;
          subject?: string | null;
          topic?: string | null;
          voiceId?: string | null;
        };
        Update: {
          author?: string | null;
          created_at?: string;
          duration?: number | null;
          gender?: boolean | null;
          id?: string;
          name?: string | null;
          photoUrl?: string | null;
          style?: boolean | null;
          subject?: string | null;
          topic?: string | null;
          voiceId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companions_voiceId_fkey";
            columns: ["voiceId"];
            isOneToOne: false;
            referencedRelation: "voices";
            referencedColumns: ["id"];
          },
        ];
      };
      "session-history": {
        Row: {
          companion_id: string | null;
          created_at: string;
          id: number;
          user_id: string | null;
        };
        Insert: {
          companion_id?: string | null;
          created_at?: string;
          id?: number;
          user_id?: string | null;
        };
        Update: {
          companion_id?: string | null;
          created_at?: string;
          id?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session-history_companion_id_fkey";
            columns: ["companion_id"];
            isOneToOne: false;
            referencedRelation: "companions";
            referencedColumns: ["id"];
          },
        ];
      };
      voices: {
        Row: {
          accent: string | null;
          createdAt: string;
          description: string | null;
          gender: string | null;
          id: string;
          isDeleted: boolean | null;
          isPublic: boolean | null;
          name: string | null;
          orgId: string | null;
          previewUrl: string | null;
          provider: string | null;
          providerId: string;
          slug: string | null;
          style: string | null;
          updatedAt: string | null;
        };
        Insert: {
          accent?: string | null;
          createdAt?: string;
          description?: string | null;
          gender?: string | null;
          id: string;
          isDeleted?: boolean | null;
          isPublic?: boolean | null;
          name?: string | null;
          orgId?: string | null;
          previewUrl?: string | null;
          provider?: string | null;
          providerId: string;
          slug?: string | null;
          style?: string | null;
          updatedAt?: string | null;
        };
        Update: {
          accent?: string | null;
          createdAt?: string;
          description?: string | null;
          gender?: string | null;
          id?: string;
          isDeleted?: boolean | null;
          isPublic?: boolean | null;
          name?: string | null;
          orgId?: string | null;
          previewUrl?: string | null;
          provider?: string | null;
          providerId?: string;
          slug?: string | null;
          style?: string | null;
          updatedAt?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
