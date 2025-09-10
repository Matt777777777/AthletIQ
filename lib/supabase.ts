// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Client Supabase lazy (initialisé seulement quand nécessaire)
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-js-react-native',
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      console.log('✅ Client Supabase initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation Supabase:', error);
      throw error;
    }
  }
  return supabaseClient;
}

// Export pour compatibilité
export const supabase = {
  get auth() { return getSupabaseClient().auth; },
  get from() { return getSupabaseClient().from; },
  get storage() { return getSupabaseClient().storage; },
  get realtime() { return getSupabaseClient().realtime; },
  get channel() { return getSupabaseClient().channel; },
  get removeChannel() { return getSupabaseClient().removeChannel; },
  get removeAllChannels() { return getSupabaseClient().removeAllChannels; },
  get getChannels() { return getSupabaseClient().getChannels; },
};

// Configuration de base de données
export const TABLES = {
  PROFILES: 'profiles',
  SAVED_PLANS: 'saved_plans',
  SHOPPING_ITEMS: 'shopping_items',
  DAILY_INTAKE: 'daily_intake',
  DAILY_STEPS: 'daily_steps',
  DAY_PLANS: 'day_plans',
  CHAT_MESSAGES: 'chat_messages',
} as const;

// Types pour la base de données
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          goal: string;
          sessions: number;
          diet: string;
          first_name?: string;
          age?: number;
          weight?: number;
          height?: number;
          gender?: 'male' | 'female';
          profile_photo?: string;
          fitness_level?: string;
          equipment?: string;
          intolerances?: string;
          limitations?: string;
          preferred_time?: string;
          chat_responses?: any;
          chat_questions_asked?: boolean;
          daily_meals?: any;
          daily_workout?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal: string;
          sessions: number;
          diet: string;
          first_name?: string;
          age?: number;
          weight?: number;
          height?: number;
          gender?: 'male' | 'female';
          profile_photo?: string;
          fitness_level?: string;
          equipment?: string;
          intolerances?: string;
          limitations?: string;
          preferred_time?: string;
          chat_responses?: any;
          chat_questions_asked?: boolean;
          daily_meals?: any;
          daily_workout?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal?: string;
          sessions?: number;
          diet?: string;
          first_name?: string;
          age?: number;
          weight?: number;
          height?: number;
          gender?: 'male' | 'female';
          profile_photo?: string;
          fitness_level?: string;
          equipment?: string;
          intolerances?: string;
          limitations?: string;
          preferred_time?: string;
          chat_responses?: any;
          chat_questions_asked?: boolean;
          daily_meals?: any;
          daily_workout?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_plans: {
        Row: {
          id: string;
          user_id: string;
          type: 'workout' | 'meal';
          title: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'workout' | 'meal';
          title: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'workout' | 'meal';
          title?: string;
          content?: string;
          created_at?: string;
        };
      };
      shopping_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          quantity: string;
          unit?: string;
          category: string;
          checked: boolean;
          source?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          quantity: string;
          unit?: string;
          category: string;
          checked: boolean;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          quantity?: string;
          unit?: string;
          category?: string;
          checked?: boolean;
          source?: string;
          created_at?: string;
        };
      };
      daily_intake: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          kcal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          kcal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          kcal?: number;
          created_at?: string;
        };
      };
      daily_steps: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          steps: number;
          last_updated: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          steps?: number;
          last_updated?: string;
          created_at?: string;
        };
      };
      day_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          breakfast?: any;
          lunch?: any;
          snack?: any;
          dinner?: any;
          workout?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          breakfast?: any;
          lunch?: any;
          snack?: any;
          dinner?: any;
          workout?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          breakfast?: any;
          lunch?: any;
          snack?: any;
          dinner?: any;
          workout?: any;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          is_user: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          is_user: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          is_user?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

// Fonction utilitaire pour obtenir l'ID utilisateur actuel
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}

// Fonction utilitaire pour vérifier la connectivité Supabase
export async function isSupabaseConnected(): Promise<boolean> {
  try {
    // Vérifier d'abord si les variables d'environnement sont définies
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('Variables d\'environnement Supabase non définies');
      return false;
    }

    // Test simple de connexion
    const client = getSupabaseClient();
    const { data, error } = await client.from('profiles').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase non connecté:', error);
    return false;
  }
}
