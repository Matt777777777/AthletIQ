// lib/storage-adapter.ts
// Système de fallback sécurisé AsyncStorage <-> Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { getCurrentUserId, supabase } from './supabase'; // Temporairement désactivé

export type StorageMode = 'async' | 'supabase' | 'hybrid';

class StorageAdapter {
  private mode: StorageMode = 'async';
  private initialized = false;

  // Initialisation du mode de stockage
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // TEMPORAIRE: Mode AsyncStorage uniquement pour éviter l'erreur window
    this.mode = 'async';
    console.log('⚠️ Mode de stockage: ASYNCSTORAGE uniquement (Supabase temporairement désactivé)');
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
      // Mode AsyncStorage uniquement (Supabase temporairement désactivé)
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Données sauvegardées (Local): ${key}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      throw error;
    }
  }

  // Charger avec fallback automatique
  async load(key: string): Promise<any> {
    await this.initialize();

    try {
      // Mode AsyncStorage uniquement (Supabase temporairement désactivé)
      const localData = await AsyncStorage.getItem(key);
      if (localData) {
        console.log(`✅ Données chargées (Local): ${key}`);
        return JSON.parse(localData);
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
      // Mode AsyncStorage uniquement (Supabase temporairement désactivé)
      await AsyncStorage.removeItem(key);
      console.log(`✅ Données supprimées (Local): ${key}`);
    } catch (error) {
      console.error(`❌ Erreur suppression ${key}:`, error);
      throw error;
    }
  }

  // Méthodes privées pour Supabase (temporairement commentées)
  /*
  private async saveToSupabase(key: string, data: any): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    // Mapping des clés AsyncStorage vers les tables Supabase
    const tableMapping: { [key: string]: string } = {
      'userProfile': 'profiles',
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
      case 'daily_steps':
        await this.saveDailyStepsToSupabase(userId, data);
        break;
      case 'day_plans':
        await this.saveDayPlansToSupabase(userId, data);
        break;
      default:
        throw new Error(`Table non supportée: ${tableName}`);
    }
  }
  */

  /*
  private async loadFromSupabase(key: string): Promise<any> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    const tableMapping: { [key: string]: string } = {
      'userProfile': 'profiles',
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
      case 'daily_steps':
        return await this.loadDailyStepsFromSupabase(userId);
      case 'day_plans':
        return await this.loadDayPlansFromSupabase(userId);
      default:
        throw new Error(`Table non supportée: ${tableName}`);
    }
  }

  private async removeFromSupabase(key: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    const tableMapping: { [key: string]: string } = {
      'userProfile': 'profiles',
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
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Méthodes spécifiques pour chaque type de données
  private async saveProfileToSupabase(userId: string, profile: any): Promise<void> {
    const { error } = await supabase
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
    const { data, error } = await supabase
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

  // Méthodes pour les autres types de données (à implémenter progressivement)
  private async savePlansToSupabase(userId: string, plans: any[]): Promise<void> {
    if (!Array.isArray(plans) || plans.length === 0) {
      console.log('Aucun plan à sauvegarder');
      return;
    }

    // Supprimer les anciens plans de l'utilisateur
    const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
      .from('saved_plans')
      .insert(plansToInsert);

    if (insertError) throw insertError;
    console.log(`✅ ${plans.length} plans sauvegardés dans Supabase`);
  }

  private async loadPlansFromSupabase(userId: string): Promise<any> {
    const { data, error } = await supabase
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

  private async saveShoppingItemsToSupabase(userId: string, items: any[]): Promise<void> {
    // TODO: Implémenter la sauvegarde des items de course
    console.log('saveShoppingItemsToSupabase - À implémenter');
  }

  private async loadShoppingItemsFromSupabase(userId: string): Promise<any> {
    // TODO: Implémenter le chargement des items de course
    console.log('loadShoppingItemsFromSupabase - À implémenter');
    return null;
  }

  private async saveDailyIntakeToSupabase(userId: string, intake: any): Promise<void> {
    // TODO: Implémenter la sauvegarde de l'apport quotidien
    console.log('saveDailyIntakeToSupabase - À implémenter');
  }

  private async loadDailyIntakeFromSupabase(userId: string): Promise<any> {
    // TODO: Implémenter le chargement de l'apport quotidien
    console.log('loadDailyIntakeFromSupabase - À implémenter');
    return null;
  }

  private async saveDailyStepsToSupabase(userId: string, steps: any): Promise<void> {
    // TODO: Implémenter la sauvegarde des pas quotidiens
    console.log('saveDailyStepsToSupabase - À implémenter');
  }

  private async loadDailyStepsFromSupabase(userId: string): Promise<any> {
    // TODO: Implémenter le chargement des pas quotidiens
    console.log('loadDailyStepsFromSupabase - À implémenter');
    return null;
  }

  private async saveDayPlansToSupabase(userId: string, plans: any[]): Promise<void> {
    // TODO: Implémenter la sauvegarde des plans journaliers
    console.log('saveDayPlansToSupabase - À implémenter');
  }

  private async loadDayPlansFromSupabase(userId: string): Promise<any> {
    // TODO: Implémenter le chargement des plans journaliers
    console.log('loadDayPlansFromSupabase - À implémenter');
    return null;
  }
}

// Instance singleton
export const storageAdapter = new StorageAdapter();
