// lib/analytics.ts
// Système d'analytics et monitoring pour TheSport

import { getCurrentUserId, getSupabaseClient } from './supabase';

export type AnalyticsEvent = {
  id: string;
  userId: string;
  eventType: 'user_action' | 'performance' | 'error' | 'sync' | 'feature_usage';
  eventName: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
};

export type PerformanceMetric = {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
};

export type UserActivity = {
  userId: string;
  lastActive: string;
  sessionCount: number;
  featuresUsed: string[];
  totalTimeSpent: number;
};

class AnalyticsManager {
  private sessionId: string;
  private appVersion: string;
  private platform: 'ios' | 'android' | 'web';
  private eventQueue: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.appVersion = '1.13.0'; // Version actuelle
    this.platform = this.detectPlatform();
    this.startPerformanceMonitoring();
  }

  // Détecter la plateforme
  private detectPlatform(): 'ios' | 'android' | 'web' {
    if (typeof window !== 'undefined') {
      if (window.navigator.userAgent.includes('iPhone') || window.navigator.userAgent.includes('iPad')) {
        return 'ios';
      }
      if (window.navigator.userAgent.includes('Android')) {
        return 'android';
      }
      return 'web';
    }
    return 'web'; // Fallback
  }

  // Générer un ID de session unique
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Démarrer le monitoring des performances
  private startPerformanceMonitoring(): void {
    // Monitorer les erreurs JavaScript
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError('javascript_error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      // Monitorer les promesses rejetées
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError('unhandled_promise_rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  // Tracker un événement
  async trackEvent(
    eventType: AnalyticsEvent['eventType'],
    eventName: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        userId,
        eventType,
        eventName,
        properties: {
          ...properties,
          isOnline: this.isOnline,
          sessionDuration: this.getSessionDuration(),
        },
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        appVersion: this.appVersion,
        platform: this.platform,
      };

      // Ajouter à la queue
      this.eventQueue.push(event);

      // Envoyer immédiatement si en ligne
      if (this.isOnline) {
        await this.flushEvents();
      }

      console.log(`📊 Event tracked: ${eventName}`, properties);
    } catch (error) {
      console.error('Erreur tracking événement:', error);
    }
  }

  // Tracker une erreur
  async trackError(errorType: string, errorData: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('error', errorType, {
      ...errorData,
      severity: this.determineSeverity(errorType),
    });
  }

  // Tracker les performances
  async trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      error,
      timestamp: new Date().toISOString(),
    };

    this.performanceMetrics.push(metric);

    // Garder seulement les 100 dernières métriques
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    await this.trackEvent('performance', 'operation_completed', {
      operation,
      duration,
      success,
      error,
    });
  }

  // Tracker l'utilisation des fonctionnalités
  async trackFeatureUsage(featureName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('feature_usage', featureName, properties);
  }

  // Tracker les actions utilisateur
  async trackUserAction(action: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('user_action', action, properties);
  }

  // Tracker la synchronisation
  async trackSync(syncType: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('sync', syncType, properties);
  }

  // Envoyer les événements en queue
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('analytics_events')
        .insert(this.eventQueue);

      if (error) throw error;

      console.log(`📊 ${this.eventQueue.length} événements envoyés`);
      this.eventQueue = [];
    } catch (error) {
      console.error('Erreur envoi événements:', error);
      // Garder les événements en queue pour un prochain essai
    }
  }

  // Obtenir les statistiques de performance
  getPerformanceStats(): {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    totalOperations: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        totalOperations: 0,
      };
    }

    const totalOperations = this.performanceMetrics.length;
    const successfulOperations = this.performanceMetrics.filter(m => m.success).length;
    const averageResponseTime = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const successRate = (successfulOperations / totalOperations) * 100;
    const errorRate = 100 - successRate;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      totalOperations,
    };
  }

  // Obtenir l'activité utilisateur
  async getUserActivity(): Promise<UserActivity | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return null;

      const client = getSupabaseClient();
      const { data, error } = await client
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur récupération activité utilisateur:', error);
      return null;
    }
  }

  // Mettre à jour l'activité utilisateur
  async updateUserActivity(featureUsed?: string): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const client = getSupabaseClient();
      const now = new Date().toISOString();

      // Récupérer l'activité existante
      const { data: existingActivity } = await client
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .single();

      const featuresUsed = existingActivity?.features_used || [];
      if (featureUsed && !featuresUsed.includes(featureUsed)) {
        featuresUsed.push(featureUsed);
      }

      const activityData = {
        user_id: userId,
        last_active: now,
        session_count: (existingActivity?.session_count || 0) + 1,
        features_used: featuresUsed,
        total_time_spent: (existingActivity?.total_time_spent || 0) + this.getSessionDuration(),
        updated_at: now,
      };

      await client
        .from('user_activity')
        .upsert(activityData);

      console.log('📊 Activité utilisateur mise à jour');
    } catch (error) {
      console.error('Erreur mise à jour activité utilisateur:', error);
    }
  }

  // Déterminer la sévérité d'une erreur
  private determineSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = ['database_error', 'auth_error', 'sync_error'];
    const highErrors = ['network_error', 'storage_error'];
    const mediumErrors = ['validation_error', 'permission_error'];

    if (criticalErrors.includes(errorType)) return 'critical';
    if (highErrors.includes(errorType)) return 'high';
    if (mediumErrors.includes(errorType)) return 'medium';
    return 'low';
  }

  // Générer un ID d'événement unique
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obtenir la durée de session
  private getSessionDuration(): number {
    // Approximation basée sur le timestamp de création de session
    const sessionStart = parseInt(this.sessionId.split('_')[1]);
    return Date.now() - sessionStart;
  }

  // Mettre à jour le statut de connexion
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    if (isOnline) {
      this.flushEvents();
    }
  }

  // Obtenir les métriques en temps réel
  getRealTimeMetrics(): {
    eventsInQueue: number;
    performanceMetrics: number;
    isOnline: boolean;
    sessionDuration: number;
  } {
    return {
      eventsInQueue: this.eventQueue.length,
      performanceMetrics: this.performanceMetrics.length,
      isOnline: this.isOnline,
      sessionDuration: this.getSessionDuration(),
    };
  }
}

// Instance singleton
export const analytics = new AnalyticsManager();
