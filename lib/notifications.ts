// lib/notifications.ts
// Système de notifications push pour TheSport

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { analytics } from './analytics';
import { getCurrentUserId, getSupabaseClient } from './supabase';

export type NotificationData = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledTime?: string;
  type: 'reminder' | 'achievement' | 'sync' | 'general' | 'workout' | 'meal';
  priority: 'low' | 'normal' | 'high';
};

export type NotificationSettings = {
  enabled: boolean;
  workoutReminders: boolean;
  mealReminders: boolean;
  achievementNotifications: boolean;
  syncNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
};

class NotificationManager {
  private expoPushToken: string | null = null;
  private notificationSettings: NotificationSettings | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeNotifications();
  }

  // Initialiser les notifications
  private async initializeNotifications(): Promise<void> {
    try {
      // Configurer le comportement des notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permissions de notification refusées');
        return;
      }

      // Obtenir le token push
      if (Device.isDevice) {
        this.expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('📱 Token push obtenu:', this.expoPushToken);
        
        // Enregistrer le token dans Supabase
        await this.registerPushToken();
      } else {
        console.warn('Les notifications push ne fonctionnent que sur un appareil physique');
      }

      // Charger les paramètres de notification
      await this.loadNotificationSettings();

      this.isInitialized = true;
      await analytics.trackEvent('feature_usage', 'notifications_initialized');
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      await analytics.trackError('notification_init_error', { error: error.message });
    }
  }

  // Enregistrer le token push dans Supabase
  private async registerPushToken(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId || !this.expoPushToken) return;

      const client = getSupabaseClient();
      await client
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: this.expoPushToken,
          platform: Platform.OS,
          device_id: Device.osInternalBuildId || 'unknown',
          updated_at: new Date().toISOString(),
        });

      console.log('📱 Token push enregistré dans Supabase');
    } catch (error) {
      console.error('Erreur enregistrement token push:', error);
    }
  }

  // Charger les paramètres de notification
  private async loadNotificationSettings(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        this.notificationSettings = {
          enabled: data.enabled,
          workoutReminders: data.workout_reminders,
          mealReminders: data.meal_reminders,
          achievementNotifications: data.achievement_notifications,
          syncNotifications: data.sync_notifications,
          quietHours: {
            enabled: data.quiet_hours_enabled,
            start: data.quiet_hours_start || '22:00',
            end: data.quiet_hours_end || '08:00',
          },
        };
      } else {
        // Paramètres par défaut
        this.notificationSettings = {
          enabled: true,
          workoutReminders: true,
          mealReminders: true,
          achievementNotifications: true,
          syncNotifications: false,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        };
      }
    } catch (error) {
      console.error('Erreur chargement paramètres notifications:', error);
    }
  }

  // Envoyer une notification locale
  async sendLocalNotification(notification: NotificationData): Promise<void> {
    try {
      if (!this.isInitialized || !this.notificationSettings?.enabled) {
        console.log('Notifications désactivées');
        return;
      }

      // Vérifier les heures silencieuses
      if (this.isInQuietHours()) {
        console.log('Notification supprimée (heures silencieuses)');
        return;
      }

      // Vérifier le type de notification
      if (!this.isNotificationTypeEnabled(notification.type)) {
        console.log(`Notifications ${notification.type} désactivées`);
        return;
      }

      const notificationContent = {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        priority: notification.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
      };

      if (notification.scheduledTime) {
        // Notification programmée
        const trigger = new Date(notification.scheduledTime);
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger,
        });
        console.log(`📅 Notification programmée: ${notification.title}`);
      } else {
        // Notification immédiate
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: null,
        });
        console.log(`📱 Notification envoyée: ${notification.title}`);
      }

      await analytics.trackEvent('feature_usage', 'notification_sent', {
        type: notification.type,
        priority: notification.priority,
      });
    } catch (error) {
      console.error('Erreur envoi notification:', error);
      await analytics.trackError('notification_send_error', { error: error.message });
    }
  }

  // Envoyer une notification de rappel d'entraînement
  async sendWorkoutReminder(workoutTitle: string, scheduledTime: string): Promise<void> {
    await this.sendLocalNotification({
      id: `workout_${Date.now()}`,
      title: '💪 Rappel d\'entraînement',
      body: `Il est temps pour votre séance: ${workoutTitle}`,
      type: 'workout',
      priority: 'high',
      scheduledTime,
      data: { workoutTitle, type: 'workout_reminder' },
    });
  }

  // Envoyer une notification de rappel de repas
  async sendMealReminder(mealTitle: string, scheduledTime: string): Promise<void> {
    await this.sendLocalNotification({
      id: `meal_${Date.now()}`,
      title: '🍽️ Rappel de repas',
      body: `Il est temps pour: ${mealTitle}`,
      type: 'meal',
      priority: 'normal',
      scheduledTime,
      data: { mealTitle, type: 'meal_reminder' },
    });
  }

  // Envoyer une notification d'achievement
  async sendAchievementNotification(achievement: string): Promise<void> {
    await this.sendLocalNotification({
      id: `achievement_${Date.now()}`,
      title: '🏆 Nouvel achievement !',
      body: achievement,
      type: 'achievement',
      priority: 'high',
      data: { type: 'achievement' },
    });
  }

  // Envoyer une notification de synchronisation
  async sendSyncNotification(message: string, isSuccess: boolean = true): Promise<void> {
    await this.sendLocalNotification({
      id: `sync_${Date.now()}`,
      title: isSuccess ? '✅ Synchronisation réussie' : '❌ Erreur de synchronisation',
      body: message,
      type: 'sync',
      priority: 'low',
      data: { type: 'sync', success: isSuccess },
    });
  }

  // Vérifier si on est dans les heures silencieuses
  private isInQuietHours(): boolean {
    if (!this.notificationSettings?.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.notificationSettings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.notificationSettings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Heures silencieuses qui traversent minuit
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Vérifier si un type de notification est activé
  private isNotificationTypeEnabled(type: NotificationData['type']): boolean {
    if (!this.notificationSettings) return false;

    switch (type) {
      case 'workout':
        return this.notificationSettings.workoutReminders;
      case 'meal':
        return this.notificationSettings.mealReminders;
      case 'achievement':
        return this.notificationSettings.achievementNotifications;
      case 'sync':
        return this.notificationSettings.syncNotifications;
      default:
        return true;
    }
  }

  // Mettre à jour les paramètres de notification
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      this.notificationSettings = { ...this.notificationSettings, ...settings };

      const client = getSupabaseClient();
      await client
        .from('notification_settings')
        .upsert({
          user_id: userId,
          enabled: this.notificationSettings.enabled,
          workout_reminders: this.notificationSettings.workoutReminders,
          meal_reminders: this.notificationSettings.mealReminders,
          achievement_notifications: this.notificationSettings.achievementNotifications,
          sync_notifications: this.notificationSettings.syncNotifications,
          quiet_hours_enabled: this.notificationSettings.quietHours.enabled,
          quiet_hours_start: this.notificationSettings.quietHours.start,
          quiet_hours_end: this.notificationSettings.quietHours.end,
          updated_at: new Date().toISOString(),
        });

      console.log('📱 Paramètres de notification mis à jour');
      await analytics.trackEvent('user_action', 'notification_settings_updated');
    } catch (error) {
      console.error('Erreur mise à jour paramètres notifications:', error);
    }
  }

  // Obtenir les paramètres actuels
  getNotificationSettings(): NotificationSettings | null {
    return this.notificationSettings;
  }

  // Annuler toutes les notifications programmées
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('📱 Toutes les notifications programmées annulées');
    } catch (error) {
      console.error('Erreur annulation notifications:', error);
    }
  }

  // Obtenir les notifications programmées
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erreur récupération notifications programmées:', error);
      return [];
    }
  }
}

// Instance singleton
export const notificationManager = new NotificationManager();

