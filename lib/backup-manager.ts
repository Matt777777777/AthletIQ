// lib/backup-manager.ts
// Système de sauvegarde automatique pour TheSport

import { analytics } from './analytics';
import { notificationManager } from './notifications';
import { getCurrentUserId, getSupabaseClient } from './supabase';

export type BackupData = {
  userId: string;
  timestamp: string;
  version: string;
  data: {
    profile: any;
    plans: any[];
    shoppingList: any[];
    dailyIntake: any;
    dailySteps: any;
    dayPlans: any[];
    chatMessages: any[];
  };
  metadata: {
    totalSize: number;
    itemCount: number;
    compressionRatio: number;
  };
};

export type BackupStatus = {
  lastBackup: string | null;
  nextBackup: string | null;
  totalBackups: number;
  totalSize: number;
  isBackingUp: boolean;
  lastError: string | null;
};

class BackupManager {
  private isBackingUp: boolean = false;
  private backupInterval: NodeJS.Timeout | null = null;
  private backupFrequency: number = 24 * 60 * 60 * 1000; // 24 heures
  private maxBackups: number = 30; // Garder 30 sauvegardes maximum
  private compressionEnabled: boolean = true;

  constructor() {
    this.startAutomaticBackup();
  }

  // Démarrer la sauvegarde automatique
  private startAutomaticBackup(): void {
    // Vérifier toutes les 6 heures si une sauvegarde est nécessaire
    this.backupInterval = setInterval(async () => {
      await this.checkAndPerformBackup();
    }, 6 * 60 * 60 * 1000);

    console.log('💾 Sauvegarde automatique démarrée');
  }

