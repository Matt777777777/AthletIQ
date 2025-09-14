// app/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Calendar from "../components/Calendar";
import DayDetailModal from "../components/DayDetailModal";
import { MealNutrition } from "../lib/meal-nutrition";
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
    breakfast: null as { id: string; title: string; content: string; date: string; eaten?: boolean; nutrition?: MealNutrition } | null,
    lunch: null as { id: string; title: string; content: string; date: string; eaten?: boolean; nutrition?: MealNutrition } | null,
    snack: null as { id: string; title: string; content: string; date: string; eaten?: boolean; nutrition?: MealNutrition } | null,
    dinner: null as { id: string; title: string; content: string; date: string; eaten?: boolean; nutrition?: MealNutrition } | null
  });

  // États pour les séances du jour (nombre illimité)
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
  const [selectedDayData, setSelectedDayData] = useState<NonNullable<UserProfile['daily_history']>[string] | null>(null);

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
  const extractWorkoutSections = (content: string | undefined) => {
    const sections: {
      warmup: string[];
      main: string[];
      cooldown: string[];
    } = {
      warmup: [],
      main: [],
      cooldown: []
    };

    if (!content || typeof content !== 'string') {
      return sections;
    }

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
  const extractWorkoutEquipment = (content: string | undefined): string => {
    if (!content || typeof content !== 'string') {
      return 'Aucun';
    }
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

  // Calcul de l'objectif de calories dépensées pour le sport
  const calculateSportCalorieGoal = () => {
    if (!profile) return 300; // Objectif par défaut

    try {
      // Calculer le BMR (Basal Metabolic Rate) pour estimer les besoins
      const age = parseInt(String(profile.age || "25"));
      const weight = parseFloat(String(profile.weight || "70"));
      const height = parseFloat(String(profile.height || "170"));
      const gender = profile.gender || "homme";

      // Formule de Mifflin-St Jeor pour le BMR
      let bmr;
      if (gender === "female") {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      }

      // Facteur d'activité basé sur le niveau de fitness et les séances par semaine
      const sessionsPerWeek = parseInt(String(profile.sessions || "3"));
      const fitnessLevel = profile.chat_responses?.fitnessLevel || profile.fitness_level || "débutant";
      
      let activityFactor = 1.2; // Sédentaire par défaut
      
      if (fitnessLevel === "débutant") {
        if (sessionsPerWeek <= 2) activityFactor = 1.3;
        else if (sessionsPerWeek <= 4) activityFactor = 1.4;
        else activityFactor = 1.5;
      } else if (fitnessLevel === "intermédiaire") {
        if (sessionsPerWeek <= 2) activityFactor = 1.4;
        else if (sessionsPerWeek <= 4) activityFactor = 1.6;
        else activityFactor = 1.7;
      } else if (fitnessLevel === "avancé") {
        if (sessionsPerWeek <= 2) activityFactor = 1.5;
        else if (sessionsPerWeek <= 4) activityFactor = 1.7;
        else activityFactor = 1.9;
      }

      // Calculer les calories totales nécessaires
      const totalCalories = bmr * activityFactor;
      
      // Objectif de calories à dépenser par l'exercice (15-25% du total)
      let exerciseGoal;
      if (profile.goal === "Perte de poids") {
        exerciseGoal = totalCalories * 0.25; // 25% pour la perte de poids
      } else if (profile.goal === "Prise de masse") {
        exerciseGoal = totalCalories * 0.15; // 15% pour la prise de masse
      } else if (profile.goal === "Maintien") {
        exerciseGoal = totalCalories * 0.20; // 20% pour le maintien
      } else {
        exerciseGoal = totalCalories * 0.20; // 20% par défaut
      }

      // Ajuster selon l'âge (les personnes plus âgées ont besoin de moins d'exercice intense)
      if (age > 50) {
        exerciseGoal *= 0.9;
      } else if (age > 65) {
        exerciseGoal *= 0.8;
      }

      const finalGoal = Math.round(exerciseGoal);
      
      console.log('Debug calculateSportCalorieGoal:', {
        profile: { age, weight, height, gender, goal: profile.goal, sessions: sessionsPerWeek, fitnessLevel },
        bmr,
        activityFactor,
        totalCalories,
        exerciseGoal,
        finalGoal
      });
      
      return Math.max(200, finalGoal); // Minimum 200 kcal
    } catch (error) {
      console.error('Erreur dans calculateSportCalorieGoal:', error);
      return 300; // Valeur par défaut en cas d'erreur
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
      if (profileData?.saved_plans?.workouts) {
        const workouts = profileData.saved_plans.workouts.map(workout => ({
          id: workout.id,
          title: workout.title,
          content: workout.content,
          date: workout.date
        }));
        setSavedWorkouts(workouts);
      }

      // Charger les séances du jour depuis le profil
      if (profileData?.daily_workouts && Array.isArray(profileData.daily_workouts)) {
        // Nouvelles séances multiples
        const workouts = profileData.daily_workouts.map((workout: any) => ({
          ...workout,
          calories: workout.calories || estimateWorkoutCalories(workout.content, profileData)
        }));
        setDailyWorkouts(workouts);
      } else if (profileData?.daily_workout) {
        // Ancien format (compatibilité)
        const workout = profileData.daily_workout;
        const estimatedCalories = workout.calories || estimateWorkoutCalories(workout.content, profileData);
        setDailyWorkouts([{
          ...workout,
          calories: estimatedCalories,
          sessionType: 'morning' as const
        }]);
      } else if (workoutData && workoutData.title && workoutData.content && workoutData.title.trim() !== '' && workoutData.content.trim() !== '') {
        // Si pas de séance du jour, utiliser la dernière séance comme base (seulement si elle est valide)
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
      if (profileData?.daily_meals) {
        const meals = {
          breakfast: profileData.daily_meals.breakfast ? { ...profileData.daily_meals.breakfast, eaten: profileData.daily_meals.breakfast.eaten || false } : null,
          lunch: profileData.daily_meals.lunch ? { ...profileData.daily_meals.lunch, eaten: profileData.daily_meals.lunch.eaten || false } : null,
          snack: profileData.daily_meals.snack ? { ...profileData.daily_meals.snack, eaten: profileData.daily_meals.snack.eaten || false } : null,
          dinner: profileData.daily_meals.dinner ? { ...profileData.daily_meals.dinner, eaten: profileData.daily_meals.dinner.eaten || false } : null
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
      if (profileData?.saved_plans?.meals) {
        setSavedMeals(profileData.saved_plans.meals);
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

    // Calculer les calories du repas manuel
    const nutrition = estimateMealNutrition(manualMealContent.trim(), currentMealType);
    const mealWithNutrition = {
      id: `${currentMealType}_${Date.now()}`,
      title: manualMealTitle.trim(),
      content: manualMealContent.trim(),
      date: new Date().toISOString(),
      eaten: false,
      nutrition: nutrition
    };

    const success = await saveDailyMeal(currentMealType, mealWithNutrition);

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

    // Calculer les calories du repas importé
    const nutrition = estimateMealNutrition(meal.content, currentMealType);
    const mealWithNutrition = {
      id: `${currentMealType}_${Date.now()}`,
      title: meal.title,
      content: meal.content,
      date: new Date().toISOString(),
      eaten: false,
      nutrition: nutrition
    };

    // Utiliser directement le titre et le contenu déjà formatés
    const success = await saveDailyMeal(currentMealType, mealWithNutrition);

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
        // Utiliser les calories stockées dans le repas si disponibles, sinon les calculer
        if (meal.nutrition) {
          totalCalories += meal.nutrition.calories;
          totalCarbs += meal.nutrition.carbs;
          totalProtein += meal.nutrition.protein;
          totalFat += meal.nutrition.fat;
        } else {
          // Fallback: calculer les calories si elles ne sont pas stockées
          const nutrition = estimateMealNutrition(meal.content, mealType as 'breakfast' | 'lunch' | 'snack' | 'dinner');
          totalCalories += nutrition.calories;
          totalCarbs += nutrition.carbs;
          totalProtein += nutrition.protein;
          totalFat += nutrition.fat;
        }
      }
    });

    return { calories: totalCalories, carbs: totalCarbs, protein: totalProtein, fat: totalFat };
  };

  // Base de données des calories par ingrédient (pour 100g)
  const ingredientCalories = {
    // Protéines
    'poulet': { calories: 165, carbs: 0, protein: 31, fat: 3.6 },
    'saumon': { calories: 208, carbs: 0, protein: 25, fat: 12 },
    'œuf': { calories: 155, carbs: 1.1, protein: 13, fat: 11 },
    'œufs': { calories: 155, carbs: 1.1, protein: 13, fat: 11 },
    'fromage blanc': { calories: 59, carbs: 3.4, protein: 10, fat: 0.4 },
    'yaourt grec': { calories: 59, carbs: 3.6, protein: 10, fat: 0.4 },
    'thon': { calories: 144, carbs: 0, protein: 30, fat: 1 },
    'dinde': { calories: 189, carbs: 0, protein: 29, fat: 7 },
    'bœuf': { calories: 250, carbs: 0, protein: 26, fat: 15 },
    'porc': { calories: 263, carbs: 0, protein: 27, fat: 16 },
    'cabillaud': { calories: 82, carbs: 0, protein: 18, fat: 0.7 },
    'crevettes': { calories: 99, carbs: 0.2, protein: 24, fat: 0.3 },
    
    // Glucides
    'riz': { calories: 130, carbs: 28, protein: 2.7, fat: 0.3 },
    'quinoa': { calories: 120, carbs: 22, protein: 4.4, fat: 1.9 },
    'pâtes': { calories: 131, carbs: 25, protein: 5, fat: 1.1 },
    'pomme de terre': { calories: 77, carbs: 17, protein: 2, fat: 0.1 },
    'patate douce': { calories: 86, carbs: 20, protein: 1.6, fat: 0.1 },
    'avoine': { calories: 389, carbs: 66, protein: 17, fat: 7 },
    'pain': { calories: 265, carbs: 49, protein: 9, fat: 3.2 },
    'banane': { calories: 89, carbs: 23, protein: 1.1, fat: 0.3 },
    'pomme': { calories: 52, carbs: 14, protein: 0.3, fat: 0.2 },
    'orange': { calories: 47, carbs: 12, protein: 0.9, fat: 0.1 },
    
    // Légumes
    'brocoli': { calories: 34, carbs: 7, protein: 2.8, fat: 0.4 },
    'épinards': { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 },
    'courgette': { calories: 17, carbs: 3.1, protein: 1.2, fat: 0.3 },
    'poivron': { calories: 31, carbs: 7, protein: 1, fat: 0.3 },
    'tomate': { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2 },
    'carotte': { calories: 41, carbs: 10, protein: 0.9, fat: 0.2 },
    'concombre': { calories: 16, carbs: 4, protein: 0.7, fat: 0.1 },
    'salade': { calories: 15, carbs: 3, protein: 1.4, fat: 0.2 },
    'champignon': { calories: 22, carbs: 3.3, protein: 3.1, fat: 0.3 },
    'oignon': { calories: 40, carbs: 9, protein: 1.1, fat: 0.1 },
    
    // Graisses
    'avocat': { calories: 160, carbs: 9, protein: 2, fat: 15 },
    'huile d\'olive': { calories: 884, carbs: 0, protein: 0, fat: 100 },
    'd\'huile d\'olive': { calories: 884, carbs: 0, protein: 0, fat: 100 },
    'huile': { calories: 884, carbs: 0, protein: 0, fat: 100 },
    'beurre': { calories: 717, carbs: 0.1, protein: 0.9, fat: 81 },
    'amandes': { calories: 579, carbs: 22, protein: 21, fat: 50 },
    'noix': { calories: 654, carbs: 14, protein: 15, fat: 65 },
    'noix de cajou': { calories: 553, carbs: 30, protein: 18, fat: 44 },
    'graines de chia': { calories: 486, carbs: 42, protein: 17, fat: 31 },
    
    // Laitages
    'lait': { calories: 42, carbs: 5, protein: 3.4, fat: 1 },
    'fromage': { calories: 113, carbs: 1, protein: 7, fat: 9 },
    'parmesan': { calories: 431, carbs: 4.1, protein: 38, fat: 29 },
    'mozzarella': { calories: 300, carbs: 2.2, protein: 22, fat: 22 },
    
    // Fruits
    'fruits rouges': { calories: 57, carbs: 14, protein: 0.7, fat: 0.3 },
    'fraise': { calories: 32, carbs: 8, protein: 0.7, fat: 0.3 },
    'myrtille': { calories: 57, carbs: 14, protein: 0.7, fat: 0.3 },
    'framboise': { calories: 52, carbs: 12, protein: 1.2, fat: 0.7 },
    'kiwi': { calories: 61, carbs: 15, protein: 1.1, fat: 0.5 },
    'mangue': { calories: 60, carbs: 15, protein: 0.8, fat: 0.4 },
    
    // Autres
    'miel': { calories: 304, carbs: 82, protein: 0.3, fat: 0 },
    'sucre': { calories: 387, carbs: 100, protein: 0, fat: 0 },
    'citron': { calories: 29, carbs: 9, protein: 1.1, fat: 0.3 },
    'ail': { calories: 149, carbs: 33, protein: 6.4, fat: 0.5 },
    'gingembre': { calories: 80, carbs: 18, protein: 1.8, fat: 0.8 }
  };

  // Fonction pour extraire les ingrédients et quantités du contenu du repas
  const extractIngredientsFromMeal = (mealContent: string) => {
    const ingredients = [];
    const lines = mealContent.split('\n');
    
    for (const line of lines) {
      // Chercher les lignes qui commencent par "•" ou "-" (format de liste)
      if (line.trim().match(/^[•\-]\s*(.+)/)) {
        const ingredientText = line.trim().replace(/^[•\-]\s*/, '');
        
        // Patterns pour différents formats d'ingrédients
        let match;
        let quantity = 1;
        let unit = 'g';
        let ingredient = '';
        
        // Pattern 1: "200g de poulet" ou "150g de riz"
        match = ingredientText.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|cl|dl|l)\s*(?:de\s+)?(.+)/i);
        if (match) {
          quantity = parseFloat(match[1]);
          unit = match[2];
          ingredient = match[3].toLowerCase().trim();
        }
        // Pattern 2: "1 cuillère à soupe d'huile d'olive"
        else if (ingredientText.match(/^(\d+)\s+(cuillère|cuillères)\s+(?:à\s+)?(soupe|café)\s+(?:de\s+)?(.+)/i)) {
          match = ingredientText.match(/^(\d+)\s+(cuillère|cuillères)\s+(?:à\s+)?(soupe|café)\s+(?:de\s+)?(.+)/i);
          if (match) {
            quantity = parseFloat(match[1]);
            unit = 'cuillère';
            ingredient = match[4].toLowerCase().trim();
          }
        }
        // Pattern 3: "1 avocat (150g)" ou "2 œufs"
        else if (ingredientText.match(/^(\d+)\s+(.+?)(?:\s*\((\d+(?:\.\d+)?)\s*(g|kg)\))?$/i)) {
          match = ingredientText.match(/^(\d+)\s+(.+?)(?:\s*\((\d+(?:\.\d+)?)\s*(g|kg)\))?$/i);
          if (match) {
            quantity = parseFloat(match[1]);
            ingredient = match[2].toLowerCase().trim();
            if (match[3] && match[4]) {
              // Si on a le poids entre parenthèses, l'utiliser
              quantity = parseFloat(match[3]);
              unit = match[4];
            } else {
              // Sinon, utiliser des quantités par défaut pour les unités
              if (ingredient.includes('œuf')) {
                quantity = quantity * 50; // 1 œuf = 50g
                unit = 'g';
              } else if (ingredient.includes('avocat')) {
                quantity = quantity * 150; // 1 avocat = 150g
                unit = 'g';
              } else if (ingredient.includes('banane')) {
                quantity = quantity * 120; // 1 banane = 120g
                unit = 'g';
              } else if (ingredient.includes('pomme')) {
                quantity = quantity * 150; // 1 pomme = 150g
                unit = 'g';
              } else {
                unit = 'g';
              }
            }
          }
        }
        // Pattern 4: "1 tasse de farine" ou "2 pincées de sel"
        else if (ingredientText.match(/^(\d+)\s+(tasse|tasses|pincée|pincées)\s+(?:de\s+)?(.+)/i)) {
          match = ingredientText.match(/^(\d+)\s+(tasse|tasses|pincée|pincées)\s+(?:de\s+)?(.+)/i);
          if (match) {
            quantity = parseFloat(match[1]);
            unit = match[2];
            ingredient = match[3].toLowerCase().trim();
          }
        }
        
        if (ingredient) {
          // Convertir en grammes pour le calcul
          let quantityInGrams = quantity;
          if (unit.includes('kg')) quantityInGrams = quantity * 1000;
          else if (unit.includes('l') || unit.includes('ml')) quantityInGrams = quantity; // Approximation pour les liquides
          else if (unit.includes('cuillère')) quantityInGrams = quantity * 15; // 1 cuillère = 15g
          else if (unit.includes('tasse')) quantityInGrams = quantity * 200; // 1 tasse = 200g
          else if (unit.includes('pincée')) quantityInGrams = quantity * 1; // 1 pincée = 1g
          
          ingredients.push({
            name: ingredient,
            quantity: quantityInGrams,
            originalText: ingredientText
          });
        }
      }
    }
    
    return ingredients;
  };

  // Fonction pour calculer les calories et macronutriments d'un repas basée sur son contenu réel
  const estimateMealNutrition = (mealContent: string, mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    const ingredients = extractIngredientsFromMeal(mealContent);
    
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    
    // Calculer les valeurs nutritionnelles pour chaque ingrédient
    for (const ingredient of ingredients) {
      const nutrition = ingredientCalories[ingredient.name as keyof typeof ingredientCalories];
      if (nutrition) {
        const factor = ingredient.quantity / 100; // Convertir de 100g à la quantité réelle
        totalCalories += nutrition.calories * factor;
        totalCarbs += nutrition.carbs * factor;
        totalProtein += nutrition.protein * factor;
        totalFat += nutrition.fat * factor;
      }
    }
    
    // Si aucun ingrédient trouvé, utiliser les valeurs par défaut basées sur le type de repas
    if (totalCalories === 0) {
      const baseCalories = {
        breakfast: 400,
        lunch: 600,
        snack: 200,
        dinner: 500
      };
      
      const baseMacros = {
        breakfast: { carbs: 50, protein: 20, fat: 15 },
        lunch: { carbs: 75, protein: 30, fat: 20 },
        snack: { carbs: 25, protein: 10, fat: 8 },
        dinner: { carbs: 60, protein: 35, fat: 18 }
      };
      
      totalCalories = baseCalories[mealType];
      totalCarbs = baseMacros[mealType].carbs;
      totalProtein = baseMacros[mealType].protein;
      totalFat = baseMacros[mealType].fat;
    }
    
    return {
      calories: Math.round(totalCalories),
      carbs: Math.round(totalCarbs),
      protein: Math.round(totalProtein),
      fat: Math.round(totalFat)
    };
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
    // Déterminer le type de séance : alterner entre matin et soir, ou matin si c'est la première
    const sessionType: 'morning' | 'evening' = dailyWorkouts.length === 0 ? 'morning' : 
      (dailyWorkouts.length % 2 === 0 ? 'morning' : 'evening');
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

    // Utiliser les calories stockées dans le repas si disponibles, sinon les calculer
    const mealNutrition = meal.nutrition || estimateMealNutrition(meal.content, mealType);
    
    // Recalculer les valeurs nutritionnelles basées sur tous les repas mangés
    const nutritionFromMeals = recalculateNutritionFromMeals(updatedMeals);
    setDailyIntake({ kcal: nutritionFromMeals.calories });
    setMacronutrients({ 
      carbs: nutritionFromMeals.carbs, 
      protein: nutritionFromMeals.protein, 
      fat: nutritionFromMeals.fat 
    });

    // Sauvegarder les nouvelles valeurs
    await saveDailyIntake({ kcal: nutritionFromMeals.calories });
    
    if (newEatenState) {
      console.log(`Repas ${mealType} mangé: +${mealNutrition.calories} kcal, +${mealNutrition.carbs}g glucides, +${mealNutrition.protein}g protéines, +${mealNutrition.fat}g graisses`);
    } else {
      console.log(`Repas ${mealType} non mangé: -${mealNutrition.calories} kcal, -${mealNutrition.carbs}g glucides, -${mealNutrition.protein}g protéines, -${mealNutrition.fat}g graisses`);
    }
    console.log(`Valeurs nutritionnelles totales: ${nutritionFromMeals.calories} kcal, ${nutritionFromMeals.carbs}g glucides, ${nutritionFromMeals.protein}g protéines, ${nutritionFromMeals.fat}g graisses`);

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
    console.log(`- Niveau de sport: ${profile.chat_responses?.fitnessLevel || profile.fitness_level || "Non défini"}`);
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
        
        {/* Calories dépensées */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 14 }}>
              Calories dépensées
            </Text>
            <Text style={{ color: "#0070F3", fontWeight: "700", fontSize: 14 }}>
              {Math.round(calculateDailyCaloriesBurned())} kcal
            </Text>
          </View>
        </View>
        
        {dailyWorkouts.length > 0 ? (
          <View>
            {dailyWorkouts.filter(workout => workout.title && workout.content && workout.title.trim() !== '' && workout.content.trim() !== '').map((workout, index) => (
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
              dailyHistory={profile?.daily_history}
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






