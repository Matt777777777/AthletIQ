import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { checkAndResetDailyChat, loadChatMessages, Message, saveChatMessages } from "../lib/chat";
import { estimateKcalTarget } from "../lib/nutrition";
import { loadProfile, savePlan, saveProfile, UserProfile } from "../lib/profile";
import { addShoppingItem, extractIngredientsFromAIResponse } from "../lib/shopping";
import { calculateWorkoutCalories } from "../lib/workout-calories";
import { theme } from "../theme";

// ✅ Endpoint Vercel (prod)
const endpoint =
  "https://the-sport-backend-o6wzopx00-matts-projects-43da855b.vercel.app/api/chat";

// Message type is now imported from lib/chat

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAskingProfileQuestions, setIsAskingProfileQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lastAIResponse, setLastAIResponse] = useState<Message | null>(null);
  const [showSaveButtons, setShowSaveButtons] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Fonction pour vérifier et réinitialiser le chat quotidiennement
  const handleDailyChatReset = async () => {
    try {
      await checkAndResetDailyChat();
      // Recharger les messages après la réinitialisation
      const loadedMessages = await loadChatMessages();
      setMessages(loadedMessages);
      setLastAIResponse(null);
      setShowSaveButtons(false);
      setInput("");
    } catch (error) {
      console.log("Erreur lors de la vérification de réinitialisation quotidienne:", error);
    }
  };

  // Fonction pour nettoyer le texte des réponses IA
  const cleanText = (text: string): string => {
    return text
      // Supprimer les balises markdown
      .replace(/#{1,6}\s*/g, '') // Enlever les # (titres)
      .replace(/\*\*(.*?)\*\*/g, '$1') // Enlever les ** (gras)
      .replace(/\*(.*?)\*/g, '$1') // Enlever les * (italique)
      .replace(/`(.*?)`/g, '$1') // Enlever les ` (code)
      .replace(/~~(.*?)~~/g, '$1') // Enlever les ~~ (barré)
      // Nettoyer les listes et puces
      .replace(/^[\s]*[-*+]\s+/gm, '• ') // Remplacer les puces par •
      .replace(/^[\s]*\d+\.\s+/gm, '') // Enlever les numérotations
      // Nettoyer les espaces multiples
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Réduire les sauts de ligne multiples
      .replace(/[ \t]+/g, ' ') // Réduire les espaces multiples
      .trim();
  };

  // Fonction pour extraire le titre du plat depuis la réponse IA
  const extractMealTitle = (content: string): string => {
    console.log("🔍 extractMealTitle - Contenu reçu:", content.substring(0, 200) + "...");
    
    // Diviser le contenu en lignes et filtrer les lignes vides
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    console.log("🔍 extractMealTitle - Lignes:", lines);
    
    // Chercher le titre dans les premières lignes
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      console.log(`🔍 extractMealTitle - Ligne ${i}:`, line);
      
      // Ignorer les lignes qui commencent par des mots-clés de repas
      if (/^(PetitDéjeuner|Petit-déjeuner|Déjeuner|Dîner|Collation|Snack|Voici|Je te propose|Recette)/i.test(line)) {
        continue;
      }
      
      // Ignorer les lignes trop courtes ou qui contiennent des instructions
      if (line.length < 5 || /^(Ingrédients|Préparation|Instructions|Étapes|1\.|2\.|3\.)/i.test(line)) {
        continue;
      }
      
      // Nettoyer la ligne
      let cleanedTitle = line.replace(/[:•\-\*#]/g, '').trim();
      
      // Si la ligne nettoyée fait au moins 5 caractères, c'est probablement le titre
      if (cleanedTitle.length >= 5) {
        console.log("🔍 extractMealTitle - Titre trouvé:", cleanedTitle);
        return cleanedTitle;
      }
    }

    // Fallback: retourner un titre générique
    console.log("🔍 extractMealTitle - Fallback utilisé");
    return "Recette générée";
  };


  // Fonction pour nettoyer le contenu de la recette
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

  // Fonction pour extraire le titre de la séance (avec la date)
  const extractWorkoutTitle = (content: string): string => {
    // Diviser le contenu en lignes et filtrer les lignes vides
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Prendre la première ligne qui contient le titre avec la date
    if (lines.length > 0) {
      return lines[0].trim();
    }
    
    // Si pas de contenu, retourner un titre par défaut
    return "Séance de sport";
  };

  // Fonction pour nettoyer le contenu de la séance
  const cleanWorkoutContent = (content: string): string => {
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
        /Voici une séance de [^:]+ pour [^:]+:/gi,
        /Voici une séance de [^:]+:/gi,
        /Voici [^:]+ pour [^:]+:/gi,
        /Voici [^:]+:/gi,
        /Je te propose [^:]+:/gi,
        /Voici [^:]+ adapté:/gi,
        /Voici [^:]+ parfait:/gi,
      ];

      let cleanedContent = content;
      
      for (const pattern of introPatterns) {
        cleanedContent = cleanedContent.replace(pattern, '').trim();
      }

      // Nettoyer les espaces et sauts de ligne en début
      cleanedContent = cleanedContent.replace(/^\s*\n+/, '').trim();
      
      return cleanedContent;
    }

    // Fallback: retourner le contenu tel quel
    return content;
  };

  // Fonction pour générer un repas de démarrage
  const generateStarterMeal = async () => {
    const mealPrompt = "Génère-moi un repas équilibré et sain pour le déjeuner, sans matériel spécial, avec des ingrédients simples à trouver. Suis le format obligatoire : commence directement par le nom du plat, puis Ingrédients : et Préparation :";
    setInput(mealPrompt);
    // Attendre un petit délai pour que l'input soit mis à jour
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  // Fonction pour générer une séance de sport de démarrage
  const generateStarterWorkout = async () => {
    const workoutPrompt = "Génère-moi une séance de sport classique d'1 heure sans matériel, adaptée à tous niveaux. Inclus le titre de la séance, le matériel nécessaire (aucun), et les exercices avec répétitions et durées.";
    setInput(workoutPrompt);
    // Attendre un petit délai pour que l'input soit mis à jour
    setTimeout(() => {
      sendMessage();
    }, 100);
  };



  // Questions complémentaires pour le profil
  const profileQuestions = [
    "Quel est ton niveau de sport actuel ? (débutant, intermédiaire, avancé)",
    "Quel matériel de sport as-tu à disposition ? (aucun, basique, complet)",
    "As-tu des intolérances alimentaires ou des allergies ?",
    "Y a-t-il des exercices que tu ne peux pas faire ? (problèmes de dos, genoux, etc.)",
    "À quel moment préfères-tu faire du sport ? (matin, midi, soir, flexible)"
  ];

  // Fonction pour détecter et extraire les informations du profil depuis une réponse
  const extractProfileInfo = (text: string): Partial<UserProfile> => {
    const lowerText = text.toLowerCase();
    const updates: Partial<UserProfile> = {};

    // Détection du niveau de sport
    if (lowerText.includes('débutant') || lowerText.includes('debutant')) {
      updates.fitness_level = "Débutant";
    } else if (lowerText.includes('intermédiaire') || lowerText.includes('intermediaire')) {
      updates.fitness_level = "Intermédiaire";
    } else if (lowerText.includes('avancé') || lowerText.includes('avance')) {
      updates.fitness_level = "Avancé";
    }

    // Détection du matériel
    if (lowerText.includes('aucun') || lowerText.includes('rien') || lowerText.includes('pas de matériel')) {
      updates.equipment = "Aucun";
    } else if (lowerText.includes('basique') || lowerText.includes('tapis') || lowerText.includes('élastique')) {
      updates.equipment = "Basique";
    } else if (lowerText.includes('complet') || lowerText.includes('salle') || lowerText.includes('haltères')) {
      updates.equipment = "Complet";
    }

    // Détection des intolérances
    if (lowerText.includes('aucune') || lowerText.includes('pas d\'intolérance') || lowerText.includes('rien')) {
      updates.intolerances = "Aucune";
      } else {
      const intolerances = [];
      if (lowerText.includes('lactose')) intolerances.push('Lactose');
      if (lowerText.includes('gluten')) intolerances.push('Gluten');
      if (lowerText.includes('fruits à coque') || lowerText.includes('noix')) intolerances.push('Fruits à coque');
      if (intolerances.length > 0) {
        updates.intolerances = intolerances.join(', ');
      }
    }

    // Détection des limitations
    if (lowerText.includes('aucune') || lowerText.includes('pas de problème') || lowerText.includes('rien')) {
      updates.limitations = "Aucune";
    } else {
      const limitations = [];
      if (lowerText.includes('dos') || lowerText.includes('lombaires')) limitations.push('Problèmes de dos');
      if (lowerText.includes('genoux') || lowerText.includes('genou')) limitations.push('Problèmes de genoux');
      if (limitations.length > 0) {
        updates.limitations = limitations.join(', ');
      }
    }

    // Détection des horaires préférés
    if (lowerText.includes('matin')) {
      updates.preferred_time = "Matin";
    } else if (lowerText.includes('midi')) {
      updates.preferred_time = "Midi";
    } else if (lowerText.includes('soir')) {
      updates.preferred_time = "Soir";
    } else if (lowerText.includes('flexible') || lowerText.includes('n\'importe')) {
      updates.preferred_time = "Flexible";
    }

    return updates;
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Vérifier et réinitialiser le chat quotidiennement
        await handleDailyChatReset();
        
        const loadedProfile = await loadProfile();
        setProfile(loadedProfile);
        
        // Initialiser les messages selon le profil
        if (loadedProfile) {
          // Vérifier si on doit poser les questions (première fois seulement)
          const shouldAskQuestions = !loadedProfile.chat_questions_asked;
          
          console.log("Profil chargé:", loadedProfile);
          console.log("Questions déjà posées:", loadedProfile.chat_questions_asked);
          console.log("Doit poser les questions:", shouldAskQuestions);
          
          if (shouldAskQuestions) {
            setMessages([
              {
                id: "welcome",
                text: "Salut ! Je suis ton coach IA. Pour créer un programme parfaitement adapté à tes besoins, j'aimerais te poser quelques questions :",
                sender: "ai",
              },
              {
                id: "question_0",
                text: `1/5 - ${profileQuestions[0]}`,
                sender: "ai",
              }
            ]);
            setIsAskingProfileQuestions(true);
            setCurrentQuestionIndex(0);
          } else {
            // Profil complet, message d'accueil personnalisé
            const welcomeMessage = loadedProfile.first_name 
              ? `Salut ${loadedProfile.first_name} ! Je suis ton coach IA. Je connais ton profil et je vais adapter toutes mes réponses à tes besoins. Pose-moi une question !`
              : "Salut ! Je suis ton coach IA. Je connais ton profil et je vais adapter toutes mes réponses à tes besoins. Pose-moi une question !";
            
            setMessages([
              {
                id: "welcome",
                text: welcomeMessage,
                sender: "ai",
              },
            ]);
          }
        } else {
          // Pas de profil, poser les questions
          setMessages([
            {
              id: "welcome",
              text: "Salut ! Je suis ton coach IA. Pour créer un programme parfaitement adapté à tes besoins, j'aimerais te poser quelques questions :",
              sender: "ai",
            },
            {
              id: "question_0",
              text: `1/5 - ${profileQuestions[0]}`,
              sender: "ai",
            }
          ]);
          setIsAskingProfileQuestions(true);
          setCurrentQuestionIndex(0);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation du chat:", error);
        setMessages([
          {
            id: "error",
            text: "Erreur lors du chargement de ton profil. Réessaie plus tard !",
            sender: "ai",
          },
        ]);
      }
    };

    initializeChat();
  }, []);

  // Recharger le profil quand on revient sur l'onglet chat
  useFocusEffect(
    React.useCallback(() => {
      const reloadProfile = async () => {
        try {
          const loadedProfile = await loadProfile();
          setProfile(loadedProfile);
        } catch (error) {
          console.error("Erreur lors du rechargement du profil:", error);
        }
      };
      reloadProfile();
    }, [])
  );

  // Surveiller les changements de chat_questions_asked pour redémarrer l'onboarding
  useEffect(() => {
    if (profile && !profile.chat_questions_asked && !isAskingProfileQuestions && messages.length === 0) {
      console.log("Redémarrage de l'onboarding détecté");
      setMessages([
        {
          id: "welcome",
          text: "Salut ! Je suis ton coach IA. Pour créer un programme parfaitement adapté à tes besoins, j'aimerais te poser quelques questions :",
          sender: "ai",
        },
        {
          id: "question_0",
          text: `1/5 - ${profileQuestions[0]}`,
          sender: "ai",
        }
      ]);
      setIsAskingProfileQuestions(true);
      setCurrentQuestionIndex(0);
    }
  }, [profile?.chat_questions_asked]);

  // Fonction pour traiter une réponse et mettre à jour le profil
  const handleProfileAnswer = async (answer: string) => {
    if (!profile) return;

    console.log("Traitement de la réponse:", answer);
    
    // Ajouter la réponse de l'utilisateur aux messages
    const userMessage: Message = {
      id: `answer_${currentQuestionIndex}`,
      text: answer,
      sender: "user",
    };
    setMessages(prev => [...prev, userMessage]);
    // Sauvegarder les messages
    const updatedMessages = [...messages, userMessage];
    await saveChatMessages(updatedMessages);
    
    // Extraire les informations du profil depuis la réponse
    const profileUpdates = extractProfileInfo(answer);
    
    // Enregistrer la réponse exacte selon la question actuelle
    const questionKeys = ['fitness_level', 'equipment', 'intolerances', 'limitations', 'preferred_time'];
    const currentQuestionKey = questionKeys[currentQuestionIndex];
    
    // Créer ou mettre à jour les réponses exactes
    const currentChatResponses = profile.chat_responses || {};
    const updatedChatResponses = {
      ...currentChatResponses,
      [currentQuestionKey]: answer
    };
    
    console.log("Informations extraites:", profileUpdates);
    console.log("Réponse exacte enregistrée:", { [currentQuestionKey]: answer });
    
    try {
      const updatedProfile = { 
        ...profile, 
        ...profileUpdates,
        chat_responses: updatedChatResponses
      };
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);
      
      console.log("Profil mis à jour:", updatedProfile);
      
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du profil:", error);
    }
    
    // Passer à la question suivante (même si la sauvegarde a échoué)
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    
    // Poser la question suivante ou terminer
    setTimeout(async () => {
      if (nextIndex < profileQuestions.length) {
        const nextQuestion: Message = {
          id: `question_${nextIndex}`,
          text: `${nextIndex + 1}/5 - ${profileQuestions[nextIndex]}`,
          sender: "ai",
        };
        setMessages(prev => [...prev, nextQuestion]);
      } else {
        // Toutes les questions posées - marquer comme terminé
        setIsAskingProfileQuestions(false);
        
        // Marquer que les questions ont été posées
        try {
          const finalProfile = { 
            ...profile, 
            ...profileUpdates,
            chat_responses: updatedChatResponses,
            chat_questions_asked: true 
          };
          console.log("🔍 Sauvegarde du profil final:", finalProfile);
          await saveProfile(finalProfile);
          setProfile(finalProfile);
          console.log("✅ Questions marquées comme posées, profil mis à jour");
        } catch (error) {
          console.error("❌ Erreur lors de la sauvegarde du flag:", error);
        }
        
        const completionMessage: Message = {
          id: "completion",
          text: "Parfait ! J'ai toutes les informations nécessaires. Maintenant je peux te donner des conseils parfaitement adaptés à ton profil. Que veux-tu faire ?",
          sender: "ai",
        };
        setMessages(prev => [...prev, completionMessage]);
      }
    }, 500);
  };

    const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;

    // Si on est en train de poser les questions de profil, traiter la réponse
    if (isAskingProfileQuestions) {
      await handleProfileAnswer(content);
      setInput("");
      return; // Ne pas continuer avec le message normal
    }

    const userMsg: Message = { id: Date.now().toString(), text: content, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    // Sauvegarder les messages
    const updatedMessages = [...messages, userMsg];
    await saveChatMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setShowSaveButtons(false); // Masquer les boutons lors d'un nouveau message

    try {
      // Construire le prompt système avec toutes les informations du profil
      let systemPrompt = "Tu es un coach sportif & nutrition pour l'app AthletIQ. " +
        "Réponds en français, de façon claire et structurée (listes, étapes). " +
        "N'effectue pas de conseils médicaux ; oriente vers un professionnel si nécessaire.";

      if (profile) {
        // Calculer les besoins caloriques
        const kcalTarget = estimateKcalTarget(profile);
        const breakfastKcal = Math.round(kcalTarget * 0.25); // 25% du total
        const lunchKcal = Math.round(kcalTarget * 0.35); // 35% du total
        const snackKcal = Math.round(kcalTarget * 0.15); // 15% du total
        const dinnerKcal = Math.round(kcalTarget * 0.25); // 25% du total

        systemPrompt += "\n\nINFORMATIONS UTILISATEUR (à utiliser pour personnaliser tes réponses) :";
        
        // Informations personnelles
        if (profile.first_name) {
          systemPrompt += `\n- Prénom: ${profile.first_name}`;
        }
        if (profile.gender) {
          systemPrompt += `\n- Sexe: ${profile.gender === "male" ? "Homme" : "Femme"}`;
        }
        if (profile.age) {
          systemPrompt += `\n- Âge: ${profile.age} ans`;
        }
        if (profile.weight) {
          systemPrompt += `\n- Poids: ${profile.weight} kg`;
        }
        if (profile.height) {
          systemPrompt += `\n- Taille: ${profile.height} cm`;
        }
        
        // Objectifs et préférences
        systemPrompt += `\n- Objectif: ${profile.goal}`;
        systemPrompt += `\n- Séances par semaine: ${profile.sessions}`;
        systemPrompt += `\n- Régime alimentaire: ${profile.diet}`;
        
        // BESOINS CALORIQUES (nouveau)
        systemPrompt += `\n\nBESOINS CALORIQUES QUOTIDIENS:`;
        systemPrompt += `\n- Total quotidien: ${kcalTarget} kcal`;
        systemPrompt += `\n- Petit-déjeuner: ${breakfastKcal} kcal (25%)`;
        systemPrompt += `\n- Déjeuner: ${lunchKcal} kcal (35%)`;
        systemPrompt += `\n- Collation: ${snackKcal} kcal (15%)`;
        systemPrompt += `\n- Dîner: ${dinnerKcal} kcal (25%)`;
        
        // Informations complémentaires (valeurs extraites)
        if (profile.fitness_level) {
          systemPrompt += `\n- Niveau de sport: ${profile.fitness_level}`;
        }
        if (profile.equipment) {
          systemPrompt += `\n- Matériel disponible: ${profile.equipment}`;
        }
        if (profile.intolerances) {
          systemPrompt += `\n- Intolérances alimentaires: ${profile.intolerances}`;
        }
        if (profile.limitations) {
          systemPrompt += `\n- Limitations physiques: ${profile.limitations}`;
        }
        if (profile.preferred_time) {
          systemPrompt += `\n- Horaires préférés: ${profile.preferred_time}`;
        }

        // Réponses exactes du chat (pour plus de contexte)
        if (profile.chat_responses) {
          systemPrompt += "\n\nRÉPONSES EXACTES DE L'UTILISATEUR (pour mieux comprendre ses besoins) :";
          if (profile.chat_responses.fitnessLevel) {
            systemPrompt += `\n- Niveau de sport (réponse exacte): "${profile.chat_responses.fitnessLevel}"`;
          }
          if (profile.chat_responses.equipment) {
            systemPrompt += `\n- Matériel (réponse exacte): "${profile.chat_responses.equipment}"`;
          }
          if (profile.chat_responses.intolerances) {
            systemPrompt += `\n- Intolérances (réponse exacte): "${profile.chat_responses.intolerances}"`;
          }
          if (profile.chat_responses.limitations) {
            systemPrompt += `\n- Limitations (réponse exacte): "${profile.chat_responses.limitations}"`;
          }
          if (profile.chat_responses.preferredTime) {
            systemPrompt += `\n- Horaires (réponse exacte): "${profile.chat_responses.preferredTime}"`;
          }
        }
        
        systemPrompt += "\n\nIMPORTANT: Adapte TOUJOURS tes réponses à ces informations. " +
          "Pour les repas, calcule les portions selon l'âge, poids et objectif. " +
          "Pour les exercices, adapte selon le niveau, matériel et limitations. " +
          "Utilise les réponses exactes pour mieux comprendre les besoins spécifiques de l'utilisateur. " +
          "N'affiche JAMAIS ces informations dans tes réponses - utilise-les seulement pour personnaliser.";
        
        // Instructions spécifiques pour les repas (nouveau)
        systemPrompt += "\n\nINSTRUCTIONS SPÉCIFIQUES POUR LES REPAS:";
        systemPrompt += `\n- Quand tu proposes des repas, respecte EXACTEMENT les calories cibles par repas.`;
        systemPrompt += `\n- Petit-déjeuner: propose des repas d'environ ${breakfastKcal} kcal`;
        systemPrompt += `\n- Déjeuner: propose des repas d'environ ${lunchKcal} kcal`;
        systemPrompt += `\n- Collation: propose des repas d'environ ${snackKcal} kcal`;
        systemPrompt += `\n- Dîner: propose des repas d'environ ${dinnerKcal} kcal`;
        systemPrompt += `\n- Adapte les portions selon le régime alimentaire: ${profile.diet}`;
        systemPrompt += `\n- Respecte les intolérances: ${profile.intolerances || 'aucune'}`;
        systemPrompt += `\n- Inclus des macronutriments équilibrés (protéines, glucides, lipides)`;
        systemPrompt += `\n- Pour les repas du jour, propose 4 repas qui totalisent ${kcalTarget} kcal`;
        
        // Format obligatoire pour les repas
        systemPrompt += "\n\nFORMAT OBLIGATOIRE POUR CHAQUE REPAS:";
        systemPrompt += `\n- COMMENCE DIRECTEMENT par le nom du plat (ex: "Poulet grillé au riz", "Salade de quinoa aux légumes")`;
        systemPrompt += `\n- INTERDIT: phrases d'introduction comme "Voici un dîner savoureux pour toi :", "Je te propose", "Voici une idée"`;
        systemPrompt += `\n- Le nom doit être descriptif et appétissant`;
        systemPrompt += `\n- Ensuite, liste les ingrédients avec "Ingrédients :"`;
        systemPrompt += `\n- Puis liste la préparation avec "Préparation :"`;
        systemPrompt += `\n- Structure: NOM DU PLAT (1ère ligne) → Ingrédients : → Préparation :`;
        systemPrompt += `\n- Utilise des puces (•) pour les ingrédients et les étapes de préparation`;
        systemPrompt += `\n- Format des ingrédients: "• Nom de l'ingrédient - quantité"`;
        systemPrompt += `\n- Format de la préparation: "• Étape de préparation"`;
        
        // Instructions pour la détection du type de demande
        systemPrompt += "\n\nDÉTECTION DU TYPE DE DEMANDE:";
        systemPrompt += `\n- Si l'utilisateur demande UN SEUL repas (ex: "petit-déjeuner", "déjeuner", "collation", "dîner"):`;
        systemPrompt += `\n  * Propose UNIQUEMENT ce repas avec les calories appropriées`;
        systemPrompt += `\n  * Utilise le format standard d'un repas unique`;
        systemPrompt += `\n  * COMMENCE par le nom du plat (ex: "Poulet grillé au riz")`;
        systemPrompt += `\n- Si l'utilisateur demande TOUS les repas du jour (ex: "repas du jour", "planification", "menu complet"):`;
        systemPrompt += `\n  * Propose les 4 repas dans un format unifié`;
        systemPrompt += `\n  * Structure: "PETIT-DÉJEUNER", "DÉJEUNER", "COLLATION", "DÎNER"`;
        systemPrompt += `\n  * Chaque repas COMMENCE par son nom de plat`;
        systemPrompt += `\n  * Puis liste les ingrédients et la préparation`;
        systemPrompt += `\n  * Total des 4 repas = ${kcalTarget} kcal`;
        
        // Instructions spécifiques pour les séances de sport
        systemPrompt += "\n\nINSTRUCTIONS SPÉCIFIQUES POUR LES SÉANCES DE SPORT:";
        systemPrompt += `\n- Adapte la difficulté selon le niveau: ${profile.fitness_level}`;
        systemPrompt += `\n- Utilise uniquement le matériel disponible: ${profile.equipment}`;
        systemPrompt += `\n- Respecte les limitations: ${profile.limitations || 'aucune'}`;
        systemPrompt += `\n- Propose des exercices adaptés aux horaires: ${profile.preferred_time}`;
        systemPrompt += `\n- Inclus échauffement, exercices principaux et récupération`;
        systemPrompt += `\n- Précise les répétitions, séries et temps de repos`;
        systemPrompt += `\n- Adapte l'intensité selon l'objectif: ${profile.goal}`;
        
        // Format obligatoire pour les séances de sport
        systemPrompt += "\n\nFORMAT OBLIGATOIRE POUR CHAQUE SÉANCE DE SPORT:";
        systemPrompt += `\n- COMMENCE DIRECTEMENT par le nom de la séance suivi de la date d'aujourd'hui (ex: "Séance HIIT 45min - ${new Date().toLocaleDateString('fr-FR')}", "Circuit training complet - ${new Date().toLocaleDateString('fr-FR')}")`;
        systemPrompt += `\n- INTERDIT: phrases d'introduction comme "Voici une séance parfaite pour toi :", "Je te propose", "Voici une idée"`;
        systemPrompt += `\n- Le nom doit être descriptif et motivant`;
        systemPrompt += `\n- Ensuite, liste le matériel avec "Matériel :"`;
        systemPrompt += `\n- Puis liste la durée avec "Durée :"`;
        systemPrompt += `\n- Ensuite, détaille les exercices avec "Exercices :"`;
        systemPrompt += `\n- Structure: NOM DE LA SÉANCE (1ère ligne) → Matériel : → Durée : → Exercices :`;
        systemPrompt += `\n- Pour les exercices, utilise le format: "• Nom de l'exercice - X séries de Y répétitions - Z secondes de repos"`;
      }


              systemPrompt += "\n\nFORMAT RECETTES - Utilise TOUJOURS :" +
        "\n- NOM DU PLAT (1ère ligne) - SANS phrase d'introduction" +
        "\n- Ingrédients : (liste chaque ingrédient avec sa quantité adaptée au profil utilisateur)" +
        "\n- Préparation : (avec les étapes)" +
        "\n" +
        "IMPORTANT: Réponses concises et directes. Évite les répétitions et les détails superflus." +
        "\n" +
        "POUR LES INGRÉDIENTS:" +
        `\n- Adapte les quantités selon le sexe (${profile?.gender === "male" ? "Homme" : "Femme"}), le poids (${profile?.weight}kg) et les objectifs (${profile?.goal})` +
        "\n- Utilise le format: '• 200g de poulet', '• 150g de riz', '• 1 cuillère à soupe d'huile d'olive'" +
        `\n- Sois précis sur les quantités pour ${profile?.gender === "male" ? "un homme" : "une femme"} de ${profile?.weight}kg` +
        "\n" +
        "INTERDICTIONS STRICTES:" +
        "\n- JAMAIS de phrases comme 'Voici un dîner savoureux pour toi :'" +
        "\n- JAMAIS de phrases comme 'Je te propose', 'Voici une idée', 'Voici un repas'" +
        "\n- COMMENCE DIRECTEMENT par le nom du plat";

      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content },
          ],
        }),
      });

      const ct = r.headers.get("content-type") || "";
      const text = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} - ${text.slice(0, 220)}`);
      if (!ct.includes("application/json"))
        throw new Error(`Réponse non-JSON: ${text.slice(0, 220)}`);

      const data = JSON.parse(text);
      const replyText = data.reply?.toString() || "Pas de réponse reçue.";

      // Nettoyer la réponse (supprimer les balises JSON et markdown)
      const cleanedText = cleanText(replyText.replace(/<INGREDIENTS>[\s\S]*?<\/INGREDIENTS>/gi, '').trim());

      // Streaming artificiel
      const messageId = (Date.now() + 1).toString();
      const aiMessage = {
        id: messageId,
        text: "",
        sender: "ai" as const,
        originalText: replyText, // Stocker le texte original avec balises JSON
      };
      setMessages((prev) => [...prev, aiMessage]);
      // Sauvegarder les messages
      const updatedMessages = [...messages, aiMessage];
      await saveChatMessages(updatedMessages);

      setIsTyping(true);

      // Effet de frappe mot par mot
      let currentText = "";
      const words = cleanedText.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? " " : "") + words[i];
        
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === messageId ? { ...msg, text: currentText } : msg
          );
          // Sauvegarder les messages mis à jour
          saveChatMessages(updated);
          return updated;
        });
        
        // Pause variable selon le type de contenu
        const word = words[i];
        let delay = 50; // Délai de base
        
        if (word.includes("•") || word.includes("-")) delay = 200; // Pause pour les listes
        else if (word.includes(".") || word.includes("!")) delay = 300; // Pause pour les phrases
        else if (word.includes(",") || word.includes(":")) delay = 150; // Pause pour les virgules
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      setIsTyping(false);
      
      // Capturer la réponse et afficher les boutons de sauvegarde
      setLastAIResponse({
        id: messageId,
        text: cleanedText,
        sender: "ai",
        originalText: replyText,
      });
      setShowSaveButtons(true);
    } catch (e: any) {
      const errorText = "❌ Erreur serveur: " +
        (e?.message || "inconnue") +
        "\n(Astuce: vérifie l'URL de l'API et ta clé OpenAI sur Vercel)";
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: errorText,
          sender: "ai",
        },
      ]);
    } finally {
      setLoading(false);
      if (!isUserScrolling) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      enabled={true}
    >
      <View style={{ flex: 1 }}>
        <View style={{ 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center", 
          paddingTop: 60, 
          paddingHorizontal: theme.spacing.md, 
          marginBottom: theme.spacing.md 
        }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h2 
          }}>
            Ton coach IA
        </Text>
          {/* Boutons masqués */}
          {/* <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => {
                if (listRef.current) {
                  listRef.current.scrollToEnd({ animated: true });
                }
              }}
              style={{
                backgroundColor: "#0070F3",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                ↓ Bas
          </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
              }}
              style={{
                backgroundColor: "#333",
                paddingHorizontal: 12,
                paddingVertical: 6,
            borderRadius: 8, 
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                Fermer clavier
            </Text>
            </Pressable>
          </View> */}
        </View>


        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            paddingBottom: theme.spacing.md, 
            paddingHorizontal: theme.spacing.md,
            flexGrow: 1,
            minHeight: '100%'
          }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bounces={true}
          alwaysBounceVertical={false}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View>
            <View
              style={{
                alignSelf: item.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.sender === "user" ? theme.colors.primary : theme.colors.surfaceElevated,
                marginVertical: theme.spacing.xs,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                maxWidth: "78%",
                ...theme.shadows.sm
              }}
            >
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body,
                lineHeight: 20 
              }}>
                  {cleanText(item.text)}
                  {item.sender === "ai" && isTyping && item.text === "" && (
                    <Text style={{ color: theme.colors.textTertiary }}>🤖 écrit...</Text>
                  )}
              </Text>
              </View>
              
              {/* Boutons de démarrage - affichés après le message d'accueil ou de completion */}
              {((item.id === "welcome" && profile && profile.chat_questions_asked && !isAskingProfileQuestions) || 
                (item.id === "completion" && profile && profile.chat_questions_asked)) && (
                <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", gap: theme.spacing.sm, width: "100%" }}>
                    <Pressable
                      onPress={generateStarterMeal}
                      style={{
                        flex: 1,
                        ...theme.button.secondary,
                      }}
                    >
                      <Text style={{ 
                        color: theme.colors.primary, 
                        ...theme.typography.button,
                        textAlign: "center" 
                      }}>
                        Générer un repas
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={generateStarterWorkout}
                      style={{
                        flex: 1,
                        ...theme.button.secondary,
                      }}
                    >
                      <Text style={{ 
                        color: theme.colors.primary, 
                        ...theme.typography.button,
                        textAlign: "center" 
                      }}>
                        Séance de sport
                      </Text>
                    </Pressable>
                  </View>
            </View>
          )}
            </View>
          )}
          onContentSizeChange={() => {
            if (!isUserScrolling) {
              setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
            }
          }}
          onLayout={() => {
            if (!isUserScrolling) {
              setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
            }
          }}
          onScrollBeginDrag={() => setIsUserScrolling(true)}
          onScrollEndDrag={() => {
            setTimeout(() => setIsUserScrolling(false), 1000);
          }}
          onMomentumScrollEnd={() => {
            setTimeout(() => setIsUserScrolling(false), 1000);
          }}
        />

                {/* Boutons d'action rapide - affichés seulement après une réponse IA */}
        {showSaveButtons && lastAIResponse && (
          <View style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <Pressable
                  onPress={async () => {
                    const mealTitle = extractMealTitle(lastAIResponse?.text || '');
                    const mealContent = cleanMealContent(lastAIResponse?.text || '');
                    const success = await savePlan('meal', mealTitle, mealContent);
                    if (success) {
                      const updatedProfile = await loadProfile();
                      setProfile(updatedProfile);
                      const confirmMessage: Message = {
                        id: `confirm_${Date.now()}`,
                        text: "Repas enregistré dans tes plans !",
                        sender: "ai",
                      };
                      setMessages(prev => [...prev, confirmMessage]);
                    }
                  }}
                  style={{
                    flex: 1,
                    ...theme.button.secondary,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.primary, 
                    ...theme.typography.caption,
                    fontWeight: "600" 
                  }}>
                    Enregistrer repas
                  </Text>
                </Pressable>

          <Pressable
                  onPress={async () => {
                    const workoutTitle = extractWorkoutTitle(lastAIResponse?.text || '');
                    const workoutContent = cleanWorkoutContent(lastAIResponse?.text || '');
                    
                    // Calculer les calories de la séance
                    const calorieCalculation = calculateWorkoutCalories(workoutContent, profile);
                    
                    // Ajouter les informations de calories au contenu
                    const workoutContentWithCalories = `${workoutContent}\n\n---\nCalories estimées: ${calorieCalculation.calories} kcal\nDurée: ${calorieCalculation.duration} min\nIntensité: ${calorieCalculation.intensity}\nType d'activité: ${calorieCalculation.activityType}`;
                    
                    const success = await savePlan('workout', workoutTitle, workoutContentWithCalories);
                    if (success) {
                      const updatedProfile = await loadProfile();
                      setProfile(updatedProfile);
                      const confirmMessage: Message = {
                        id: `confirm_${Date.now()}`,
                        text: `Séance enregistrée dans tes plans ! (${calorieCalculation.calories} kcal estimées)`,
                        sender: "ai",
                      };
                      setMessages(prev => [...prev, confirmMessage]);
                    }
                  }}
                  style={{
                    flex: 1,
                    ...theme.button.secondary,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.primary, 
                    ...theme.typography.caption,
                    fontWeight: "600" 
                  }}>
                    Enregistrer séance
            </Text>
          </Pressable>
        </View>
          </View>
        )}



        {/* Bouton liste de courses - affiché seulement après une réponse IA */}
        {showSaveButtons && (
          <View style={{ paddingVertical: 4 }}>
            <Pressable
              onPress={async () => {
                try {
                  if (!lastAIResponse) {
                    const errorMessage: Message = {
                      id: `error_${Date.now()}`,
                      text: "Aucun message IA trouvé.",
                      sender: "ai",
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return;
                  }
                  
                  // TOUJOURS utiliser originalText pour l'extraction des ingrédients
                  // car il contient les balises <INGREDIENTS>...</INGREDIENTS>
                  console.log('Debug - lastAIResponse:', lastAIResponse);
                  console.log('Debug - originalText:', lastAIResponse.originalText);
                  console.log('Debug - text:', lastAIResponse.text);
                  
                  let textToExtract = lastAIResponse.originalText;
                  
                  // Si originalText n'est pas disponible, utiliser le texte normal
                  if (!textToExtract) {
                    console.log('originalText non disponible, utilisation du texte normal');
                    textToExtract = lastAIResponse.text;
                  }
                  const extractedItems = extractIngredientsFromAIResponse(textToExtract);
                  
                  if (extractedItems.length > 0) {
                    // Ajouter chaque ingrédient à la liste de courses
                    for (const item of extractedItems) {
                      await addShoppingItem({
                        ...item,
                        source: "Chat IA",
                      });
                    }
                    
                    const confirmMessage: Message = {
                      id: `confirm_${Date.now()}`,
                      text: `${extractedItems.length} ingrédient(s) ajouté(s) à ta liste de courses !`,
                      sender: "ai",
                    };
                    setMessages(prev => [...prev, confirmMessage]);
                  } else {
                    const errorMessage: Message = {
                      id: `error_${Date.now()}`,
                      text: "Aucun ingrédient trouvé dans cette réponse.",
                      sender: "ai",
                    };
                    setMessages(prev => [...prev, errorMessage]);
                  }
                } catch (error) {
                  console.error('Erreur ajout liste courses:', error);
                  const errorMessage: Message = {
                    id: `error_${Date.now()}`,
                    text: "Erreur lors de l'ajout à la liste de courses.",
                    sender: "ai",
                  };
                  setMessages(prev => [...prev, errorMessage]);
                }
              }}
              style={{
                ...theme.button.secondary,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.primary,
              }}
            >
              <Text style={{ 
                color: theme.colors.primary, 
                ...theme.typography.caption,
                fontWeight: "600" 
              }}>
                Ajouter à ma liste de courses
            </Text>
          </Pressable>
        </View>
        )}

        <View style={{
          flexDirection: "row", 
          alignItems: "center", 
          paddingVertical: theme.spacing.sm,
          paddingBottom: Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.md,
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing.md
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={loading || isTyping ? "🤖 Génération en cours..." : "Écris ton message..."}
            editable={!loading && !isTyping}
            placeholderTextColor={theme.colors.textTertiary}
            style={{
              flex: 1,
              ...theme.input,
              marginRight: theme.spacing.sm,
            }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={true}
            multiline={false}
          />
          <Pressable
            onPress={sendMessage}
            disabled={loading || isTyping}
            style={{
              ...theme.button.primary,
              opacity: loading || isTyping ? 0.6 : 1,
            }}
          >
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.button 
            }}>
              {loading || isTyping ? "…" : "Envoyer"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}




