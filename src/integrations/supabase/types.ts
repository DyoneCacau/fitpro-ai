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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
      anamnesis: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          age: number
          alcohol_use: string | null
          aluno_id: string
          assessed_at: string
          bmr: number
          body_fat_pct: number | null
          carbs_g: number
          clinical_notes: string | null
          created_at: string
          digestion_notes: string | null
          expectations: string | null
          family_history: string | null
          fat_g: number
          food_preferences: string | null
          goal: Database["public"]["Enums"]["fitness_goal"]
          height_cm: number
          id: string
          injuries: string | null
          is_active: boolean
          kcal_target: number
          lean_mass_kg: number | null
          main_motivation: string | null
          meals_per_day: number | null
          measurements: Json | null
          medical_history: string | null
          medications: string | null
          occupation: string | null
          pain_or_limitations: string | null
          par_q_cleared: boolean | null
          par_q_notes: string | null
          personal_id: string
          protein_g: number
          restrictions: string | null
          sex: string
          sleep_hours: number | null
          smoking: string | null
          stress_level: string | null
          supplements_used: string | null
          surgeries: string | null
          tdee: number
          training_days_per_week: number | null
          training_experience: string | null
          training_history: string | null
          training_location: string | null
          updated_at: string
          weekly_availability: string | null
          weight_kg: number
        }
        Insert: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          age: number
          alcohol_use?: string | null
          aluno_id: string
          assessed_at?: string
          bmr: number
          body_fat_pct?: number | null
          carbs_g: number
          clinical_notes?: string | null
          created_at?: string
          digestion_notes?: string | null
          expectations?: string | null
          family_history?: string | null
          fat_g: number
          food_preferences?: string | null
          goal: Database["public"]["Enums"]["fitness_goal"]
          height_cm: number
          id?: string
          injuries?: string | null
          is_active?: boolean
          kcal_target: number
          lean_mass_kg?: number | null
          main_motivation?: string | null
          meals_per_day?: number | null
          measurements?: Json | null
          medical_history?: string | null
          medications?: string | null
          occupation?: string | null
          pain_or_limitations?: string | null
          par_q_cleared?: boolean | null
          par_q_notes?: string | null
          personal_id: string
          protein_g: number
          restrictions?: string | null
          sex: string
          sleep_hours?: number | null
          smoking?: string | null
          stress_level?: string | null
          supplements_used?: string | null
          surgeries?: string | null
          tdee: number
          training_days_per_week?: number | null
          training_experience?: string | null
          training_history?: string | null
          training_location?: string | null
          updated_at?: string
          weekly_availability?: string | null
          weight_kg: number
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          age?: number
          alcohol_use?: string | null
          aluno_id?: string
          assessed_at?: string
          bmr?: number
          body_fat_pct?: number | null
          carbs_g?: number
          clinical_notes?: string | null
          created_at?: string
          digestion_notes?: string | null
          expectations?: string | null
          family_history?: string | null
          fat_g?: number
          food_preferences?: string | null
          goal?: Database["public"]["Enums"]["fitness_goal"]
          height_cm?: number
          id?: string
          injuries?: string | null
          is_active?: boolean
          kcal_target?: number
          lean_mass_kg?: number | null
          main_motivation?: string | null
          meals_per_day?: number | null
          measurements?: Json | null
          medical_history?: string | null
          medications?: string | null
          occupation?: string | null
          pain_or_limitations?: string | null
          par_q_cleared?: boolean | null
          par_q_notes?: string | null
          personal_id?: string
          protein_g?: number
          restrictions?: string | null
          sex?: string
          sleep_hours?: number | null
          smoking?: string | null
          stress_level?: string | null
          supplements_used?: string | null
          surgeries?: string | null
          tdee?: number
          training_days_per_week?: number | null
          training_experience?: string | null
          training_history?: string | null
          training_location?: string | null
          updated_at?: string
          weekly_availability?: string | null
          weight_kg?: number
        }
        Relationships: []
      }
      assessments: {
        Row: {
          aluno_id: string
          assessed_at: string
          body_fat_pct: number | null
          created_at: string
          height_cm: number | null
          id: string
          lean_mass_kg: number | null
          measurements: Json | null
          notes: string | null
          personal_id: string | null
          photos: Json | null
          weight_kg: number | null
        }
        Insert: {
          aluno_id: string
          assessed_at?: string
          body_fat_pct?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measurements?: Json | null
          notes?: string | null
          personal_id?: string | null
          photos?: Json | null
          weight_kg?: number | null
        }
        Update: {
          aluno_id?: string
          assessed_at?: string
          body_fat_pct?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          measurements?: Json | null
          notes?: string | null
          personal_id?: string | null
          photos?: Json | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          amount_cents: number
          billing_cycle: string
          created_at: string
          id: string
          name: string
          personal_id: string
        }
        Insert: {
          amount_cents: number
          billing_cycle?: string
          created_at?: string
          id?: string
          name: string
          personal_id: string
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string
          created_at?: string
          id?: string
          name?: string
          personal_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_meal_completions: {
        Row: {
          aluno_id: string
          completed_at: string
          id: string
          log_date: string
          meal_id: string
        }
        Insert: {
          aluno_id: string
          completed_at?: string
          id?: string
          log_date?: string
          meal_id: string
        }
        Update: {
          aluno_id?: string
          completed_at?: string
          id?: string
          log_date?: string
          meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_meal_completions_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "diet_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_meal_items: {
        Row: {
          carbs_g: number | null
          fat_g: number | null
          food: string
          id: string
          kcal: number | null
          meal_id: string
          notes: string | null
          position: number | null
          protein_g: number | null
          quantity: number
          substitution_set_id: string | null
          unit: string
        }
        Insert: {
          carbs_g?: number | null
          fat_g?: number | null
          food: string
          id?: string
          kcal?: number | null
          meal_id: string
          notes?: string | null
          position?: number | null
          protein_g?: number | null
          quantity?: number
          substitution_set_id?: string | null
          unit?: string
        }
        Update: {
          carbs_g?: number | null
          fat_g?: number | null
          food?: string
          id?: string
          kcal?: number | null
          meal_id?: string
          notes?: string | null
          position?: number | null
          protein_g?: number | null
          quantity?: number
          substitution_set_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "diet_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_meal_items_substitution_set_id_fkey"
            columns: ["substitution_set_id"]
            isOneToOne: false
            referencedRelation: "diet_meal_substitution_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_meal_substitution_sets: {
        Row: {
          created_at: string
          id: string
          meal_id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          meal_id: string
          name?: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          meal_id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "diet_meal_substitution_sets_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "diet_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_meals: {
        Row: {
          description: string | null
          id: string
          plan_id: string
          position: number | null
          slot: Database["public"]["Enums"]["meal_slot"]
          time_label: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          plan_id: string
          position?: number | null
          slot: Database["public"]["Enums"]["meal_slot"]
          time_label?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          plan_id?: string
          position?: number | null
          slot?: Database["public"]["Enums"]["meal_slot"]
          time_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          aluno_id: string | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          is_active: boolean
          is_template: boolean
          kcal_target: number | null
          name: string
          notes: string | null
          personal_id: string | null
          protein_g: number | null
          updated_at: string
        }
        Insert: {
          aluno_id?: string | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          kcal_target?: number | null
          name?: string
          notes?: string | null
          personal_id?: string | null
          protein_g?: number | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          kcal_target?: number | null
          name?: string
          notes?: string | null
          personal_id?: string | null
          protein_g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      diet_substitutions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          original_food: string
          plan_id: string
          position: number
          substitute_food: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          original_food: string
          plan_id: string
          position?: number
          substitute_food: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          original_food?: string
          plan_id?: string
          position?: number
          substitute_food?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_substitutions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_supplements: {
        Row: {
          created_at: string
          dosage: string
          id: string
          name: string
          notes: string | null
          plan_id: string
          position: number
          timing: string | null
        }
        Insert: {
          created_at?: string
          dosage?: string
          id?: string
          name: string
          notes?: string | null
          plan_id: string
          position?: number
          timing?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          id?: string
          name?: string
          notes?: string | null
          plan_id?: string
          position?: number
          timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_supplements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_catalog: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_path: string | null
          muscle_group: string | null
          name: string
          personal_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          muscle_group?: string | null
          name: string
          personal_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          muscle_group?: string | null
          name?: string
          personal_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          note: string | null
          position: number
          set_type: Database["public"]["Enums"]["set_type"]
          target_load: number | null
          target_reps: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          note?: string | null
          position?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          target_load?: number | null
          target_reps?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          note?: string | null
          position?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          target_load?: number | null
          target_reps?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          image: string | null
          muscle_group: string | null
          name: string
          note: string | null
          position: number
          rest_seconds: number | null
          video_url: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          muscle_group?: string | null
          name: string
          note?: string | null
          position?: number
          rest_seconds?: number | null
          video_url?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          muscle_group?: string | null
          name?: string
          note?: string | null
          position?: number
          rest_seconds?: number | null
          video_url?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          aluno_id: string
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food: string
          id: string
          kcal: number | null
          log_date: string
          photo_url: string | null
          protein_g: number | null
          quantity: number
          slot: Database["public"]["Enums"]["meal_slot"]
          source_meal_item_id: string | null
          unit: string
        }
        Insert: {
          aluno_id: string
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food: string
          id?: string
          kcal?: number | null
          log_date?: string
          photo_url?: string | null
          protein_g?: number | null
          quantity?: number
          slot: Database["public"]["Enums"]["meal_slot"]
          source_meal_item_id?: string | null
          unit?: string
        }
        Update: {
          aluno_id?: string
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food?: string
          id?: string
          kcal?: number | null
          log_date?: string
          photo_url?: string | null
          protein_g?: number | null
          quantity?: number
          slot?: Database["public"]["Enums"]["meal_slot"]
          source_meal_item_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_source_meal_item_id_fkey"
            columns: ["source_meal_item_id"]
            isOneToOne: false
            referencedRelation: "diet_meal_items"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics_daily: {
        Row: {
          active_calories: number | null
          created_at: string
          distance_m: number | null
          heart_rate_avg: number | null
          id: string
          metric_date: string
          provider: string
          resting_calories: number | null
          sleep_minutes: number | null
          source_label: string | null
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          created_at?: string
          distance_m?: number | null
          heart_rate_avg?: number | null
          id?: string
          metric_date: string
          provider: string
          resting_calories?: number | null
          sleep_minutes?: number | null
          source_label?: string | null
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_calories?: number | null
          created_at?: string
          distance_m?: number | null
          heart_rate_avg?: number | null
          id?: string
          metric_date?: string
          provider?: string
          resting_calories?: number | null
          sleep_minutes?: number | null
          source_label?: string | null
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          aluno_id: string
          amount_cents: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          personal_id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          aluno_id: string
          amount_cents: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          personal_id: string
          status?: string
          subscription_id?: string | null
        }
        Update: {
          aluno_id?: string
          amount_cents?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          personal_id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "student_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          personal_id: string
          photo_url: string | null
          text: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          personal_id: string
          photo_url?: string | null
          text?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          personal_id?: string
          photo_url?: string | null
          text?: string | null
        }
        Relationships: []
      }
      professional_subscriptions: {
        Row: {
          cardholder_name: string | null
          created_at: string
          current_period_end: string | null
          gateway: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          id: string
          plan: string
          price_cents: number
          professional_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cardholder_name?: string | null
          created_at?: string
          current_period_end?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan?: string
          price_cents?: number
          professional_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cardholder_name?: string | null
          created_at?: string
          current_period_end?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          id?: string
          plan?: string
          price_cents?: number
          professional_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          follow_up_interval_days: number | null
          follow_up_kind: Database["public"]["Enums"]["appointment_kind"] | null
          full_name: string | null
          id: string
          instagram: string | null
          is_nutritionist: boolean
          is_personal_trainer: boolean
          onboarding_completed_at: string | null
          onboarding_revenue_range: string | null
          onboarding_skipped: boolean
          onboarding_student_range: string | null
          personal_id: string | null
          phone: string | null
          registry_number: string | null
          registry_type:
            | Database["public"]["Enums"]["professional_registry"]
            | null
          tour_completed_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          follow_up_interval_days?: number | null
          follow_up_kind?:
            | Database["public"]["Enums"]["appointment_kind"]
            | null
          full_name?: string | null
          id: string
          instagram?: string | null
          is_nutritionist?: boolean
          is_personal_trainer?: boolean
          onboarding_completed_at?: string | null
          onboarding_revenue_range?: string | null
          onboarding_skipped?: boolean
          onboarding_student_range?: string | null
          personal_id?: string | null
          phone?: string | null
          registry_number?: string | null
          registry_type?:
            | Database["public"]["Enums"]["professional_registry"]
            | null
          tour_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          follow_up_interval_days?: number | null
          follow_up_kind?:
            | Database["public"]["Enums"]["appointment_kind"]
            | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_nutritionist?: boolean
          is_personal_trainer?: boolean
          onboarding_completed_at?: string | null
          onboarding_revenue_range?: string | null
          onboarding_skipped?: boolean
          onboarding_student_range?: string | null
          personal_id?: string | null
          phone?: string | null
          registry_number?: string | null
          registry_type?:
            | Database["public"]["Enums"]["professional_registry"]
            | null
          tour_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          done_at: string
          exercise_set_id: string
          id: string
          load: number
          note: string | null
          reps: number
          session_id: string
        }
        Insert: {
          done_at?: string
          exercise_set_id: string
          id?: string
          load?: number
          note?: string | null
          reps?: number
          session_id: string
        }
        Update: {
          done_at?: string
          exercise_set_id?: string
          id?: string
          load?: number
          note?: string | null
          reps?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_set_id_fkey"
            columns: ["exercise_set_id"]
            isOneToOne: false
            referencedRelation: "exercise_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_appointments: {
        Row: {
          aluno_id: string
          created_at: string
          duration_minutes: number
          id: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          notes: string | null
          personal_id: string
          recurrence_days: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          notes?: string | null
          personal_id: string
          recurrence_days?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          notes?: string | null
          personal_id?: string
          recurrence_days?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      student_follow_ups: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          interval_days: number
          is_active: boolean
          kind: Database["public"]["Enums"]["appointment_kind"]
          last_visit_at: string | null
          notes: string | null
          personal_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          kind?: Database["public"]["Enums"]["appointment_kind"]
          last_visit_at?: string | null
          notes?: string | null
          personal_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          interval_days?: number
          is_active?: boolean
          kind?: Database["public"]["Enums"]["appointment_kind"]
          last_visit_at?: string | null
          notes?: string | null
          personal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          follow_up_interval_days: number
          follow_up_kind: Database["public"]["Enums"]["appointment_kind"]
          full_name: string | null
          id: string
          personal_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          follow_up_interval_days?: number
          follow_up_kind?: Database["public"]["Enums"]["appointment_kind"]
          full_name?: string | null
          id?: string
          personal_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          follow_up_interval_days?: number
          follow_up_kind?: Database["public"]["Enums"]["appointment_kind"]
          full_name?: string | null
          id?: string
          personal_id?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      student_lab_exams: {
        Row: {
          aluno_id: string
          created_at: string
          exam_date: string | null
          exam_name: string
          id: string
          notes: string | null
          personal_id: string
          results: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          exam_date?: string | null
          exam_name: string
          id?: string
          notes?: string | null
          personal_id: string
          results?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          exam_date?: string | null
          exam_name?: string
          id?: string
          notes?: string | null
          personal_id?: string
          results?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_lab_exams_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lab_exams_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_materials: {
        Row: {
          aluno_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          link_url: string | null
          personal_id: string
          title: string
        }
        Insert: {
          aluno_id: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          personal_id: string
          title: string
        }
        Update: {
          aluno_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          personal_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_materials_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_materials_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subscriptions: {
        Row: {
          aluno_id: string
          amount_cents: number
          created_at: string
          id: string
          next_due_date: string
          notes: string | null
          personal_id: string
          plan_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          amount_cents: number
          created_at?: string
          id?: string
          next_due_date: string
          notes?: string | null
          personal_id: string
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          next_due_date?: string
          notes?: string | null
          personal_id?: string
          plan_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wearable_activities: {
        Row: {
          activity_type: string | null
          calories: number | null
          created_at: string
          distance_m: number | null
          duration_sec: number | null
          external_id: string
          id: string
          name: string
          provider: string
          raw_data: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          external_id: string
          id?: string
          name: string
          provider: string
          raw_data?: Json | null
          started_at: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          calories?: number | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          external_id?: string
          id?: string
          name?: string
          provider?: string
          raw_data?: Json | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_connections: {
        Row: {
          access_token: string | null
          created_at: string
          external_user_id: string | null
          id: string
          last_sync_at: string | null
          metadata: Json
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wearable_daily_metrics: {
        Row: {
          active_calories_kcal: number | null
          aluno_id: string
          avg_heart_rate_bpm: number | null
          created_at: string
          distance_meters: number | null
          exercise_minutes: number | null
          id: string
          metric_date: string
          resting_heart_rate_bpm: number | null
          sleep_minutes: number | null
          source_platform: string | null
          steps: number | null
          synced_at: string
          weight_kg: number | null
        }
        Insert: {
          active_calories_kcal?: number | null
          aluno_id: string
          avg_heart_rate_bpm?: number | null
          created_at?: string
          distance_meters?: number | null
          exercise_minutes?: number | null
          id?: string
          metric_date: string
          resting_heart_rate_bpm?: number | null
          sleep_minutes?: number | null
          source_platform?: string | null
          steps?: number | null
          synced_at?: string
          weight_kg?: number | null
        }
        Update: {
          active_calories_kcal?: number | null
          aluno_id?: string
          avg_heart_rate_bpm?: number | null
          created_at?: string
          distance_meters?: number | null
          exercise_minutes?: number | null
          id?: string
          metric_date?: string
          resting_heart_rate_bpm?: number | null
          sleep_minutes?: number | null
          source_platform?: string | null
          steps?: number | null
          synced_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wearable_daily_metrics_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_health_settings: {
        Row: {
          aluno_id: string
          connected_at: string | null
          created_at: string
          last_synced_at: string | null
          permissions: Json
          platform: string | null
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          aluno_id: string
          connected_at?: string | null
          created_at?: string
          last_synced_at?: string | null
          permissions?: Json
          platform?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          connected_at?: string | null
          created_at?: string
          last_synced_at?: string | null
          permissions?: Json
          platform?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wearable_health_settings_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_routines: {
        Row: {
          aluno_id: string | null
          auto_archive_on_end: boolean
          created_at: string
          difficulty: string | null
          ends_at: string | null
          hide_before_start: boolean
          id: string
          is_template: boolean
          level: Database["public"]["Enums"]["routine_level"]
          name: string
          notes: string | null
          objective: string | null
          personal_id: string
          routine_kind: Database["public"]["Enums"]["routine_kind"]
          schedule_type: Database["public"]["Enums"]["routine_schedule"]
          starts_at: string | null
          status: Database["public"]["Enums"]["routine_status"]
          target_sex: Database["public"]["Enums"]["routine_target_sex"]
          updated_at: string
        }
        Insert: {
          aluno_id?: string | null
          auto_archive_on_end?: boolean
          created_at?: string
          difficulty?: string | null
          ends_at?: string | null
          hide_before_start?: boolean
          id?: string
          is_template?: boolean
          level?: Database["public"]["Enums"]["routine_level"]
          name: string
          notes?: string | null
          objective?: string | null
          personal_id: string
          routine_kind?: Database["public"]["Enums"]["routine_kind"]
          schedule_type?: Database["public"]["Enums"]["routine_schedule"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["routine_status"]
          target_sex?: Database["public"]["Enums"]["routine_target_sex"]
          updated_at?: string
        }
        Update: {
          aluno_id?: string | null
          auto_archive_on_end?: boolean
          created_at?: string
          difficulty?: string | null
          ends_at?: string | null
          hide_before_start?: boolean
          id?: string
          is_template?: boolean
          level?: Database["public"]["Enums"]["routine_level"]
          name?: string
          notes?: string | null
          objective?: string | null
          personal_id?: string
          routine_kind?: Database["public"]["Enums"]["routine_kind"]
          schedule_type?: Database["public"]["Enums"]["routine_schedule"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["routine_status"]
          target_sex?: Database["public"]["Enums"]["routine_target_sex"]
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          aluno_id: string
          created_at: string
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          total_volume: number | null
          updated_at: string
          workout_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_volume?: number | null
          updated_at?: string
          workout_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          total_volume?: number | null
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          aluno_id: string | null
          category: Database["public"]["Enums"]["workout_category"]
          created_at: string
          estimated_minutes: number | null
          id: string
          is_active: boolean
          letter: string
          muscles: string | null
          personal_id: string | null
          routine_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          aluno_id?: string | null
          category?: Database["public"]["Enums"]["workout_category"]
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          letter?: string
          muscles?: string | null
          personal_id?: string | null
          routine_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string | null
          category?: Database["public"]["Enums"]["workout_category"]
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          letter?: string
          muscles?: string | null
          personal_id?: string | null
          routine_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_close_stale_sessions: { Args: never; Returns: number }
      can_see_feed: { Args: { _personal_id: string }; Returns: boolean }
      clone_diet_plan: {
        Args: {
          _as_template?: boolean
          _source_plan_id: string
          _target_aluno_id?: string
          _template_name?: string
        }
        Returns: string
      }
      clone_workout_routine: {
        Args: {
          _ends_at?: string
          _name?: string
          _source_routine_id: string
          _starts_at?: string
          _target_aluno_id: string
        }
        Returns: string
      }
      complete_appointment: {
        Args: { _appointment_id: string }
        Returns: string
      }
      complete_student_invitation: {
        Args: { _token: string }
        Returns: undefined
      }
      count_my_students: { Args: never; Returns: number }
      create_student_appointment: {
        Args: {
          _aluno_id: string
          _duration_minutes?: number
          _kind?: Database["public"]["Enums"]["appointment_kind"]
          _notes?: string
          _recurrence_days?: number
          _scheduled_at: string
        }
        Returns: string
      }
      create_student_invitation: {
        Args: {
          _email: string
          _follow_up_interval_days?: number
          _follow_up_kind?: Database["public"]["Enums"]["appointment_kind"]
          _full_name?: string
        }
        Returns: {
          invitation_id: string
          invite_url: string
          token: string
        }[]
      }
      get_invitation_public: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          follow_up_interval_days: number
          follow_up_kind: Database["public"]["Enums"]["appointment_kind"]
          full_name: string
          id: string
          is_nutritionist: boolean
          is_personal_trainer: boolean
          personal_name: string
          status: string
        }[]
      }
      get_my_students: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
        }[]
      }
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_profile_personal_id: { Args: { _user_id: string }; Returns: string }
      get_student_profile: {
        Args: { _aluno_id: string }
        Returns: {
          created_at: string
          full_name: string
          id: string
          personal_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_professional_user: { Args: { _user_id: string }; Returns: boolean }
      mark_overdue_invoices: { Args: never; Returns: number }
      refresh_workout_routine_statuses: { Args: never; Returns: undefined }
      repair_my_student_link: { Args: never; Returns: undefined }
      student_linked_to_personal: {
        Args: { _aluno_id: string; _personal_id?: string }
        Returns: boolean
      }
      sync_diet_from_anamnesis: { Args: { _aluno_id: string }; Returns: string }
      sync_student_follow_up_plan: {
        Args: {
          _aluno_id: string
          _interval_days: number
          _kind?: Database["public"]["Enums"]["appointment_kind"]
          _personal_id: string
        }
        Returns: undefined
      }
      update_student_follow_up_plan: {
        Args: {
          _aluno_id: string
          _interval_days: number
          _kind?: Database["public"]["Enums"]["appointment_kind"]
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "sedentario" | "leve" | "moderado" | "intenso" | "atleta"
      app_role: "admin" | "personal" | "aluno"
      appointment_kind: "treino" | "retorno" | "avaliacao" | "consulta"
      appointment_status: "scheduled" | "completed" | "cancelled"
      fitness_goal:
        | "perda_peso"
        | "ganho_massa"
        | "definicao"
        | "manutencao"
        | "performance"
      meal_slot:
        | "cafe"
        | "lanche_manha"
        | "almoco"
        | "lanche_tarde"
        | "jantar"
        | "ceia"
      post_kind: "treino" | "dieta" | "evolucao" | "livre"
      professional_registry: "cref" | "crn"
      routine_kind: "treinos" | "aerobico"
      routine_level: "adaptacao" | "iniciante" | "intermediario" | "avancado"
      routine_schedule: "por_letra" | "por_dia_semana"
      routine_status: "scheduled" | "active" | "archived"
      routine_target_sex: "masculino" | "feminino" | "unissex"
      session_status: "em_andamento" | "concluido" | "encerrado_auto"
      set_type: "normal" | "drop" | "falha" | "rest_pause"
      workout_category:
        | "forca"
        | "hipertrofia"
        | "cardio"
        | "funcional"
        | "mobilidade"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_level: ["sedentario", "leve", "moderado", "intenso", "atleta"],
      app_role: ["admin", "personal", "aluno"],
      appointment_kind: ["treino", "retorno", "avaliacao", "consulta"],
      appointment_status: ["scheduled", "completed", "cancelled"],
      fitness_goal: [
        "perda_peso",
        "ganho_massa",
        "definicao",
        "manutencao",
        "performance",
      ],
      meal_slot: [
        "cafe",
        "lanche_manha",
        "almoco",
        "lanche_tarde",
        "jantar",
        "ceia",
      ],
      post_kind: ["treino", "dieta", "evolucao", "livre"],
      professional_registry: ["cref", "crn"],
      routine_kind: ["treinos", "aerobico"],
      routine_level: ["adaptacao", "iniciante", "intermediario", "avancado"],
      routine_schedule: ["por_letra", "por_dia_semana"],
      routine_status: ["scheduled", "active", "archived"],
      routine_target_sex: ["masculino", "feminino", "unissex"],
      session_status: ["em_andamento", "concluido", "encerrado_auto"],
      set_type: ["normal", "drop", "falha", "rest_pause"],
      workout_category: [
        "forca",
        "hipertrofia",
        "cardio",
        "funcional",
        "mobilidade",
      ],
    },
  },
} as const
