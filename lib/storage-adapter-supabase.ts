// lib/storage-adapter-supabase.ts
// Version optimisée pour Supabase uniquement (Phase 4)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, getSupabaseClient } from './supabase';

export type StorageError = {
  type: 'NETWORK' | 'AUTH' | 'PERMISSION' | 'DATA' | 'UNKNOWN';
  message: string;
  originalError?: any;
  key?: string;
};

class SupabaseStorageAdapter {
  private cache = new Map<string, any>(); // Cache pour optimiser les performances
  private lastSync = new Map<string, number>(); // Timestamp de la dernière sync
  private initialized = false;

  // Initialisation
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Vérifier la connexion Supabase
      const client = getSupabaseClient();
      const { data, error } = await client.from('profiles').select('id').limit(1);
      
      if (error) {
        throw new Error(`Supabase non accessible: ${error.message}`);
      }
      
      console.log('✅ Storage Supabase initialisé');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Erreur initialisation Supabase:', error);
      throw error;
    }
  }

  // Obtenir les statistiques du cache
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Vider le cache
  clearCache(): void {
    this.cache.clear();
    this.lastSync.clear();
    console.log('🧹 Cache Supabase vidé');
  }

  // Créer une erreur typée
  private createStorageError(
    type: StorageError['type'],
    message: string,
    originalError?: any,
    key?: string
  ): StorageError {
    return {
      type,
      message,
      originalError,
      key
    };
  }

  // Gérer les erreurs Supabase
  private handleSupabaseError(error: any, key: string): StorageError {
    if (error?.code === 'PGRST301' || error?.message?.includes('network')) {
      return this.createStorageError('NETWORK', 'Erreur de connexion réseau', error, key);
    }
    if (error?.code === 'PGRST301' || error?.message?.includes('auth')) {
      return this.createStorageError('AUTH', 'Erreur d\'authentification', error, key);
    }
    if (error?.code === 'PGRST301' || error?.message?.includes('permission')) {
      return this.createStorageError('PERMISSION', 'Erreur de permissions', error, key);
    }
    return this.createStorageError('UNKNOWN', 'Erreur Supabase inconnue', error, key);
  }

  // Sauvegarder des données
  async save(key: string, data: any): Promise<void> {
    await this.initialize();

    // Mettre à jour le cache
    this.cache.set(key, data);
    this.lastSync.set(key, Date.now());

    // Vérifier si l'utilisateur est connecté avant d'essayer Supabase
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, sauvegarde AsyncStorage pour ${key}`);
      try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`✅ Données sauvegardées (AsyncStorage): ${key}`);
        return;
      } catch (asyncError) {
        console.error(`❌ Erreur AsyncStorage pour ${key}:`, asyncError);
        throw asyncError;
      }
    }

    try {
      await this.saveToSupabase(key, data);
      console.log(`✅ Données sauvegardées (Supabase): ${key}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      throw this.handleSupabaseError(error, key);
    }
  }

  // Charger des données
  async load(key: string): Promise<any> {
    await this.initialize();

    // Vérifier le cache d'abord
    if (this.cache.has(key)) {
      const lastSyncTime = this.lastSync.get(key) || 0;
      const now = Date.now();
      // Cache valide pendant 10 minutes (plus long car pas de fallback)
      if (now - lastSyncTime < 10 * 60 * 1000) {
        console.log(`📦 Données chargées depuis le cache: ${key}`);
        return this.cache.get(key);
      }
    }

    // Vérifier si l'utilisateur est connecté avant d'essayer Supabase
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, chargement AsyncStorage pour ${key}`);
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          console.log(`✅ Données chargées (AsyncStorage): ${key}`);
          return data;
        }
        return null;
      } catch (asyncError) {
        console.error(`❌ Erreur AsyncStorage pour ${key}:`, asyncError);
        return null;
      }
    }

    try {
      const data = await this.loadFromSupabase(key);
      
      // Mettre à jour le cache
      this.cache.set(key, data);
      this.lastSync.set(key, Date.now());
      console.log(`✅ Données chargées (Supabase): ${key}`);
      return data;
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      throw this.handleSupabaseError(error, key);
    }
  }

  // Supprimer des données
  async remove(key: string): Promise<void> {
    await this.initialize();

    // Vérifier si l'utilisateur est connecté avant d'essayer Supabase
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, suppression AsyncStorage pour ${key}`);
      try {
        await AsyncStorage.removeItem(key);
        // Supprimer du cache
        this.cache.delete(key);
        this.lastSync.delete(key);
        console.log(`✅ Données supprimées (AsyncStorage): ${key}`);
        return;
      } catch (asyncError) {
        console.error(`❌ Erreur AsyncStorage pour ${key}:`, asyncError);
        throw asyncError;
      }
    }

    try {
      await this.removeFromSupabase(key);
      // Supprimer du cache
      this.cache.delete(key);
      this.lastSync.delete(key);
      console.log(`✅ Données supprimées (Supabase): ${key}`);
    } catch (error) {
      console.error(`❌ Erreur suppression ${key}:`, error);
      throw this.handleSupabaseError(error, key);
    }
  }

  // Sauvegarder vers Supabase
  private async saveToSupabase(key: string, data: any): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, skip Supabase pour ${key}`);
      return; // Retourner sans erreur pour permettre le fallback AsyncStorage
    }

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'profiles', // Les plans sont stockés dans le profil
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
      'the_sport_chat_messages_v1': 'chat_messages',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(`Table non mappée pour la clé: ${key}`);
    }

    // Logique de sauvegarde spécifique par table
    switch (tableName) {
      case 'profiles':
        if (key === 'the_sport_saved_plans_v1') {
          // Si c'est une sauvegarde de plans, les sauvegarder dans la table saved_plans
          await this.savePlansToSupabase(userId, data);
        } else {
          // Sinon, sauvegarder le profil normalement
          await this.saveProfileToSupabase(userId, data);
        }
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
      case 'chat_messages':
        await this.saveChatMessagesToSupabase(userId, data);
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

  // Charger depuis Supabase
  private async loadFromSupabase(key: string): Promise<any> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, skip Supabase pour ${key}`);
      return null; // Retourner null pour permettre le fallback AsyncStorage
    }

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'profiles', // Les plans sont stockés dans le profil
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
      'the_sport_chat_messages_v1': 'chat_messages',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(`Table non mappée pour la clé: ${key}`);
    }

    // Logique de chargement spécifique par table
    switch (tableName) {
      case 'profiles':
        if (key === 'the_sport_saved_plans_v1') {
          // Si c'est un chargement de plans, les charger depuis la table saved_plans
          return await this.loadPlansFromSupabase(userId);
        } else {
          // Sinon, charger le profil normalement
          return await this.loadProfileFromSupabase(userId);
        }
      case 'shopping_items':
        return await this.loadShoppingItemsFromSupabase(userId);
      case 'daily_intake':
        return await this.loadDailyIntakeFromSupabase(userId);
      case 'daily_steps':
        return await this.loadDailyStepsFromSupabase(userId);
      case 'day_plans':
        return await this.loadDayPlansFromSupabase(userId);
      case 'chat_messages':
        return await this.loadChatMessagesFromSupabase(userId);
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

  // Supprimer depuis Supabase
  private async removeFromSupabase(key: string): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log(`📱 Utilisateur non connecté, skip Supabase pour ${key}`);
      return; // Retourner sans erreur pour permettre le fallback AsyncStorage
    }

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'saved_plans', // Pour la suppression, on supprime de la table saved_plans
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
      'the_sport_chat_messages_v1': 'chat_messages',
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
    
    // Vérifier si le profil existe déjà
    const { data: existingProfile, error: selectError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    const profileData = {
      user_id: userId,
      goal: profile.goal,
      sessions: profile.sessions,
      diet: profile.diet,
      first_name: profile.first_name || profile.firstName,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender,
      profile_photo: profile.profile_photo || profile.profilePhoto,
      fitness_level: profile.fitness_level || profile.fitnessLevel,
      equipment: profile.equipment,
      intolerances: profile.intolerances,
      limitations: profile.limitations,
      preferred_time: profile.preferred_time || profile.preferredTime,
      chat_responses: profile.chat_responses || profile.chatResponses,
      chat_questions_asked: profile.chat_questions_asked || profile.chatQuestionsAsked,
      daily_meals: profile.daily_meals || profile.dailyMeals,
      daily_workout: profile.daily_workout || profile.dailyWorkout,
      daily_history: profile.daily_history || profile.dailyHistory,
      saved_plans: profile.saved_plans || profile.savedPlans,
      updated_at: new Date().toISOString(),
    };

    if (existingProfile) {
      // Mettre à jour le profil existant
      const { error: updateError } = await client
        .from('profiles')
        .update(profileData)
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    } else {
      // Créer un nouveau profil
      const { error: insertError } = await client
        .from('profiles')
        .insert(profileData);
      
      if (insertError) throw insertError;
    }

    // Sauvegarder aussi les plans dans la table saved_plans si ils existent
    if (profile.saved_plans) {
      console.log(`💾 Saving plans to Supabase:`, profile.saved_plans);
      await this.savePlansToSupabase(userId, profile.saved_plans);
      console.log(`✅ Plans saved to Supabase successfully`);
    }
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

    // Charger les plans depuis la table saved_plans
    console.log(`🔄 Loading plans from Supabase for user: ${userId}`);
    const { data: plansData, error: plansError } = await client
      .from('saved_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (plansError) {
      console.warn('❌ Erreur chargement plans:', plansError);
    } else {
      console.log(`📦 Plans loaded from Supabase:`, plansData);
    }

    // Organiser les plans par type
    const savedPlans: {
      workouts: Array<{ id: string; title: string; content: string; date: string }>;
      meals: Array<{ id: string; title: string; content: string; date: string }>;
    } = {
      workouts: [],
      meals: []
    };

    if (plansData) {
      plansData.forEach((plan: any) => {
        if (plan.type === 'workout') {
          savedPlans.workouts.push({
            id: plan.id,
            title: plan.title,
            content: plan.content,
            date: plan.created_at
          });
        } else if (plan.type === 'meal') {
          savedPlans.meals.push({
            id: plan.id,
            title: plan.title,
            content: plan.content,
            date: plan.created_at
          });
        }
      });
    }

    // Convertir le format Supabase vers le format AsyncStorage
    return {
      goal: data.goal,
      sessions: data.sessions,
      diet: data.diet,
      first_name: data.first_name,
      age: data.age,
      weight: data.weight,
      height: data.height,
      gender: data.gender,
      profile_photo: data.profile_photo,
      fitness_level: data.fitness_level,
      equipment: data.equipment,
      intolerances: data.intolerances,
      limitations: data.limitations,
      preferred_time: data.preferred_time,
      chat_responses: data.chat_responses,
      chat_questions_asked: data.chat_questions_asked,
      daily_meals: data.daily_meals,
      daily_workout: data.daily_workout,
      daily_history: data.daily_history,
      saved_plans: savedPlans,
    };
  }

  // Méthodes spécifiques pour les plans
  private async savePlansToSupabase(userId: string, plans: any): Promise<void> {
    try {
      console.log(`🔄 savePlansToSupabase called with:`, plans);
      
      if (!plans || (!plans.workouts && !plans.meals)) {
        console.log('Aucun plan à sauvegarder');
        return;
      }

      const client = getSupabaseClient();
      
      // Supprimer les anciens plans de l'utilisateur
      console.log(`🗑️ Deleting old plans for user: ${userId}`);
      const { error: deleteError } = await client
        .from('saved_plans')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('❌ Erreur suppression anciens plans:', deleteError);
        // Ne pas throw l'erreur, continuer avec l'insertion
      } else {
        console.log('✅ Anciens plans supprimés');
      }

      // Préparer tous les plans à insérer
      const plansToInsert: any[] = [];

      // Ajouter les séances de sport
      if (plans.workouts && Array.isArray(plans.workouts)) {
        console.log(`📝 Adding ${plans.workouts.length} workouts`);
        plans.workouts.forEach((workout: any) => {
          plansToInsert.push({
            user_id: userId,
            type: 'workout',
            title: workout.title,
            content: workout.content,
            created_at: workout.date || new Date().toISOString(),
          });
        });
      }

      // Ajouter les repas
      if (plans.meals && Array.isArray(plans.meals)) {
        console.log(`🍽️ Adding ${plans.meals.length} meals`);
        plans.meals.forEach((meal: any) => {
          plansToInsert.push({
            user_id: userId,
            type: 'meal',
            title: meal.title,
            content: meal.content,
            created_at: meal.date || new Date().toISOString(),
          });
        });
      }

      if (plansToInsert.length === 0) {
        console.log('Aucun plan valide à sauvegarder');
        return;
      }

      console.log(`💾 Inserting ${plansToInsert.length} plans to Supabase:`, plansToInsert);
      const { error: insertError } = await client
        .from('saved_plans')
        .insert(plansToInsert);

      if (insertError) {
        console.error('❌ Erreur insertion plans:', insertError);
        throw insertError;
      }
      
      console.log(`✅ ${plansToInsert.length} plans sauvegardés dans Supabase`);
    } catch (error) {
      console.error('❌ Erreur dans savePlansToSupabase:', error);
      throw error;
    }
  }

  private async loadPlansFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('saved_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { workouts: [], meals: [] };

    // Séparer les plans par type
    const workouts: any[] = [];
    const meals: any[] = [];

    data.forEach((plan: any) => {
      const planData = {
        id: plan.id,
        title: plan.title,
        content: plan.content,
        date: plan.created_at,
      };

      if (plan.type === 'workout') {
        workouts.push(planData);
      } else if (plan.type === 'meal') {
        meals.push(planData);
      }
    });

    return { workouts, meals };
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
    return data.map((item: any) => ({
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

    // Utiliser upsert pour éviter les conflits de contrainte unique
    const { error: upsertError } = await client
      .from('daily_intake')
      .upsert({
        user_id: userId,
        date: today,
        kcal: intake.kcal,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date'
      });

    if (upsertError) throw upsertError;
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

  // Méthodes spécifiques pour les pas de marche
  private async saveDailyStepsToSupabase(userId: string, steps: any): Promise<void> {
    if (!steps || typeof steps.steps !== 'number') {
      console.log('Aucun pas de marche à sauvegarder');
      return;
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Utiliser upsert pour éviter les conflits de contrainte unique
    const { error: upsertError } = await client
      .from('daily_steps')
      .upsert({
        user_id: userId,
        date: today,
        steps: steps.steps,
        last_updated: steps.lastUpdated || new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date'
      });

    if (upsertError) throw upsertError;
    console.log(`✅ Pas de marche sauvegardés dans Supabase: ${steps.steps} pas`);
  }

  private async loadDailyStepsFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    const { data, error } = await client
      .from('daily_steps')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucun enregistrement trouvé, retourner les pas par défaut
        return { steps: 0, lastUpdated: new Date().toISOString() };
      }
      throw error;
    }

    if (!data) return { steps: 0, lastUpdated: new Date().toISOString() };

    // Convertir le format Supabase vers le format AsyncStorage
    return {
      steps: data.steps,
      lastUpdated: data.last_updated,
  
    };
  }

  // Méthodes spécifiques pour les plans de jour
  private async saveDayPlansToSupabase(userId: string, plans: any[]): Promise<void> {
    if (!Array.isArray(plans) || plans.length === 0) {
      console.log('Aucun plan de jour à sauvegarder');
      return;
    }

    const client = getSupabaseClient();

    // Supprimer tous les anciens plans de l'utilisateur
    const { error: deleteError } = await client
      .from('day_plans')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Erreur suppression anciens plans de jour:', deleteError);
    }

    // Insérer tous les nouveaux plans
    const plansToInsert = plans.map((plan: any) => ({
      user_id: userId,
      plan_id: plan.id,
      title: plan.title,
      date: plan.date,
      workout_title: plan.workout.title,
      workout_content: plan.workout.content,
      breakfast_title: plan.meals.breakfast.title,
      breakfast_content: plan.meals.breakfast.content,
      lunch_title: plan.meals.lunch.title,
      lunch_content: plan.meals.lunch.content,
      dinner_title: plan.meals.dinner.title,
      dinner_content: plan.meals.dinner.content,
      shopping_list: JSON.stringify(plan.shoppingList),
      created_at: plan.createdAt,
    }));

    const { error: insertError } = await client
      .from('day_plans')
      .insert(plansToInsert);

    if (insertError) throw insertError;
    console.log(`✅ ${plans.length} plans de jour sauvegardés dans Supabase`);
  }

  private async loadDayPlansFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('day_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Convertir le format Supabase vers le format AsyncStorage
    return data.map((plan: any) => ({
      id: plan.plan_id,
      title: plan.title,
      date: plan.date,
      workout: {
        title: plan.workout_title,
        content: plan.workout_content,
      },
      meals: {
        breakfast: {
          title: plan.breakfast_title,
          content: plan.breakfast_content,
        },
        lunch: {
          title: plan.lunch_title,
          content: plan.lunch_content,
        },
        dinner: {
          title: plan.dinner_title,
          content: plan.dinner_content,
        },
      },
      shoppingList: JSON.parse(plan.shopping_list || '[]'),
      createdAt: plan.created_at,
    }));
  }

  // Méthodes spécifiques pour les messages de chat
  private async saveChatMessagesToSupabase(userId: string, messages: any[]): Promise<void> {
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('Aucun message de chat à sauvegarder');
      return;
    }

    const client = getSupabaseClient();

    // Supprimer tous les anciens messages de l'utilisateur
    const { error: deleteError } = await client
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Erreur suppression anciens messages:', deleteError);
    }

    // Insérer tous les nouveaux messages
    const messagesToInsert = messages.map(message => ({
      user_id: userId,
      message_id: message.id,
      text: message.text,
      sender: message.sender,
      original_text: message.originalText || null,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await client
      .from('chat_messages')
      .insert(messagesToInsert);

    if (insertError) throw insertError;
    console.log(`✅ ${messages.length} messages de chat sauvegardés dans Supabase`);
  }

  private async loadChatMessagesFromSupabase(userId: string): Promise<any> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Convertir le format Supabase vers le format AsyncStorage
    return data.map((message: any) => ({
      id: message.message_id,
      text: message.text,
      sender: message.sender,
      originalText: message.original_text,
    }));
  }

}

// Instance singleton
export const supabaseStorageAdapter = new SupabaseStorageAdapter();

