import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { loadProfile, UserProfile } from "../lib/profile";

export default function WorkoutDetails() {
  const params = useLocalSearchParams<{ 
    title?: string; 
    content?: string; 
    duration?: string; 
    calories?: string; 
    completed?: string; 
  }>();
  
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
      const profileData = await loadProfile();
      setProfile(profileData);
      
      // D'abord, essayer de récupérer les données temporaires depuis AsyncStorage
      const tempWorkoutData = await AsyncStorage.getItem('tempWorkoutDetails');
      if (tempWorkoutData) {
        const workoutData = JSON.parse(tempWorkoutData);
        setDailyWorkout(workoutData);
        // Nettoyer les données temporaires
        await AsyncStorage.removeItem('tempWorkoutDetails');
        return;
      }
      
      // Si des paramètres sont passés via l'URL, les utiliser
      if (params.title && params.content) {
        setDailyWorkout({
          id: `workout_${Date.now()}`,
          title: params.title,
          content: params.content,
          duration: parseInt(params.duration || '45'),
          calories: parseInt(params.calories || '300'),
          completed: params.completed === 'true'
        });
      } else if (profileData?.dailyWorkout) {
        // Sinon, utiliser la séance du jour du profil
        setDailyWorkout(profileData.dailyWorkout);
      }
    } catch (error) {
      console.error('Erreur chargement séance:', error);
    }
  }, [params]);

  // Fonction pour extraire un résumé de la séance
  const extractWorkoutSummary = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Si on a au moins 2 lignes, prendre la deuxième ligne comme résumé
    if (lines.length >= 2) {
      return lines[1].trim();
    }
    
    // Si on a seulement une ligne, essayer d'extraire un résumé
    if (lines.length === 1) {
      const firstLine = lines[0].trim();
      
      // Patterns pour extraire un résumé
      const summaryPatterns = [
        /Matériel\s*:\s*(.+)/i,
        /Description\s*:\s*(.+)/i,
        /Résumé\s*:\s*(.+)/i,
        /Préparation\s*:\s*(.+)/i,
      ];

      for (const pattern of summaryPatterns) {
        const match = firstLine.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // Si aucun pattern trouvé, retourner la ligne complète
      return firstLine;
    }

    return "Aucun résumé disponible";
  };

  // Fonction pour extraire les exercices principaux (max 3-4)
  const extractMainExercises = (content: string) => {
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
    
    // Retourner seulement les 3-4 premiers exercices pour le résumé
    return exercises.slice(0, 4);
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkoutData();
    }, [loadWorkoutData])
  );

  if (!dailyWorkout) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 12, textAlign: "center" }}>
          Aucune séance planifiée
        </Text>
        <Text style={{ color: "#8a8a8a", fontSize: 14, textAlign: "center" }}>
          Retourne au dashboard pour planifier une séance
        </Text>
      </View>
    );
  }

  const workoutSummary = extractWorkoutSummary(dailyWorkout.content);
  const mainExercises = extractMainExercises(dailyWorkout.content);

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      {/* En-tête */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
          {dailyWorkout.title}
        </Text>
        <Text style={{ color: "#8a8a8a", fontSize: 16, marginBottom: 12 }}>
          {dailyWorkout.duration} min • {dailyWorkout.calories} kcal estimées
        </Text>
        
        {/* Statut */}
        <View style={{ 
          backgroundColor: dailyWorkout.completed ? "#1a4d1a" : "#1a1a4d", 
          paddingHorizontal: 12, 
          paddingVertical: 6, 
          borderRadius: 20,
          alignSelf: "flex-start"
        }}>
          <Text style={{ 
            color: dailyWorkout.completed ? "#4CAF50" : "#0070F3", 
            fontSize: 12, 
            fontWeight: "600"
          }}>
            {dailyWorkout.completed ? "✓ Terminée" : "⏳ À faire"}
          </Text>
        </View>
      </View>

      {/* Résumé de la séance */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
          Résumé de la séance
        </Text>
        
        <View style={{
          backgroundColor: "#111",
          borderColor: "#1d1d1d",
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        }}>
          <Text style={{ color: "#ccc", fontSize: 14, lineHeight: 20 }}>
            {workoutSummary}
          </Text>
        </View>

        {/* Exercices principaux */}
        {mainExercises.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Exercices principaux
            </Text>
            
            {mainExercises.map((exercise, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderColor: "#333",
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, marginBottom: 4 }}>
                  {exercise.name}
                </Text>
                <Text style={{ color: "#aaa", fontSize: 12 }}>
                  {exercise.detail}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Informations complètes */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
            Détails complets
          </Text>
          <View style={{
            backgroundColor: "#111",
            borderColor: "#1d1d1d",
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
          }}>
            <Text style={{ color: "#ccc", fontSize: 14, lineHeight: 20 }}>
              {dailyWorkout.content}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
