// lib/offline-manager.ts
// Gestionnaire de mode hors ligne intelligent pour TheSport

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseStorageAdapter } from './storage-adapter-supabase';
import { analytics } from './analytics';

export type OfflineData = {
  key: string;
  data: any;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
};

export type OfflineStatus = {
  isOffline: boolean;
  pendingSyncs: number;
  lastSyncTime: string | null;
  cacheSize: number;
  syncErrors: string[];
};

class OfflineManager {
  private isOffline: boolean = false;
  private offlineData: Map<string, OfflineData> = new Map();
  private syncQueue: string[] = [];
  private maxRetries: number = 3;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeOfflineMode();
    this.startSyncMonitoring();
  }

  // Initialiser le mode hors ligne
  private async initializeOfflineMode(): Promise<void> {
    try {
      // Charger les données hors ligne depuis AsyncStorage
      const offlineDataString = await AsyncStorage.getItem('offline_data');
      if (offlineDataString) {
        const data = JSON.parse(offlineDataString);
        this.offlineData = new Map(Object.entries(data));
        console.log(`📱 ${this.offlineData.size} éléments chargés depuis le cache hors ligne`);
      }

      // Vérifier la connectivité
      await this.checkConnectivity();
    } catch (error) {
      console.error('Erreur initialisation mode hors ligne:', error);
    }
  }

  // Vérifier la connectivité
  private async checkConnectivity(): Promise<void> {
    try {
      // Essayer une requête simple vers Supabase
      await supabaseStorageAdapter.initialize();
      this.setOnlineStatus(false);
    } catch (error) {
      this.setOnlineStatus(true);
    }
  }

  // Définir le statut de connexion
  setOnlineStatus(isOffline: boolean): void {
    const wasOffline = this.isOffline;
    this.isOffline = isOffline;

    if (wasOffline && !isOffline) {
      // Retour en ligne - démarrer la synchronisation
      this.startSyncProcess();
    }

    analytics.setOnlineStatus(!isOffline);
    console.log(`📱 Mode ${isOffline ? 'hors ligne' : 'en ligne'} activé`);
  }

  // Sauvegarder des données en mode hors ligne
  async saveOffline(key: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    try {
      const offlineData: OfflineData = {
        key,
        data,
        timestamp: new Date().toISOString(),
        priority,
        syncStatus: 'pending',
        retryCount: 0,
      };

      this.offlineData.set(key, offlineData);
      await this.persistOfflineData();

      // Ajouter à la queue de synchronisation
      if (!this.syncQueue.includes(key)) {
        this.syncQueue.push(key);
      }

      // Tenter la synchronisation immédiate si en ligne
      if (!this.isOffline) {
        await this.syncSingleItem(key);
      }

      console.log(`📱 Données sauvegardées hors ligne: ${key}`);
    } catch (error) {
      console.error('Erreur sauvegarde hors ligne:', error);
      await analytics.trackError('offline_save_error', { key, error: error.message });
    }
  }

  // Charger des données depuis le cache hors ligne
  async loadOffline(key: string): Promise<any> {
    try {
      const offlineData = this.offlineData.get(key);
      if (offlineData) {
        console.log(`📱 Données chargées depuis le cache hors ligne: ${key}`);
        return offlineData.data;
      }
      return null;
    } catch (error) {
      console.error('Erreur chargement hors ligne:', error);
      return null;
    }
  }

  // Synchroniser un élément spécifique
  private async syncSingleItem(key: string): Promise<boolean> {
    try {
      const offlineData = this.offlineData.get(key);
      if (!offlineData) return true;

      // Tenter la sauvegarde vers Supabase
      await supabaseStorageAdapter.save(key, offlineData.data);
      
      // Marquer comme synchronisé
      offlineData.syncStatus = 'synced';
      this.offlineData.set(key, offlineData);
      await this.persistOfflineData();

      // Retirer de la queue
      this.syncQueue = this.syncQueue.filter(k => k !== key);

      console.log(`✅ Synchronisé: ${key}`);
      await analytics.trackSync('single_item', { key, success: true });
      return true;
    } catch (error) {
      console.error(`❌ Erreur sync ${key}:`, error);
      
      // Incrémenter le compteur de tentatives
      const offlineData = this.offlineData.get(key);
      if (offlineData) {
        offlineData.retryCount++;
        offlineData.syncStatus = offlineData.retryCount >= this.maxRetries ? 'failed' : 'pending';
        this.offlineData.set(key, offlineData);
        await this.persistOfflineData();
      }

      await analytics.trackSync('single_item', { key, success: false, error: error.message });
      return false;
    }
  }

  // Démarrer le processus de synchronisation
  private async startSyncProcess(): Promise<void> {
    console.log('🔄 Démarrage de la synchronisation...');
    
    // Trier par priorité (high, medium, low)
    const sortedKeys = Array.from(this.offlineData.keys()).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[this.offlineData.get(a)?.priority || 'medium'];
      const bPriority = priorityOrder[this.offlineData.get(b)?.priority || 'medium'];
      return bPriority - aPriority;
    });

    let syncedCount = 0;
    let failedCount = 0;

    for (const key of sortedKeys) {
      const success = await this.syncSingleItem(key);
      if (success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    console.log(`🔄 Synchronisation terminée: ${syncedCount} succès, ${failedCount} échecs`);
    await analytics.trackSync('batch_sync', { 
      syncedCount, 
      failedCount, 
      totalItems: this.offlineData.size 
    });
  }

  // Démarrer le monitoring de synchronisation
  private startSyncMonitoring(): void {
    // Synchroniser toutes les 30 secondes si en ligne
    this.syncInterval = setInterval(async () => {
      if (!this.isOffline && this.syncQueue.length > 0) {
        await this.startSyncProcess();
      }
    }, 30000);
  }

  // Arrêter le monitoring
  stopSyncMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Persister les données hors ligne
  private async persistOfflineData(): Promise<void> {
    try {
      const dataObject = Object.fromEntries(this.offlineData);
      await AsyncStorage.setItem('offline_data', JSON.stringify(dataObject));
    } catch (error) {
      console.error('Erreur persistance données hors ligne:', error);
    }
  }

  // Nettoyer les données synchronisées
  async cleanupSyncedData(): Promise<void> {
    try {
      const syncedKeys = Array.from(this.offlineData.keys()).filter(
        key => this.offlineData.get(key)?.syncStatus === 'synced'
      );

      for (const key of syncedKeys) {
        this.offlineData.delete(key);
      }

      await this.persistOfflineData();
      console.log(`🧹 ${syncedKeys.length} éléments synchronisés nettoyés`);
    } catch (error) {
      console.error('Erreur nettoyage données synchronisées:', error);
    }
  }

  // Obtenir le statut hors ligne
  getOfflineStatus(): OfflineStatus {
    const pendingSyncs = Array.from(this.offlineData.values()).filter(
      data => data.syncStatus === 'pending'
    ).length;

    const syncErrors = Array.from(this.offlineData.values())
      .filter(data => data.syncStatus === 'failed')
      .map(data => `${data.key}: ${data.retryCount} tentatives`);

    return {
      isOffline: this.isOffline,
      pendingSyncs,
      lastSyncTime: this.getLastSyncTime(),
      cacheSize: this.offlineData.size,
      syncErrors,
    };
  }

  // Obtenir le temps de dernière synchronisation
  private getLastSyncTime(): string | null {
    const syncedItems = Array.from(this.offlineData.values()).filter(
      data => data.syncStatus === 'synced'
    );

    if (syncedItems.length === 0) return null;

    const latestSync = syncedItems.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });

    return latestSync.timestamp;
  }

  // Forcer la synchronisation
  async forceSync(): Promise<void> {
    console.log('🔄 Synchronisation forcée...');
    await this.startSyncProcess();
  }

  // Obtenir les données en attente de synchronisation
  getPendingSyncData(): OfflineData[] {
    return Array.from(this.offlineData.values()).filter(
      data => data.syncStatus === 'pending'
    );
  }

  // Obtenir les données échouées
  getFailedSyncData(): OfflineData[] {
    return Array.from(this.offlineData.values()).filter(
      data => data.syncStatus === 'failed'
    );
  }

  // Réessayer la synchronisation des échecs
  async retryFailedSyncs(): Promise<void> {
    const failedItems = this.getFailedSyncData();
    console.log(`🔄 Nouvelle tentative pour ${failedItems.length} éléments échoués`);

    for (const item of failedItems) {
      // Réinitialiser le statut
      item.syncStatus = 'pending';
      item.retryCount = 0;
      this.offlineData.set(item.key, item);
    }

    await this.persistOfflineData();
    await this.startSyncProcess();
  }
}

// Instance singleton
export const offlineManager = new OfflineManager();
