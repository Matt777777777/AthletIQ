// lib/synthesis.ts
// Système de synthèse automatique pour les plans enregistrés

// 🏋️ Extraire les groupes musculaires d'un exercice
function extractMuscleGroups(text: string): string {
  const muscleMap: { [key: string]: string } = {
    // Poitrine
    'pompe': 'Poitrine/Triceps',
    'push-up': 'Poitrine/Triceps',
    'pushup': 'Poitrine/Triceps',
    'développé': 'Poitrine/Triceps',
    'développé couché': 'Poitrine/Triceps',
    'bench': 'Poitrine/Triceps',
    'bench press': 'Poitrine/Triceps',
    'pectoraux': 'Poitrine/Triceps',
    'poitrine': 'Poitrine/Triceps',
    'chest': 'Poitrine/Triceps',
    
    // Dos
    'traction': 'Dos/Biceps',
    'rowing': 'Dos/Biceps',
    'row': 'Dos/Biceps',
    'lat': 'Dos/Biceps',
    'lats': 'Dos/Biceps',
    'dorsaux': 'Dos/Biceps',
    'pull': 'Dos/Biceps',
    'pull-up': 'Dos/Biceps',
    'pullup': 'Dos/Biceps',
    'dos': 'Dos/Biceps',
    'back': 'Dos/Biceps',
    
    // Jambes
    'squat': 'Jambes/Fessiers',
    'squats': 'Jambes/Fessiers',
    'fente': 'Jambes/Fessiers',
    'fentes': 'Jambes/Fessiers',
    'lunge': 'Jambes/Fessiers',
    'lunges': 'Jambes/Fessiers',
    'quadriceps': 'Jambes/Fessiers',
    'quads': 'Jambes/Fessiers',
    'fessiers': 'Jambes/Fessiers',
    'glutes': 'Jambes/Fessiers',
    'mollets': 'Jambes/Fessiers',
    'calves': 'Jambes/Fessiers',
    'jambes': 'Jambes/Fessiers',
    'legs': 'Jambes/Fessiers',
    
    // Épaules
    'épaule': 'Épaules',
    'épaules': 'Épaules',
    'shoulder': 'Épaules',
    'shoulders': 'Épaules',
    'développé militaire': 'Épaules',
    'military press': 'Épaules',
    'lateral': 'Épaules',
    'lateral raise': 'Épaules',
    'élévation': 'Épaules',
    
    // Core
    'gainage': 'Core',
    'planche': 'Core',
    'plank': 'Core',
    'crunch': 'Core',
    'crunches': 'Core',
    'abdos': 'Core',
    'abdominaux': 'Core',
    'core': 'Core',
    'ab': 'Core',
    'abs': 'Core',
    'mountain climber': 'Core',
    'mountain climbers': 'Core',
    
    // Bras
    'biceps': 'Biceps',
    'bicep': 'Biceps',
    'triceps': 'Triceps',
    'tricep': 'Triceps',
    'curl': 'Biceps',
    'curls': 'Biceps',
    'extension': 'Triceps',
    'extensions': 'Triceps',
    'dips': 'Triceps',
    'dip': 'Triceps',
    
    // Full Body
    'burpee': 'Full Body',
    'burpees': 'Full Body',
    'thruster': 'Full Body',
    'thrusters': 'Full Body',
    'clean': 'Full Body',
    'snatch': 'Full Body'
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [keyword, muscleGroup] of Object.entries(muscleMap)) {
    if (lowerText.includes(keyword)) {
      return muscleGroup;
    }
  }
  
  // Si aucun groupe musculaire trouvé, essayer de deviner
  if (lowerText.includes('pompe') || lowerText.includes('push') || lowerText.includes('bench')) return 'Poitrine/Triceps';
  if (lowerText.includes('squat') || lowerText.includes('fente') || lowerText.includes('lunge')) return 'Jambes/Fessiers';
  if (lowerText.includes('traction') || lowerText.includes('rowing') || lowerText.includes('pull')) return 'Dos/Biceps';
  if (lowerText.includes('gainage') || lowerText.includes('planche') || lowerText.includes('crunch')) return 'Core';
  if (lowerText.includes('épaule') || lowerText.includes('shoulder') || lowerText.includes('lateral')) return 'Épaules';
  if (lowerText.includes('bicep') || lowerText.includes('curl')) return 'Biceps';
  if (lowerText.includes('tricep') || lowerText.includes('extension') || lowerText.includes('dip')) return 'Triceps';
  if (lowerText.includes('burpee') || lowerText.includes('thruster')) return 'Full Body';
  
  return 'Full Body';
}

