import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { deletePlan, deleteProfile, loadProfile, saveProfile, UserProfile } from "../../lib/profile";

// Fonctions d'extraction et de nettoyage (copiées depuis le dashboard)
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

// Fonction pour déterminer le type de repas basé sur le contenu
const getMealType = (content: string): string => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('petit') && lowerContent.includes('déjeuner')) {
    return 'Petit-déj';
  } else if (lowerContent.includes('déjeuner') || lowerContent.includes('déj')) {
    return 'Déjeuner';
  } else if (lowerContent.includes('dîner') || lowerContent.includes('diner')) {
    return 'Dîner';
  } else if (lowerContent.includes('collation') || lowerContent.includes('snack')) {
    return 'Collation';
  }
  
  return 'Repas';
};

// Fonctions pour les séances de sport
const extractWorkoutTitle = (content: string): string => {
  // Diviser le contenu en lignes et filtrer les lignes vides
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Si on a au moins 2 lignes, prendre la deuxième ligne comme titre
  if (lines.length >= 2) {
    const secondLine = lines[1].trim();
    // Nettoyer la ligne (enlever les deux-points, etc.)
    let cleanedTitle = secondLine.replace(/[:•\-\*]/g, '').trim();
    
    // Ne pas supprimer "Séance" du titre, mais supprimer les autres préfixes
    cleanedTitle = cleanedTitle.replace(/^(Workout|Entraînement|Training)\s*:?\s*/i, '');
    
    return cleanedTitle;
  }
  
  // Si on a seulement une ligne, essayer d'extraire le titre des patterns
  if (lines.length === 1) {
    const patterns = [
      /Voici une séance d'entraînement ([^:]+):/i,
      /Voici ([^:]+):/i,
      /Je te propose ([^:]+):/i,
      /Voici une séance ([^:]+):/i,
    ];

    for (const pattern of patterns) {
      const match = lines[0].match(pattern);
      if (match && match[1]) {
        let title = match[1].trim();
        // Ne pas supprimer "Séance" du titre, mais supprimer les autres préfixes
        title = title.replace(/^(Workout|Entraînement|Training)\s*:?\s*/i, '');
        return title;
      }
    }
  }

  // Fallback: retourner un titre générique
  return "Séance générée";
};

