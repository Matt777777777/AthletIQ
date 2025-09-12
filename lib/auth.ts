// lib/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from './profile';
import { getSupabaseClient } from './supabase';

export type AuthUser = {
  id: string;
  email: string;
  profile?: Profile;
};

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = {
    user: null,
    loading: true,
    error: null,
  };

  constructor() {
    this.initializeAuth();
  }

  // Initialiser l'authentification au démarrage
  private async initializeAuth() {
    try {
      this.updateState({ loading: true, error: null });
      
      const client = getSupabaseClient();
      const { data: { session } } = await client.auth.getSession();
      
      if (session?.user) {
        const profile = await this.loadUserProfile(session.user.id);
        this.updateState({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            profile,
          },
          loading: false,
          error: null,
        });
      } else {
        this.updateState({
          user: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Erreur initialisation auth:', error);
      this.updateState({
        user: null,
        loading: false,
        error: 'Erreur de connexion',
      });
    }
  }

  // Inscription avec email/mot de passe
  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });
      
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Créer un profil par défaut pour le nouvel utilisateur
        const defaultProfile: Profile = {
          goal: 'maintenance',
          sessions: 3,
          diet: 'équilibré',
          first_name: '',
          age: 25,
          weight: 70,
          height: 170,
          gender: 'male',
          profile_photo: '',
          fitness_level: 'débutant',
          equipment: 'aucun',
          intolerances: '',
          limitations: '',
          preferred_time: 'matin',
          chat_responses: {},
          chat_questions_asked: false,
          daily_meals: {},
          daily_workout: {},
        };

        try {
          await this.saveUserProfile(data.user.id, defaultProfile);
        } catch (profileError) {
          console.warn('Erreur création profil par défaut:', profileError);
          // Continuer même si la création du profil échoue
        }
        
        this.updateState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            profile: defaultProfile,
          },
          loading: false,
          error: null,
        });

        return { success: true };
      }

      this.updateState({ loading: false, error: 'Erreur lors de l\'inscription' });
      return { success: false, error: 'Erreur lors de l\'inscription' };
    } catch (error) {
      console.error('Erreur signup:', error);
      this.updateState({ loading: false, error: 'Erreur de connexion' });
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  // Connexion avec email/mot de passe
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });
      
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Note: Pour le développement, on ignore la confirmation d'email
        // En production, décommenter la vérification ci-dessous
        /*
        if (!data.user.email_confirmed_at) {
          this.updateState({ 
            loading: false, 
            error: 'Veuillez confirmer votre email avant de vous connecter' 
          });
          return { success: false, error: 'Veuillez confirmer votre email avant de vous connecter' };
        }
        */

        const profile = await this.loadUserProfile(data.user.id);
        this.updateState({
          user: {
            id: data.user.id,
            email: data.user.email || '',
            profile,
          },
          loading: false,
          error: null,
        });

        return { success: true };
      }

      this.updateState({ loading: false, error: 'Erreur lors de la connexion' });
      return { success: false, error: 'Erreur lors de la connexion' };
    } catch (error) {
      console.error('Erreur signin:', error);
      this.updateState({ loading: false, error: 'Erreur de connexion' });
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  // Déconnexion
  async signOut(): Promise<void> {
    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
      
      // Nettoyer le cache local
      await AsyncStorage.multiRemove([
        'userProfile',
        'savedPlans',
        'shoppingItems',
        'dailyIntake',
        'dailySteps',
        'dayPlans',
        'chatMessages',
      ]);

      this.updateState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Erreur signout:', error);
      this.updateState({ error: 'Erreur lors de la déconnexion' });
    }
  }

  // Charger le profil utilisateur depuis Supabase
  private async loadUserProfile(userId: string): Promise<Profile | null> {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erreur chargement profil:', error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      return null;
    }
  }

  // Sauvegarder le profil utilisateur dans Supabase
  private async saveUserProfile(userId: string, profile: Profile): Promise<void> {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('profiles')
        .upsert({
          user_id: userId,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Erreur sauvegarde profil:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      throw error;
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentState.user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      await this.saveUserProfile(this.currentState.user.id, profile);
      
      this.updateState({
        user: {
          ...this.currentState.user,
          profile,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur update profil:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  }

  // Écouter les changements d'état
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Appeler immédiatement avec l'état actuel
    listener(this.currentState);
    
    // Retourner une fonction de désabonnement
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Mettre à jour l'état et notifier les listeners
  private updateState(newState: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  // Obtenir l'état actuel
  getCurrentState(): AuthState {
    return this.currentState;
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return this.currentState.user !== null && !this.currentState.loading;
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser(): AuthUser | null {
    return this.currentState.user;
  }

  // Changer le mot de passe
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = getSupabaseClient();
      
      // Vérifier le mot de passe actuel en tentant de se reconnecter
      const { data: { user } } = await client.auth.getUser();
      if (!user?.email) {
        return { success: false, error: 'Utilisateur non trouvé' };
      }

      // Mettre à jour le mot de passe
      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Erreur changement mot de passe:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      return { success: false, error: 'Une erreur est survenue' };
    }
  }
}

// Instance singleton
export const authService = new AuthService();