export interface SynthesizedWorkout {
  title: string;
  duration: string;
  exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    rest: string;
    muscleGroups?: string;
    notes?: string;
  }>;
  warmup?: string;
  cooldown?: string;
  tips?: string[];
}

export interface SynthesizedMeal {
  title: string;
  servings: string;
  prepTime: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  instructions: string[];
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
}

// 🏋️ Synthétiser une séance d'entraînement
export function synthesizeWorkout(chatResponse: string): SynthesizedWorkout {
  console.log("🔍 Synthèse workout - Texte reçu:", chatResponse.substring(0, 200) + "...");
  
  const lines = chatResponse.split('\n').map(line => line.trim()).filter(line => line);
  
  // Créer un titre descriptif basé sur le contenu
  let title = "Séance d'entraînement";
  
  // Extraire la durée
  const durationMatch = chatResponse.match(/(\d+)\s*(?:min|minutes?|h|heures?)/i);
  const duration = durationMatch ? `${durationMatch[1]} min` : "45 min";
  
  // Détecter le type de séance
  const lowerText = chatResponse.toLowerCase();
  let sessionType = "";
  
  if (lowerText.includes('sans matériel') || lowerText.includes('au poids du corps') || lowerText.includes('bodyweight')) {
    sessionType = "sans matériel";
  } else if (lowerText.includes('haltères') || lowerText.includes('dumbbell')) {
    sessionType = "avec haltères";
  } else if (lowerText.includes('barre') || lowerText.includes('barbell')) {
    sessionType = "avec barre";
  } else if (lowerText.includes('cardio') || lowerText.includes('hiit')) {
    sessionType = "cardio";
  } else if (lowerText.includes('musculation') || lowerText.includes('force')) {
    sessionType = "musculation";
  } else {
    sessionType = "full body";
  }
  
  // Créer le titre descriptif
  title = `Séance de ${duration} ${sessionType}`;
  
  // Extraire les exercices - approche plus robuste
  const exercises: Array<{name: string; sets: string; reps: string; rest: string; muscleGroups?: string; notes?: string}> = [];
  
  // Patterns plus flexibles pour les exercices
  const exercisePatterns = [
    // Format: "3 x 12 Pompes"
    /(\d+)\s*x\s*(\d+)\s*([^-\n]+?)(?:\s*-\s*([^-\n]+?))?(?:\s*\(([^)]+)\))?/gi,
    // Format: "Pompes: 3 x 12"
    /([^-\n]+?)\s*:\s*(\d+)\s*x\s*(\d+)(?:\s*-\s*([^-\n]+?))?(?:\s*\(([^)]+)\))?/gi,
    // Format: "3 séries de 12 Pompes"
    /(\d+)\s*séries?\s*de\s*(\d+)\s*([^-\n]+?)(?:\s*-\s*([^-\n]+?))?(?:\s*\(([^)]+)\))?/gi,
    // Format: "Pompes (3x12)"
    /([^-\n]+?)\s*\((\d+)x(\d+)\)/gi,
    // Format simple: "Pompes - 3x12"
    /([^-\n]+?)\s*-\s*(\d+)x(\d+)/gi,
    // Format: "Pompes 3x12"
    /([^-\n]+?)\s+(\d+)x(\d+)/gi,
    // Format: "3x12 Pompes"
    /(\d+)x(\d+)\s+([^-\n]+?)/gi,
    // Format: "Pompes 3 x 12"
    /([^-\n]+?)\s+(\d+)\s*x\s*(\d+)/gi,
    // Format: "• Pompes: 3x12"
    /[•\-\*]\s*([^-\n]+?)\s*:\s*(\d+)x(\d+)/gi,
    // Format: "• 3x12 Pompes"
    /[•\-\*]\s*(\d+)x(\d+)\s+([^-\n]+?)/gi,
    // Format avec durée: "Pompes - 45 sec"
    /([^-\n]+?)\s*-\s*(\d+)\s*(?:sec|secondes?|s)/gi,
    // Format avec durée: "Pompes: 45 sec"
    /([^-\n]+?)\s*:\s*(\d+)\s*(?:sec|secondes?|s)/gi,
    // Format avec durée: "Pompes 45 sec"
    /([^-\n]+?)\s+(\d+)\s*(?:sec|secondes?|s)/gi,
    // Format avec durée: "45 sec Pompes"
    /(\d+)\s*(?:sec|secondes?|s)\s+([^-\n]+?)/gi,
    // Format avec durée: "Pompes - 3 x 45 sec"
    /([^-\n]+?)\s*-\s*(\d+)\s*x\s*(\d+)\s*(?:sec|secondes?|s)/gi,
    // Format avec durée: "3 x 45 sec Pompes"
    /(\d+)\s*x\s*(\d+)\s*(?:sec|secondes?|s)\s+([^-\n]+?)/gi
  ];
  
  for (const pattern of exercisePatterns) {
    let match;
    while ((match = pattern.exec(chatResponse)) !== null) {
      let sets, reps, name, rest, notes;
      
      // Gérer les différents formats de patterns
      if (match[1] && match[2] && match[3]) {
        // Vérifier si c'est un format avec durée (sec/secondes)
        if (pattern.source.includes('sec|secondes?|s')) {
          // Format avec durée: "Pompes - 45 sec" ou "45 sec Pompes"
          if (/^\d+$/.test(match[1])) {
            // "45 sec Pompes"
            sets = "1";
            reps = match[1] + "s";
            name = match[2];
          } else {
            // "Pompes - 45 sec"
            name = match[1];
            sets = "1";
            reps = match[2] + "s";
          }
        } else if (pattern.source.includes('x') && pattern.source.includes('sec|secondes?|s')) {
          // Format avec séries et durée: "Pompes - 3 x 45 sec"
          if (/^\d+$/.test(match[1])) {
            // "3 x 45 sec Pompes"
            sets = match[1];
            reps = match[2] + "s";
            name = match[3];
          } else {
            // "Pompes - 3 x 45 sec"
            name = match[1];
            sets = match[2];
            reps = match[3] + "s";
          }
        } else {
          // Format classique avec répétitions
          if (/^\d+$/.test(match[1])) {
            // "3x12 Pompes"
            sets = match[1];
            reps = match[2];
            name = match[3];
          } else {
            // "Pompes 3x12" ou "Pompes: 3x12"
            name = match[1];
            sets = match[2];
            reps = match[3];
          }
        }
        rest = match[4] || undefined;
        notes = match[5] || undefined;
      }
      
      if (name && sets && reps) {
        // Nettoyer le nom de l'exercice
        const cleanName = name.trim().replace(/[•\-\*]/g, '').replace(/^\d+\.?\s*/, '');
        
        // Exclure les mots-clés qui ne sont pas des noms d'exercices
        const excludedKeywords = ['séries', 'répétitions', 'sets', 'reps', 'repos', 'rest', 'min', 'minutes', 'secondes', 'sec'];
        const lowerCleanName = cleanName.toLowerCase();
        
        if (excludedKeywords.some(keyword => lowerCleanName.includes(keyword))) {
          console.log("⚠️ Nom d'exercice exclu (mot-clé):", cleanName);
          continue; // Passer cet exercice
        }
        
        // Vérifier que le nom n'est pas trop court ou vide
        if (cleanName.length < 3) {
          console.log("⚠️ Nom d'exercice trop court:", cleanName);
          continue;
        }
        
        console.log("🔍 Exercice trouvé:", { name: cleanName, sets, reps });
        
        // Extraire les groupes musculaires
        const muscleGroups = extractMuscleGroups(cleanName + (rest || '') + (notes || ''));
        
        exercises.push({
          name: cleanName,
          sets: sets.trim(),
          reps: reps.trim(),
          rest: rest ? rest.trim() : "1-2 min",
          muscleGroups,
          notes: notes ? notes.trim() : undefined
        });
      }
    }
  }
  
  // Si aucun exercice trouvé, essayer une approche par lignes
  if (exercises.length === 0) {
    console.log("🔍 Aucun exercice trouvé avec les patterns, essai par lignes...");
    
    for (const line of lines) {
      // Chercher des lignes qui contiennent des nombres et des mots d'exercices
      if (line.match(/\d+/) && line.length > 5 && line.length < 100) {
        // Chercher des patterns avec durée ou répétitions
        const durationMatch = line.match(/(\d+)\s*(?:sec|secondes?|s)/i);
        const setsRepsMatch = line.match(/(\d+)\s*(?:x|×)\s*(\d+)/i);
        
        if (durationMatch) {
          // Format avec durée: "Pompes 45 sec"
          const duration = durationMatch[1];
          let exerciseName = line
            .replace(durationMatch[0], '') // Supprimer "45 sec"
            .replace(/[•\-\*]/g, '') // Supprimer les puces
            .replace(/^\d+\.?\s*/, '') // Supprimer les numéros de liste
            .replace(/[:\s]+$/, '') // Supprimer les : et espaces en fin
            .trim();
          
          if (exerciseName.length > 2 && exerciseName.length < 50) {
            console.log("🔍 Exercice avec durée trouvé par lignes:", { name: exerciseName, sets: "1", reps: duration + "s" });
            const muscleGroups = extractMuscleGroups(exerciseName);
            exercises.push({
              name: exerciseName,
              sets: "1",
              reps: duration + "s",
              rest: "1-2 min",
              muscleGroups
            });
          }
        } else if (setsRepsMatch && setsRepsMatch[1] && setsRepsMatch[2]) {
          // Format avec séries/répétitions: "Pompes 3x12"
          const sets = setsRepsMatch[1];
          const reps = setsRepsMatch[2];
          let exerciseName = line
            .replace(setsRepsMatch[0], '') // Supprimer "3x12"
            .replace(/[•\-\*]/g, '') // Supprimer les puces
            .replace(/^\d+\.?\s*/, '') // Supprimer les numéros de liste
            .replace(/[:\s]+$/, '') // Supprimer les : et espaces en fin
            .trim();
          
          // Exclure les mots-clés qui ne sont pas des noms d'exercices
          const excludedKeywords = ['séries', 'répétitions', 'sets', 'reps', 'repos', 'rest', 'min', 'minutes', 'secondes', 'sec'];
          const lowerExerciseName = exerciseName.toLowerCase();
          
          if (exerciseName.length > 2 && exerciseName.length < 50 && 
              !excludedKeywords.some(keyword => lowerExerciseName.includes(keyword))) {
            console.log("🔍 Exercice trouvé par lignes:", { name: exerciseName, sets: numbers[0], reps: numbers[1] });
            const muscleGroups = extractMuscleGroups(exerciseName);
            exercises.push({
              name: exerciseName,
              sets: numbers[0],
              reps: numbers[1],
              rest: "1-2 min",
              muscleGroups
            });
          } else {
            console.log("⚠️ Exercice exclu par lignes:", exerciseName);
          }
        }
      }
    }
  }
  
  // Si toujours rien, créer des exercices génériques basés sur le contenu
  if (exercises.length === 0) {
    console.log("🔍 Création d'exercices génériques...");
    const commonExercises = [
      {name: 'Pompes', sets: '4', reps: '12', muscleGroups: 'Poitrine/Triceps'},
      {name: 'Squats', sets: '4', reps: '15', muscleGroups: 'Jambes/Fessiers'},
      {name: 'Fentes', sets: '3', reps: '10', muscleGroups: 'Jambes/Fessiers'},
      {name: 'Gainage', sets: '3', reps: '45s', muscleGroups: 'Core'},
      {name: 'Burpees', sets: '3', reps: '8', muscleGroups: 'Full Body'},
      {name: 'Mountain Climbers', sets: '3', reps: '20', muscleGroups: 'Core'}
    ];
    
    for (const exercise of commonExercises) {
      exercises.push({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: "1-2 min",
        muscleGroups: exercise.muscleGroups
      });
    }
  }
  
  // Extraire l'échauffement
  const warmupMatch = chatResponse.match(/échauffement[^:]*:?\s*([^.\n]+)/i);
  const warmup = warmupMatch ? warmupMatch[1].trim() : "5-10 minutes d'échauffement général";
  
  // Extraire la récupération
  const cooldownMatch = chatResponse.match(/(?:récupération|retour au calme)[^:]*:?\s*([^.\n]+)/i);
  const cooldown = cooldownMatch ? cooldownMatch[1].trim() : "5 minutes d'étirements";
  
  // Extraire les conseils
  const tips: string[] = [];
  const tipPatterns = [
    /conseil[^:]*:?\s*([^.\n]+)/gi,
    /astuce[^:]*:?\s*([^.\n]+)/gi,
    /important[^:]*:?\s*([^.\n]+)/gi
  ];
  
  for (const pattern of tipPatterns) {
    let match;
    while ((match = pattern.exec(chatResponse)) !== null) {
      const tip = match[1].trim();
      if (tip && tip.length > 10) {
        tips.push(tip);
      }
    }
  }
  
  // Ajouter des conseils génériques si aucun trouvé
  if (tips.length === 0) {
    tips.push("Maintenez une bonne forme pendant tous les exercices");
    tips.push("Respirez correctement pendant l'effort");
    tips.push("Hydratez-vous régulièrement");
  }
  
  console.log("✅ Synthèse workout - Exercices trouvés:", exercises.length);
  
  return {
    title,
    duration,
    exercises: exercises.slice(0, 10), // Limiter à 10 exercices
    warmup,
    cooldown,
    tips: tips.slice(0, 5) // Limiter à 5 conseils
  };
}

