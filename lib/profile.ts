// lib/profile.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageAdapter } from "./storage-adapter-simple";

export type UserProfile = {
  goal: string;     // Exemple : "Perdre du poids", "Prendre du muscle", "Être en forme"
  sessions: number; // Nombre de séances par semaine (2..7)
  diet: string;     // Exemple : "Végétarien", "Vegan", "Sans gluten", "Aucune restriction"
  
  // Informations personnelles
  firstName?: string;    // Prénom de l'utilisateur
  age?: number;          // Âge en années
  weight?: number;       // Poids en kg
  height?: number;       // Taille en cm
  gender?: 'male' | 'female'; // Sexe de l'utilisateur
  profilePhoto?: string; // URI de la photo de profil
  
  // Questions complémentaires du chat IA (réponses exactes)
  fitnessLevel?: "Débutant" | "Intermédiaire" | "Avancé";
  equipment?: "Aucun" | "Basique" | "Complet";
  intolerances?: string; // Ex: "Lactose, gluten" ou "Aucune"
  limitations?: string;  // Ex: "Problèmes de dos" ou "Aucune"
  preferredTime?: "Matin" | "Midi" | "Soir" | "Flexible";
  
  // Réponses exactes aux questions du chat (mot pour mot)
  chatResponses?: {
    fitnessLevel?: string;    // Réponse exacte à "Quel est ton niveau de sport actuel ?"
    equipment?: string;       // Réponse exacte à "Quel matériel de sport as-tu à disposition ?"
    intolerances?: string;    // Réponse exacte à "As-tu des intolérances alimentaires ou des allergies ?"
    limitations?: string;     // Réponse exacte à "Y a-t-il des exercices que tu ne peux pas faire ?"
    preferredTime?: string;   // Réponse exacte à "À quel moment préfères-tu faire du sport ?"
  };
  
  // Flag pour indiquer si les questions du chat ont déjà été posées
  chatQuestionsAsked?: boolean;
  
  // Plans sauvegardés
  savedPlans?: {
    workouts: Array<{
      id: string;
      title: string;
      content: string;
      date: string;
    }>;
    meals: Array<{
      id: string;
      title: string;
      content: string;
      date: string;
    }>;
  };

  // Repas quotidiens
  dailyMeals?: {
    breakfast?: {
      id: string;
      title: string;
      content: string;
      date: string;
      eaten?: boolean;
    } | null;
    lunch?: {
      id: string;
      title: string;
      content: string;
      date: string;
      eaten?: boolean;
    } | null;
    snack?: {
      id: string;
      title: string;
      content: string;
      date: string;
      eaten?: boolean;
    } | null;
    dinner?: {
      id: string;
      title: string;
      content: string;
      date: string;
      eaten?: boolean;
    } | null;
  };

  // Séance du jour (compatibilité)
  dailyWorkout?: {
    id: string;
    title: string;
    content: string;
    duration: number; // en minutes
    calories: number; // calories estimées
    completed: boolean;
    completedAt?: string;
  } | null;
  
  // Séances du jour (nouveau format - support 2 séances)
  dailyWorkouts?: Array<{
    id: string;
    title: string;
    content: string;
    duration: number; // en minutes
    calories: number; // calories estimées
    completed: boolean;
    completedAt?: string;
    sessionType: 'morning' | 'evening'; // Type de séance
  }>;

  // Historique des journées
  dailyHistory?: {
    [date: string]: { // Format: "YYYY-MM-DD"
      date: string;
      nutrition: {
        kcal: number;
        carbs: number;
        protein: number;
        fat: number;
      };
      steps: {
        count: number;
        target: number;
      };
      workouts: {
        completed: number;
        total: number;
        caloriesBurned: number;
        target: number;
      };
      meals: {
        breakfast?: { title: string; eaten: boolean };
        lunch?: { title: string; eaten: boolean };
        snack?: { title: string; eaten: boolean };
        dinner?: { title: string; eaten: boolean };
      };
    };
  };
};

const KEY = "the_sport_profile_v1";

// Sauvegarder le profil de l’utilisateur en local
export async function saveProfile(p: UserProfile) {
  try {
    // Utiliser le storage adapter avec fallback automatique
    await storageAdapter.save(KEY, p);
  } catch (e) {
    console.error("Erreur en sauvegardant le profil:", e);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(p));
      console.log("✅ Profil sauvegardé en fallback (AsyncStorage)");
    } catch (fallbackError) {
      console.error("❌ Erreur fallback AsyncStorage:", fallbackError);
    }
  }
}

// Charger le profil de l'utilisateur depuis le stockage local
export async function loadProfile(): Promise<UserProfile | null> {
  try {
    // Utiliser le storage adapter avec fallback automatique
    const profile = await storageAdapter.load(KEY);
    if (profile) return profile as UserProfile;
    
    // Fallback vers AsyncStorage si pas de données
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (e) {
    console.error("Erreur en chargeant le profil:", e);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UserProfile;
    } catch (fallbackError) {
      console.error("❌ Erreur fallback AsyncStorage:", fallbackError);
      return null;
    }
  }
}

// Supprimer le profil (utile pour les tests)
export async function deleteProfile(): Promise<void> {
  try {
    // Utiliser le storage adapter avec fallback automatique
    await storageAdapter.remove(KEY);
  } catch (e) {
    console.error("Erreur en supprimant le profil:", e);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      await AsyncStorage.removeItem(KEY);
      console.log("✅ Profil supprimé en fallback (AsyncStorage)");
    } catch (fallbackError) {
      console.error("❌ Erreur fallback AsyncStorage:", fallbackError);
    }
  }
}

