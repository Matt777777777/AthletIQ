// lib/sync-manager.ts
// Gestionnaire de synchronisation avancé pour Supabase

import { supabaseStorageAdapter } from './storage-adapter-supabase';
import { getCurrentUserId, getSupabaseClient } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';
export type ConflictResolution = 'local' | 'remote' | 'merge';

export interface SyncResult {
  status: SyncStatus;
  conflicts: Array<{
    key: string;
    localData: any;
    remoteData: any;
    lastModified: string;
  }>;
  syncedKeys: string[];
  errors: string[];
}

class SyncManager {
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  // Ajouter un listener pour les changements de statut
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  // Supprimer un listener
  removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  // Notifier les listeners
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status));
  }

  // Synchroniser toutes les données
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        status: 'syncing',
        conflicts: [],
        syncedKeys: [],
        errors: ['Synchronisation déjà en cours']
      };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      const result: SyncResult = {
        status: 'idle',
        conflicts: [],
        syncedKeys: [],
        errors: []
      };

      // Synchroniser chaque service
      const services = [
        'the_sport_profile_v1',
        'the_sport_saved_plans_v1',
        'the_sport_shopping_list_v1',
        'the_sport_daily_intake_v1',
        'the_sport_daily_steps_v1',
        'the_sport_day_plans_v1',
        'the_sport_chat_messages_v1'
      ];

      for (const key of services) {
        try {
          await this.syncService(key);
          result.syncedKeys.push(key);
        } catch (error) {
          result.errors.push(`Erreur sync ${key}: ${error.message}`);
        }
      }

      this.lastSyncTime = Date.now();
      result.status = result.errors.length > 0 ? 'error' : 'success';
      this.notifyListeners(result.status);

      return result;
    } catch (error) {
      this.notifyListeners('error');
      return {
        status: 'error',
        conflicts: [],
        syncedKeys: [],
        errors: [error.message]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Synchroniser un service spécifique
  private async syncService(key: string): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    // Charger les données locales (depuis le cache)
    const localData = await supabaseStorageAdapter.load(key);
    
    // Charger les données distantes
    const remoteData = await this.loadFromSupabase(key);
    
    // Comparer les timestamps pour détecter les conflits
    const localTimestamp = this.getLastModified(localData);
    const remoteTimestamp = this.getLastModified(remoteData);
    
    if (localTimestamp && remoteTimestamp) {
      const localTime = new Date(localTimestamp).getTime();
      const remoteTime = new Date(remoteTimestamp).getTime();
      
      // Si les données distantes sont plus récentes, les utiliser
      if (remoteTime > localTime) {
        await supabaseStorageAdapter.save(key, remoteData);
        console.log(`✅ ${key} synchronisé depuis le serveur`);
      } else if (localTime > remoteTime) {
        // Si les données locales sont plus récentes, les envoyer
        await this.saveToSupabase(key, localData);
        console.log(`✅ ${key} synchronisé vers le serveur`);
      }
    } else if (remoteData && !localData) {
      // Pas de données locales, utiliser les données distantes
      await supabaseStorageAdapter.save(key, remoteData);
      console.log(`✅ ${key} chargé depuis le serveur`);
    } else if (localData && !remoteData) {
      // Pas de données distantes, envoyer les données locales
      await this.saveToSupabase(key, localData);
      console.log(`✅ ${key} envoyé vers le serveur`);
    }
  }

  // Charger depuis Supabase (bypass du cache)
  private async loadFromSupabase(key: string): Promise<any> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté');

    // Utiliser la même logique que le storage adapter mais sans cache
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
    if (!tableName) return null;

    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Pas de données
      throw error;
    }

    return data;
  }

  // Sauvegarder vers Supabase (bypass du cache)
  private async saveToSupabase(key: string, data: any): Promise<void> {
    const client = getSupabaseClient();
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
    if (!tableName) throw new Error(`Table non mappée pour la clé: ${key}`);

    // Utiliser upsert pour éviter les conflits
    const { error } = await client
      .from(tableName)
      .upsert({
        user_id: userId,
        data: data,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  // Obtenir le timestamp de dernière modification
  private getLastModified(data: any): string | null {
    if (!data) return null;
    
    // Chercher différents champs de timestamp
    if (data.updated_at) return data.updated_at;
    if (data.lastUpdated) return data.lastUpdated;
    if (data.createdAt) return data.createdAt;
    if (data.date) return data.date;
    
    return null;
  }

  // Résoudre un conflit
  async resolveConflict(
    key: string, 
    resolution: ConflictResolution, 
    mergedData?: any
  ): Promise<void> {
    try {
      let finalData: any;
      
      switch (resolution) {
        case 'local':
          finalData = await supabaseStorageAdapter.load(key);
          break;
        case 'remote':
          finalData = await this.loadFromSupabase(key);
          break;
        case 'merge':
          finalData = mergedData;
          break;
        default:
          throw new Error('Résolution de conflit invalide');
      }
      
      // Sauvegarder la résolution
      await supabaseStorageAdapter.save(key, finalData);
      await this.saveToSupabase(key, finalData);
      
      console.log(`✅ Conflit résolu pour ${key} avec résolution: ${resolution}`);
    } catch (error) {
      console.error(`❌ Erreur résolution conflit ${key}:`, error);
      throw error;
    }
  }

  // Obtenir le statut de synchronisation
  getSyncStatus(): { isSyncing: boolean; lastSyncTime: number | null } {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }

  // Forcer la synchronisation (ignore le cache)
  async forceSync(): Promise<SyncResult> {
    // Vider le cache pour forcer le rechargement
    supabaseStorageAdapter.clearCache();
    return this.syncAll();
  }
}

// Instance singleton
export const syncManager = new SyncManager();
