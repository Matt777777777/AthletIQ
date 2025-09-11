// lib/dayplan.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPlan } from './plans';
import { loadProfile, UserProfile } from './profile';
import { addShoppingItem, extractIngredientsFromAIResponse } from './shopping';
import { storageAdapter } from './storage-adapter-simple';

export interface DayPlan {
  id: string;
  title: string;
  date: string;
  workout: {
    title: string;
    content: string;
  };
  meals: {
    breakfast: { title: string; content: string };
    lunch: { title: string; content: string };
    dinner: { title: string; content: string };
  };
  shoppingList: Array<{
    name: string;
    quantity: string;
    unit: string;
    category: string;
  }>;
  createdAt: string;
}

const DAY_PLANS_KEY = 'the_sport_day_plans_v1';

// 🚀 Générer un plan de journée complet
export async function generateDayPlan(): Promise<DayPlan> {
  const profile = await loadProfile();
  
  const dayPlanId = `dayplan_${Date.now()}`;
  const today = new Date().toLocaleDateString('fr-FR');
  
  // Créer le titre personnalisé
  const title = `Ma journée ${today}${profile ? ` - ${profile.goal}` : ''}`;
  
  // Générer les contenus via l'API
  const [workout, breakfast, lunch, dinner] = await Promise.all([
    generateWorkout(profile),
    generateMeal('petit-déjeuner', profile),
    generateMeal('déjeuner', profile),
    generateMeal('dîner', profile)
  ]);
  
  // Extraire tous les ingrédients des repas
  const allMealsText = `${breakfast.content}\n\n${lunch.content}\n\n${dinner.content}`;
  const shoppingList = extractIngredientsFromAIResponse(allMealsText);
  
  const dayPlan: DayPlan = {
    id: dayPlanId,
    title,
    date: today,
    workout: {
      title: workout.title,
      content: workout.content
    },
    meals: {
      breakfast: {
        title: breakfast.title,
        content: breakfast.content
      },
      lunch: {
        title: lunch.title,
        content: lunch.content
      },
      dinner: {
        title: dinner.title,
        content: dinner.content
      }
    },
    shoppingList,
    createdAt: new Date().toISOString()
  };
  
  // Sauvegarder le plan de journée
  await saveDayPlan(dayPlan);
  
  return dayPlan;
}

// 🏋️ Générer une séance d'entraînement
async function generateWorkout(profile: UserProfile | null): Promise<{ title: string; content: string }> {
  const systemPrompt = `Tu es un coach sportif expert. Génère une séance d'entraînement complète et structurée.
  
${profile ? `Profil utilisateur: ${profile.goal}, ${profile.sessions} séances/semaine, ${profile.diet}` : 'Profil par défaut: objectif général, 3 séances/semaine'}

FORMAT REQUIS:
- Titre accrocheur
- Échauffement (5-10 min)
- Exercices principaux (30-45 min)
- Récupération (5-10 min)
- Conseils pratiques

IMPORTANT: Réponse concise et structurée. Évite les répétitions.`;

  const response = await callAI([{ role: 'user', content: 'Génère ma séance d\'entraînement du jour' }], systemPrompt);
  
  return {
    title: `Séance ${new Date().toLocaleDateString('fr-FR')}`,
    content: response
  };
}