// Sauvegarder un plan (séance ou repas)
export async function savePlan(type: 'workout' | 'meal', title: string, content: string): Promise<boolean> {
  try {
    const profile = await loadProfile();
    if (!profile) return false;

    const savedPlans = profile.savedPlans || { workouts: [], meals: [] };
    
    const newPlan = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toISOString(),
    };

    if (type === 'workout') {
      savedPlans.workouts.push(newPlan);
    } else {
      savedPlans.meals.push(newPlan);
    }

    const updatedProfile = { ...profile, savedPlans };
    await saveProfile(updatedProfile);
    return true;
  } catch (e) {
    console.error("Erreur en sauvegardant le plan:", e);
    return false;
  }
}

// Supprimer un plan spécifique
export async function deletePlan(type: 'workout' | 'meal', planId: string): Promise<boolean> {
  try {
    console.log(`🔄 deletePlan called for ${type} with id: ${planId}`);
    
    const profile = await loadProfile();
    if (!profile) {
      console.log(`❌ No profile found for deletion`);
      return false;
    }

    const savedPlans = profile.savedPlans || { workouts: [], meals: [] };
    
    if (type === 'workout') {
      const beforeCount = savedPlans.workouts.length;
      savedPlans.workouts = savedPlans.workouts.filter(workout => workout.id !== planId);
      const afterCount = savedPlans.workouts.length;
      console.log(`✅ Workout deletion: ${beforeCount} → ${afterCount} workouts`);
    } else {
      const beforeCount = savedPlans.meals.length;
      savedPlans.meals = savedPlans.meals.filter(meal => meal.id !== planId);
      const afterCount = savedPlans.meals.length;
      console.log(`✅ Meal deletion: ${beforeCount} → ${afterCount} meals`);
    }

    const updatedProfile = { ...profile, savedPlans };
    await saveProfile(updatedProfile);
    console.log(`✅ deletePlan completed successfully for ${type}: ${planId}`);
    return true;
  } catch (e) {
    console.error("Erreur en supprimant le plan:", e);
    return false;
  }
}

// Sauvegarder un repas quotidien
export async function saveDailyMeal(mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner', meal: {
  id: string;
  title: string;
  content: string;
  date: string;
  eaten?: boolean;
}): Promise<boolean> {
  try {
    console.log(`🔄 saveDailyMeal called for ${mealType}:`, meal.title);
    
    const profile = await loadProfile();
    if (!profile) {
      console.log(`❌ No profile found for saving daily meal`);
      return false;
    }

    // Initialiser dailyMeals si nécessaire
    if (!profile.dailyMeals) {
      profile.dailyMeals = {
        breakfast: null,
        lunch: null,
        snack: null,
        dinner: null
      };
    }

    // Sauvegarder le repas
    profile.dailyMeals[mealType] = meal;
    
    await saveProfile(profile);
    console.log(`✅ Daily meal saved: ${mealType} - ${meal.title}`);
    return true;
  } catch (e) {
    console.error("Erreur en sauvegardant le repas quotidien:", e);
    return false;
  }
}

// Supprimer un repas quotidien
export async function deleteDailyMeal(mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner'): Promise<boolean> {
  try {
    console.log(`🔄 deleteDailyMeal called for ${mealType}`);
    
    const profile = await loadProfile();
    if (!profile) {
      console.log(`❌ No profile found for deleting daily meal`);
      return false;
    }

    if (!profile.dailyMeals) {
      console.log(`❌ No daily meals found`);
      return false;
    }

    // Supprimer le repas
    profile.dailyMeals[mealType] = null;
    
    await saveProfile(profile);
    console.log(`✅ Daily meal deleted: ${mealType}`);
    return true;
  } catch (e) {
    console.error("Erreur en supprimant le repas quotidien:", e);
    return false;
  }
}

// Sauvegarder les données du jour dans l'historique
export async function saveDailyHistory(dayData: {
  date: string;
  nutrition: { kcal: number; carbs: number; protein: number; fat: number };
  steps: { count: number; target: number };
  workouts: { completed: number; total: number; caloriesBurned: number; target: number };
  meals: {
    breakfast?: { title: string; eaten: boolean };
    lunch?: { title: string; eaten: boolean };
    snack?: { title: string; eaten: boolean };
    dinner?: { title: string; eaten: boolean };
  };
}): Promise<boolean> {
  try {
    const profile = await loadProfile();
    if (!profile) return false;

    // Initialiser dailyHistory si nécessaire
    if (!profile.dailyHistory) {
      profile.dailyHistory = {};
    }

    // Sauvegarder les données du jour
    profile.dailyHistory[dayData.date] = dayData;
    
    await saveProfile(profile);
    console.log(`✅ Daily history saved for ${dayData.date}`);
    return true;
  } catch (e) {
    console.error("Erreur en sauvegardant l'historique quotidien:", e);
    return false;
  }
}

// Charger l'historique d'une date spécifique
export async function loadDailyHistory(date: string): Promise<NonNullable<UserProfile['dailyHistory']>[string] | null> {
  try {
    const profile = await loadProfile();
    if (!profile || !profile.dailyHistory) return null;
    
    return profile.dailyHistory[date] || null;
  } catch (e) {
    console.error("Erreur en chargeant l'historique quotidien:", e);
    return null;
  }
}

// Charger l'historique des 30 derniers jours
export async function loadRecentHistory(days: number = 30): Promise<Array<NonNullable<UserProfile['dailyHistory']>[string]>> {
  try {
    const profile = await loadProfile();
    if (!profile || !profile.dailyHistory) return [];

    const today = new Date();
    const history: Array<NonNullable<UserProfile['dailyHistory']>[string]> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      if (profile.dailyHistory[dateString]) {
        history.push(profile.dailyHistory[dateString]);
      }
    }

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error("Erreur en chargeant l'historique récent:", e);
    return [];
  }
}
