// lib/meal-nutrition.ts
export type MealNutrition = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};

// Base de données des calories par ingrédient (pour 100g)
const ingredientCalories: { [key: string]: { calories: number; carbs: number; protein: number; fat: number } } = {
  'poulet': { calories: 165, carbs: 0, protein: 31, fat: 3.6 },
  'saumon': { calories: 208, carbs: 0, protein: 25, fat: 12 },
  'œuf': { calories: 155, carbs: 1.1, protein: 13, fat: 11 },
  'œufs': { calories: 155, carbs: 1.1, protein: 13, fat: 11 },
  'avocat': { calories: 160, carbs: 8.5, protein: 2, fat: 14.7 },
  'riz': { calories: 130, carbs: 28, protein: 2.7, fat: 0.3 },
  'pomme de terre': { calories: 77, carbs: 17, protein: 2, fat: 0.1 },
  'pâtes': { calories: 131, carbs: 25, protein: 5, fat: 1.1 },
  'pain': { calories: 265, carbs: 49, protein: 9, fat: 3.2 },
  'fromage': { calories: 113, carbs: 1.3, protein: 7, fat: 9 },
  'lait': { calories: 42, carbs: 5, protein: 3.4, fat: 1 },
  'yaourt': { calories: 59, carbs: 3.6, protein: 10, fat: 0.4 },
  'banane': { calories: 89, carbs: 23, protein: 1.1, fat: 0.3 },
  'pomme': { calories: 52, carbs: 14, protein: 0.3, fat: 0.2 },
  'orange': { calories: 47, carbs: 12, protein: 0.9, fat: 0.1 },
  'brocoli': { calories: 34, carbs: 7, protein: 2.8, fat: 0.4 },
  'épinards': { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 },
  'épinard': { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 },
  'carotte': { calories: 41, carbs: 10, protein: 0.9, fat: 0.2 },
  'tomate': { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2 },
  'oignon': { calories: 40, carbs: 9.3, protein: 1.1, fat: 0.1 },
  'ail': { calories: 149, carbs: 33, protein: 6.4, fat: 0.5 },
  'huile d\'olive': { calories: 884, carbs: 0, protein: 0, fat: 100 },
  'huile': { calories: 884, carbs: 0, protein: 0, fat: 100 },
  'beurre': { calories: 717, carbs: 0.1, protein: 0.9, fat: 81 },
  'noix': { calories: 654, carbs: 13.7, protein: 15.2, fat: 65.2 },
  'amandes': { calories: 579, carbs: 21.6, protein: 21.2, fat: 49.9 },
  'chocolat': { calories: 546, carbs: 45.9, protein: 7.8, fat: 31.3 },
  'miel': { calories: 304, carbs: 82.4, protein: 0.3, fat: 0 },
  'sucre': { calories: 387, carbs: 100, protein: 0, fat: 0 },
  'farine': { calories: 364, carbs: 76, protein: 10, fat: 1 },
  'fraise': { calories: 32, carbs: 7.7, protein: 0.7, fat: 0.3 },
  'myrtille': { calories: 57, carbs: 14, protein: 0.7, fat: 0.3 },
  'framboise': { calories: 52, carbs: 12, protein: 1.2, fat: 0.7 },
  'kiwi': { calories: 61, carbs: 15, protein: 1.1, fat: 0.5 },
  'ananas': { calories: 50, carbs: 13, protein: 0.5, fat: 0.1 },
  'mangue': { calories: 60, carbs: 15, protein: 0.8, fat: 0.4 },
  'pêche': { calories: 39, carbs: 10, protein: 0.9, fat: 0.3 },
  'abricot': { calories: 48, carbs: 11, protein: 1.4, fat: 0.4 },
  'cerise': { calories: 63, carbs: 16, protein: 1.1, fat: 0.2 },
  'raisin': { calories: 67, carbs: 17, protein: 0.6, fat: 0.4 },
  'melon': { calories: 34, carbs: 8, protein: 0.8, fat: 0.2 },
  'pastèque': { calories: 30, carbs: 8, protein: 0.6, fat: 0.2 },
  'concombre': { calories: 16, carbs: 4, protein: 0.7, fat: 0.1 },
  'courgette': { calories: 17, carbs: 3.1, protein: 1.2, fat: 0.3 },
  'aubergine': { calories: 25, carbs: 6, protein: 1, fat: 0.2 },
  'poivron': { calories: 31, carbs: 7, protein: 1, fat: 0.3 },
  'champignon': { calories: 22, carbs: 3.3, protein: 3.1, fat: 0.3 },
  'courge': { calories: 26, carbs: 6.5, protein: 1, fat: 0.1 },
  'patate douce': { calories: 86, carbs: 20, protein: 1.6, fat: 0.1 },
  'maïs': { calories: 86, carbs: 19, protein: 3.3, fat: 1.2 },
  'pois': { calories: 81, carbs: 14, protein: 5.4, fat: 0.4 },
  'haricots verts': { calories: 31, carbs: 7, protein: 1.8, fat: 0.2 },
  'lentilles': { calories: 116, carbs: 20, protein: 9, fat: 0.4 },
  'pois chiches': { calories: 164, carbs: 27, protein: 8.9, fat: 2.6 },
  'quinoa': { calories: 120, carbs: 22, protein: 4.4, fat: 1.9 },
  'avoine': { calories: 389, carbs: 66, protein: 17, fat: 7 },
  'blé': { calories: 339, carbs: 71, protein: 13, fat: 2 },
  'orge': { calories: 352, carbs: 78, protein: 10, fat: 2.3 },
  'sarrasin': { calories: 343, carbs: 71, protein: 13, fat: 3.4 },
  'millet': { calories: 378, carbs: 73, protein: 11, fat: 4.2 },
  'riz complet': { calories: 111, carbs: 23, protein: 2.6, fat: 0.9 },
  'pâtes complètes': { calories: 124, carbs: 25, protein: 5, fat: 1.1 },
  'pain complet': { calories: 247, carbs: 41, protein: 13, fat: 4.2 },
  'pain de seigle': { calories: 259, carbs: 48, protein: 8, fat: 3.3 },
  'pain aux céréales': { calories: 247, carbs: 41, protein: 13, fat: 4.2 },
  'croissant': { calories: 406, carbs: 45, protein: 8, fat: 21 },
  'brioche': { calories: 374, carbs: 49, protein: 8, fat: 16 },
  'baguette': { calories: 265, carbs: 49, protein: 9, fat: 3.2 },
  'biscotte': { calories: 406, carbs: 75, protein: 11, fat: 6 },
  'crackers': { calories: 502, carbs: 61, protein: 9, fat: 25 },
  'céréales': { calories: 379, carbs: 85, protein: 7, fat: 1.2 },
  'muesli': { calories: 362, carbs: 66, protein: 10, fat: 5.9 },
  'granola': { calories: 471, carbs: 64, protein: 10, fat: 20 },
  'flocons d\'avoine': { calories: 389, carbs: 66, protein: 17, fat: 7 },
  'porridge': { calories: 71, carbs: 12, protein: 2.4, fat: 1.4 },
  'pancakes': { calories: 227, carbs: 28, protein: 6, fat: 9 },
  'waffles': { calories: 291, carbs: 32, protein: 8, fat: 14 },
  'crêpes': { calories: 227, carbs: 28, protein: 6, fat: 9 },
  'gaufres': { calories: 291, carbs: 32, protein: 8, fat: 14 },
  'donuts': { calories: 452, carbs: 51, protein: 5, fat: 25 },
  'muffins': { calories: 265, carbs: 32, protein: 4, fat: 13 },
  'cupcakes': { calories: 305, carbs: 35, protein: 3, fat: 17 },
  'tarte': { calories: 285, carbs: 32, protein: 4, fat: 16 },
  'gâteau': { calories: 350, carbs: 45, protein: 5, fat: 16 },
  'brownies': { calories: 405, carbs: 45, protein: 5, fat: 23 },
  'cookies': { calories: 488, carbs: 65, protein: 6, fat: 22 },
  'biscuits': { calories: 502, carbs: 61, protein: 9, fat: 25 },
  'viennoiseries': { calories: 406, carbs: 45, protein: 8, fat: 21 },
  'pâtisseries': { calories: 350, carbs: 45, protein: 5, fat: 16 },
  'glace': { calories: 207, carbs: 24, protein: 3.5, fat: 11 },
  'sorbet': { calories: 127, carbs: 32, protein: 0.6, fat: 0.2 },
  'yaourt glacé': { calories: 127, carbs: 24, protein: 3.5, fat: 2.5 },
  'frozen yogurt': { calories: 127, carbs: 24, protein: 3.5, fat: 2.5 },
  'smoothie': { calories: 120, carbs: 30, protein: 2, fat: 0.5 },
  'jus de fruits': { calories: 45, carbs: 11, protein: 0.5, fat: 0.1 },
  'soda': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'boisson énergisante': { calories: 45, carbs: 11, protein: 0, fat: 0 },
  'thé': { calories: 1, carbs: 0.3, protein: 0, fat: 0 },
  'café': { calories: 2, carbs: 0, protein: 0.3, fat: 0 },
  'cappuccino': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'latte': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'espresso': { calories: 2, carbs: 0, protein: 0.3, fat: 0 },
  'americano': { calories: 2, carbs: 0, protein: 0.3, fat: 0 },
  'macchiato': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'mocha': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'frappuccino': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'chocolat chaud': { calories: 43, carbs: 3, protein: 2, fat: 2.5 },
  'tisane': { calories: 1, carbs: 0.3, protein: 0, fat: 0 },
  'infusion': { calories: 1, carbs: 0.3, protein: 0, fat: 0 },
  'eau': { calories: 0, carbs: 0, protein: 0, fat: 0 },
  'eau gazeuse': { calories: 0, carbs: 0, protein: 0, fat: 0 },
  'limonade': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'citronnade': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'orangeade': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'punch': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'cocktail': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'vin': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'bière': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'champagne': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'whisky': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vodka': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'gin': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'rhum': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'cognac': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'liqueur': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'apéritif': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'digestif': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'cocktail sans alcool': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'mocktail': { calories: 42, carbs: 10.6, protein: 0, fat: 0 },
  'sangria': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'mimosa': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'bellini': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'kir': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'kir royal': { calories: 83, carbs: 2.6, protein: 0.1, fat: 0 },
  'margarita': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'mojito': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'daiquiri': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'piña colada': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'cosmopolitan': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'martini': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'manhattan': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'old fashioned': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'whisky sour': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'mint julep': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'sazerac': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'boulevardier': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'negroni': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'americano': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'aperol spritz': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'campari': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vermouth': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'sherry': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'porto': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'madère': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'marsala': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de liqueur': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin doux': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin moelleux': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin liquoreux': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de glace': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de paille': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de voile': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin jaune': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de noix': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de châtaigne': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de cerise': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de prune': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de poire': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'vin de pomme': { calories: 250, carbs: 0, protein: 0, fat: 0 },
  'cidre': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'poiré': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'hydromel': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'sake': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'soju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'shochu': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'baijiu': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'huangjiu': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'mijiu': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'cheongju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'makgeolli': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'dongdongju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'takju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'yakju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gukhwaju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'ihwaju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gamhongno': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'sansachun': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'baeksaeju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'dansul': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gwasilju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'songjeolju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'goryangju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gyodongbeopju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'samhaeju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'ihwaju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gukhwaju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gamhongno': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'sansachun': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'baeksaeju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'dansul': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gwasilju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'songjeolju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'goryangju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'gyodongbeopju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 },
  'samhaeju': { calories: 43, carbs: 3.6, protein: 0.5, fat: 0 }
};

