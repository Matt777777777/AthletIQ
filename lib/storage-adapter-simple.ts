// lib/storage-adapter-simple.ts
// Version simplifiée utilisant uniquement AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StorageMode = 'async' | 'supabase' | 'hybrid';

class StorageAdapter {
  private mode: StorageMode = 'async';
  private initialized = false;

  // Initialisation du mode de stockage
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Mode AsyncStorage uniquement (Supabase temporairement désactivé)
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
}

// Instance singleton
export const storageAdapter = new StorageAdapter();
