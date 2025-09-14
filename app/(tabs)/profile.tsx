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
    View
} from "react-native";
import { authService } from "../../lib/auth";
import { deletePlan, deleteProfile, loadProfile, saveProfile, UserProfile } from "../../lib/profile";
import { theme } from "../../theme";

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
  
  // États pour la modal de compte
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showAccountInfoModal, setShowAccountInfoModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Charger la photo de profil depuis le profil sauvegardé
  useEffect(() => {
    if (profile?.profileImage) {
      setProfileImage(profile.profileImage);
    }
  }, [profile]);

  // Charger le numéro de téléphone depuis le profil
  useEffect(() => {
    if (profile?.phone) {
      setPhoneNumber(profile.phone);
    }
  }, [profile]);

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
      console.log('📦 Profil chargé dans l\'écran profil:', userProfile?.saved_plans);
      setProfile(userProfile);
      if (userProfile) {
        setFirstName(userProfile.first_name || "");
        setAge(userProfile.age?.toString() || "");
        setWeight(userProfile.weight?.toString() || "");
        setHeight(userProfile.height?.toString() || "");
        setGender(userProfile.gender === "male" ? "Homme" : userProfile.gender === "female" ? "Femme" : "");
        
        // Initialiser les états des préférences
        setGoal(userProfile.goal || "");
        setSessions(userProfile.sessions?.toString() || "");
        setDiet(userProfile.diet || "");
        setFitnessLevel(userProfile.chat_responses?.fitnessLevel || userProfile.fitness_level || "");
        setEquipment(userProfile.chat_responses?.equipment || userProfile.equipment || "");
        setIntolerances(userProfile.chat_responses?.intolerances || userProfile.intolerances || "");
        setLimitations(userProfile.chat_responses?.limitations || userProfile.limitations || "");
        setPreferredTime(userProfile.chat_responses?.preferredTime || userProfile.preferred_time || "");
        
        console.log("Profil chargé dans l'onglet profil:", userProfile);
        console.log("Réponses du chat:", userProfile.chat_responses);
        console.log("Horaires préférés - chat_responses:", userProfile.chat_responses?.preferredTime);
        console.log("Horaires préférés - profile:", userProfile.preferred_time);
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
        first_name: firstName.trim() || undefined,
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
        fitness_level: fitnessLevel.trim() as "Débutant" | "Intermédiaire" | "Avancé" || profile.fitness_level,
        equipment: equipment.trim() as "Aucun" | "Basique" | "Complet" || profile.equipment,
        intolerances: intolerances.trim() || profile.intolerances,
        limitations: limitations.trim() || profile.limitations,
        preferred_time: preferredTime.trim() as "Matin" | "Midi" | "Soir" | "Flexible" || profile.preferred_time,
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

  const deleteAllMeals = async () => {
    if (!profile?.saved_plans?.meals?.length) {
      Alert.alert("Aucun repas", "Il n'y a aucun repas à supprimer");
      return;
    }

    Alert.alert(
      "Supprimer tous les repas",
      `Êtes-vous sûr de vouloir supprimer tous les ${profile.saved_plans.meals.length} repas enregistrés ? Cette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer tout",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedProfile = {
                ...profile,
                saved_plans: {
                  workouts: profile.saved_plans?.workouts || [],
                  meals: []
                }
              };
              
              await saveProfile(updatedProfile);
              setProfile(updatedProfile);
              
              // Synchroniser aussi avec lib/plans.ts
              try {
                const { listPlans, deletePlan } = await import('../../lib/plans');
                const allPlans = await listPlans();
                const mealPlans = allPlans.filter(plan => plan.type === 'meal');
                
                for (const mealPlan of mealPlans) {
                  await deletePlan(mealPlan.id);
                }
                console.log(`✅ ${mealPlans.length} repas supprimés de lib/plans.ts`);
              } catch (syncError) {
                console.warn(`⚠️ Failed to sync deletion with lib/plans.ts:`, syncError);
              }
              
            } catch (error) {
              console.error("Erreur lors de la suppression des repas:", error);
              Alert.alert("Erreur", "Impossible de supprimer les repas");
            }
          }
        }
      ]
    );
  };

  const deleteAllWorkouts = async () => {
    if (!profile?.saved_plans?.workouts?.length) {
      Alert.alert("Aucune séance", "Il n'y a aucune séance à supprimer");
      return;
    }

    Alert.alert(
      "Supprimer toutes les séances",
      `Êtes-vous sûr de vouloir supprimer toutes les ${profile.saved_plans.workouts.length} séances enregistrées ? Cette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer tout",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedProfile = {
                ...profile,
                saved_plans: {
                  workouts: [],
                  meals: profile.saved_plans?.meals || []
                }
              };
              
              await saveProfile(updatedProfile);
              setProfile(updatedProfile);
              
              // Synchroniser aussi avec lib/plans.ts
              try {
                const { listPlans, deletePlan } = await import('../../lib/plans');
                const allPlans = await listPlans();
                const workoutPlans = allPlans.filter(plan => plan.type === 'workout');
                
                for (const workoutPlan of workoutPlans) {
                  await deletePlan(workoutPlan.id);
                }
                console.log(`✅ ${workoutPlans.length} séances supprimées de lib/plans.ts`);
              } catch (syncError) {
                console.warn(`⚠️ Failed to sync deletion with lib/plans.ts:`, syncError);
              }
              
            } catch (error) {
              console.error("Erreur lors de la suppression des séances:", error);
              Alert.alert("Erreur", "Impossible de supprimer les séances");
            }
          }
        }
      ]
    );
  };

  // Fonctions pour la gestion du compte
  const loadUserEmail = async () => {
    try {
      const { getSupabaseClient } = await import('../../lib/supabase');
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'email:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      if (result.success) {
        Alert.alert('Succès', 'Mot de passe modifié avec succès');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de modifier le mot de passe');
      }
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer le profil local
              await deleteProfile();
              // Déconnexion
              await authService.signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Erreur lors de la suppression du compte:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            }
          }
        }
      ]
    );
  };

  const handleSelectProfileImage = async () => {
    try {
      // Demander les permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission requise", "L'accès à la galerie est nécessaire pour sélectionner une photo de profil.");
        return;
      }

      // Afficher les options (galerie ou appareil photo)
      Alert.alert(
        "Sélectionner une photo",
        "Choisissez une source pour votre photo de profil",
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Galerie",
            onPress: () => pickImageFromGallery()
          },
          {
            text: "Appareil photo",
            onPress: () => takePhotoWithCamera()
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        // Ici vous pourriez sauvegarder l'URI dans le profil utilisateur
        if (profile) {
          const updatedProfile = { ...profile, profileImage: result.assets[0].uri };
          await saveProfile(updatedProfile);
          setProfile(updatedProfile);
        }
        Alert.alert("Succès", "Photo de profil mise à jour !");
      }
    } catch (error) {
      console.error('Erreur lors de la sélection depuis la galerie:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission requise", "L'accès à l'appareil photo est nécessaire pour prendre une photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        // Ici vous pourriez sauvegarder l'URI dans le profil utilisateur
        if (profile) {
          const updatedProfile = { ...profile, profileImage: result.assets[0].uri };
          await saveProfile(updatedProfile);
          setProfile(updatedProfile);
        }
        Alert.alert("Succès", "Photo de profil mise à jour !");
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleSaveAccountInfo = async () => {
    if (!profile) return;

    try {
      const updatedProfile = { ...profile, phone: phoneNumber };
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);
      setShowAccountInfoModal(false);
      Alert.alert("Succès", "Informations de compte mises à jour !");
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des informations de compte:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ 
      paddingTop: 60, 
      paddingHorizontal: theme.spacing.md, 
      paddingBottom: theme.spacing.lg 
    }}>
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: theme.spacing.xs 
      }}>
        <Text style={{ 
          color: theme.colors.text, 
          ...theme.typography.h2 
        }}>
          Mon Profil
        </Text>
        <Pressable
          onPress={() => {
            loadUserEmail();
            setShowAccountModal(true);
          }}
          style={{
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* Icône hamburger (3 barres) */}
          <View style={{ flexDirection: "column", gap: 2 }}>
            <View style={{ width: 16, height: 2, backgroundColor: theme.colors.text, borderRadius: 1 }} />
            <View style={{ width: 16, height: 2, backgroundColor: theme.colors.text, borderRadius: 1 }} />
            <View style={{ width: 16, height: 2, backgroundColor: theme.colors.text, borderRadius: 1 }} />
          </View>
        </Pressable>
      </View>
      <Text style={{ 
        color: theme.colors.textSecondary, 
        ...theme.typography.body,
        marginBottom: theme.spacing.lg 
      }}>
        Gère tes informations et préférences
      </Text>

      {/* Section Plans sauvegardés */}
      <View style={{ 
        ...theme.card,
        marginBottom: theme.spacing.lg
      }}>
        <Text style={{ 
          color: theme.colors.text, 
          ...theme.typography.h4, 
          marginBottom: theme.spacing.md 
        }}>
          Mes plans enregistrés
        </Text>
        
        {/* Séances sauvegardées */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: theme.spacing.xs 
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4 
            }}>
              Séances ({profile?.saved_plans?.workouts?.length || 0})
            </Text>
            {(profile?.saved_plans?.workouts?.length || 0) > 0 && (
              <Pressable
                onPress={deleteAllWorkouts}
                style={{
                  backgroundColor: "#2a1a1a",
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                  borderWidth: 1,
                  borderColor: "#4a2a2a"
                }}
              >
                <Text style={{ 
                  color: "#ff6666", 
                  ...theme.typography.caption 
                }}>
                  Tout supprimer
                </Text>
              </Pressable>
            )}
          </View>
          {profile?.saved_plans?.workouts?.length ? (
            <ScrollView 
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {profile.saved_plans.workouts.slice().reverse().map((workout) => {
              const cleanedContent = cleanWorkoutContent(workout.content);
              
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => openPlanDetail('workout', workout)}
                  style={{ 
                    backgroundColor: theme.colors.surfaceElevated, 
                    padding: theme.spacing.sm, 
                    borderRadius: theme.borderRadius.md, 
                    marginBottom: theme.spacing.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: theme.colors.primary
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.body 
                  }}>
                    {workout.title}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.textSecondary, 
                    ...theme.typography.caption, 
                    marginTop: theme.spacing.xs 
                  }}>
                    Sauvegardé le {new Date(workout.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.textTertiary, 
                    ...theme.typography.caption, 
                    marginTop: theme.spacing.xs, 
                    fontStyle: "italic" 
                  }}>
                    {cleanedContent.substring(0, 100)}...
                  </Text>
                  <View style={{ 
                    flexDirection: "row", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginTop: theme.spacing.xs 
                  }}>
                    <Text style={{ 
                      color: theme.colors.primary, 
                      ...theme.typography.caption 
                    }}>
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
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.xs,
                        paddingVertical: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.primary
                      }}
                    >
                      <Text style={{ 
                        color: theme.colors.primary, 
                        ...theme.typography.caption 
                      }}>🗑</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
              })}
            </ScrollView>
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
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: theme.spacing.xs 
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4 
            }}>
              Repas ({profile?.saved_plans?.meals?.length || 0})
            </Text>
            {(profile?.saved_plans?.meals?.length || 0) > 0 && (
              <Pressable
                onPress={deleteAllMeals}
                style={{
                  backgroundColor: "#2a1a1a",
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                  borderWidth: 1,
                  borderColor: "#4a2a2a"
                }}
              >
                <Text style={{ 
                  color: "#ff6666", 
                  ...theme.typography.caption 
                }}>
                  Tout supprimer
                </Text>
              </Pressable>
            )}
          </View>
          {profile?.saved_plans?.meals?.length ? (
            <ScrollView 
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {profile.saved_plans.meals.slice().reverse().map((meal) => {
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
                    backgroundColor: theme.colors.surfaceElevated, 
                    padding: theme.spacing.sm, 
                    borderRadius: theme.borderRadius.md, 
                    marginBottom: theme.spacing.sm,
                    borderLeftWidth: 3,
                    borderLeftColor: theme.colors.primary
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.body 
                  }}>
                    {meal.title}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.textSecondary, 
                    ...theme.typography.caption, 
                    marginTop: theme.spacing.xs 
                  }}>
                    Sauvegardé le {new Date(meal.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.textTertiary, 
                    ...theme.typography.caption, 
                    marginTop: theme.spacing.xs, 
                    fontStyle: "italic" 
                  }}>
                    {cleanedContent.substring(0, 100)}...
                  </Text>
                  <View style={{ 
                    flexDirection: "row", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginTop: theme.spacing.xs 
                  }}>
                    <Text style={{ 
                      color: theme.colors.primary, 
                      ...theme.typography.caption 
                    }}>
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
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.xs,
                        paddingVertical: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.primary
                      }}
                    >
                      <Text style={{ 
                        color: theme.colors.primary, 
                        ...theme.typography.caption 
                      }}>🗑</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
              })}
            </ScrollView>
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

      {/* Section Informations personnelles */}
      <View style={{ 
        ...theme.card,
        marginBottom: theme.spacing.lg
      }}>
        <View style={{ 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: theme.spacing.md 
        }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h4 
          }}>
            Informations personnelles
          </Text>
          <Pressable
            onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            style={{
              backgroundColor: "transparent",
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              minHeight: 32,
            }}
          >
            {isEditing ? (
              <Text style={{ 
                color: "#00D4AA", 
                ...theme.typography.body 
              }}>
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
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              Prénom
            </Text>
            {isEditing ? (
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ton prénom"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  ...theme.input,
                }}
              />
            ) : (
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body, 
                paddingVertical: theme.spacing.xs 
              }}>
                {profile?.first_name || "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              Âge
            </Text>
            {isEditing ? (
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Ton âge"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            ) : (
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body, 
                paddingVertical: theme.spacing.xs 
              }}>
                {profile?.age ? `${profile.age} ans` : "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              Poids
            </Text>
            {isEditing ? (
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Ton poids en kg"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            ) : (
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body, 
                paddingVertical: theme.spacing.xs 
              }}>
                {profile?.weight ? `${profile.weight} kg` : "Non renseigné"}
              </Text>
            )}
          </View>

          <View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              Taille
            </Text>
            {isEditing ? (
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="Ta taille en cm"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            ) : (
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body, 
                paddingVertical: theme.spacing.xs 
              }}>
                {profile?.height ? `${profile.height} cm` : "Non renseigné"}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Section Préférences */}
      <View style={{ 
        ...theme.card,
        marginBottom: theme.spacing.lg
      }}>
        <View style={{ 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: theme.spacing.md 
        }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h4 
          }}>
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
                {profile?.chat_responses?.fitnessLevel || profile?.fitness_level || "Non défini"}
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
                {profile?.chat_responses?.equipment || profile?.equipment || "Non défini"}
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
                {profile?.chat_responses?.intolerances || profile?.intolerances || "Non défini"}
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
                {profile?.chat_responses?.limitations || profile?.limitations || "Non défini"}
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
                {profile?.chat_responses?.preferredTime || profile?.preferred_time || "Non défini"}
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





        {/* Bouton pour réinitialiser l'onboarding du dashboard */}
        <Pressable
          onPress={async () => {
            if (profile) {
              const updatedProfile = { ...profile, onboardingCompleted: false };
              await saveProfile(updatedProfile);
              setProfile(updatedProfile);
              Alert.alert("Succès", "L'onboarding du dashboard a été réinitialisé !");
            }
          }}
          style={{
            backgroundColor: "#1a2a4a",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#2a4a6a",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#60A5FA", fontWeight: "700" }}>Réinitialiser l'onboarding du dashboard</Text>
        </Pressable>

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

      {/* Modal de gestion du compte */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountModal(false)}
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
            backgroundColor: "#111",
            borderBottomWidth: 1,
            borderBottomColor: "#333"
          }}>
            <Pressable
              onPress={() => setShowAccountModal(false)}
              style={{
                padding: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>←</Text>
            </Pressable>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              Mon compte
            </Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView style={{ flex: 1 }}>
            {/* Section Profil */}
            <View style={{
              backgroundColor: "#111",
              marginTop: 20,
              marginHorizontal: 16,
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#0070F3",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                  borderWidth: 3,
                  borderColor: "#333",
                  overflow: "hidden",
                }}>
                  {profileImage || profile?.profileImage ? (
                    <Image
                      source={{ uri: profileImage || profile?.profileImage }}
                      style={{
                        width: 74,
                        height: 74,
                        borderRadius: 37,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800" }}>👨‍💼</Text>
                  )}
                </View>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 }}>
                  {profile?.first_name || "Utilisateur"}
                </Text>
                <Pressable
                  onPress={handleSelectProfileImage}
                  style={{
                    backgroundColor: "#1a1a1a",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "#0070F3",
                  }}
                >
                  <Text style={{ color: "#0070F3", fontSize: 14, fontWeight: "600" }}>
                    Modifier la photo
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Section Informations de compte */}
            <View style={{
              backgroundColor: "#111",
              marginHorizontal: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Pressable
                onPress={() => setShowAccountInfoModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#1a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#60A5FA", fontSize: 18 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                    Informations de compte
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    {userEmail || "Chargement..."}
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowChangePassword(!showChangePassword)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#1a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#60A5FA", fontSize: 18 }}>🔐</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                    Connexion et sécurité
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Mot de passe et authentification
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>

              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#1a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#60A5FA", fontSize: 18 }}>🔒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                    Données et confidentialité
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Gérer vos données personnelles
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>

              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#1a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#60A5FA", fontSize: 18 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                    Préférences de notification
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Personnaliser vos notifications
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>
            </View>

            {/* Section Aide */}
            <View style={{
              backgroundColor: "#111",
              marginHorizontal: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#1a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#60A5FA", fontSize: 18 }}>💬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                    Aide
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Support et FAQ
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>
            </View>

            {/* Formulaire de changement de mot de passe */}
            {showChangePassword && (
              <View style={{
                backgroundColor: "#111",
                marginHorizontal: 16,
                borderRadius: 12,
                marginBottom: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#333"
              }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
                  Changer le mot de passe
                </Text>
                
                <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
                  Mot de passe actuel
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 16
                  }}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Mot de passe actuel"
                  secureTextEntry
                  placeholderTextColor="#666"
                />

                <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
                  Nouveau mot de passe
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 16
                  }}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nouveau mot de passe"
                  secureTextEntry
                  placeholderTextColor="#666"
                />

                <Text style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
                  Confirmer le nouveau mot de passe
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 20
                  }}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le nouveau mot de passe"
                  secureTextEntry
                  placeholderTextColor="#666"
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={handleChangePassword}
                    style={{
                      backgroundColor: "#0070F3",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      flex: 1
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                      Modifier
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      backgroundColor: "#333",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      flex: 1
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                      Annuler
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Section Actions du compte */}
            <View style={{
              backgroundColor: "#111",
              marginHorizontal: 16,
              borderRadius: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Pressable
                onPress={handleDeleteAccount}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#333",
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#2a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#ff4444", fontSize: 18 }}>🗑️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#ff4444", fontSize: 16, fontWeight: "600" }}>
                    Fermer le compte
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Supprimer définitivement votre compte
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#2a1a1a",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ color: "#ff6b6b", fontSize: 18 }}>↗️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#ff6b6b", fontSize: 16, fontWeight: "600" }}>
                    Déconnexion
                  </Text>
                  <Text style={{ color: "#aaa", fontSize: 14, marginTop: 2 }}>
                    Se déconnecter de votre compte
                  </Text>
                </View>
                <Text style={{ color: "#aaa", fontSize: 18 }}>›</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal des informations de compte */}
      <Modal
        visible={showAccountInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountInfoModal(false)}
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
            backgroundColor: "#111",
            borderBottomWidth: 1,
            borderBottomColor: "#333"
          }}>
            <Pressable
              onPress={() => setShowAccountInfoModal(false)}
              style={{
                padding: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>←</Text>
            </Pressable>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              Informations de compte
            </Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Section Email */}
            <View style={{
              backgroundColor: "#111",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
                Email
              </Text>
              <Text style={{ color: "#aaa", fontSize: 16 }}>
                {userEmail || "Chargement..."}
              </Text>
            </View>

            {/* Section Numéro de téléphone */}
            <View style={{
              backgroundColor: "#111",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#333"
            }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
                Numéro de téléphone
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#333",
                  fontSize: 16
                }}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Entrez votre numéro de téléphone"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            {/* Boutons d'action */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={handleSaveAccountInfo}
                style={{
                  backgroundColor: "#0070F3",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Sauvegarder
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowAccountInfoModal(false)}
                style={{
                  backgroundColor: "#333",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                  Annuler
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
