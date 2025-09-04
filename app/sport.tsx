import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { latestByType } from "../lib/plans";
import { loadProfile, UserProfile } from "../lib/profile";

export default function Sport() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyWorkout, setDailyWorkout] = useState<{
    id: string;
    title: string;
    content: string;
    duration: number;
    calories: number;
    completed: boolean;
    completedAt?: string;
  } | null>(null);

  const loadWorkoutData = useCallback(async () => {
    try {
      const [profileData, workoutData] = await Promise.all([
        loadProfile(),
        latestByType("workout")
      ]);

      setProfile(profileData);

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
    } catch (error) {
      console.error('Erreur chargement données sport:', error);
    }
  }, []);

  // Fonction pour estimer les calories brûlées lors d'une séance
  const estimateWorkoutCalories = (workoutContent: string, userProfile: UserProfile | null) => {
    const baseCaloriesPerMinute = 10;
    const duration = 45;
    
    let multiplier = 1;
    if (userProfile?.fitnessLevel === 'Avancé') multiplier = 1.2;
    else if (userProfile?.fitnessLevel === 'Débutant') multiplier = 0.8;
    
    if (userProfile?.weight) {
      multiplier *= (userProfile.weight / 70);
    }
    
    return Math.round(baseCaloriesPerMinute * duration * multiplier);
  };

  // Fonction pour extraire les exercices du contenu de la séance
  const extractExercisesFromContent = (content: string) => {
    const exercises: Array<{ name: string; detail: string }> = [];
    
    // Diviser le contenu en lignes
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Chercher les exercices (lignes qui commencent par des chiffres ou des puces)
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Patterns pour détecter les exercices
      const exercisePatterns = [
        /^\d+\.\s*(.+)/, // "1. Exercice"
        /^[-*•]\s*(.+)/, // "- Exercice" ou "* Exercice" ou "• Exercice"
        /^(.+?):\s*(.+)/, // "Exercice: détails"
      ];
      
      for (const pattern of exercisePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const exerciseName = match[1].trim();
          const exerciseDetail = match[2] ? match[2].trim() : '';
          
          // Nettoyer le nom de l'exercice
          const cleanName = exerciseName
            .replace(/^\d+\.\s*/, '') // Enlever "1. "
            .replace(/^[-*•]\s*/, '') // Enlever "- " ou "* " ou "• "
            .trim();
          
          if (cleanName && cleanName.length > 0) {
            exercises.push({
              name: cleanName,
              detail: exerciseDetail || 'Exercice de la séance'
            });
          }
          break;
        }
      }
    });
    
    // Si aucun exercice trouvé, essayer de diviser par paragraphes
    if (exercises.length === 0) {
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      paragraphs.forEach((paragraph, index) => {
        const firstLine = paragraph.split('\n')[0].trim();
        if (firstLine && firstLine.length > 0 && !firstLine.toLowerCase().includes('préparation')) {
          exercises.push({
            name: firstLine,
            detail: 'Exercice de la séance'
          });
        }
      });
    }
    
    return exercises.slice(0, 8); // Limiter à 8 exercices max
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkoutData();
    }, [loadWorkoutData])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 }}>
        {dailyWorkout ? dailyWorkout.title : "Séance du jour"}
      </Text>
      <Text style={{ color: "#aaa", marginBottom: 16 }}>
        {dailyWorkout ? `${dailyWorkout.duration} min • ${dailyWorkout.calories} kcal` : "Full Body • 45 min"}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {dailyWorkout ? (
          // Extraire les exercices du contenu de la séance
          extractExercisesFromContent(dailyWorkout.content).map((exercise, index) => (
            <View
              key={index}
              style={{
                backgroundColor: "#111",
                borderColor: "#1d1d1d",
                borderWidth: 1,
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{exercise.name}</Text>
              <Text style={{ color: "#ccc", marginTop: 4 }}>{exercise.detail}</Text>
            </View>
          ))
        ) : (
          // Fallback avec exercices par défaut
          [
            { name: "Pompes", detail: "4 x 12 • Poitrine/Triceps" },
            { name: "Squats", detail: "4 x 10 • Jambes/Fessiers" },
            { name: "Rowing haltères", detail: "3 x 12 • Dos/Biceps" },
            { name: "Gainage", detail: "3 x 45s • Core" },
          ].map((e, index) => (
            <View
              key={index}
              style={{
                backgroundColor: "#111",
                borderColor: "#1d1d1d",
                borderWidth: 1,
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{e.name}</Text>
              <Text style={{ color: "#ccc", marginTop: 4 }}>{e.detail}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