const cleanWorkoutContent = (content: string): string => {
  // Diviser le contenu en lignes et filtrer les lignes vides
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Si on a au moins 3 lignes, supprimer la première ligne (introduction) et la deuxième ligne (répétition du titre)
  if (lines.length >= 3) {
    // Prendre toutes les lignes sauf la première et la deuxième
    const contentLines = lines.slice(2);
    return contentLines.join('\n').trim();
  }
  
  // Si on a 2 lignes, supprimer seulement la première ligne (introduction)
  if (lines.length === 2) {
    return lines[1].trim();
  }
  
  // Si on a seulement une ligne, essayer de nettoyer avec les patterns
  if (lines.length === 1) {
    const introPatterns = [
      /Voici une séance d'entraînement [^:]+ pour [^:]+:/gi,
      /Voici une séance d'entraînement [^:]+:/gi,
      /Voici une séance [^:]+ pour [^:]+:/gi,
      /Voici une séance [^:]+:/gi,
      /Voici [^:]+ pour [^:]+:/gi,
      /Voici [^:]+:/gi,
      /Je te propose [^:]+:/gi,
      /Voici [^:]+ adaptée:/gi,
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

// Options disponibles (mêmes que dans l'onboarding)
const goals = ["Perdre du poids", "Prendre du muscle", "Être en forme"];
const diets = ["Végétarien", "Vegan", "Sans gluten", "Aucune restriction"];
const sessionsOptions = [2, 3, 4, 5, 6, 7];

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<string>("");
  
  // États pour l'édition des préférences
  const [goal, setGoal] = useState("");
  const [sessions, setSessions] = useState("");
  const [diet, setDiet] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [equipment, setEquipment] = useState("");
  const [intolerances, setIntolerances] = useState("");
  const [limitations, setLimitations] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  
  // États pour les listes déroulantes
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [showSessionsDropdown, setShowSessionsDropdown] = useState(false);
  const [showDietDropdown, setShowDietDropdown] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    type: 'workout' | 'meal';
    title: string;
    content: string;
    date: string;
  } | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Fermer toutes les listes déroulantes quand on sort du mode édition
  useEffect(() => {
    if (!isEditingPreferences) {
      setShowGoalDropdown(false);
      setShowSessionsDropdown(false);
      setShowDietDropdown(false);
    }
  }, [isEditingPreferences]);

  // Recharger le profil à chaque fois que l'utilisateur revient sur cet onglet
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const userProfile = await loadProfile();
      setProfile(userProfile);
      if (userProfile) {
        setFirstName(userProfile.firstName || "");
        setAge(userProfile.age?.toString() || "");
        setWeight(userProfile.weight?.toString() || "");
        setHeight(userProfile.height?.toString() || "");
        setGender(userProfile.gender === "male" ? "Homme" : userProfile.gender === "female" ? "Femme" : "");
        
        // Initialiser les états des préférences
        setGoal(userProfile.goal || "");
        setSessions(userProfile.sessions?.toString() || "");
        setDiet(userProfile.diet || "");
        setFitnessLevel(userProfile.chatResponses?.fitnessLevel || userProfile.fitnessLevel || "");
        setEquipment(userProfile.chatResponses?.equipment || userProfile.equipment || "");
        setIntolerances(userProfile.chatResponses?.intolerances || userProfile.intolerances || "");
        setLimitations(userProfile.chatResponses?.limitations || userProfile.limitations || "");
        setPreferredTime(userProfile.chatResponses?.preferredTime || userProfile.preferredTime || "");
        
        console.log("Profil chargé dans l'onglet profil:", userProfile);
        console.log("Réponses du chat:", userProfile.chatResponses);
        console.log("Horaires préférés - chatResponses:", userProfile.chatResponses?.preferredTime);
        console.log("Horaires préférés - profile:", userProfile.preferredTime);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const updatedProfile = {
        ...profile,
        firstName: firstName.trim() || undefined,
        age: age ? parseInt(age) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        gender: gender === "Homme" ? "male" as const : gender === "Femme" ? "female" as const : undefined,
      };
      
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert("Succès", "Profil mis à jour !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder le profil");
    }
  };

  const handleSavePreferences = async () => {
    if (!profile) return;

    try {
      const updatedProfile = {
        ...profile,
        goal: goal.trim() || profile.goal,
        sessions: sessions ? parseInt(sessions) : profile.sessions,
        diet: diet.trim() || profile.diet,
        fitnessLevel: fitnessLevel.trim() as "Débutant" | "Intermédiaire" | "Avancé" || profile.fitnessLevel,
        equipment: equipment.trim() as "Aucun" | "Basique" | "Complet" || profile.equipment,
        intolerances: intolerances.trim() || profile.intolerances,
        limitations: limitations.trim() || profile.limitations,
        preferredTime: preferredTime.trim() as "Matin" | "Midi" | "Soir" | "Flexible" || profile.preferredTime,
      };
      
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);
      setIsEditingPreferences(false);
      Alert.alert("Succès", "Préférences mises à jour !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les préférences");
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (!profile) return;
        
        const updatedProfile = {
          ...profile,
          profilePhoto: result.assets[0].uri,
        };
        
        await saveProfile(updatedProfile);
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection d'image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  const removePhoto = async () => {
    if (!profile) return;
    
    const updatedProfile = {
      ...profile,
      profilePhoto: undefined,
    };
    
    await saveProfile(updatedProfile);
    setProfile(updatedProfile);
  };

  const openPlanDetail = (type: 'workout' | 'meal', plan: { id: string; title: string; content: string; date: string }) => {
    setSelectedPlan({
      id: plan.id,
      type,
      title: plan.title,
      content: plan.content,
      date: plan.date
    });
    setShowPlanDetail(true);
  };


  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000" }} contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
          Mon Profil
        </Text>
      </View>
      <Text style={{ color: "#aaa", marginBottom: 24 }}>
        Gère tes informations et préférences
      </Text>

      {/* Section Photo de profil */}
      <View style={{ 
        backgroundColor: "#111", 
        borderRadius: 16, 
        padding: 20, 
        marginBottom: 20,
        alignItems: "center"
      }}>
        
        <TouchableOpacity onPress={pickImage} style={{ marginBottom: 12 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "#222",
            borderWidth: 2,
            borderColor: "#333",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden"
          }}>
            {profile?.profilePhoto ? (
              <Image 
                source={{ uri: profile.profilePhoto }} 
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <Text style={{ color: "#666", fontSize: 24 }}>👤</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={pickImage}
            style={{
              backgroundColor: "#0070F3",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
              Changer
            </Text>
          </Pressable>
          
          {profile?.profilePhoto && (
            <Pressable
              onPress={removePhoto}
              style={{
                backgroundColor: "#ff4444",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                Supprimer
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Section Informations personnelles */}
      <View style={{ 
        backgroundColor: "#111", 
        borderRadius: 16, 
        padding: 20, 
        marginBottom: 20
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            Informations personnelles
          </Text>
          <Pressable
            onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            style={{
              backgroundColor: "transparent",
              paddingHorizontal: 8,
              paddingVertical: 8,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              minHeight: 32,
            }}
          >
            {isEditing ? (
              <Text style={{ color: "#00D4AA", fontWeight: "600", fontSize: 16 }}>
                ✓
              </Text>
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                {/* Icône carré + stylo en bleu */}
                <View style={{
                  width: 24,
                  height: 24,
                  position: "relative",
                }}>
                  {/* Carré avec bordure */}
                  <View style={{
                    position: "absolute",
                    top: 3,
                    left: 3,
                    width: 15,
                    height: 15,
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    borderColor: "#0070F3",
                    borderRadius: 2,
                  }} />
                  {/* Stylo en diagonale */}
                  <View style={{
                    position: "absolute",
                    top: 2,
                    left: 12,
                    width: 12,
                    height: 3,
                    backgroundColor: "#0070F3",
                    borderRadius: 1.5,
                    transform: [{ rotate: "-45deg" }],
                  }} />
                  {/* Pointe du stylo */}
                  <View style={{
                    position: "absolute",
                    top: 9,
                    left: 6,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 2,
                    borderRightWidth: 2,
                    borderTopWidth: 4,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#0070F3",
                    transform: [{ rotate: "-45deg" }],
                  }} />
                </View>
              </View>
            )}
          </Pressable>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
              Sexe
            </Text>
            {isEditing ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {["Homme", "Femme"].map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={{
                      flex: 1,
                      backgroundColor: gender === g ? "#0070F3" : "#222",
                      borderWidth: 1,
                      borderColor: gender === g ? "#0070F3" : "#333",
                      padding: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, paddingVertical: 4 }}>
                {profile?.gender === "male" ? "Homme" : profile?.gender === "female" ? "Femme" : "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
              Prénom
            </Text>
            {isEditing ? (
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ton prénom"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, paddingVertical: 4 }}>
                {profile?.firstName || "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
              Âge
            </Text>
            {isEditing ? (
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Ton âge"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, paddingVertical: 4 }}>
                {profile?.age ? `${profile.age} ans` : "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
              Poids
            </Text>
            {isEditing ? (
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Ton poids en kg"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, paddingVertical: 4 }}>
                {profile?.weight ? `${profile.weight} kg` : "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
              Taille
            </Text>
            {isEditing ? (
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="Ta taille en cm"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, paddingVertical: 4 }}>
                {profile?.height ? `${profile.height} cm` : "Non renseigné"}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Section Préférences */}
      <View style={{ 
        backgroundColor: "#111", 
        borderRadius: 16, 
        padding: 20, 
        marginBottom: 20
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            Préférences
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => {
                if (isEditingPreferences) {
                  // Annuler = recharger le profil (même fonction que Reset)
                  loadUserProfile();
                }
                setIsEditingPreferences(!isEditingPreferences);
              }}
              style={{
                backgroundColor: "transparent",
                paddingHorizontal: 8,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                minHeight: 32,
              }}
            >
              {isEditingPreferences ? (
                <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 16 }}>
                  ✕
                </Text>
              ) : (
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  {/* Icône carré + stylo en bleu */}
                  <View style={{
                    width: 24,
                    height: 24,
                    position: "relative",
                  }}>
                    {/* Carré avec bordure */}
                    <View style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      width: 15,
                      height: 15,
                      backgroundColor: "transparent",
                      borderWidth: 2,
                      borderColor: "#0070F3",
                      borderRadius: 2,
                    }} />
                    {/* Stylo en diagonale */}
                    <View style={{
                      position: "absolute",
                      top: 2,
                      left: 12,
                      width: 12,
                      height: 3,
                      backgroundColor: "#0070F3",
                      borderRadius: 1.5,
                      transform: [{ rotate: "-45deg" }],
                    }} />
                    {/* Pointe du stylo */}
                    <View style={{
                      position: "absolute",
                      top: 9,
                      left: 6,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 2,
                      borderRightWidth: 2,
                      borderTopWidth: 4,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      borderTopColor: "#0070F3",
                      transform: [{ rotate: "-45deg" }],
                    }} />
                  </View>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Objectif</Text>
            {isEditingPreferences ? (
              <View>
                <Pressable
                  onPress={() => setShowGoalDropdown(!showGoalDropdown)}
                  style={{
                    backgroundColor: "#222",
                    borderWidth: 1,
                    borderColor: "#333",
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: goal ? "#fff" : "#666", fontSize: 14 }}>
                    {goal || "Sélectionner un objectif"}
                  </Text>
                  <Text style={{ color: "#666", fontSize: 12 }}>
                    {showGoalDropdown ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {showGoalDropdown && (
                  <View style={{
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#444",
                    borderRadius: 8,
                    marginTop: 4,
                    maxHeight: 150,
                  }}>
                    {goals.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setGoal(option);
                          setShowGoalDropdown(false);
                        }}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#444",
                        }}
                      >
                        <Text style={{ 
                          color: goal === option ? "#0070F3" : "#fff", 
                          fontSize: 14,
                          fontWeight: goal === option ? "600" : "400"
                        }}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.goal || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Séances/semaine</Text>
            {isEditingPreferences ? (
              <View>
                <Pressable
                  onPress={() => setShowSessionsDropdown(!showSessionsDropdown)}
                  style={{
                    backgroundColor: "#222",
                    borderWidth: 1,
                    borderColor: "#333",
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: sessions ? "#fff" : "#666", fontSize: 14 }}>
                    {sessions || "Sélectionner le nombre"}
                  </Text>
                  <Text style={{ color: "#666", fontSize: 12 }}>
                    {showSessionsDropdown ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {showSessionsDropdown && (
                  <View style={{
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#444",
                    borderRadius: 8,
                    marginTop: 4,
                    maxHeight: 150,
                  }}>
                    {sessionsOptions.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setSessions(option.toString());
                          setShowSessionsDropdown(false);
                        }}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#444",
                        }}
                      >
                        <Text style={{ 
                          color: sessions === option.toString() ? "#0070F3" : "#fff", 
                          fontSize: 14,
                          fontWeight: sessions === option.toString() ? "600" : "400"
                        }}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.sessions || 0}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Régime alimentaire</Text>
            {isEditingPreferences ? (
              <View>
                <Pressable
                  onPress={() => setShowDietDropdown(!showDietDropdown)}
                  style={{
                    backgroundColor: "#222",
                    borderWidth: 1,
                    borderColor: "#333",
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: diet ? "#fff" : "#666", fontSize: 14 }}>
                    {diet || "Sélectionner un régime"}
                  </Text>
                  <Text style={{ color: "#666", fontSize: 12 }}>
                    {showDietDropdown ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {showDietDropdown && (
                  <View style={{
                    backgroundColor: "#333",
                    borderWidth: 1,
                    borderColor: "#444",
                    borderRadius: 8,
                    marginTop: 4,
                    maxHeight: 150,
                  }}>
                    {diets.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setDiet(option);
                          setShowDietDropdown(false);
                        }}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "#444",
                        }}
                      >
                        <Text style={{ 
                          color: diet === option ? "#0070F3" : "#fff", 
                          fontSize: 14,
                          fontWeight: diet === option ? "600" : "400"
                        }}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.diet || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Niveau de sport</Text>
            {isEditingPreferences ? (
              <TextInput
                value={fitnessLevel}
                onChangeText={setFitnessLevel}
                placeholder="Ex: Débutant, Intermédiaire, Avancé..."
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.chatResponses?.fitnessLevel || profile?.fitnessLevel || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Matériel</Text>
            {isEditingPreferences ? (
              <TextInput
                value={equipment}
                onChangeText={setEquipment}
                placeholder="Ex: Aucun, Basique, Complet..."
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.chatResponses?.equipment || profile?.equipment || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Intolérances</Text>
            {isEditingPreferences ? (
              <TextInput
                value={intolerances}
                onChangeText={setIntolerances}
                placeholder="Ex: Lactose, Gluten, Aucune..."
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.chatResponses?.intolerances || profile?.intolerances || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Limitations</Text>
            {isEditingPreferences ? (
              <TextInput
                value={limitations}
                onChangeText={setLimitations}
                placeholder="Ex: Problèmes de dos, Aucune..."
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.chatResponses?.limitations || profile?.limitations || "Non défini"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>Horaires préférés</Text>
            {isEditingPreferences ? (
              <TextInput
                value={preferredTime}
                onChangeText={setPreferredTime}
                placeholder="Ex: Matin, Midi, Soir, Flexible..."
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#222",
                  borderWidth: 1,
                  borderColor: "#333",
                  padding: 12,
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {profile?.chatResponses?.preferredTime || profile?.preferredTime || "Non défini"}
              </Text>
            )}
          </View>
        </View>
        
        {/* Bouton sauvegarder les préférences */}
        {isEditingPreferences && (
          <Pressable
            onPress={handleSavePreferences}
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Sauvegarder les préférences</Text>
          </Pressable>
        )}
      </View>



      {/* Section Actions */}
      <View style={{ marginBottom: 20 }}>


        {/* Section Plans sauvegardés */}
        <View style={{ 
          backgroundColor: "#111", 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 20
        }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
            Mes plans enregistrés
          </Text>
          
          {/* Séances sauvegardées */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#60A5FA", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Séances ({profile?.savedPlans?.workouts?.length || 0})
            </Text>
            {profile?.savedPlans?.workouts?.length ? (
              profile.savedPlans.workouts.slice(-3).reverse().map((workout) => {
                const cleanedContent = cleanWorkoutContent(workout.content);
                
                return (
                  <Pressable
                    key={workout.id}
                    onPress={() => openPlanDetail('workout', workout)}
                    style={{ 
                      backgroundColor: "#1a1f2e", 
                      padding: 12, 
                      borderRadius: 8, 
                      marginBottom: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: "#60A5FA"
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                      {workout.title}
                    </Text>
                    <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                      Sauvegardé le {new Date(workout.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
                      {cleanedContent.substring(0, 100)}...
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "600" }}>
                        Appuyer pour voir le détail
                      </Text>
                      <Pressable
                        onPress={async (e) => {
                          e.stopPropagation(); // Empêcher l'ouverture de la modal
                          console.log(`Delete workout from list: ${workout.title}`);
                          
                          // Pour la simulation sur ordinateur, on peut bypasser l'Alert
                          const isSimulator = __DEV__ && Platform.OS === 'web';
                          
                          if (isSimulator) {
                            // Suppression directe en simulation
                            console.log(`Simulator mode: deleting workout directly`);
                            const success = await deletePlan('workout', workout.id);
                            if (success) {
                              loadUserProfile();
                            }
                            return;
                          }
                          
                          Alert.alert(
                            "Supprimer la séance",
                            `Êtes-vous sûr de vouloir supprimer "${workout.title}" ?`,
                            [
                              { text: "Annuler", style: "cancel" },
                              {
                                text: "Supprimer",
                                style: "destructive",
                                onPress: async () => {
                                  console.log(`User confirmed deletion of workout: ${workout.title}`);
                                  const success = await deletePlan('workout', workout.id);
                                  if (success) {
                                    loadUserProfile();
                                  }
                                }
                              }
                            ]
                          );
                        }}
                        style={{
                          backgroundColor: "#1a2a4a",
                          paddingHorizontal: 6,
                          paddingVertical: 4,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: "#60A5FA"
                        }}
                      >
                        <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "600" }}>🗑</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={{ 
                backgroundColor: "#1a1a1a", 
                padding: 16, 
                borderRadius: 8,
                alignItems: "center"
              }}>
                <Text style={{ color: "#666", fontSize: 14, fontStyle: "italic" }}>
                  Aucune séance sauvegardée
                </Text>
                <Text style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
                  Demande une séance dans le chat pour l'enregistrer ici
                </Text>
              </View>
            )}
          </View>
          
          {/* Repas sauvegardés */}
          <View>
            <Text style={{ color: "#3B82F6", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              Repas ({profile?.savedPlans?.meals?.length || 0})
            </Text>
            {profile?.savedPlans?.meals?.length ? (
              profile.savedPlans.meals.slice(-3).reverse().map((meal) => {
                const mealType = getMealType(meal.content);
                const extractedTitle = extractMealTitle(meal.content);
                const cleanedContent = cleanMealContent(meal.content);
                
                return (
                  <Pressable
                    key={meal.id}
                    onPress={() => openPlanDetail('meal', {
                      ...meal,
                      title: meal.title,
                      content: cleanedContent
                    })}
                    style={{ 
                      backgroundColor: "#1a1f3a", 
                      padding: 12, 
                      borderRadius: 8, 
                      marginBottom: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: "#3B82F6"
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                      {meal.title}
                    </Text>
                    <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                      Sauvegardé le {new Date(meal.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
                      {cleanedContent.substring(0, 100)}...
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Text style={{ color: "#3B82F6", fontSize: 10, fontWeight: "600" }}>
                        Appuyer pour voir le détail
                      </Text>
                      <Pressable
                        onPress={async (e) => {
                          e.stopPropagation(); // Empêcher l'ouverture de la modal
                          console.log(`Delete meal from list: ${extractedTitle}`);
                          
                          // Pour la simulation sur ordinateur, on peut bypasser l'Alert
                          const isSimulator = __DEV__ && Platform.OS === 'web';
                          
                          if (isSimulator) {
                            // Suppression directe en simulation
                            console.log(`Simulator mode: deleting meal directly`);
                            const success = await deletePlan('meal', meal.id);
                            if (success) {
                              loadUserProfile();
                            }
                            return;
                          }
                          
                          Alert.alert(
                            "Supprimer le repas",
                            `Êtes-vous sûr de vouloir supprimer "${extractedTitle}" ?`,
                            [
                              { text: "Annuler", style: "cancel" },
                              {
                                text: "Supprimer",
                                style: "destructive",
                                onPress: async () => {
                                  console.log(`User confirmed deletion of meal: ${extractedTitle}`);
                                  const success = await deletePlan('meal', meal.id);
                                  if (success) {
                                    loadUserProfile();
                                  }
                                }
                              }
                            ]
                          );
                        }}
                        style={{
                          backgroundColor: "#1a1f3a",
                          paddingHorizontal: 6,
                          paddingVertical: 4,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: "#3B82F6"
                        }}
                      >
                        <Text style={{ color: "#3B82F6", fontSize: 10, fontWeight: "600" }}>🗑</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={{ 
                backgroundColor: "#1a1a1a", 
                padding: 16, 
                borderRadius: 8,
                alignItems: "center"
              }}>
                <Text style={{ color: "#666", fontSize: 14, fontStyle: "italic" }}>
                  Aucun repas sauvegardé
                </Text>
                <Text style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
                  Demande un repas dans le chat pour l'enregistrer ici
                </Text>
              </View>
            )}
          </View>
        </View>



        {/* Bouton de test pour réinitialiser l'onboarding */}
        <Pressable
          onPress={async () => {
            await deleteProfile();
            router.replace("/");
          }}
          style={{
            backgroundColor: "#2a1a1a",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#4a2a2a",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>Réinitialiser l'onboarding (test)</Text>
        </Pressable>

        {/* Bouton de test pour réinitialiser les questions du chat */}
        <Pressable
          onPress={async () => {
            if (profile) {
              const updatedProfile = { ...profile, chatQuestionsAsked: false };
              await saveProfile(updatedProfile);
              setProfile(updatedProfile);
              console.log("Questions du chat réinitialisées");
            }
          }}
          style={{
            backgroundColor: "#1a1f2e",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#2a3a4a",
          }}
        >
          <Text style={{ color: "#60A5FA", fontWeight: "700" }}>Réinitialiser les questions du chat (test)</Text>
        </Pressable>
      </View>

      {/* Modal de détail du plan */}
      <Modal
        visible={showPlanDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlanDetail(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Header de la modal */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#333"
          }}>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
              {selectedPlan?.title}
            </Text>
            <Pressable
              onPress={() => setShowPlanDetail(false)}
              style={{
                backgroundColor: "transparent",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
            >
              <Text style={{ color: "transparent", fontWeight: "600" }}>Fermer</Text>
            </Pressable>
          </View>

          {/* Contenu du plan */}
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={{
              backgroundColor: selectedPlan?.type === 'workout' ? "#1a1f2e" : "#1a1f3a",
              padding: 20,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: selectedPlan?.type === 'workout' ? "#60A5FA" : "#3B82F6"
            }}>
              <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
                Sauvegardé le {selectedPlan?.date ? new Date(selectedPlan.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </Text>
              
              <Text style={{ 
                color: "#fff", 
                fontSize: 16, 
                lineHeight: 24,
                fontFamily: "monospace"
              }}>
                {selectedPlan?.content}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