// Fonction pour extraire les ingrédients d'un repas
function extractIngredientsFromMeal(mealContent: string): Array<{ name: string; quantity: number }> {
  const ingredients: Array<{ name: string; quantity: number }> = [];
  const lines = mealContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('-') === false) continue;
    
    // Patterns pour extraire les ingrédients
    const patterns = [
      // "50g d'épinards" ou "50g de fromage"
      /(\d+(?:\.\d+)?)\s*(?:g|grammes?|kg|kilos?)\s+(?:d'|de\s+)([^,\n]+)/gi,
      // "2 œufs" ou "1 banane"
      /(\d+(?:\.\d+)?)\s+([^,\n]+?)(?:\s+\(.*\))?/gi,
      // "1 cuillère d'huile d'olive"
      /(\d+(?:\.\d+)?)\s*(?:cuillères?|c\.à\.s\.|c\.à\.c\.)\s+(?:d'|de\s+)([^,\n]+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(trimmedLine)) !== null) {
        const quantity = parseFloat(match[1]);
        let ingredient = match[2].trim().toLowerCase();
        
        // Nettoyer l'ingrédient
        ingredient = ingredient.replace(/^d'/, '').replace(/^de\s+/, '').trim();
        
        // Convertir les quantités en grammes
        let quantityInGrams = quantity;
        if (trimmedLine.toLowerCase().includes('kg') || trimmedLine.toLowerCase().includes('kilo')) {
          quantityInGrams = quantity * 1000;
        } else if (trimmedLine.toLowerCase().includes('cuillère') || trimmedLine.toLowerCase().includes('c.à.s') || trimmedLine.toLowerCase().includes('c.à.c')) {
          quantityInGrams = quantity * 15; // Approximation: 1 cuillère = 15g
        }
        
        // Éviter les doublons
        const existingIngredient = ingredients.find(ing => ing.name === ingredient);
        if (existingIngredient) {
          existingIngredient.quantity += quantityInGrams;
        } else {
          ingredients.push({ name: ingredient, quantity: quantityInGrams });
        }
      }
    }
  }
  
  return ingredients;
}

/**
 * Estime les calories et macronutriments d'un repas basé sur son contenu
 */
export function estimateMealNutrition(mealContent: string, mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner'): MealNutrition {
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
}