  // Vérifier et effectuer une sauvegarde si nécessaire
  private async checkAndPerformBackup(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const lastBackup = await this.getLastBackupTime();
      const now = Date.now();
      
      if (!lastBackup || (now - lastBackup) >= this.backupFrequency) {
        await this.performBackup();
      }
    } catch (error) {
      console.error('Erreur vérification sauvegarde:', error);
    }
  }

  // Effectuer une sauvegarde complète
  async performBackup(): Promise<BackupData | null> {
    if (this.isBackingUp) {
      console.log('Sauvegarde déjà en cours...');
      return null;
    }

    this.isBackingUp = true;
    const startTime = Date.now();

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      console.log('💾 Début de la sauvegarde...');

      // Collecter toutes les données
      const backupData = await this.collectAllData(userId);
      
      // Compresser les données si activé
      if (this.compressionEnabled) {
        backupData.metadata.compressionRatio = await this.compressData(backupData);
      }

      // Sauvegarder dans Supabase
      await this.saveBackupToSupabase(backupData);

      // Nettoyer les anciennes sauvegardes
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
      console.log(`💾 Sauvegarde terminée en ${duration}ms`);

      // Envoyer une notification
      await notificationManager.sendSyncNotification(
        `Sauvegarde automatique réussie (${backupData.metadata.itemCount} éléments)`,
        true
      );

      await analytics.trackEvent('feature_usage', 'backup_completed', {
        duration,
        itemCount: backupData.metadata.itemCount,
        totalSize: backupData.metadata.totalSize,
      });

      return backupData;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      
      await notificationManager.sendSyncNotification(
        `Erreur de sauvegarde: ${error.message}`,
        false
      );

      await analytics.trackError('backup_error', { error: error.message });
      return null;
    } finally {
      this.isBackingUp = false;
    }
  }

  // Collecter toutes les données utilisateur
  private async collectAllData(userId: string): Promise<BackupData> {
    const client = getSupabaseClient();
    const timestamp = new Date().toISOString();
    let totalSize = 0;
    let itemCount = 0;

    // Profil utilisateur
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Plans sauvegardés
    const { data: plans } = await client
      .from('saved_plans')
      .select('*')
      .eq('user_id', userId);

    // Liste de courses
    const { data: shoppingList } = await client
      .from('shopping_items')
      .select('*')
      .eq('user_id', userId);

    // Apport nutritionnel
    const { data: dailyIntake } = await client
      .from('daily_intake')
      .select('*')
      .eq('user_id', userId);

    // Pas de marche
    const { data: dailySteps } = await client
      .from('daily_steps')
      .select('*')
      .eq('user_id', userId);

    // Plans de jour
    const { data: dayPlans } = await client
      .from('day_plans')
      .select('*')
      .eq('user_id', userId);

    // Messages de chat
    const { data: chatMessages } = await client
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId);

    const data = {
      profile: profile || null,
      plans: plans || [],
      shoppingList: shoppingList || [],
      dailyIntake: dailyIntake || [],
      dailySteps: dailySteps || [],
      dayPlans: dayPlans || [],
      chatMessages: chatMessages || [],
    };

    // Calculer la taille et le nombre d'éléments
    const dataString = JSON.stringify(data);
    totalSize = new Blob([dataString]).size;
    itemCount = Object.values(data).reduce((count, items) => {
      return count + (Array.isArray(items) ? items.length : (items ? 1 : 0));
    }, 0);

    return {
      userId,
      timestamp,
      version: '1.13.0',
      data,
      metadata: {
        totalSize,
        itemCount,
        compressionRatio: 1.0, // Sera mis à jour si compression activée
      },
    };
  }

  // Compresser les données (simulation)
  private async compressData(backupData: BackupData): Promise<number> {
    // Simulation de compression - dans un vrai projet, utiliser une librairie de compression
    const originalSize = backupData.metadata.totalSize;
    const compressedSize = Math.floor(originalSize * 0.7); // 30% de réduction simulée
    
    backupData.metadata.totalSize = compressedSize;
    return originalSize / compressedSize;
  }

  // Sauvegarder dans Supabase
  private async saveBackupToSupabase(backupData: BackupData): Promise<void> {
    const client = getSupabaseClient();
    
    await client
      .from('user_backups')
      .insert({
        user_id: backupData.userId,
        backup_data: backupData.data,
        metadata: backupData.metadata,
        version: backupData.version,
        created_at: backupData.timestamp,
      });

    console.log('💾 Sauvegarde enregistrée dans Supabase');
  }

  // Nettoyer les anciennes sauvegardes
  private async cleanupOldBackups(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const client = getSupabaseClient();
      
      // Récupérer toutes les sauvegardes de l'utilisateur
      const { data: backups } = await client
        .from('user_backups')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!backups || backups.length <= this.maxBackups) return;

      // Supprimer les sauvegardes les plus anciennes
      const backupsToDelete = backups.slice(this.maxBackups);
      const idsToDelete = backupsToDelete.map(backup => backup.id);

      await client
        .from('user_backups')
        .delete()
        .in('id', idsToDelete);

      console.log(`🧹 ${idsToDelete.length} anciennes sauvegardes supprimées`);
    } catch (error) {
      console.error('Erreur nettoyage sauvegardes:', error);
    }
  }

  // Obtenir le statut de sauvegarde
  async getBackupStatus(): Promise<BackupStatus> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return {
          lastBackup: null,
          nextBackup: null,
          totalBackups: 0,
          totalSize: 0,
          isBackingUp: this.isBackingUp,
          lastError: null,
        };
      }

      const client = getSupabaseClient();
      
      // Dernière sauvegarde
      const { data: lastBackup } = await client
        .from('user_backups')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Statistiques générales
      const { data: allBackups } = await client
        .from('user_backups')
        .select('metadata')
        .eq('user_id', userId);

      const totalBackups = allBackups?.length || 0;
      const totalSize = allBackups?.reduce((sum, backup) => 
        sum + (backup.metadata?.totalSize || 0), 0) || 0;

      const lastBackupTime = lastBackup?.created_at || null;
      const nextBackupTime = lastBackupTime ? 
        new Date(new Date(lastBackupTime).getTime() + this.backupFrequency).toISOString() : 
        null;

      return {
        lastBackup: lastBackupTime,
        nextBackup: nextBackupTime,
        totalBackups,
        totalSize,
        isBackingUp: this.isBackingUp,
        lastError: null,
      };
    } catch (error) {
      console.error('Erreur récupération statut sauvegarde:', error);
      return {
        lastBackup: null,
        nextBackup: null,
        totalBackups: 0,
        totalSize: 0,
        isBackingUp: this.isBackingUp,
        lastError: error.message,
      };
    }
  }

  // Restaurer depuis une sauvegarde
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      console.log(`🔄 Restauration depuis la sauvegarde ${backupId}...`);

      const client = getSupabaseClient();
      
      // Récupérer la sauvegarde
      const { data: backup, error } = await client
        .from('user_backups')
        .select('backup_data')
        .eq('id', backupId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!backup) throw new Error('Sauvegarde non trouvée');

      // Restaurer les données
      await this.restoreData(backup.backup_data);

      console.log('✅ Restauration terminée');
      
      await notificationManager.sendSyncNotification(
        'Restauration depuis sauvegarde réussie',
        true
      );

      await analytics.trackEvent('feature_usage', 'backup_restored', { backupId });
      return true;
    } catch (error) {
      console.error('Erreur restauration:', error);
      
      await notificationManager.sendSyncNotification(
        `Erreur de restauration: ${error.message}`,
        false
      );

      await analytics.trackError('backup_restore_error', { error: error.message, backupId });
      return false;
    }
  }

  // Restaurer les données
  private async restoreData(data: any): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    if (!userId) return;

    // Restaurer chaque type de données
    if (data.profile) {
      await client
        .from('profiles')
        .upsert({ ...data.profile, user_id: userId });
    }

    if (data.plans && data.plans.length > 0) {
      await client
        .from('saved_plans')
        .delete()
        .eq('user_id', userId);
      
      const plansToInsert = data.plans.map((plan: any) => ({
        ...plan,
        user_id: userId,
      }));
      
      await client
        .from('saved_plans')
        .insert(plansToInsert);
    }

    // Répéter pour les autres types de données...
    // (simplifié pour l'exemple)
  }

  // Obtenir la liste des sauvegardes
  async getBackupList(): Promise<Array<{ id: string; timestamp: string; size: number; itemCount: number }>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return [];

      const client = getSupabaseClient();
      const { data: backups } = await client
        .from('user_backups')
        .select('id, created_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return backups?.map(backup => ({
        id: backup.id,
        timestamp: backup.created_at,
        size: backup.metadata?.totalSize || 0,
        itemCount: backup.metadata?.itemCount || 0,
      })) || [];
    } catch (error) {
      console.error('Erreur récupération liste sauvegardes:', error);
      return [];
    }
  }

  // Obtenir le temps de la dernière sauvegarde
  private async getLastBackupTime(): Promise<number | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return null;

      const client = getSupabaseClient();
      const { data: lastBackup } = await client
        .from('user_backups')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return lastBackup ? new Date(lastBackup.created_at).getTime() : null;
    } catch (error) {
      console.error('Erreur récupération dernière sauvegarde:', error);
      return null;
    }
  }

  // Forcer une sauvegarde immédiate
  async forceBackup(): Promise<BackupData | null> {
    console.log('💾 Sauvegarde forcée...');
    return this.performBackup();
  }

  // Arrêter la sauvegarde automatique
  stopAutomaticBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('💾 Sauvegarde automatique arrêtée');
    }
  }
}

// Instance singleton
export const backupManager = new BackupManager();