// 🍽️ Synthétiser un repas
export function synthesizeMeal(chatResponse: string): SynthesizedMeal {
  console.log("🔍 Synthèse meal - Texte reçu:", chatResponse.substring(0, 200) + "...");
  
  const lines = chatResponse.split('\n').map(line => line.trim()).filter(line => line);
  
  // Extraire le titre - approche plus flexible
  let title = "Recette";
  const titlePatterns = [
    /(?:recette|plat|repas)[^:]*:?\s*([^\n]+)/i,
    /^([^.\n]+?)(?:\s*-\s*\d+)/i,
    /^([A-Z][^.\n]{5,50})/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = chatResponse.match(pattern);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }
  
  // Extraire le nombre de portions
  const servingsMatch = chatResponse.match(/(\d+)\s*(?:portion|personne)/i);
  const servings = servingsMatch ? `${servingsMatch[1]} portions` : "2 portions";
  
  // Extraire le temps de préparation
  const prepTimeMatch = chatResponse.match(/(\d+)\s*(?:min|minutes?|h|heures?)\s*(?:de\s*)?(?:préparation|cuisson)/i);
  const prepTime = prepTimeMatch ? `${prepTimeMatch[1]} min` : "20 min";
  
  // Extraire les ingrédients - approche plus robuste
  const ingredients: Array<{name: string; quantity: string; unit: string}> = [];
  
  // Patterns plus flexibles pour les ingrédients
  const ingredientPatterns = [
    /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cuillères?|tasses?|pincées?|branches?|gousses?|tranches?|unités?)\s*de\s*([^,\n]+)/gi,
    /(\d+(?:\.\d+)?)\s*([^,\n]+?)\s*(g|kg|ml|l|cuillères?|tasses?|pincées?|branches?|gousses?|tranches?|unités?)/gi,
    /([^,\n]+?)\s*:\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cuillères?|tasses?|pincées?|branches?|gousses?|tranches?|unités?)/gi,
    // Format simple: "2 tomates"
    /(\d+(?:\.\d+)?)\s*([^,\n]+?)(?:\s|$)/gi
  ];
  
  for (const pattern of ingredientPatterns) {
    let match;
    while ((match = pattern.exec(chatResponse)) !== null) {
      const [, quantity, unit, name] = match;
      if (name && quantity) {
        ingredients.push({
          name: name.trim(),
          quantity: quantity.trim(),
          unit: unit ? unit.trim() : "unités"
        });
      }
    }
  }
  
  // Si aucun ingrédient trouvé, essayer une approche par lignes
  if (ingredients.length === 0) {
    console.log("🔍 Aucun ingrédient trouvé avec les patterns, essai par lignes...");
    
    for (const line of lines) {
      // Chercher des lignes qui contiennent des nombres et des mots d'ingrédients
      if (line.match(/\d+/) && line.length > 5 && line.length < 50) {
        const numbers = line.match(/\d+/g);
        if (numbers && numbers.length >= 1) {
          const ingredientName = line.replace(/\d+/g, '').replace(/[x×-]/g, '').trim();
          if (ingredientName.length > 2) {
            ingredients.push({
              name: ingredientName,
              quantity: numbers[0],
              unit: "unités"
            });
          }
        }
      }
    }
  }
  
  // Si toujours rien, créer des ingrédients génériques
  if (ingredients.length === 0) {
    console.log("🔍 Création d'ingrédients génériques...");
    const commonIngredients = [
      {name: "Tomates", quantity: "2", unit: "unités"},
      {name: "Oignon", quantity: "1", unit: "unité"},
      {name: "Ail", quantity: "2", unit: "gousses"},
      {name: "Huile d'olive", quantity: "2", unit: "cuillères"},
      {name: "Sel", quantity: "1", unit: "pincée"},
      {name: "Poivre", quantity: "1", unit: "pincée"}
    ];
    ingredients.push(...commonIngredients);
  }
  
  // Extraire les instructions
  const instructions: string[] = [];
  const instructionPatterns = [
    /(\d+)\.\s*([^.\n]+)/g,
    /étape\s*\d+[^:]*:?\s*([^.\n]+)/gi,
    /instruction[^:]*:?\s*([^.\n]+)/gi
  ];
  
  for (const pattern of instructionPatterns) {
    let match;
    while ((match = pattern.exec(chatResponse)) !== null) {
      const instruction = match[1] || match[2];
      if (instruction && instruction.length > 10) {
        instructions.push(instruction.trim());
      }
    }
  }
  
  // Si aucune instruction trouvée, extraire les phrases qui commencent par des verbes d'action
  if (instructions.length === 0) {
    const actionVerbs = ['couper', 'mélanger', 'cuire', 'ajouter', 'verser', 'chauffer', 'mettre', 'préparer', 'faire', 'mettre'];
    const sentences = chatResponse.split(/[.!?]/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 15 && actionVerbs.some(verb => trimmed.toLowerCase().includes(verb))) {
        instructions.push(trimmed);
      }
    }
  }
  
  // Si toujours rien, créer des instructions génériques
  if (instructions.length === 0) {
    instructions.push("Préparez tous les ingrédients");
    instructions.push("Mélangez les ingrédients selon vos goûts");
    instructions.push("Cuisez à feu moyen jusqu'à ce que ce soit prêt");
    instructions.push("Servez chaud et dégustez");
  }
  
  // Extraire les valeurs nutritionnelles
  const nutrition: {calories: string; protein: string; carbs: string; fat: string} = {
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  };
  
  const caloriesMatch = chatResponse.match(/(\d+)\s*(?:kcal|calories)/i);
  if (caloriesMatch) nutrition.calories = `${caloriesMatch[1]} kcal`;
  
  const proteinMatch = chatResponse.match(/(\d+(?:\.\d+)?)\s*g\s*(?:de\s*)?protéines?/i);
  if (proteinMatch) nutrition.protein = `${proteinMatch[1]}g protéines`;
  
  const carbsMatch = chatResponse.match(/(\d+(?:\.\d+)?)\s*g\s*(?:de\s*)?glucides?/i);
  if (carbsMatch) nutrition.carbs = `${carbsMatch[1]}g glucides`;
  
  const fatMatch = chatResponse.match(/(\d+(?:\.\d+)?)\s*g\s*(?:de\s*)?lipides?/i);
  if (fatMatch) nutrition.fat = `${fatMatch[1]}g lipides`;
  
  console.log("✅ Synthèse meal - Ingrédients trouvés:", ingredients.length);
  
  return {
    title,
    servings,
    prepTime,
    ingredients: ingredients.slice(0, 15), // Limiter à 15 ingrédients
    instructions: instructions.slice(0, 10), // Limiter à 10 instructions
    nutrition: Object.values(nutrition).some(v => v) ? nutrition : undefined
  };
}

