// lib/storage-adapter-simple.ts
// Version simplifiée utilisant uniquement AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, getSupabaseClient, isSupabaseConnected } from './supabase';

export type StorageMode = 'async' | 'supabase' | 'hybrid';

class StorageAdapter {
  private mode: StorageMode = 'async';
  private initialized = false;

  // Initialisation du mode de stockage
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Vérifier si Supabase est configuré et connecté
      const isConnected = await isSupabaseConnected();
      const userId = await getCurrentUserId();
      
      if (isConnected && userId) {
        this.mode = 'hybrid'; // Mode hybride : Supabase + AsyncStorage en fallback
        console.log('✅ Mode de stockage: HYBRIDE (Supabase + AsyncStorage)');
      } else {
        this.mode = 'async'; // Mode AsyncStorage uniquement
        console.log('⚠️ Mode de stockage: ASYNCSTORAGE uniquement (Supabase non disponible)');
      }
    } catch (error) {
      console.error('Erreur initialisation storage:', error);
      this.mode = 'async';
      console.log('⚠️ Mode de stockage: ASYNCSTORAGE uniquement (Erreur Supabase)');
    }

    this.initialized = true;
  }

  // Obtenir le mode actuel
  getMode(): StorageMode {
    return this.mode;
  }

  // Sauvegarder avec fallback automatique
  async save(key: string, data: any): Promise<void> {
    await this.initialize();

    try {
      if (this.mode === 'hybrid') {
        // Essayer Supabase d'abord
        try {
          await this.saveToSupabase(key, data);
          // Sauvegarder aussi en local comme backup
          await AsyncStorage.setItem(key, JSON.stringify(data));
          console.log(`✅ Données sauvegardées (Supabase + Local): ${key}`);
        } catch (supabaseError) {
          console.warn('⚠️ Erreur Supabase, fallback vers AsyncStorage:', supabaseError);
          await AsyncStorage.setItem(key, JSON.stringify(data));
          console.log(`✅ Données sauvegardées (Local uniquement): ${key}`);
        }
      } else {
        // Mode AsyncStorage uniquement
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`✅ Données sauvegardées (Local): ${key}`);
      }
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      throw error;
    }
  }

  // Charger avec fallback automatique
  async load(key: string): Promise<any> {
    await this.initialize();

    try {
      if (this.mode === 'hybrid') {
        // Essayer Supabase d'abord
        try {
          const data = await this.loadFromSupabase(key);
          if (data) {
            console.log(`✅ Données chargées (Supabase): ${key}`);
            return data;
          }
        } catch (supabaseError) {
          console.warn('⚠️ Erreur Supabase, fallback vers AsyncStorage:', supabaseError);
        }

        // Fallback vers AsyncStorage
        const localData = await AsyncStorage.getItem(key);
        if (localData) {
          console.log(`✅ Données chargées (Local): ${key}`);
          return JSON.parse(localData);
        }
      } else {
        // Mode AsyncStorage uniquement
        const localData = await AsyncStorage.getItem(key);
        if (localData) {
          console.log(`✅ Données chargées (Local): ${key}`);
          return JSON.parse(localData);
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      return null;
    }
  }

  // Supprimer avec fallback automatique
  async remove(key: string): Promise<void> {
    await this.initialize();

    try {
      if (this.mode === 'hybrid') {
        // Essayer Supabase d'abord
        try {
          await this.removeFromSupabase(key);
          // Supprimer aussi en local
          await AsyncStorage.removeItem(key);
          console.log(`✅ Données supprimées (Supabase + Local): ${key}`);
        } catch (supabaseError) {
          console.warn('⚠️ Erreur Supabase, fallback vers AsyncStorage:', supabaseError);
          await AsyncStorage.removeItem(key);
          console.log(`✅ Données supprimées (Local uniquement): ${key}`);
        }
      } else {
        // Mode AsyncStorage uniquement
        await AsyncStorage.removeItem(key);
        console.log(`✅ Données supprimées (Local): ${key}`);
      }
    } catch (error) {
      console.error(`❌ Erreur suppression ${key}:`, error);
      throw error;
    }
  }

  // Méthodes privées pour Supabase
  private async saveToSupabase(key: string, data: any): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    // Mapping des clés AsyncStorage vers les tables Supabase
    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'saved_plans',
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(`Table non mappée pour la clé: ${key}`);
    }

    // Logique de sauvegarde spécifique par table
    switch (tableName) {
      case 'profiles':
        await this.saveProfileToSupabase(userId, data);
        break;
      case 'saved_plans':
        await this.savePlansToSupabase(userId, data);
        break;
      case 'shopping_items':
        await this.saveShoppingItemsToSupabase(userId, data);
        break;
      case 'daily_intake':
        await this.saveDailyIntakeToSupabase(userId, data);
        break;
      default:
        // Pour les autres tables, sauvegarder en JSON
        const client = getSupabaseClient();
        const { error } = await client
          .from(tableName)
          .upsert({
            user_id: userId,
            data: data,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
    }
  }

  private async loadFromSupabase(key: string): Promise<any> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'saved_plans',
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(`Table non mappée pour la clé: ${key}`);
    }

    // Logique de chargement spécifique par table
    switch (tableName) {
      case 'profiles':
        return await this.loadProfileFromSupabase(userId);
      case 'saved_plans':
        return await this.loadPlansFromSupabase(userId);
      case 'shopping_items':
        return await this.loadShoppingItemsFromSupabase(userId);
      case 'daily_intake':
        return await this.loadDailyIntakeFromSupabase(userId);
      default:
        // Pour les autres tables, charger depuis JSON
        const client = getSupabaseClient();
        const { data, error } = await client
          .from(tableName)
          .select('data')
          .eq('user_id', userId)
          .single();
        if (error) throw error;
        return data?.data || null;
    }
  }

  private async removeFromSupabase(key: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'saved_plans',
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(`Table non mappée pour la clé: ${key}`);
    }

    // Supprimer les données de l'utilisateur
    const client = getSupabaseClient();
    const { error } = await client
      .from(tableName)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Méthodes spécifiques pour le profil
  private async saveProfileToSupabase(userId: string, profile: any): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('profiles')
      .upsert({
        user_id: userId,
        goal: profile.goal,
        sessions: profile.sessions,
        diet: profile.diet,
        first_name: profile.firstName,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        gender: profile.gender,
        profile_photo: profile.profilePhoto,
        fitness_level: profile.fitnessLevel,
        equipment: profile.equipment,
        intolerances: profile.intolerances,
        limitations: profile.limitations,
        preferred_time: profile.preferredTime,
        chat_responses: profile.chatResponses,
        chat_questions_asked: profile.chatQuestionsAsked,
        daily_meals: profile.dailyMeals,
        daily_workout: profile.dailyWorkout,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  private async loadProfileFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Convertir le format Supabase vers le format AsyncStorage
    return {
      goal: data.goal,
      sessions: data.sessions,
      diet: data.diet,
      firstName: data.first_name,
      age: data.age,
      weight: data.weight,
      height: data.height,
      gender: data.gender,
      profilePhoto: data.profile_photo,
      fitnessLevel: data.fitness_level,
      equipment: data.equipment,
      intolerances: data.intolerances,
      limitations: data.limitations,
      preferredTime: data.preferred_time,
      chatResponses: data.chat_responses,
      chatQuestionsAsked: data.chat_questions_asked,
      dailyMeals: data.daily_meals,
      dailyWorkout: data.daily_workout,
    };
  }

  // Méthodes spécifiques pour les plans
  private async savePlansToSupabase(userId: string, plans: any[]): Promise<void> {
    if (!Array.isArray(plans) || plans.length === 0) {
      console.log('Aucun plan à sauvegarder');
      return;
    }

    // Supprimer les anciens plans de l'utilisateur
    const client = getSupabaseClient();
    const { error: deleteError } = await client
      .from('saved_plans')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Erreur suppression anciens plans:', deleteError);
    }

    // Insérer les nouveaux plans
    const plansToInsert = plans.map(plan => ({
      user_id: userId,
      type: plan.type,
      title: plan.title,
      content: plan.content,
      created_at: plan.dateISO || new Date().toISOString(),
    }));

    const { error: insertError } = await client
      .from('saved_plans')
      .insert(plansToInsert);

    if (insertError) throw insertError;
    console.log(`✅ ${plans.length} plans sauvegardés dans Supabase`);
  }

  private async loadPlansFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('saved_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Convertir le format Supabase vers le format AsyncStorage
    return data.map(plan => ({
      id: plan.id,
      type: plan.type,
      title: plan.title,
      content: plan.content,
      dateISO: plan.created_at,
    }));
  }

  // Méthodes spécifiques pour la liste de courses
  private async saveShoppingItemsToSupabase(userId: string, items: any[]): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) {
      console.log('Aucun article de course à sauvegarder');
      return;
    }

    // Supprimer les anciens articles de l'utilisateur
    const client = getSupabaseClient();
    const { error: deleteError } = await client
      .from('shopping_items')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Erreur suppression anciens articles:', deleteError);
    }

    // Insérer les nouveaux articles
    const itemsToInsert = items.map(item => ({
      user_id: userId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || null,
      category: item.category,
      checked: item.checked,
      source: item.source || null,
      created_at: item.dateAdded || new Date().toISOString(),
    }));

    const { error: insertError } = await client
      .from('shopping_items')
      .insert(itemsToInsert);

    if (insertError) throw insertError;
    console.log(`✅ ${items.length} articles de course sauvegardés dans Supabase`);
  }

  private async loadShoppingItemsFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('shopping_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Convertir le format Supabase vers le format AsyncStorage
    return data.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      checked: item.checked,
      dateAdded: item.created_at,
      source: item.source,
    }));
  }

  // Méthodes spécifiques pour l'apport nutritionnel
  private async saveDailyIntakeToSupabase(userId: string, intake: any): Promise<void> {
    if (!intake || typeof intake.kcal !== 'number') {
      console.log('Aucun apport nutritionnel à sauvegarder');
      return;
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Supprimer l'ancien apport du jour
    const { error: deleteError } = await client
      .from('daily_intake')
      .delete()
      .eq('user_id', userId)
      .eq('date', today);

    if (deleteError) {
      console.warn('Erreur suppression ancien apport:', deleteError);
    }

    // Insérer le nouvel apport
    const { error: insertError } = await client
      .from('daily_intake')
      .insert({
        user_id: userId,
        date: today,
        kcal: intake.kcal,
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
    console.log(`✅ Apport nutritionnel sauvegardé dans Supabase: ${intake.kcal} kcal`);
  }

  private async loadDailyIntakeFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    const { data, error } = await client
      .from('daily_intake')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucun enregistrement trouvé, retourner l'apport par défaut
        return { kcal: 0 };
      }
      throw error;
    }

    if (!data) return { kcal: 0 };

    // Convertir le format Supabase vers le format AsyncStorage
    return {
      kcal: data.kcal,
    };
  }
}

// Instance singleton
export const storageAdapter = new StorageAdapter();
