// extract-methods.js
// Script pour extraire les méthodes spécifiques du storage-adapter-simple.ts

const fs = require('fs');

// Lire le fichier source
const sourceContent = fs.readFileSync('./lib/storage-adapter-simple.ts', 'utf8');

// Extraire les méthodes spécifiques (entre les commentaires "Méthodes spécifiques")
const methodsStart = sourceContent.indexOf('// Méthodes spécifiques pour le profil');
const methodsEnd = sourceContent.lastIndexOf('}');

if (methodsStart !== -1 && methodsEnd !== -1) {
  const methods = sourceContent.substring(methodsStart, methodsEnd);
  
  // Créer le contenu pour le nouveau fichier
  const newContent = `// lib/storage-adapter-supabase.ts
// Version optimisée pour Supabase uniquement (Phase 4)

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
        throw new Error(\`Supabase non accessible: \${error.message}\`);
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
      return this.createStorageError('AUTH', 'Erreur d\\'authentification', error, key);
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

    try {
      await this.saveToSupabase(key, data);
      console.log(\`✅ Données sauvegardées (Supabase): \${key}\`);
    } catch (error) {
      console.error(\`❌ Erreur sauvegarde \${key}:\`, error);
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
        console.log(\`📦 Données chargées depuis le cache: \${key}\`);
        return this.cache.get(key);
      }
    }

    try {
      const data = await this.loadFromSupabase(key);
      // Mettre à jour le cache
      this.cache.set(key, data);
      this.lastSync.set(key, Date.now());
      console.log(\`✅ Données chargées (Supabase): \${key}\`);
      return data;
    } catch (error) {
      console.error(\`❌ Erreur chargement \${key}:\`, error);
      throw this.handleSupabaseError(error, key);
    }
  }

  // Supprimer des données
  async remove(key: string): Promise<void> {
    await this.initialize();

    try {
      await this.removeFromSupabase(key);
      // Supprimer du cache
      this.cache.delete(key);
      this.lastSync.delete(key);
      console.log(\`✅ Données supprimées (Supabase): \${key}\`);
    } catch (error) {
      console.error(\`❌ Erreur suppression \${key}:\`, error);
      throw this.handleSupabaseError(error, key);
    }
  }

  // Sauvegarder vers Supabase
  private async saveToSupabase(key: string, data: any): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    const tableMapping: { [key: string]: string } = {
      'the_sport_profile_v1': 'profiles',
      'the_sport_saved_plans_v1': 'saved_plans',
      'the_sport_shopping_list_v1': 'shopping_items',
      'the_sport_daily_intake_v1': 'daily_intake',
      'the_sport_daily_steps_v1': 'daily_steps',
      'the_sport_day_plans_v1': 'day_plans',
      'the_sport_chat_messages_v1': 'chat_messages',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(\`Table non mappée pour la clé: \${key}\`);
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

  // Charger depuis Supabase
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
      'the_sport_chat_messages_v1': 'chat_messages',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(\`Table non mappée pour la clé: \${key}\`);
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

  // Supprimer depuis Supabase
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
      'the_sport_chat_messages_v1': 'chat_messages',
    };

    const tableName = tableMapping[key];
    if (!tableName) {
      throw new Error(\`Table non mappée pour la clé: \${key}\`);
    }

    // Supprimer les données de l'utilisateur
    const client = getSupabaseClient();
    const { error } = await client
      .from(tableName)
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

${methods}
}

// Instance singleton
export const supabaseStorageAdapter = new SupabaseStorageAdapter();
`;

  // Écrire le nouveau fichier
  fs.writeFileSync('./lib/storage-adapter-supabase.ts', newContent);
  console.log('✅ Fichier storage-adapter-supabase.ts créé avec succès');
} else {
  console.error('❌ Impossible de trouver les méthodes spécifiques');
}

