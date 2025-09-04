// lib/profile.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = {
  goal: string;     // Exemple : "Perdre du poids", "Prendre du muscle", "Être en forme"
  sessions: number; // Nombre de séances par semaine (2..7)
  diet: string;     // Exemple : "Végétarien", "Vegan", "Sans gluten", "Aucune restriction"
  
  // Informations personnelles
  firstName?: string;    // Prénom de l'utilisateur
  age?: number;          // Âge en années
  weight?: number;       // Poids en kg
  height?: number;       // Taille en cm
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

  // Séance du jour
  dailyWorkout?: {
    id: string;
    title: string;
    content: string;
    duration: number; // en minutes
    calories: number; // calories estimées
    completed: boolean;
    completedAt?: string;
  } | null;
};

const KEY = "the_sport_profile_v1";

// Sauvegarder le profil de l’utilisateur en local
export async function saveProfile(p: UserProfile) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    console.error("Erreur en sauvegardant le profil:", e);
  }
}

// Charger le profil de l'utilisateur depuis le stockage local
export async function loadProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (e) {
    console.error("Erreur en chargeant le profil:", e);
    return null;
  }
}

// Supprimer le profil (utile pour les tests)
export async function deleteProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error("Erreur en supprimant le profil:", e);
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
