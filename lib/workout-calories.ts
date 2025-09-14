// lib/workout-calories.ts
import { UserProfile } from './profile';

export interface WorkoutCalorieCalculation {
  calories: number;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
  activityType: string;
}

// Base de données des activités et leurs MET (Metabolic Equivalent of Task)
const activityMETs: { [key: string]: number } = {
  // Cardio
  'course': 8.0,
  'jogging': 7.0,
  'marche': 3.5,
  'vélo': 8.0,
  'natation': 8.0,
  'rameur': 7.0,
  'elliptique': 5.0,
  'tapis': 6.0,
  'cardio': 6.0,
  
  // Musculation
  'musculation': 5.0,
  'poids': 5.0,
  'haltères': 5.0,
  'squat': 5.0,
  'pompes': 3.8,
  'tractions': 4.0,
  'dips': 4.0,
  'gainage': 3.0,
  'abdos': 3.0,
  'planche': 3.0,
  
  // HIIT et intensité
  'hiit': 8.0,
  'tabata': 8.0,
  'circuit': 7.0,
  'crossfit': 8.0,
  'burpees': 8.0,
  'mountain climbers': 8.0,
  'jumping jacks': 8.0,
  
  // Yoga et stretching
  'yoga': 2.5,
  'stretching': 2.0,
  'pilates': 3.0,
  'méditation': 1.0,
  
  // Sports
  'football': 7.0,
  'basketball': 6.0,
  'tennis': 7.0,
  'badminton': 5.5,
  'volleyball': 3.0,
  'handball': 7.0,
  'rugby': 8.0,
  'boxe': 12.0,
  'arts martiaux': 10.0,
  'danse': 4.8,
  'zumba': 6.0,
  
  // Activités fonctionnelles
  'montée escaliers': 8.0,
  'escalade': 8.0,
  'randonnée': 6.0,
  'ski': 7.0,
  'snowboard': 5.0,
  'surf': 5.0,
  'kayak': 5.0,
  'aviron': 7.0,
};

// Fonction pour extraire les informations d'une séance
export function extractWorkoutInfo(content: string): {
  duration: number;
  activities: string[];
  intensity: 'low' | 'moderate' | 'high';
} {
  if (!content || typeof content !== 'string') {
    return {
      duration: 45,
      activities: [],
      intensity: 'moderate'
    };
  }
  
  const lines = content.toLowerCase().split('\n');
  let duration = 45; // Durée par défaut
  const activities: string[] = [];
  let intensity: 'low' | 'moderate' | 'high' = 'moderate';
  
  // Extraire la durée
  for (const line of lines) {
    // Chercher des patterns de durée
    const durationMatch = line.match(/(\d+)\s*(min|minutes?|h|heures?)/);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2];
      if (unit.includes('h') || unit.includes('heure')) {
        duration = value * 60; // Convertir en minutes
      } else {
        duration = value;
      }
      break;
    }
  }
  
  // Extraire les activités
  for (const line of lines) {
    for (const activity of Object.keys(activityMETs)) {
      if (line.includes(activity)) {
        activities.push(activity);
      }
    }
  }
  
  // Déterminer l'intensité
  const highIntensityKeywords = ['hiit', 'tabata', 'intense', 'maximal', 'explosif', 'sprint', 'burpees', 'crossfit'];
  const lowIntensityKeywords = ['léger', 'doucement', 'récupération', 'stretching', 'yoga', 'marche'];
  
  const contentLower = content.toLowerCase();
  if (highIntensityKeywords.some(keyword => contentLower.includes(keyword))) {
    intensity = 'high';
  } else if (lowIntensityKeywords.some(keyword => contentLower.includes(keyword))) {
    intensity = 'low';
  }
  
  return { duration, activities, intensity };
}

// Fonction principale pour calculer les calories d'une séance
export function calculateWorkoutCalories(content: string, profile: UserProfile | null): WorkoutCalorieCalculation {
  if (!profile || !content || typeof content !== 'string') {
    return {
      calories: 300,
      duration: 45,
      intensity: 'moderate',
      activityType: 'unknown'
    };
  }
  
  const { duration, activities, intensity } = extractWorkoutInfo(content);
  
  // Données du profil
  const age = parseInt(String(profile.age || "25"));
  const weight = parseFloat(String(profile.weight || "70"));
  const height = parseFloat(String(profile.height || "170"));
  const gender = profile.gender || "homme";
  
  // Calcul du BMR (Basal Metabolic Rate) avec la formule de Mifflin-St Jeor
  let bmr: number;
  if (gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  
  // Déterminer le MET moyen
  let averageMET = 5.0; // MET par défaut
  
  if (activities.length > 0) {
    const activityMETs_found = activities.map(activity => activityMETs[activity]).filter(met => met > 0);
    if (activityMETs_found.length > 0) {
      averageMET = activityMETs_found.reduce((sum, met) => sum + met, 0) / activityMETs_found.length;
    }
  } else {
    // Si aucune activité spécifique trouvée, estimer selon l'intensité
    switch (intensity) {
      case 'low':
        averageMET = 3.0;
        break;
      case 'moderate':
        averageMET = 5.0;
        break;
      case 'high':
        averageMET = 8.0;
        break;
    }
  }
  
  // Ajuster le MET selon l'intensité
  switch (intensity) {
    case 'low':
      averageMET *= 0.8;
      break;
    case 'high':
      averageMET *= 1.3;
      break;
    default:
      // moderate - pas d'ajustement
      break;
  }
  
  // Ajuster selon l'âge (les personnes plus âgées brûlent moins de calories)
  if (age > 50) {
    averageMET *= 0.95;
  } else if (age > 65) {
    averageMET *= 0.9;
  }
  
  // Ajuster selon le niveau de fitness
  const fitnessLevel = profile.chat_responses?.fitnessLevel || profile.fitness_level || "débutant";
  switch (fitnessLevel) {
    case 'débutant':
      averageMET *= 0.9; // Les débutants brûlent moins efficacement
      break;
    case 'avancé':
      averageMET *= 1.1; // Les avancés brûlent plus efficacement
      break;
    default:
      // intermédiaire - pas d'ajustement
      break;
  }
  
  // Calcul final des calories
  // Formule : MET × poids (kg) × durée (heures)
  const calories = Math.round(averageMET * weight * (duration / 60));
  
  // S'assurer que le résultat est raisonnable (minimum 50, maximum 2000)
  const finalCalories = Math.max(50, Math.min(2000, calories));
  
  console.log('Debug calculateWorkoutCalories:', {
    profile: { age, weight, height, gender, fitnessLevel },
    workout: { duration, activities, intensity },
    calculation: { bmr, averageMET, calories, finalCalories }
  });
  
  return {
    calories: finalCalories,
    duration,
    intensity,
    activityType: activities.length > 0 ? activities.join(', ') : 'unknown'
  };
}
