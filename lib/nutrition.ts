// lib/nutrition.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "./profile";
import { supabaseStorageAdapter as storageAdapter } from './storage-adapter-supabase';

const DAILY_INTAKE_KEY = "the_sport_daily_intake_v1";

export type DailyIntake = {
  kcal: number;
};

export type MealNutrition = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};

/**
 * Calcule le métabolisme de base (BMR) avec la formule de Mifflin-St Jeor
 */
function calculateBMR(profile: UserProfile): number {
  if (!profile.age || !profile.weight || !profile.height) {
    // Valeurs par défaut si données manquantes
    return 1800; // BMR moyen pour un adulte
  }

  const age = profile.age;
  const weight = profile.weight; // en kg
  const height = profile.height; // en cm

  // Formule de Mifflin-St Jeor (plus précise que Harris-Benedict)
  // BMR = 10 * poids(kg) + 6.25 * taille(cm) - 5 * âge + s
  // s = +5 pour hommes, -161 pour femmes
  const genderFactor = profile.gender === "female" ? -161 : 5; // +5 pour hommes, -161 pour femmes
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + genderFactor;
  
  return Math.round(bmr);
}

/**
 * Calcule le facteur d'activité physique basé sur le niveau de sport et les séances
 */
function calculateActivityFactor(profile: UserProfile): number {
  // Facteur de base selon le niveau de sport
  let baseFactor = 1.2; // Sédentaire par défaut

  const fitnessLevel = profile.chatResponses?.fitnessLevel || profile.fitnessLevel || "";
  const sessions = profile.sessions || 0;

  // Ajustement selon le niveau de sport
  if (fitnessLevel.toLowerCase().includes("débutant")) {
    baseFactor = 1.3;
  } else if (fitnessLevel.toLowerCase().includes("intermédiaire")) {
    baseFactor = 1.4;
  } else if (fitnessLevel.toLowerCase().includes("avancé")) {
    baseFactor = 1.5;
  }

  // Ajustement selon le nombre de séances par semaine
  if (sessions >= 6) {
    baseFactor += 0.2; // Très actif
  } else if (sessions >= 4) {
    baseFactor += 0.15; // Actif
  } else if (sessions >= 2) {
    baseFactor += 0.1; // Modérément actif
  }

  return Math.min(baseFactor, 1.8); // Plafonner à 1.8
}

/**
 * Estime l'objectif calorique quotidien basé sur le profil utilisateur complet
 * Utilise le BMR + facteur d'activité + ajustements selon l'objectif
 */
export function estimateKcalTarget(profile: UserProfile): number {
  // Calcul du métabolisme de base
  const bmr = calculateBMR(profile);
  
  // Calcul du facteur d'activité
  const activityFactor = calculateActivityFactor(profile);
  
  // Calcul des calories de maintenance
  let target = Math.round(bmr * activityFactor);
  
  console.log('Debug BMR calculation:', {
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    bmr,
    activityFactor,
    target
  });

  // Ajustements selon l'objectif
  const goal = profile.goal?.toLowerCase() || "";
  
  if (goal.includes("perdre") || goal.includes("perte")) {
    // Déficit calorique pour la perte de poids (15-20% de déficit)
    target = Math.round(target * 0.8);
    console.log('Ajustement perte de poids:', { goal, target });
  } else if (goal.includes("prendre") || goal.includes("muscle") || goal.includes("masse")) {
    // Surplus calorique pour la prise de muscle (10-15% de surplus)
    target = Math.round(target * 1.15);
    console.log('Ajustement prise de masse:', { goal, target });
  } else if (goal.includes("maintenir") || goal.includes("forme")) {
    // Calories de maintenance
    // Pas d'ajustement
    console.log('Ajustement maintien:', { goal, target });
  } else {
    console.log('Aucun ajustement d\'objectif:', { goal, target });
  }

  // Ajustement selon le régime alimentaire
  const diet = profile.diet?.toLowerCase() || "";
  if (diet.includes("végétarien") || diet.includes("vegan")) {
    // Légère augmentation pour compenser la densité calorique plus faible
    target = Math.round(target * 1.05);
  }

  // Plafonner entre 1200 et 4000 kcal pour des valeurs réalistes
  return Math.max(1200, Math.min(4000, target));
}

/**
 * Charge l'apport calorique quotidien depuis le stockage local
 */
export async function loadDailyIntake(): Promise<DailyIntake> {
  try {
    const data = await storageAdapter.load(DAILY_INTAKE_KEY);
    return data || { kcal: 0 };
  } catch (error) {
    console.error('Erreur chargement apport nutritionnel:', error);
    // Fallback vers AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(DAILY_INTAKE_KEY);
      if (!raw) return { kcal: 0 };
      return JSON.parse(raw) as DailyIntake;
    } catch (e) {
      console.error("Erreur en chargeant l'apport quotidien:", e);
      return { kcal: 0 };
    }
  }
}

/**
 * Sauvegarde l'apport calorique quotidien dans le stockage local
 */
export async function saveDailyIntake(intake: DailyIntake): Promise<void> {
  try {
    await storageAdapter.save(DAILY_INTAKE_KEY, intake);
  } catch (error) {
    console.error('Erreur sauvegarde apport nutritionnel:', error);
    // Fallback vers AsyncStorage
    try {
      await AsyncStorage.setItem(DAILY_INTAKE_KEY, JSON.stringify(intake));
    } catch (e) {
      console.error("Erreur en sauvegardant l'apport quotidien:", e);
    }
  }
}

