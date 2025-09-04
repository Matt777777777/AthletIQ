// app/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DailyIntake, estimateKcalTarget, loadDailyIntake, saveDailyIntake } from "../lib/nutrition";
import { latestByType, SavedPlan } from "../lib/plans";
import { loadProfile, saveDailyMeal, UserProfile } from "../lib/profile";
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
  const [showMacronutrients, setShowMacronutrients] = useState(false);
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

  // États pour la séance du jour
  const [dailyWorkout, setDailyWorkout] = useState<{
    id: string;
    title: string;
    content: string;
    duration: number; // en minutes
    calories: number; // calories estimées
    completed: boolean;
    completedAt?: string;
  } | null>(null);

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

      // Charger la séance du jour depuis le profil
      if (profileData?.dailyWorkout) {
        setDailyWorkout(profileData.dailyWorkout);
      } else if (workoutData) {
        // Si pas de séance du jour, utiliser la dernière séance comme base
        const estimatedCalories = estimateWorkoutCalories(workoutData.content, profileData);
        setDailyWorkout({
          id: `daily_${Date.now()}`,
          title: workoutData.title,
          content: workoutData.content,
          duration: 45, // Durée par défaut
          calories: estimatedCalories,
          completed: false
        });
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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

    // Utiliser les mêmes fonctions d'extraction et de nettoyage que dans le chat
    const extractedTitle = extractMealTitle(meal.content);
    const cleanedContent = cleanMealContent(meal.content);

    const success = await saveDailyMeal(currentMealType, {
      id: `${currentMealType}_${Date.now()}`,
      title: extractedTitle,
      content: cleanedContent,
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
  const estimateWorkoutCalories = (workoutContent: string, userProfile: UserProfile | null) => {
    // Estimation basique : 8-12 calories par minute selon l'intensité
    const baseCaloriesPerMinute = 10;
    const duration = 45; // Durée par défaut en minutes
    
    // Ajuster selon le niveau de fitness
    let multiplier = 1;
    if (userProfile?.fitnessLevel === 'Avancé') multiplier = 1.2;
    else if (userProfile?.fitnessLevel === 'Débutant') multiplier = 0.8;
    
    // Ajuster selon le poids de l'utilisateur
    if (userProfile?.weight) {
      multiplier *= (userProfile.weight / 70); // 70kg comme référence
    }
    
    return Math.round(baseCaloriesPerMinute * duration * multiplier);
  };

  // Fonction pour marquer une séance comme terminée
  const toggleWorkoutCompleted = async () => {
    if (!dailyWorkout) return;

    const updatedWorkout = {
      ...dailyWorkout,
      completed: !dailyWorkout.completed,
      completedAt: !dailyWorkout.completed ? new Date().toISOString() : undefined
    };

    setDailyWorkout(updatedWorkout);

    // Sauvegarder dans le profil
    if (profile) {
      const updatedProfile = {
        ...profile,
        dailyWorkout: updatedWorkout
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    }

    console.log(`Séance ${updatedWorkout.completed ? 'terminée' : 'non terminée'}: ${updatedWorkout.title}`);
  };

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







  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000" }} contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20 }}>
      {/* Header avec logo */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
          Salut Matteo
        </Text>
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



          {/* Section Macronutriments avec toggle */}
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              {showMacronutrients && (
                <>
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
                </>
              )}
            </View>
            
            {/* Flèche toggle */}
            <Pressable
              onPress={() => setShowMacronutrients(!showMacronutrients)}
              style={{
                padding: 4,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: "#666", fontSize: 12 }}>
                {showMacronutrients ? "▲" : "▼"}
              </Text>
            </Pressable>
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
                  borderTopColor: stepsProgressPercentage >= 100 ? "#FF6B35" : "#00D4AA",
                  borderRightColor: stepsProgressPercentage >= 75 ? (stepsProgressPercentage >= 100 ? "#FF6B35" : "#00D4AA") : "transparent",
                  borderBottomColor: stepsProgressPercentage >= 50 ? (stepsProgressPercentage >= 100 ? "#FF6B35" : "#00D4AA") : "transparent",
                  borderLeftColor: stepsProgressPercentage >= 25 ? (stepsProgressPercentage >= 100 ? "#FF6B35" : "#00D4AA") : "transparent",
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
          <Text style={{ color: "#00D4AA", fontWeight: "700", fontSize: 12, textAlign: "center" }}>
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
        
        {dailyWorkout ? (
          <View style={{ alignItems: "center" }}>
            {/* Cercle de progression */}
            <View style={{ position: "relative", marginBottom: 16 }}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 8,
                  borderColor: "#2a2a2a",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {/* Cercle de progression */}
                <View
                  style={{
                    position: "absolute",
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 8,
                    borderColor: "transparent",
                    borderTopColor: dailyWorkout.completed ? "#4CAF50" : "#0070F3",
                    borderRightColor: dailyWorkout.completed ? "#4CAF50" : "#0070F3",
                    borderBottomColor: dailyWorkout.completed ? "#4CAF50" : "#0070F3",
                    borderLeftColor: dailyWorkout.completed ? "#4CAF50" : "#0070F3",
                    transform: [{ rotate: "-90deg" }],
                  }}
                />
                
                {/* Icône au centre */}
                <Text style={{ color: dailyWorkout.completed ? "#4CAF50" : "#0070F3", fontSize: 24 }}>
                  {dailyWorkout.completed ? "✓" : "🏃"}
                </Text>
              </View>
            </View>

            {/* Informations de la séance */}
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 4, textAlign: "center" }}>
              {dailyWorkout.title}
            </Text>
            <Text style={{ color: "#8a8a8a", fontSize: 14, marginBottom: 8, textAlign: "center" }}>
              {dailyWorkout.duration} min • {dailyWorkout.calories} kcal
            </Text>
            
            {/* Statut */}
            <Text style={{ 
              color: dailyWorkout.completed ? "#4CAF50" : "#0070F3", 
              fontSize: 12, 
              fontWeight: "600",
              marginBottom: 16
            }}>
              {dailyWorkout.completed ? "Terminée" : "À faire"}
            </Text>

            {/* Boutons d'action */}
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <Pressable
                onPress={toggleWorkoutCompleted}
                style={{
                  flex: 1,
                  backgroundColor: dailyWorkout.completed ? "#4CAF50" : "#0070F3",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                  {dailyWorkout.completed ? "Marquer non terminée" : "Marquer terminée"}
                </Text>
              </Pressable>
              
              <Link href="/sport" asChild>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: "#333",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#555",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                    Détails
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ color: "#8a8a8a", fontSize: 16, marginBottom: 12, textAlign: "center" }}>
              Aucune séance planifiée
            </Text>
            <Link href="/sport" asChild>
              <Pressable
                style={{
                  backgroundColor: "#0070F3",
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Planifier une séance</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>


      {/* LISTE DE COURSES */}
      <View
        style={{
          backgroundColor: "#1a0e1a",
          borderColor: "#2a1a2a",
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
                <Text style={{ color: "#fff", fontWeight: "600" }}>Importer</Text>
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
                      {extractMealTitle(meal.content)}
                    </Text>
                    <Text style={{ color: "#aaa", fontSize: 12 }} numberOfLines={2}>
                      {cleanMealContent(meal.content)}
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

    </ScrollView>
  );
}






