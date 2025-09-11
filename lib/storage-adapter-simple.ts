// lib/storage-adapter-simple.ts
// Version simplifiée utilisant uniquement AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, getSupabaseClient, isSupabaseConnected } from './supabase';

export type StorageMode = 'async' | 'supabase' | 'hybrid';

export type StorageError = {
  type: 'NETWORK' | 'AUTH' | 'PERMISSION' | 'DATA' | 'UNKNOWN';
  message: string;
  originalError?: any;
  key?: string;
};

class StorageAdapter {
  private mode: StorageMode = 'async';
  private initialized = false;
  private cache = new Map<string, any>(); // Cache pour éviter les appels répétés
  private lastSync = new Map<string, number>(); // Timestamp de la dernière sync

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

  // Vider le cache
  clearCache(): void {
    this.cache.clear();
    this.lastSync.clear();
    console.log('🧹 Cache vidé');
  }

  // Obtenir les statistiques du cache
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
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

  // Sauvegarder avec fallback automatique
  async save(key: string, data: any): Promise<void> {
    await this.initialize();

    // Mettre à jour le cache
    this.cache.set(key, data);
    this.lastSync.set(key, Date.now());

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

    // Vérifier le cache d'abord (évite les appels répétés)
    if (this.cache.has(key)) {
      const lastSyncTime = this.lastSync.get(key) || 0;
      const now = Date.now();
      // Cache valide pendant 5 minutes
      if (now - lastSyncTime < 5 * 60 * 1000) {
        console.log(`📦 Données chargées depuis le cache: ${key}`);
        return this.cache.get(key);
      }
    }

    try {
      if (this.mode === 'hybrid') {
        // Essayer Supabase d'abord
        try {
          const data = await this.loadFromSupabase(key);
          if (data) {
            console.log(`✅ Données chargées (Supabase): ${key}`);
            // Mettre à jour le cache
            this.cache.set(key, data);
            this.lastSync.set(key, Date.now());
            return data;
          }
        } catch (supabaseError) {
          console.warn('⚠️ Erreur Supabase, fallback vers AsyncStorage:', supabaseError);
        }

        // Fallback vers AsyncStorage
        const localData = await AsyncStorage.getItem(key);
        if (localData) {
          const data = JSON.parse(localData);
          console.log(`✅ Données chargées (Local): ${key}`);
          // Mettre à jour le cache
          this.cache.set(key, data);
          this.lastSync.set(key, Date.now());
          return data;
        }
      } else {
        // Mode AsyncStorage uniquement
        const localData = await AsyncStorage.getItem(key);
        if (localData) {
          const data = JSON.parse(localData);
          console.log(`✅ Données chargées (Local): ${key}`);
          // Mettre à jour le cache
          this.cache.set(key, data);
          this.lastSync.set(key, Date.now());
          return data;
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
    const plansToInsert = plans.map((plan: any) => ({
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
    return data.map((plan: any) => ({
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

  // Méthodes spécifiques pour les pas de marche
  private async saveDailyStepsToSupabase(userId: string, steps: any): Promise<void> {
    if (!steps || typeof steps.steps !== 'number') {
      console.log('Aucun pas de marche à sauvegarder');
      return;
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Supprimer l'ancien enregistrement du jour
    const { error: deleteError } = await client
      .from('daily_steps')
      .delete()
      .eq('user_id', userId)
      .eq('date', today);

    if (deleteError) {
      console.warn('Erreur suppression anciens pas:', deleteError);
    }

    // Insérer le nouvel enregistrement
    const { error: insertError } = await client
      .from('daily_steps')
      .insert({
        user_id: userId,
        date: today,
        steps: steps.steps,
        last_updated: steps.lastUpdated || new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
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
export const storageAdapter = new StorageAdapter();
