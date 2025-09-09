// app/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Calendar from "../components/Calendar";
import DayDetailModal from "../components/DayDetailModal";
import { DailyIntake, estimateKcalTarget, loadDailyIntake, saveDailyIntake } from "../lib/nutrition";
import { latestByType, SavedPlan } from "../lib/plans";
import { loadDailyHistory, loadProfile, saveDailyHistory, saveDailyMeal, UserProfile } from "../lib/profile";
import { checkAndResetIfNewDay, checkHealthPermissions, DailySteps, getDailyStepsTarget, getStepsFromSensor, saveDailySteps } from "../lib/steps";


export default function Dashboard() {
  const params = useLocalSearchParams<{ goal?: string; sessions?: string; diet?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastWorkout, setLastWorkout] = useState<SavedPlan | null>(null);
  const [lastMeal, setLastMeal] = useState<SavedPlan | null>(null);
  const [dailyIntake, setDailyIntake] = useState<DailyIntake>({ kcal: 0 });
  const [dailySteps, setDailySteps] = useState<DailySteps>({ steps: 0, lastUpdated: new Date().toISOString() });
  const [hasHealthPermissions, setHasHealthPermissions] = useState<boolean>(false);
  
  // États pour les macronutriments
  const [macronutrients, setMacronutrients] = useState({
    carbs: 0, // glucides en grammes
    protein: 0, // protéines en grammes
    fat: 0 // graisses en grammes
  });

  // États pour les repas de la journée
  const [dailyMeals, setDailyMeals] = useState({
    breakfast: null as { id: string; title: string; content: string; date: string; eaten?: boolean } | null,
    lunch: null as { id: string; title: string; content: string; date: string; eaten?: boolean } | null,
    snack: null as { id: string; title: string; content: string; date: string; eaten?: boolean } | null,
    dinner: null as { id: string; title: string; content: string; date: string; eaten?: boolean } | null
  });

  // États pour les séances du jour (support 2 séances max)
  const [dailyWorkouts, setDailyWorkouts] = useState<Array<{
    id: string;
    title: string;
    content: string;
    duration: number; // en minutes
    calories: number; // calories estimées
    completed: boolean;
    completedAt?: string;
    sessionType: 'morning' | 'evening'; // Type de séance
  }>>([]);

  // États pour la modal de détail des séances
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<{
    id: string;
    title: string;
    content: string;
    duration: number;
    calories: number;
    completed: boolean;
    completedAt?: string;
    sessionType: 'morning' | 'evening';
  } | null>(null);

  // États pour l'import de séances
  const [showImportModal, setShowImportModal] = useState(false);
  const [savedWorkouts, setSavedWorkouts] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);

  // État pour forcer la mise à jour du cercle de progression
  const [circleKey, setCircleKey] = useState(0);

  // Mémoriser les états des workouts pour éviter les re-renders infinis
  const workoutStates = useMemo(() => {
    return dailyWorkouts.map(w => w.completed);
  }, [dailyWorkouts]);

  // États pour la modal de détail des repas
  const [selectedMeal, setSelectedMeal] = useState<{ id: string; title: string; content: string; date: string } | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  // États pour les modals d'ajout de repas
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showImportMealModal, setShowImportMealModal] = useState(false);
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [currentMealType, setCurrentMealType] = useState<'breakfast' | 'lunch' | 'snack' | 'dinner' | null>(null);
  const [manualMealTitle, setManualMealTitle] = useState('');
  const [manualMealContent, setManualMealContent] = useState('');
  const [savedMeals, setSavedMeals] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);

  // États pour le calendrier et l'historique
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<NonNullable<UserProfile['dailyHistory']>[string] | null>(null);

  // Fonction pour extraire le titre d'une séance
  const extractWorkoutTitle = (content: string): string => {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0]?.trim();
    
    // Si la première ligne contient "Voici une séance" ou similaire, prendre la suivante
    if (firstLine && /voici|séance|entraînement|workout/i.test(firstLine)) {
      return lines[1]?.trim() || firstLine;
    }
    
    return firstLine || 'Séance sans titre';
  };

  // Fonction pour estimer les calories d'une séance
  const estimateWorkoutCalories = (content: string, profile: UserProfile | null): number => {
    if (!profile) return 300; // Estimation par défaut
    
    // Estimation basée sur la durée et le poids
    const duration = 45; // Durée par défaut en minutes
    const weight = profile.weight || 70; // Poids par défaut
    
    // Estimation : 8-12 calories par minute selon l'intensité
    const caloriesPerMinute = (weight / 70) * 10; // Ajustement selon le poids
    return Math.round(duration * caloriesPerMinute);
  };

  // Fonction pour extraire les sections d'une séance
  const extractWorkoutSections = (content: string) => {
    const sections: {
      warmup: string[];
      main: string[];
      cooldown: string[];
    } = {
      warmup: [],
      main: [],
      cooldown: []
    };

    const lines = content.split('\n').filter(line => line.trim().length > 0);
    let currentSection: 'warmup' | 'main' | 'cooldown' = 'main'; // Par défaut, circuit principal

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Détecter les sections
      if (/échauffement|warmup|warm-up/i.test(trimmedLine)) {
        currentSection = 'warmup';
        continue;
      } else if (/circuit principal|exercices principaux|main|workout/i.test(trimmedLine)) {
        currentSection = 'main';
        continue;
      } else if (/récupération|récovery|cooldown|cool-down|étirements/i.test(trimmedLine)) {
        currentSection = 'cooldown';
        continue;
      }

      // Ignorer les lignes "Matériel :" et "Description :" seulement dans la section Circuit principal
      if (currentSection === 'main' && (/^matériel\s*:?$/i.test(trimmedLine) || /^description\s*:?$/i.test(trimmedLine))) {
        continue;
      }

      // Ajouter la ligne à la section appropriée
      if (trimmedLine.length > 0) {
        sections[currentSection].push(trimmedLine);
      }
    }

    return sections;
  };

  // Fonction pour extraire le matériel d'une séance
  const extractWorkoutEquipment = (content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      if (/matériel\s*:/i.test(line)) {
        return line.replace(/matériel\s*:\s*/i, '').trim();
      }
    }
    return 'Aucun';
  };

  // Calcul des calories brûlées du jour (séances uniquement)
  const calculateDailyCaloriesBurned = () => {
    let totalCalories = 0;

    // Calories des séances terminées (toutes les séances)
    dailyWorkouts.forEach((workout, index) => {
      if (workout.completed && workout.calories && workout.calories > 0) {
        totalCalories += workout.calories;
        console.log(`Workout ${index + 1} calories:`, { 
          sessionType: workout.sessionType,
          completed: workout.completed, 
          calories: workout.calories, 
          totalCalories 
        });
      }
    });

    // S'assurer qu'on retourne une valeur valide
    const result = Math.max(0, totalCalories);
    console.log('Total workout calories burned:', result);
    return isNaN(result) ? 0 : result;
  };

  // Calcul des calories totales brûlées (séances + pas) - pour usage général
  const calculateTotalCaloriesBurned = () => {
    let totalCalories = 0;

    // Calories des pas (estimation basée sur le profil complet)
    if (profile && dailySteps.steps > 0) {
      // Calcul plus précis basé sur le poids, la taille et le sexe
      const weight = profile.weight || 70; // kg
      const height = profile.height || 170; // cm
      const gender = profile.gender || 'male';
      const age = profile.age || 30; // ans
      
      // Calcul de la longueur de foulée basée sur la taille
      const strideLength = height * 0.43; // 43% de la taille en cm
      const stepsPerKm = 100000 / strideLength; // Nombre de pas par km
      const actualDistanceKm = dailySteps.steps / stepsPerKm;
      
      // Calcul du MET (Metabolic Equivalent) pour la marche
      let met = 3.5;
      if (gender === 'female') {
        met = 3.3; // Légèrement plus bas pour les femmes
      }
      
      // Ajustement selon l'âge (légèrement plus bas avec l'âge)
      if (age > 50) {
        met *= 0.95;
      }
      
      // Calcul des calories : MET × poids(kg) × temps(heures)
      const timeHours = actualDistanceKm / 5; // 5 km/h de vitesse moyenne
      const stepsCalories = Math.round(met * weight * timeHours);
      
      totalCalories += stepsCalories;
    }

    // Calories des séances terminées
    dailyWorkouts.forEach((workout) => {
      if (workout.completed && workout.calories && workout.calories > 0) {
        totalCalories += workout.calories;
      }
    });

    return Math.max(0, totalCalories);
  };

  // Calcul de l'objectif calorique du jour
  const calculateDailyCalorieGoal = () => {
    if (!profile) return 500; // Objectif par défaut

    try {
      const kcalTarget = estimateKcalTarget(profile);
      console.log('Debug estimateKcalTarget:', { 
        profile: { 
          age: profile.age, 
          weight: profile.weight, 
          height: profile.height, 
          goal: profile.goal 
        }, 
        kcalTarget 
      });
      
      if (!kcalTarget || isNaN(kcalTarget) || kcalTarget <= 0) {
        console.log('kcalTarget invalide, utilisation de 500');
        return 500; // Valeur par défaut si estimation invalide
      }

      const caloriesConsumed = dailyIntake.kcal || 0;
      const caloriesBurned = calculateDailyCaloriesBurned();
      
      // Adapter l'objectif selon l'objectif de l'utilisateur (séances uniquement)
      let activityGoal;
      
      if (profile.goal === 'Perte de poids') {
        // Pour la perte de poids : objectif élevé pour créer un déficit calorique
        // Objectif de dépense = 30-35% de l'objectif nutritionnel (séances uniquement)
        activityGoal = Math.round(kcalTarget * 0.325);
      } else if (profile.goal === 'Prise de masse') {
        // Pour la prise de masse : objectif très élevé pour compenser l'excédent calorique
        // Objectif de dépense = 35-40% de l'objectif nutritionnel (séances uniquement)
        activityGoal = Math.round(kcalTarget * 0.375);
      } else if (profile.goal === 'Maintien') {
        // Pour le maintien : objectif équilibré pour les séances
        // Objectif de dépense = 25-30% de l'objectif nutritionnel (séances uniquement)
        activityGoal = Math.round(kcalTarget * 0.275);
      } else {
        // Objectif par défaut
        activityGoal = Math.round(kcalTarget * 0.275);
      }
      
      // S'assurer que l'objectif est raisonnable (minimum 300, maximum 1500)
      const finalGoal = Math.max(300, Math.min(1500, activityGoal));
      console.log('Debug final goal:', { 
        kcalTarget, 
        caloriesConsumed, 
        caloriesBurned, 
        deficit: caloriesConsumed - caloriesBurned,
        activityGoal, 
        finalGoal 
      });
      return finalGoal;
    } catch (error) {
      console.error('Erreur dans calculateDailyCalorieGoal:', error);
      return 500; // Valeur par défaut en cas d'erreur
    }
  };

  // Forcer la mise à jour du cercle de progression
  useEffect(() => {
    setCircleKey(prev => prev + 1);
  }, [dailyIntake.kcal, dailySteps.steps, workoutStates, profile?.goal]);

  // Sauvegarder automatiquement les données dans l'historique
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveCurrentDayToHistory();
    }, 30000); // Sauvegarder toutes les 30 secondes

    return () => clearInterval(saveInterval);
  }, [profile, dailyIntake, macronutrients, dailySteps, dailyWorkouts, dailyMeals]);

  // Ne pas fermer automatiquement le modal de détails quand le calendrier se ferme
  // Le modal se fermera seulement quand l'utilisateur clique sur le X

  const loadData = useCallback(async () => {
    try {
      // Charger les données de base
      const [profileData, workoutData, mealData, intakeData, stepsData, permissionsData] = await Promise.all([
        loadProfile(),
        latestByType("workout"),
        latestByType("meal"),
        loadDailyIntake(),
        checkAndResetIfNewDay(),
        checkHealthPermissions()
      ]);

      setProfile(profileData);
      setLastWorkout(workoutData);
      setLastMeal(mealData);
      setDailyIntake(intakeData);
      setDailySteps(stepsData);
      setHasHealthPermissions(permissionsData);

      // Charger les séances sauvegardées
      if (profileData?.savedPlans?.workouts) {
        const workouts = profileData.savedPlans.workouts.map(workout => ({
          id: workout.id,
          title: workout.title,
          content: workout.content,
          date: workout.date
        }));
        setSavedWorkouts(workouts);
      }

      // Charger les séances du jour depuis le profil
      if (profileData?.dailyWorkouts && Array.isArray(profileData.dailyWorkouts)) {
        // Nouvelles séances multiples
        const workouts = profileData.dailyWorkouts.map((workout: any) => ({
          ...workout,
          calories: workout.calories || estimateWorkoutCalories(workout.content, profileData)
        }));
        setDailyWorkouts(workouts);
      } else if (profileData?.dailyWorkout) {
        // Ancien format (compatibilité)
        const workout = profileData.dailyWorkout;
        const estimatedCalories = workout.calories || estimateWorkoutCalories(workout.content, profileData);
        setDailyWorkouts([{
          ...workout,
          calories: estimatedCalories,
          sessionType: 'morning' as const
        }]);
      } else if (workoutData) {
        // Si pas de séance du jour, utiliser la dernière séance comme base
        const estimatedCalories = estimateWorkoutCalories(workoutData.content, profileData);
        setDailyWorkouts([{
          id: `daily_${Date.now()}`,
          title: workoutData.title,
          content: workoutData.content,
          duration: 45, // Durée par défaut
          calories: estimatedCalories,
          completed: false,
          sessionType: 'morning' as const
        }]);
      }
      
      // Charger les repas quotidiens depuis le profil
      if (profileData?.dailyMeals) {
        const meals = {
          breakfast: profileData.dailyMeals.breakfast ? { ...profileData.dailyMeals.breakfast, eaten: profileData.dailyMeals.breakfast.eaten || false } : null,
          lunch: profileData.dailyMeals.lunch ? { ...profileData.dailyMeals.lunch, eaten: profileData.dailyMeals.lunch.eaten || false } : null,
          snack: profileData.dailyMeals.snack ? { ...profileData.dailyMeals.snack, eaten: profileData.dailyMeals.snack.eaten || false } : null,
          dinner: profileData.dailyMeals.dinner ? { ...profileData.dailyMeals.dinner, eaten: profileData.dailyMeals.dinner.eaten || false } : null
        };
        setDailyMeals(meals);

        // Recalculer les valeurs nutritionnelles basées sur les repas mangés
        const nutritionFromMeals = recalculateNutritionFromMeals(meals);
        setDailyIntake({ kcal: nutritionFromMeals.calories });
        setMacronutrients({ 
          carbs: nutritionFromMeals.carbs, 
          protein: nutritionFromMeals.protein, 
          fat: nutritionFromMeals.fat 
        });
        
        // Sauvegarder les valeurs recalculées
        await saveDailyIntake({ kcal: nutritionFromMeals.calories });
        console.log(`Valeurs nutritionnelles recalculées: ${nutritionFromMeals.calories} kcal, ${nutritionFromMeals.carbs}g glucides, ${nutritionFromMeals.protein}g protéines, ${nutritionFromMeals.fat}g graisses`);
      }

      // Charger les repas sauvegardés pour l'import
      if (profileData?.savedPlans?.meals) {
        setSavedMeals(profileData.savedPlans.meals);
      }
      
      // Vérifier et réinitialiser les données nutritionnelles si nouveau jour
      await checkAndResetNutritionIfNewDay();

      // Actualiser automatiquement les pas si les permissions sont accordées
      if (permissionsData) {
        try {
          const newSteps = await getStepsFromSensor();
          const updatedSteps = { steps: newSteps, lastUpdated: new Date().toISOString() };
          setDailySteps(updatedSteps);
          await saveDailySteps(updatedSteps);
        } catch (error) {
          console.error("Erreur lors de l'actualisation automatique des pas:", error);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  }, []);

  // Recharger les données à chaque fois que l'utilisateur revient sur cet onglet
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fonctions d'extraction et de nettoyage (copiées depuis le chat)
  const extractMealTitle = (content: string): string => {
    // Diviser le contenu en lignes et filtrer les lignes vides
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Si on a au moins 1 ligne, prendre la première ligne comme titre (nom du plat)
    if (lines.length >= 1) {
      const firstLine = lines[0].trim();
      // Nettoyer la ligne (enlever les deux-points, etc.)
      let cleanedTitle = firstLine.replace(/[:•\-\*]/g, '').trim();
      
      // Supprimer les préfixes de repas
      cleanedTitle = cleanedTitle.replace(/^(PetitDéjeuner|Petit-déjeuner|Déjeuner|Dîner|Collation|Snack)\s*:?\s*/i, '');
      
      return cleanedTitle;
    }

    // Fallback: retourner un titre générique
    return "Recette générée";
  };

  const cleanMealContent = (content: string): string => {
    // Diviser le contenu en lignes et filtrer les lignes vides
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Si on a au moins 2 lignes, supprimer seulement la première ligne (titre)
    if (lines.length >= 2) {
      // Prendre toutes les lignes sauf la première (qui est le titre)
      const contentLines = lines.slice(1);
      return contentLines.join('\n').trim();
    }
    
    // Si on a seulement une ligne, essayer de nettoyer avec les patterns
    if (lines.length === 1) {
      const introPatterns = [
        /Voici une idée de [^:]+ pour [^:]+:/gi,
        /Voici une idée de [^:]+:/gi,
        /Voici [^:]+ pour [^:]+:/gi,
        /Voici [^:]+:/gi,
        /Je te propose [^:]+:/gi,
        /Voici [^:]+ équilibré:/gi,
      ];

      let cleanedContent = content;
      
      for (const pattern of introPatterns) {
        cleanedContent = cleanedContent.replace(pattern, '').trim();
      }

      // Nettoyer les espaces et sauts de ligne en début
      cleanedContent = cleanedContent.replace(/^\s*\n+/, '').trim();
      
      return cleanedContent;
    }
    
    return content;
  };

  // Fonctions pour gérer l'ajout de repas
  const handleAddMealClick = () => {
    setShowMealTypeSelector(true);
  };

  const handleMealTypeSelect = (mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    setCurrentMealType(mealType);
    setShowMealTypeSelector(false);
    setShowAddMealModal(true);
  };

  const handleSaveManualMeal = async () => {
    if (!currentMealType || !manualMealTitle.trim() || !manualMealContent.trim()) {
      return;
    }

    const success = await saveDailyMeal(currentMealType, {
      id: `${currentMealType}_${Date.now()}`,
      title: manualMealTitle.trim(),
      content: manualMealContent.trim(),
      date: new Date().toISOString(),
      eaten: false
    });

    if (success) {
      // Recharger les données pour mettre à jour l'affichage
      await loadData();
      // Fermer la modal et réinitialiser les champs
      setShowAddMealModal(false);
      setManualMealTitle('');
      setManualMealContent('');
      setCurrentMealType(null);
    }
  };

  const handleImportMeal = async (meal: { id: string; title: string; content: string; date: string }) => {
    if (!currentMealType) return;

    // Utiliser directement le titre et le contenu déjà formatés
    const success = await saveDailyMeal(currentMealType, {
      id: `${currentMealType}_${Date.now()}`,
      title: meal.title,
      content: meal.content,
      date: new Date().toISOString(),
      eaten: false
    });

    if (success) {
      // Recharger les données pour mettre à jour l'affichage
      await loadData();
      // Fermer la modal
      setShowImportMealModal(false);
      setCurrentMealType(null);
    }
  };

  // Fonction pour recalculer les valeurs nutritionnelles basées sur les repas mangés
  // Fonction pour estimer les calories brûlées lors d'une séance


  const recalculateNutritionFromMeals = (meals: typeof dailyMeals) => {
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;

    Object.entries(meals).forEach(([mealType, meal]) => {
      if (meal && meal.eaten) {
        const nutrition = estimateMealNutrition(meal.content, mealType as 'breakfast' | 'lunch' | 'snack' | 'dinner');
        totalCalories += nutrition.calories;
        totalCarbs += nutrition.carbs;
        totalProtein += nutrition.protein;
        totalFat += nutrition.fat;
      }
    });

    return { calories: totalCalories, carbs: totalCarbs, protein: totalProtein, fat: totalFat };
  };

  // Fonction pour estimer les calories et macronutriments d'un repas
  const estimateMealNutrition = (mealContent: string, mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    // Estimation basée sur le type de repas et le contenu
    const baseCalories = {
      breakfast: 400,
      lunch: 600,
      snack: 200,
      dinner: 500
    };

    // Estimation des macronutriments (approximation)
    const baseMacros = {
      breakfast: { carbs: 50, protein: 20, fat: 15 },
      lunch: { carbs: 75, protein: 30, fat: 20 },
      snack: { carbs: 25, protein: 10, fat: 8 },
      dinner: { carbs: 60, protein: 35, fat: 18 }
    };

    // Ajustements basés sur le contenu (mots-clés)
    let multiplier = 1;
    const content = mealContent.toLowerCase();

    // Détecter des ingrédients riches en calories
    if (content.includes('avocat') || content.includes('huile') || content.includes('beurre')) {
      multiplier += 0.2; // +20% de calories
    }
    if (content.includes('pâtes') || content.includes('riz') || content.includes('quinoa')) {
      multiplier += 0.15; // +15% de glucides
    }
    if (content.includes('poulet') || content.includes('saumon') || content.includes('œuf')) {
      multiplier += 0.1; // +10% de protéines
    }
    if (content.includes('salade') || content.includes('légumes') || content.includes('brocoli')) {
      multiplier -= 0.1; // -10% de calories (repas plus léger)
    }

    const calories = Math.round(baseCalories[mealType] * multiplier);
    const carbs = Math.round(baseMacros[mealType].carbs * multiplier);
    const protein = Math.round(baseMacros[mealType].protein * multiplier);
    const fat = Math.round(baseMacros[mealType].fat * multiplier);

    return { calories, carbs, protein, fat };
  };

  // Fonctions de gestion des séances
  const toggleWorkoutCompleted = async (workoutId: string) => {
    const workout = dailyWorkouts.find(w => w.id === workoutId);
    if (!workout) return;

    const updatedWorkouts = dailyWorkouts.map(w => 
      w.id === workoutId 
        ? { 
            ...w, 
            completed: !w.completed,
            completedAt: !w.completed ? new Date().toISOString() : undefined
          }
        : w
    );

    setDailyWorkouts(updatedWorkouts);

    // Sauvegarder dans le profil
    try {
      const profileData = await loadProfile();
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          dailyWorkouts: updatedWorkouts
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        console.log(`Séance ${workoutId} marquée comme ${!workout.completed ? 'terminée' : 'non terminée'}`);
      }
    } catch (error) {
      console.error('Erreur sauvegarde séance:', error);
    }
  };

  const importWorkout = async (workout: { id: string; title: string; content: string; date: string }) => {
    if (dailyWorkouts.length >= 2) {
      alert('Maximum 2 séances par jour');
      return;
    }

    const sessionType: 'morning' | 'evening' = dailyWorkouts.length === 0 ? 'morning' : 'evening';
    const estimatedCalories = estimateWorkoutCalories(workout.content, profile);
    
    const newWorkout = {
      id: `daily_${Date.now()}`,
      title: workout.title,
      content: workout.content,
      duration: 45,
      calories: estimatedCalories,
      completed: false,
      sessionType
    };

    const updatedWorkouts = [...dailyWorkouts, newWorkout];
    setDailyWorkouts(updatedWorkouts);

    // Sauvegarder dans le profil
    try {
      const profileData = await loadProfile();
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          dailyWorkouts: updatedWorkouts
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        console.log('Séance importée:', newWorkout.title);
      }
    } catch (error) {
      console.error('Erreur sauvegarde séance importée:', error);
    }

    setShowImportModal(false);
  };

  const removeWorkout = async (workoutId: string) => {
    const updatedWorkouts = dailyWorkouts.filter(w => w.id !== workoutId);
    setDailyWorkouts(updatedWorkouts);

    // Sauvegarder dans le profil
    try {
      const profileData = await loadProfile();
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          dailyWorkouts: updatedWorkouts
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        console.log('Séance supprimée:', workoutId);
      }
    } catch (error) {
      console.error('Erreur suppression séance:', error);
    }
  };

  const openWorkoutDetail = (workout: typeof dailyWorkouts[0]) => {
    setSelectedWorkout(workout);
    setShowWorkoutModal(true);
  };

  // Fonction pour basculer l'état "eaten" d'un repas
  const toggleMealEaten = async (mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    if (!dailyMeals[mealType]) return;

    const meal = dailyMeals[mealType]!;
    const wasEaten = meal.eaten;
    const newEatenState = !wasEaten;

    const updatedMeals = {
      ...dailyMeals,
      [mealType]: {
        ...meal,
        eaten: newEatenState
      }
    };

    setDailyMeals(updatedMeals);

    // Calculer les calories et macronutriments du repas
    const mealNutrition = estimateMealNutrition(meal.content, mealType);
    
    // Mettre à jour les valeurs nutritionnelles
    if (newEatenState) {
      // Repas marqué comme mangé - ajouter les valeurs
      const newKcal = dailyIntake.kcal + mealNutrition.calories;
      const newCarbs = macronutrients.carbs + mealNutrition.carbs;
      const newProtein = macronutrients.protein + mealNutrition.protein;
      const newFat = macronutrients.fat + mealNutrition.fat;

      setDailyIntake({ kcal: newKcal });
      setMacronutrients({ carbs: newCarbs, protein: newProtein, fat: newFat });

      // Sauvegarder les nouvelles valeurs
      await saveDailyIntake({ kcal: newKcal });
      console.log(`Repas ${mealType} mangé: +${mealNutrition.calories} kcal, +${mealNutrition.carbs}g glucides, +${mealNutrition.protein}g protéines, +${mealNutrition.fat}g graisses`);
    } else {
      // Repas marqué comme non mangé - soustraire les valeurs
      const newKcal = Math.max(0, dailyIntake.kcal - mealNutrition.calories);
      const newCarbs = Math.max(0, macronutrients.carbs - mealNutrition.carbs);
      const newProtein = Math.max(0, macronutrients.protein - mealNutrition.protein);
      const newFat = Math.max(0, macronutrients.fat - mealNutrition.fat);

      setDailyIntake({ kcal: newKcal });
      setMacronutrients({ carbs: newCarbs, protein: newProtein, fat: newFat });

      // Sauvegarder les nouvelles valeurs
      await saveDailyIntake({ kcal: newKcal });
      console.log(`Repas ${mealType} non mangé: -${mealNutrition.calories} kcal, -${mealNutrition.carbs}g glucides, -${mealNutrition.protein}g protéines, -${mealNutrition.fat}g graisses`);
    }

    // Sauvegarder l'état des repas dans AsyncStorage
    try {
      const profileData = await loadProfile();
      if (profileData) {
        const updatedProfile = {
          ...profileData,
          dailyMeals: updatedMeals
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        console.log(`Repas ${mealType} marqué comme ${newEatenState ? 'mangé' : 'non mangé'}`);
      }
    } catch (error) {
      console.error('Erreur sauvegarde repas:', error);
    }
  };

  const goal = profile?.goal || params.goal || "Objectif général";
  const sessions = profile?.sessions || Number(params.sessions || 4);
  const diet = profile?.diet || params.diet || "Aucune restriction";

  // Calcul de l'objectif calorique
  const kcalTarget = profile ? estimateKcalTarget(profile) : 2000;
  const kcalConsumed = dailyIntake.kcal;
  const kcalProgressPercentage = Math.min((kcalConsumed / kcalTarget) * 100, 100);

  // Calcul des objectifs de macronutriments (basés sur les calories cibles)
  const calculateMacroTargets = (kcalTarget: number) => {
    // Répartition standard : 50% glucides, 25% protéines, 25% graisses
    // 1g glucides = 4 kcal, 1g protéines = 4 kcal, 1g graisses = 9 kcal
    const carbsTarget = Math.round((kcalTarget * 0.5) / 4); // 50% en glucides
    const proteinTarget = Math.round((kcalTarget * 0.25) / 4); // 25% en protéines
    const fatTarget = Math.round((kcalTarget * 0.25) / 9); // 25% en graisses
    
    return { carbsTarget, proteinTarget, fatTarget };
  };

  const { carbsTarget, proteinTarget, fatTarget } = calculateMacroTargets(kcalTarget);
  
  // Calcul des pourcentages de progression pour chaque macronutriment
  const carbsProgress = carbsTarget > 0 ? Math.min((macronutrients.carbs / carbsTarget) * 100, 100) : 0;
  const proteinProgress = proteinTarget > 0 ? Math.min((macronutrients.protein / proteinTarget) * 100, 100) : 0;
  const fatProgress = fatTarget > 0 ? Math.min((macronutrients.fat / fatTarget) * 100, 100) : 0;

  // Debug: Log des informations de calcul des calories
  if (profile) {
    console.log("Calcul des calories cibles (Dashboard rechargé):");
    console.log(`- Âge: ${profile.age || "Non défini"}`);
    console.log(`- Poids: ${profile.weight || "Non défini"} kg`);
    console.log(`- Taille: ${profile.height || "Non défini"} cm`);
    console.log(`- Objectif: ${profile.goal || "Non défini"}`);
    console.log(`- Séances/semaine: ${profile.sessions || 0}`);
    console.log(`- Niveau de sport: ${profile.chatResponses?.fitnessLevel || profile.fitnessLevel || "Non défini"}`);
    console.log(`- Régime: ${profile.diet || "Non défini"}`);
    console.log(`- Calories cibles calculées: ${kcalTarget} kcal`);
    console.log(`- Consommé: ${kcalConsumed} kcal`);
    console.log(`- Progression: ${kcalProgressPercentage.toFixed(1)}%`);
    console.log("🥗 Objectifs macronutriments:");
    console.log(`- Glucides: ${carbsTarget}g (consommé: ${macronutrients.carbs}g, ${carbsProgress.toFixed(1)}%)`);
    console.log(`- Protéines: ${proteinTarget}g (consommé: ${macronutrients.protein}g, ${proteinProgress.toFixed(1)}%)`);
    console.log(`- Graisses: ${fatTarget}g (consommé: ${macronutrients.fat}g, ${fatProgress.toFixed(1)}%)`);
    console.log(`- Calories cibles pour calcul: ${kcalTarget} kcal`);
  }

  // Calcul des pas
  const stepsTarget = getDailyStepsTarget();
  const stepsCurrent = dailySteps.steps;
  const stepsProgressPercentage = Math.min((stepsCurrent / stepsTarget) * 100, 100);

  // Fonction pour vérifier et réinitialiser les données nutritionnelles quotidiennes
  const checkAndResetNutritionIfNewDay = async () => {
    const today = new Date().toDateString();
    const lastResetDate = await AsyncStorage.getItem('last_nutrition_reset_date');
    
    if (lastResetDate !== today) {
      // Nouveau jour : réinitialiser les calories, macronutriments et repas
      const newIntake = { kcal: 0 };
      setDailyIntake(newIntake);
      await saveDailyIntake(newIntake);
      setMacronutrients({ carbs: 0, protein: 0, fat: 0 });
      setDailyMeals({ breakfast: null, lunch: null, snack: null, dinner: null });
      await AsyncStorage.setItem('last_nutrition_reset_date', today);
      console.log('Données nutritionnelles réinitialisées pour le nouveau jour');
    }
  };

  // Fonction pour sauvegarder les données du jour dans l'historique
  const saveCurrentDayToHistory = async () => {
    if (!profile) return;

    // Utiliser l'heure locale pour éviter les décalages de fuseau horaire
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayData = {
      date: todayString,
      nutrition: {
        kcal: dailyIntake.kcal,
        carbs: macronutrients.carbs,
        protein: macronutrients.protein,
        fat: macronutrients.fat,
      },
      steps: {
        count: dailySteps.steps,
        target: getDailyStepsTarget(),
      },
      workouts: {
        completed: dailyWorkouts.filter(w => w.completed).length,
        total: dailyWorkouts.length,
        caloriesBurned: calculateDailyCaloriesBurned(),
        target: calculateDailyCalorieGoal(),
      },
      meals: {
        breakfast: dailyMeals.breakfast ? { 
          title: dailyMeals.breakfast.title, 
          eaten: dailyMeals.breakfast.eaten || false 
        } : undefined,
        lunch: dailyMeals.lunch ? { 
          title: dailyMeals.lunch.title, 
          eaten: dailyMeals.lunch.eaten || false 
        } : undefined,
        snack: dailyMeals.snack ? { 
          title: dailyMeals.snack.title, 
          eaten: dailyMeals.snack.eaten || false 
        } : undefined,
        dinner: dailyMeals.dinner ? { 
          title: dailyMeals.dinner.title, 
          eaten: dailyMeals.dinner.eaten || false 
        } : undefined,
      },
    };

    await saveDailyHistory(dayData);
  };

  // Fonction pour charger les données d'une journée sélectionnée
  const handleDateSelect = async (date: string) => {
    console.log('🗓️ Date sélectionnée:', date);
    setSelectedDate(date);
    
    try {
      const dayData = await loadDailyHistory(date);
      console.log('📊 Données de la journée:', dayData);
      console.log('📊 Type de dayData:', typeof dayData);
      console.log('📊 dayData est null?', dayData === null);
      
      setSelectedDayData(dayData);
      setShowDayDetail(true);
      setShowCalendar(false); // Fermer le calendrier après sélection
      console.log('✅ Modal ouvert pour la date:', date);
      console.log('✅ showDayDetail:', true);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
    }
  };

  // Fonction pour fermer le calendrier
  const handleCloseCalendar = () => {
    setShowCalendar(false);
    // Ne pas fermer le modal de détails ici, il se fermera avec le calendrier
  };








  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000" }} contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20 }}>
      {/* Header avec logo */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
          Salut Matteo
      </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setShowCalendar(true)}
            style={{
              backgroundColor: "#0070F3",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              minHeight: 40,
            }}
          >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            {/* Icône de calendrier stylisée */}
            <View style={{
              width: 20,
              height: 18,
              backgroundColor: "transparent",
              borderWidth: 1.5,
              borderColor: "#fff",
              borderRadius: 2,
              position: "relative",
            }}>
              {/* Anneaux de suspension */}
              <View style={{
                position: "absolute",
                top: -4,
                left: 3,
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: "#fff",
              }} />
              <View style={{
                position: "absolute",
                top: -4,
                right: 3,
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: "#fff",
              }} />
              
              {/* Grille des jours */}
              <View style={{
                flexDirection: "row",
                flexWrap: "wrap",
                padding: 2,
                gap: 1,
              }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 2,
                      height: 2,
                      backgroundColor: "#fff",
                      borderRadius: 0.5,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </Pressable>
        
        </View>
      </View>

      {/* Section Nutrition et Pas - 3/4 et 1/4 */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        {/* Barre de progression des calories - 3/4 de la largeur */}
        <View
          style={{
            flex: 3,
            backgroundColor: "#111",
            borderColor: "#1d1d1d",
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 8 }}>
            NUTRITION DU JOUR
      </Text>

          {/* Affichage des calories */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 14 }}>
              {kcalConsumed} kcal
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14 }}>
              / {kcalTarget} kcal
            </Text>
          </View>

          {/* Barre de progression */}
          <View
            style={{
              backgroundColor: "#2a2a2a",
              height: 6,
              borderRadius: 3,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: kcalProgressPercentage >= 100 ? "#FF6B35" : "#0070F3",
                height: "100%",
                width: `${kcalProgressPercentage}%`,
                borderRadius: 3,
              }}
            />
          </View>



          {/* Section Macronutriments */}
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            {/* Cercle Glucides */}
            <View style={{ alignItems: "center", marginRight: 16 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: "#2a2a2a",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 4,
              }}>
                <Text style={{ color: "#ff6b9d", fontSize: 12, fontWeight: "700" }}>
                  {Math.round(carbsProgress)}%
                </Text>
              </View>
              <Text style={{ color: "#ff6b9d", fontSize: 10, fontWeight: "600", marginBottom: 2 }}>
                Glucides
              </Text>
              <Text style={{ color: "#ff6b9d", fontSize: 9 }}>
                {carbsTarget - macronutrients.carbs}g restants
              </Text>
            </View>

            {/* Cercle Protéines */}
            <View style={{ alignItems: "center", marginRight: 16 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: "#2a2a2a",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 4,
              }}>
                <Text style={{ color: "#4dabf7", fontSize: 12, fontWeight: "700" }}>
                  {Math.round(proteinProgress)}%
                </Text>
              </View>
              <Text style={{ color: "#4dabf7", fontSize: 10, fontWeight: "600", marginBottom: 2 }}>
                Protéine
              </Text>
              <Text style={{ color: "#4dabf7", fontSize: 9 }}>
                {proteinTarget - macronutrients.protein}g restants
              </Text>
            </View>

            {/* Cercle Graisses */}
            <View style={{ alignItems: "center" }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: "#2a2a2a",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 4,
              }}>
                <Text style={{ color: "#ffa94d", fontSize: 12, fontWeight: "700" }}>
                  {Math.round(fatProgress)}%
                </Text>
              </View>
              <Text style={{ color: "#ffa94d", fontSize: 10, fontWeight: "600", marginBottom: 2 }}>
                Graisse
              </Text>
              <Text style={{ color: "#ffa94d", fontSize: 9 }}>
                {fatTarget - macronutrients.fat}g restants
              </Text>
            </View>
          </View>


        </View>

        {/* Cercle de progression des pas - 1/4 de la largeur */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#111",
            borderColor: "#1d1d1d",
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, marginBottom: 8 }}>
            PAS
          </Text>
          
          {/* Cercle de progression - Plus gros */}
          <View style={{ position: "relative", marginBottom: 8 }}>
            {/* Cercle de fond */}
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                borderWidth: 8,
                borderColor: "#2a2a2a",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Cercle de progression - Version améliorée */}
              <View
                style={{
                  position: "absolute",
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 8,
                  borderColor: "transparent",
                  borderTopColor: stepsProgressPercentage >= 100 ? "#0070F3" : "#0070F3",
                  borderRightColor: stepsProgressPercentage >= 75 ? (stepsProgressPercentage >= 100 ? "#0070F3" : "#0070F3") : "transparent",
                  borderBottomColor: stepsProgressPercentage >= 50 ? (stepsProgressPercentage >= 100 ? "#0070F3" : "#0070F3") : "transparent",
                  borderLeftColor: stepsProgressPercentage >= 25 ? (stepsProgressPercentage >= 100 ? "#0070F3" : "#0070F3") : "transparent",
                  transform: [{ rotate: "-90deg" }],
                }}
              />
              
              {/* Texte au centre */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>
                  {Math.round(stepsProgressPercentage)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Affichage des pas */}
          <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 12, textAlign: "center" }}>
            {stepsCurrent.toLocaleString()} / 10,000
          </Text>
        </View>
      </View>

      {/* Section Nutrition - Repas de la journée */}
      <View
        style={{
          backgroundColor: "#111",
          borderColor: "#1d1d1d",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 12 }}>
          REPAS DU JOUR
        </Text>
        
        <View style={{ gap: 12 }}>
          {/* Petit-déjeuner */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Case à cocher pour marquer comme mangé */}
            <Pressable
              onPress={() => dailyMeals.breakfast && toggleMealEaten('breakfast')}
              disabled={!dailyMeals.breakfast}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: dailyMeals.breakfast ? (dailyMeals.breakfast.eaten ? "#00D4AA" : "#666") : "#333",
                backgroundColor: dailyMeals.breakfast?.eaten ? "#00D4AA" : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                opacity: dailyMeals.breakfast ? 1 : 0.3,
              }}
            >
              {dailyMeals.breakfast?.eaten && (
                <Text style={{ color: "#000", fontSize: 12, fontWeight: "bold" }}>✓</Text>
              )}
            </Pressable>
            
            <Pressable 
              style={{ flex: 1 }}
              onPress={() => {
                if (dailyMeals.breakfast) {
                  setSelectedMeal(dailyMeals.breakfast);
                  setShowMealModal(true);
                }
              }}
            >
              <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600" }}>Petit-déjeuner</Text>
              <Text style={{ 
                color: dailyMeals.breakfast ? (dailyMeals.breakfast.eaten ? "#00D4AA" : "#fff") : "#aaa", 
                fontSize: 12,
                textDecorationLine: dailyMeals.breakfast?.eaten ? "line-through" : "none"
              }}>
                {dailyMeals.breakfast ? dailyMeals.breakfast.title : "Pas encore planifié"}
        </Text>
            </Pressable>
          </View>

          {/* Déjeuner */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Case à cocher pour marquer comme mangé */}
            <Pressable
              onPress={() => dailyMeals.lunch && toggleMealEaten('lunch')}
              disabled={!dailyMeals.lunch}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: dailyMeals.lunch ? (dailyMeals.lunch.eaten ? "#00D4AA" : "#666") : "#333",
                backgroundColor: dailyMeals.lunch?.eaten ? "#00D4AA" : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                opacity: dailyMeals.lunch ? 1 : 0.3,
              }}
            >
              {dailyMeals.lunch?.eaten && (
                <Text style={{ color: "#000", fontSize: 12, fontWeight: "bold" }}>✓</Text>
              )}
            </Pressable>
            
            <Pressable 
              style={{ flex: 1 }}
              onPress={() => {
                if (dailyMeals.lunch) {
                  setSelectedMeal(dailyMeals.lunch);
                  setShowMealModal(true);
                }
              }}
            >
              <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600" }}>Déjeuner</Text>
              <Text style={{ 
                color: dailyMeals.lunch ? (dailyMeals.lunch.eaten ? "#00D4AA" : "#fff") : "#aaa", 
                fontSize: 12,
                textDecorationLine: dailyMeals.lunch?.eaten ? "line-through" : "none"
              }}>
                {dailyMeals.lunch ? dailyMeals.lunch.title : "Pas encore planifié"}
          </Text>
            </Pressable>
          </View>

          {/* Collation */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Case à cocher pour marquer comme mangé */}
            <Pressable
              onPress={() => dailyMeals.snack && toggleMealEaten('snack')}
              disabled={!dailyMeals.snack}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: dailyMeals.snack ? (dailyMeals.snack.eaten ? "#00D4AA" : "#666") : "#333",
                backgroundColor: dailyMeals.snack?.eaten ? "#00D4AA" : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                opacity: dailyMeals.snack ? 1 : 0.3,
              }}
            >
              {dailyMeals.snack?.eaten && (
                <Text style={{ color: "#000", fontSize: 12, fontWeight: "bold" }}>✓</Text>
              )}
            </Pressable>
            
          <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                if (dailyMeals.snack) {
                  setSelectedMeal(dailyMeals.snack);
                  setShowMealModal(true);
                }
              }}
            >
              <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600" }}>Collation</Text>
              <Text style={{ 
                color: dailyMeals.snack ? (dailyMeals.snack.eaten ? "#00D4AA" : "#fff") : "#aaa", 
                fontSize: 12,
                textDecorationLine: dailyMeals.snack?.eaten ? "line-through" : "none"
              }}>
                {dailyMeals.snack ? dailyMeals.snack.title : "Pas encore planifié"}
              </Text>
            </Pressable>
          </View>

          {/* Dîner */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Case à cocher pour marquer comme mangé */}
            <Pressable
              onPress={() => dailyMeals.dinner && toggleMealEaten('dinner')}
              disabled={!dailyMeals.dinner}
            style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: dailyMeals.dinner ? (dailyMeals.dinner.eaten ? "#00D4AA" : "#666") : "#333",
                backgroundColor: dailyMeals.dinner?.eaten ? "#00D4AA" : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
                opacity: dailyMeals.dinner ? 1 : 0.3,
              }}
            >
              {dailyMeals.dinner?.eaten && (
                <Text style={{ color: "#000", fontSize: 12, fontWeight: "bold" }}>✓</Text>
              )}
            </Pressable>
            
            <Pressable 
              style={{ flex: 1 }}
              onPress={() => {
                if (dailyMeals.dinner) {
                  setSelectedMeal(dailyMeals.dinner);
                  setShowMealModal(true);
                }
              }}
            >
              <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600" }}>Dîner</Text>
              <Text style={{ 
                color: dailyMeals.dinner ? (dailyMeals.dinner.eaten ? "#00D4AA" : "#fff") : "#aaa", 
                fontSize: 12,
                textDecorationLine: dailyMeals.dinner?.eaten ? "line-through" : "none"
              }}>
                {dailyMeals.dinner ? dailyMeals.dinner.title : "Pas encore planifié"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bouton d'ajout de repas - rond en bas à droite */}
        <View style={{ alignItems: "flex-end", marginTop: 16 }}>
          <Pressable
            onPress={handleAddMealClick}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "#0070F3",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#0070F3",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* SPORT - Séance du jour */}
      <View
        style={{
          backgroundColor: "#111",
          borderColor: "#1d1d1d",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 16 }}>
          SPORT
        </Text>
        
        {/* Barre de progression des calories dépensées */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 14 }}>
              Calories dépensées
        </Text>
            <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 14 }}>
              {Math.round(calculateDailyCaloriesBurned())} / {Math.round(calculateDailyCalorieGoal())} kcal
          </Text>
          </View>
          
          {/* Barre de progression */}
          <View
            style={{
              backgroundColor: "#2a2a2a",
              height: 6,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: "#0070F3",
                height: "100%",
                width: `${Math.min((calculateDailyCaloriesBurned() / calculateDailyCalorieGoal()) * 100, 100)}%`,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
        
        {dailyWorkouts.length > 0 ? (
          <View>
            {dailyWorkouts.map((workout, index) => (
              <View key={workout.id} style={{ marginBottom: 12 }}>
                <Pressable
                  onPress={() => openWorkoutDetail(workout)}
                  style={{
                    backgroundColor: "#1a1a1a",
                    borderColor: workout.completed ? "#22c55e" : "#333",
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        color: workout.completed ? "#22c55e" : "#fff", 
                        fontWeight: "600", 
                        fontSize: 14,
                        textDecorationLine: workout.completed ? "line-through" : "none"
                      }}>
                        {workout.title}
        </Text>
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
                        {workout.duration} min • {workout.calories} kcal • {workout.sessionType === 'morning' ? 'Matin' : 'Soir'}
          </Text>
                    </View>
                    
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable
                        onPress={() => toggleWorkoutCompleted(workout.id)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: workout.completed ? "#22c55e" : "#555",
                          backgroundColor: workout.completed ? "#22c55e" : "transparent",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {workout.completed && (
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>✓</Text>
                        )}
                      </Pressable>
                      
          <Pressable
                        onPress={() => removeWorkout(workout.id)}
            style={{
                          width: 24,
                          height: 24,
              borderRadius: 12,
                          backgroundColor: "#ff4444",
                          justifyContent: "center",
              alignItems: "center",
            }}
          >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>×</Text>
          </Pressable>
      </View>
                  </View>
                </Pressable>
              </View>
            ))}

            {dailyWorkouts.length < 2 && (
          <Pressable
                onPress={() => setShowImportModal(true)}
            style={{
                  backgroundColor: "#0070F3",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: "center",
                  marginTop: 8,
            }}
          >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                  Importer une séance enregistrée
            </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ color: "#888", fontSize: 16, marginBottom: 16 }}>
              Aucune séance planifiée
            </Text>
            <Pressable
              onPress={() => setShowImportModal(true)}
              style={{
                backgroundColor: "#0070F3",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Importer une séance enregistrée</Text>
          </Pressable>
          </View>
        )}
      </View>


      {/* LISTE DE COURSES */}
      <View
        style={{
          backgroundColor: "#111",
          borderColor: "#1d1d1d",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
          LISTE DE COURSES
        </Text>
        <Text style={{ color: "#ccc", marginBottom: 12 }}>
          Gère tes ingrédients et organise tes courses
        </Text>
        <Link href="/shopping" asChild>
          <Pressable
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Voir ma liste</Text>
          </Pressable>
        </Link>
      </View>

      {/* Modal de détail des repas */}
      <Modal
        visible={showMealModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowMealModal(false);
          setSelectedMeal(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
              borderWidth: 1,
              borderColor: "#1d1d1d",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 }}>
                {selectedMeal?.title}
            </Text>
          <Pressable
                onPress={() => {
                  setShowMealModal(false);
                  setSelectedMeal(null);
                }}
            style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>✕</Text>
          </Pressable>
      </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={{ color: "#ccc", fontSize: 14, lineHeight: 20 }}>
                {selectedMeal?.content}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal d'ajout de repas manuel */}
      <Modal
        visible={showAddMealModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddMealModal(false);
          setManualMealTitle('');
          setManualMealContent('');
          setCurrentMealType(null);
        }}
      >
        <View
            style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
              alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
              borderWidth: 1,
              borderColor: "#1d1d1d",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 }}>
                Ajouter un repas
              </Text>
              <Pressable
                onPress={() => {
                  setShowAddMealModal(false);
                  setManualMealTitle('');
                  setManualMealContent('');
                  setCurrentMealType(null);
                }}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>✕</Text>
          </Pressable>
      </View>

            <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Nom du plat
            </Text>
            <TextInput
              value={manualMealTitle}
              onChangeText={setManualMealTitle}
              placeholder="Ex: Petit Déjeuner Protéiné"
              placeholderTextColor="#666"
              style={{
                backgroundColor: "#222",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#333",
              }}
            />
            
            <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Recette
            </Text>
            <TextInput
              value={manualMealContent}
              onChangeText={setManualMealContent}
              placeholder="Décris la recette..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              style={{
                backgroundColor: "#222",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#333",
                textAlignVertical: "top",
              }}
            />
            
            <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
                onPress={() => {
                  setShowAddMealModal(false);
                  setShowImportMealModal(true);
                }}
            style={{
                  flex: 1,
                  backgroundColor: "#333",
              paddingVertical: 12,
                  borderRadius: 8,
              alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Importer depuis mes repas enregistrés</Text>
              </Pressable>
              
          <Pressable
                onPress={handleSaveManualMeal}
                style={{
                  flex: 1,
                  backgroundColor: "#0070F3",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'import de repas */}
      <Modal
        visible={showImportMealModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowImportMealModal(false);
          setCurrentMealType(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
              borderWidth: 1,
              borderColor: "#1d1d1d",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 }}>
                Importer un repas
              </Text>
              <Pressable
                onPress={() => {
                  setShowImportMealModal(false);
                  setCurrentMealType(null);
                }}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>✕</Text>
          </Pressable>
      </View>

            <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 16 }}>
              Choisis un repas depuis tes plans sauvegardés :
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {savedMeals.length > 0 ? (
                savedMeals.map((meal) => (
          <Pressable
                    key={meal.id}
                    onPress={() => handleImportMeal(meal)}
            style={{
                      backgroundColor: "#222",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
              borderWidth: 1,
                      borderColor: "#333",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600", marginBottom: 4 }}>
                      {meal.title}
                    </Text>
                    <Text style={{ color: "#aaa", fontSize: 12 }} numberOfLines={2}>
                      {meal.content}
                    </Text>
          </Pressable>
                ))
              ) : (
                <Text style={{ color: "#666", textAlign: "center", padding: 20 }}>
                  Aucun repas sauvegardé
                </Text>
              )}
            </ScrollView>
      </View>
    </View>
      </Modal>

      {/* Modal de sélection du type de repas */}
      <Modal
        visible={showMealTypeSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMealTypeSelector(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          justifyContent: "center",
              alignItems: "center",
          padding: 20,
        }}>
          <View style={{
            backgroundColor: "#1a1a1a",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 300,
              borderWidth: 1,
            borderColor: "#333",
          }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 20, textAlign: "center" }}>
              Choisir le type de repas
            </Text>
            
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => handleMealTypeSelect('breakfast')}
                style={{
                  backgroundColor: "#222",
                  padding: 16,
              borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Petit-déjeuner
                </Text>
          </Pressable>

              <Pressable
                onPress={() => handleMealTypeSelect('lunch')}
                style={{
                  backgroundColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Déjeuner
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleMealTypeSelect('snack')}
                style={{
                  backgroundColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Collation
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleMealTypeSelect('dinner')}
                style={{
                  backgroundColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Dîner
                </Text>
              </Pressable>
      </View>

            <Pressable
              onPress={() => setShowMealTypeSelector(false)}
              style={{
                marginTop: 20,
                padding: 12,
                backgroundColor: "#333",
                borderRadius: 8,
              alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Annuler</Text>
            </Pressable>
    </View>
        </View>
      </Modal>

      {/* Modal de détail des séances */}
      <Modal
        visible={showWorkoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowWorkoutModal(false);
          setSelectedWorkout(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                {selectedWorkout?.title}
              </Text>
              <Pressable
                onPress={() => {
                  setShowWorkoutModal(false);
                  setSelectedWorkout(null);
                }}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Fermer</Text>
              </Pressable>
            </View>

            {selectedWorkout && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Matériel */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: "#0070F3", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                    Matériel
                  </Text>
                  <Text style={{ color: "#fff", fontSize: 14 }}>
                    {extractWorkoutEquipment(selectedWorkout.content)}
                  </Text>
                </View>

                {/* Sections de la séance */}
                {(() => {
                  const sections = extractWorkoutSections(selectedWorkout.content);
                  return (
                    <>
                      {sections.warmup.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: "#0070F3", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                            Échauffement
                          </Text>
                          {sections.warmup.map((line, index) => (
                            <Text key={index} style={{ color: "#fff", fontSize: 14, marginBottom: 4 }}>
                              {line.startsWith('•') ? line : `• ${line}`}
                            </Text>
                          ))}
                        </View>
                      )}

                      {sections.main.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: "#0070F3", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                            Circuit principal
                          </Text>
                          {sections.main.map((line, index) => (
                            <Text key={index} style={{ color: "#fff", fontSize: 14, marginBottom: 4 }}>
                              • {line}
                            </Text>
                          ))}
                        </View>
                      )}

                      {sections.cooldown.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ color: "#0070F3", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                            Récupération
                          </Text>
                          {sections.cooldown.map((line, index) => (
                            <Text key={index} style={{ color: "#fff", fontSize: 14, marginBottom: 4 }}>
                              • {line}
                            </Text>
                          ))}
                        </View>
                      )}
                    </>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal d'import de séances */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#1a1a1a",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "80%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                Importer une séance
              </Text>
              <Pressable
                onPress={() => setShowImportModal(false)}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Fermer</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {savedWorkouts.length > 0 ? (
                savedWorkouts.map((workout) => (
                  <Pressable
                    key={workout.id}
                    onPress={() => importWorkout(workout)}
                    style={{
                      backgroundColor: "#333",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                      {workout.title}
                    </Text>
                    <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                      {new Date(workout.date).toLocaleDateString()}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: "#888", fontSize: 14, textAlign: "center", paddingVertical: 20 }}>
                  Aucune séance sauvegardée
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal du calendrier */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseCalendar}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#111",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxHeight: "90%",
              borderWidth: 1,
              borderColor: "#1d1d1d",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1 }}>
                Historique des journées
              </Text>
              <Pressable
                onPress={handleCloseCalendar}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>✕</Text>
          </Pressable>
      </View>

            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              dailyHistory={profile?.dailyHistory}
              onDayPress={handleDateSelect}
            />
    </View>
        </View>
      </Modal>

      {/* Modal des détails de journée */}
      <DayDetailModal
        visible={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        dayData={selectedDayData}
        date={selectedDate}
      />

    </ScrollView>
  );
}






