// lib/steps.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { storageAdapter } from "./storage-adapter-simple";

const DAILY_STEPS_KEY = "the_sport_daily_steps_v1";

export type DailySteps = {
  steps: number;
  lastUpdated: string; // ISO date string
};

/**
 * Objectif de pas quotidien recommandé
 */
export function getDailyStepsTarget(): number {
  return 10000; // Objectif standard de 10 000 pas par jour
}

/**
 * Charge le nombre de pas quotidien depuis le stockage local
 */
export async function loadDailySteps(): Promise<DailySteps> {
  try {
    const data = await storageAdapter.load(DAILY_STEPS_KEY);
    return data || { steps: 0, lastUpdated: new Date().toISOString() };
  } catch (error) {
    console.error('Erreur chargement pas de marche:', error);
    // Fallback vers AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(DAILY_STEPS_KEY);
      if (!raw) return { steps: 0, lastUpdated: new Date().toISOString() };
      return JSON.parse(raw) as DailySteps;
    } catch (e) {
      console.error("Erreur en chargeant les pas quotidiens:", e);
      return { steps: 0, lastUpdated: new Date().toISOString() };
    }
  }
}

/**
 * Sauvegarde le nombre de pas quotidien dans le stockage local
 */
export async function saveDailySteps(steps: DailySteps): Promise<void> {
  try {
    await storageAdapter.save(DAILY_STEPS_KEY, steps);
  } catch (error) {
    console.error('Erreur sauvegarde pas de marche:', error);
    // Fallback vers AsyncStorage
    try {
      await AsyncStorage.setItem(DAILY_STEPS_KEY, JSON.stringify(steps));
    } catch (e) {
      console.error("Erreur en sauvegardant les pas quotidiens:", e);
    }
  }
}

/**
 * Vérifie si les données de pas sont à jour (même jour)
 */
export function isStepsDataUpToDate(lastUpdated: string): boolean {
  const today = new Date().toDateString();
  const lastUpdateDate = new Date(lastUpdated).toDateString();
  return today === lastUpdateDate;
}

/**
 * Vérifie si c'est un nouveau jour et reset automatiquement si nécessaire
 */
export async function checkAndResetIfNewDay(): Promise<DailySteps> {
  try {
    const currentSteps = await loadDailySteps();
    const today = new Date().toDateString();
    const lastUpdateDate = new Date(currentSteps.lastUpdated).toDateString();
    
    // Si c'est un nouveau jour, reset les pas
    if (today !== lastUpdateDate) {
      const resetSteps = { steps: 0, lastUpdated: new Date().toISOString() };
      await saveDailySteps(resetSteps);
      return resetSteps;
    }
    
    return currentSteps;
  } catch (error) {
    console.error("Erreur lors de la vérification du nouveau jour:", error);
    return { steps: 0, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Récupère le nombre de pas depuis les capteurs du téléphone
 * Utilise expo-sensors pour accéder aux capteurs de mouvement
 */
export async function getStepsFromSensor(): Promise<number> {
  try {
    // Vérifier si le compteur de pas est disponible
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      console.log("Compteur de pas non disponible sur cet appareil");
      return 0;
    }

    // Récupérer les pas d'aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const result = await Pedometer.getStepCountAsync(startOfDay, today);
    
    // Retourner le nombre total de pas
    return result.steps || 0;
  } catch (error) {
    console.error("Erreur lors de la récupération des pas:", error);
    // En cas d'erreur, retourner une valeur par défaut
    return 0;
  }
}

/**
 * Vérifie si les permissions de santé sont accordées
 * Pour expo-sensors, les permissions sont gérées automatiquement
 */
export async function checkHealthPermissions(): Promise<boolean> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    return isAvailable;
  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return false;
  }
}

/**
 * Demande les permissions de santé à l'utilisateur
 * Pour expo-sensors, les permissions sont gérées automatiquement
 */
export async function requestHealthPermissions(): Promise<boolean> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    return isAvailable;
  } catch (error) {
    console.error("Erreur lors de la demande de permissions:", error);
    return false;
  }
}