// 📝 Formater une séance synthétisée en texte lisible
export function formatSynthesizedWorkout(workout: SynthesizedWorkout): string {
  let formatted = `🏋️ ${workout.title}\n`;
  formatted += `⏱️ Durée: ${workout.duration}\n\n`;
  
  if (workout.warmup) {
    formatted += `🔥 Échauffement:\n${workout.warmup}\n\n`;
  }
  
  formatted += `💪 Exercices:\n`;
  workout.exercises.forEach((exercise, index) => {
    formatted += `${index + 1}. ${exercise.name}\n`;
    formatted += `   ${exercise.sets} séries × ${exercise.reps} répétitions\n`;
    if (exercise.muscleGroups) formatted += `   🎯 ${exercise.muscleGroups}\n`;
    if (exercise.rest) formatted += `   Repos: ${exercise.rest}\n`;
    if (exercise.notes) formatted += `   💡 ${exercise.notes}\n`;
    formatted += `\n`;
  });
  
  if (workout.cooldown) {
    formatted += `🧘 Récupération:\n${workout.cooldown}\n\n`;
  }
  
  if (workout.tips && workout.tips.length > 0) {
    formatted += `💡 Conseils:\n`;
    workout.tips.forEach(tip => {
      formatted += `• ${tip}\n`;
    });
  }
  
  return formatted.trim();
}