// 🍽️ Générer un repas
async function generateMeal(mealType: string, profile: UserProfile | null): Promise<{ title: string; content: string }> {
  const systemPrompt = `Tu es un nutritionniste expert. Génère un ${mealType} équilibré et délicieux.

${profile ? `Profil utilisateur: ${profile.goal}, ${profile.sessions} séances/semaine, ${profile.diet}` : 'Profil par défaut: objectif général, alimentation équilibrée'}

FORMAT REQUIS:
- Nom du plat
- Ingrédients avec quantités
- Instructions de préparation
- Valeurs nutritionnelles (kcal, protéines, glucides, lipides)

FORMAT RECETTES - Utilise TOUJOURS :
<INGREDIENTS>
{"ingredients": [{"name": "nom", "quantity": "qty", "unit": "unité", "category": "catégorie"}]}
</INGREDIENTS>

Catégories: Fruits, Légumes, Protéines, Céréales, Épicerie, Laitages, Autres
Unités: g, kg, ml, l, cuillères, tasses, pincées, branches, gousses, tranches, unités

IMPORTANT: Réponse concise et structurée. Évite les répétitions.`;

  const response = await callAI([{ role: 'user', content: `Génère mon ${mealType} du jour` }], systemPrompt);
  
  return {
    title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ${new Date().toLocaleDateString('fr-FR')}`,
    content: response
  };
}

// 🤖 Appel à l'API IA
async function callAI(messages: Array<{ role: string; content: string }>, systemPrompt: string): Promise<string> {
  const endpoint = "https://the-sport-backend-1d2x3vv3y-matts-projects-43da855b.vercel.app/api/chat";
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }
  
  const data = await response.json();
  return data.reply || 'Erreur: Pas de réponse reçue';
}

// 💾 Sauvegarder un plan de journée
export async function saveDayPlan(dayPlan: DayPlan): Promise<void> {
  try {
    const existingPlans = await loadDayPlans();
    const updatedPlans = [dayPlan, ...existingPlans];
    await storageAdapter.save(DAY_PLANS_KEY, updatedPlans);
  } catch (error) {
    console.error('Erreur sauvegarde plan jour:', error);
    // Fallback vers AsyncStorage
    try {
      const existingPlans = await loadDayPlans();
      const updatedPlans = [dayPlan, ...existingPlans];
      await AsyncStorage.setItem(DAY_PLANS_KEY, JSON.stringify(updatedPlans));
    } catch (e) {
      console.error("Erreur en sauvegardant le plan de journée:", e);
      throw new Error('Impossible de sauvegarder le plan de journée');
    }
  }
}

// 📖 Charger tous les plans de journée
export async function loadDayPlans(): Promise<DayPlan[]> {
  try {
    const data = await storageAdapter.load(DAY_PLANS_KEY);
    return data || [];
  } catch (error) {
    console.error('Erreur chargement plans jour:', error);
    // Fallback vers AsyncStorage
    try {
      const data = await AsyncStorage.getItem(DAY_PLANS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erreur en chargeant les plans de jour:", e);
      return [];
    }
  }
}

// 🗑️ Supprimer un plan de journée
export async function deleteDayPlan(dayPlanId: string): Promise<void> {
  try {
    const existingPlans = await loadDayPlans();
    const updatedPlans = existingPlans.filter(plan => plan.id !== dayPlanId);
    await storageAdapter.save(DAY_PLANS_KEY, updatedPlans);
  } catch (error) {
    console.error('Erreur suppression plan jour:', error);
    // Fallback vers AsyncStorage
    try {
      const existingPlans = await loadDayPlans();
      const updatedPlans = existingPlans.filter(plan => plan.id !== dayPlanId);
      await AsyncStorage.setItem(DAY_PLANS_KEY, JSON.stringify(updatedPlans));
    } catch (e) {
      console.error("Erreur en supprimant le plan de journée:", e);
      throw new Error('Impossible de supprimer le plan de journée');
    }
  }
}

// 📋 Sauvegarder les éléments du plan dans les sections existantes
export async function saveDayPlanToSections(dayPlan: DayPlan): Promise<void> {
  try {
    // Sauvegarder la séance
    await addPlan({
      type: 'workout',
      title: dayPlan.workout.title,
      content: dayPlan.workout.content
    });
    
    // Sauvegarder les repas
    await addPlan({
      type: 'meal',
      title: dayPlan.meals.breakfast.title,
      content: dayPlan.meals.breakfast.content
    });
    
    await addPlan({
      type: 'meal',
      title: dayPlan.meals.lunch.title,
      content: dayPlan.meals.lunch.content
    });
    
    await addPlan({
      type: 'meal',
      title: dayPlan.meals.dinner.title,
      content: dayPlan.meals.dinner.content
    });
    
    // Ajouter les ingrédients à la liste de courses
    for (const item of dayPlan.shoppingList) {
      await addShoppingItem({
        ...item,
        source: `Plan jour ${dayPlan.date}`
      });
    }
  } catch (error) {
    console.error('Erreur sauvegarde sections:', error);
    throw new Error('Impossible de sauvegarder dans les sections');
  }
}