// 📝 Formater un repas synthétisé en texte lisible
export function formatSynthesizedMeal(meal: SynthesizedMeal): string {
  let formatted = `🍽️ ${meal.title}\n`;
  formatted += `👥 ${meal.servings} • ⏱️ ${meal.prepTime}\n\n`;
  
  if (meal.ingredients.length > 0) {
    formatted += `🛒 Ingrédients:\n`;
    meal.ingredients.forEach(ingredient => {
      formatted += `• ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}\n`;
    });
    formatted += `\n`;
  }
  
  if (meal.instructions.length > 0) {
    formatted += `👨‍🍳 Préparation:\n`;
    meal.instructions.forEach((instruction, index) => {
      formatted += `${index + 1}. ${instruction}\n`;
    });
    formatted += `\n`;
  }
  
  if (meal.nutrition) {
    formatted += `📊 Valeurs nutritionnelles:\n`;
    if (meal.nutrition.calories) formatted += `• ${meal.nutrition.calories}\n`;
    if (meal.nutrition.protein) formatted += `• ${meal.nutrition.protein}\n`;
    if (meal.nutrition.carbs) formatted += `• ${meal.nutrition.carbs}\n`;
    if (meal.nutrition.fat) formatted += `• ${meal.nutrition.fat}\n`;
  }
  
  return formatted.trim();
}
