// lib/shopping.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ShoppingItem = {
  id: string;
  name: string;           // Nom de l'ingrédient
  quantity: string;       // Quantité (ex: "200g", "2", "1 cuillère")
  unit?: string;          // Unité optionnelle
  category: string;       // Rayon (ex: "Fruits", "Légumes", "Protéines", "Épicerie")
  checked: boolean;       // Case cochée
  dateAdded: string;      // Date d'ajout
  source?: string;        // Source (ex: "Plan repas du 15/12")
};

export type ShoppingList = ShoppingItem[];

const KEY = "the_sport_shopping_list_v1";

// 🔄 Récupérer toute la liste
async function getAll(): Promise<ShoppingList> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ShoppingList;
  } catch {
    return [];
  }
}

// 🔒 Sauvegarder toute la liste
async function setAll(items: ShoppingList) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

// ➕ Ajouter un ingrédient
export async function addShoppingItem(item: Omit<ShoppingItem, "id" | "dateAdded">) {
  const all = await getAll();
  
  // Générer un ID unique en combinant timestamp et random
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const uniqueId = `${timestamp}_${random}`;
  
  const newItem: ShoppingItem = {
    ...item,
    id: uniqueId,
    dateAdded: new Date().toISOString(),
  };
  
  console.log(`Adding new item with id: ${uniqueId}, name: ${item.name}`);
  await setAll([newItem, ...all]);
  return newItem;
}

// ✅ Toggle case cochée
export async function toggleItem(id: string) {
  const all = await getAll();
  
  // Vérifier si c'est un élément groupé
  if (id.startsWith('grouped_')) {
    const name = id.replace('grouped_', '').split('_')[0];
    const category = id.replace('grouped_', '').split('_').slice(1).join('_');
    
    // Trouver tous les éléments avec le même nom et la même catégorie
    const sameNameItems = all.filter(item => 
      item.name.toLowerCase() === name.toLowerCase() && 
      item.category === category
    );
    
    // Toggle tous les éléments avec le même nom
    const updated = all.map(item => {
      if (item.name.toLowerCase() === name.toLowerCase() && item.category === category) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    
    await setAll(updated);
    return;
  }
  
  // Toggle un élément individuel
  const updated = all.map(item => {
    if (item.id === id) {
      return { ...item, checked: !item.checked };
    }
    return item;
  });
  
  await setAll(updated);
}

// ❌ Supprimer un ingrédient
export async function removeItem(id: string) {
  const all = await getAll();
  await setAll(all.filter(item => item.id !== id));
}

// 🧹 Vider la liste (supprimer tous les cochés)
export async function clearChecked() {
  const all = await getAll();
  await setAll(all.filter(item => !item.checked));
}

// 📋 Lister tous les ingrédients
export async function listShoppingItems(): Promise<ShoppingList> {
  return getAll();
}

// 🔍 Récupérer par catégorie
export async function getItemsByCategory(): Promise<Record<string, ShoppingItem[]>> {
  const all = await getAll();
  const grouped: Record<string, ShoppingItem[]> = {};
  
  // Grouper par nom d'abord, puis par catégorie
  const itemsByName: Record<string, ShoppingItem[]> = {};
  all.forEach(item => {
    const key = `${item.name.toLowerCase()}_${item.category}`;
    if (!itemsByName[key]) {
      itemsByName[key] = [];
    }
    itemsByName[key].push(item);
  });
  
  // Créer des éléments groupés
  Object.values(itemsByName).forEach(items => {
    if (items.length === 0) return;
    
    const firstItem = items[0];
    const category = firstItem.category;
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    
    if (items.length === 1) {
      // Un seul élément, l'ajouter tel quel
      grouped[category].push(firstItem);
    } else {
      // Plusieurs éléments avec le même nom, les grouper
      const totalQuantity = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 1;
        return sum + qty;
      }, 0);
      
      const allChecked = items.every(item => item.checked);
      const anyChecked = items.some(item => item.checked);
      
      // Créer un élément groupé
      const groupedItem: ShoppingItem = {
        id: `grouped_${firstItem.name}_${firstItem.category}`,
        name: firstItem.name,
        quantity: totalQuantity.toString(),
        unit: firstItem.unit,
        category: firstItem.category,
        checked: allChecked,
        dateAdded: items[0].dateAdded,
        source: "Groupé"
      };
      
      grouped[category].push(groupedItem);
    }
  });
  
  return grouped;
}

// 🎯 Extraction automatique des ingrédients depuis une réponse IA
export function extractIngredientsFromAIResponse(text: string): Omit<ShoppingItem, "id" | "dateAdded">[] {
  // D'abord, essayer d'extraire du JSON structuré (nouveau système)
  const jsonIngredients = extractIngredientsFromJSON(text);
  if (jsonIngredients.length > 0) {
    return jsonIngredients;
  }
  
  // Si pas de JSON, utiliser l'ancien système de regex (fallback)
  return extractIngredientsFromText(text);
}

// 🆕 Nouveau système : Extraction depuis JSON structuré
function extractIngredientsFromJSON(text: string): Omit<ShoppingItem, "id" | "dateAdded">[] {
  try {
    // Chercher les balises <INGREDIENTS>...</INGREDIENTS>
    const ingredientsMatch = text.match(/<INGREDIENTS>([\s\S]*?)<\/INGREDIENTS>/i);
    if (!ingredientsMatch) return [];
    
    const jsonText = ingredientsMatch[1].trim();
    const data = JSON.parse(jsonText);
    
    if (!data.ingredients || !Array.isArray(data.ingredients)) {
      return [];
    }
    
    return data.ingredients.map((item: any) => ({
      name: item.name || "",
      quantity: item.quantity || "1",
      unit: item.unit || undefined,
      category: item.category || "Autres",
      checked: false,
    })).filter((item: any) => item.name && item.name.trim().length > 0);
    
  } catch (error) {
    console.log("Erreur parsing JSON:", error);
    return [];
  }
}

// 🔄 Ancien système : Extraction depuis texte libre (fallback)
function extractIngredientsFromText(text: string): Omit<ShoppingItem, "id" | "dateAdded">[] {
  const ingredients: Omit<ShoppingItem, "id" | "dateAdded">[] = [];
  
  // Patterns simplifiés et plus robustes
  const patterns = [
    // "Ingrédients:" suivi d'une liste
    /ingrédients?\s*:\s*([^.\n]+)/i,
    // "Pour X personnes:" suivi d'ingrédients
    /pour\s+\d+\s+personnes?\s*:\s*([^.\n]+)/i,
    // "Liste des ingrédients:" suivi d'une liste
    /liste\s+des\s+ingrédients?\s*:\s*([^.\n]+)/i,
    // "Vous aurez besoin de:" suivi d'ingrédients
    /vous\s+aurez\s+besoin\s+de\s*:\s*([^.\n]+)/i,
    // "Recette:" suivi d'ingrédients
    /recette\s*:\s*([^.\n]+)/i,
    // "Préparation:" suivi d'ingrédients
    /préparation\s*:\s*([^.\n]+)/i,
    // "Matériel:" suivi d'ingrédients
    /matériel\s*:\s*([^.\n]+)/i,
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches && matches[1]) {
      const ingredientsText = matches[1];
      // Séparation plus intelligente (virgules, points-virgules, "et")
      const items = ingredientsText
        .split(/[,;]|\s+et\s+/)
        .map(item => item.trim())
        .filter(item => item.length > 2);
      
      items.forEach(item => {
        const parsed = parseIngredient(item);
        if (parsed) {
          // Vérifier qu'on n'a pas déjà cet ingrédient
          const exists = ingredients.some(existing => 
            existing.name.toLowerCase() === parsed.name.toLowerCase()
          );
          if (!exists) {
            ingredients.push(parsed);
          }
        }
      });
    }
  });
  
  return ingredients;
}

// 🔧 Parser un ingrédient pour extraire nom, quantité et catégorie
function parseIngredient(text: string): Omit<ShoppingItem, "id" | "dateAdded"> | null {
  // Nettoyer le texte
  const clean = text.replace(/^\d+\.\s*/, '').trim();
  if (clean.length < 2) return null;
  
  // Patterns pour extraire quantité et nom (plus robustes)
  const quantityPatterns = [
    // "200g poulet" ou "2 cuillères huile d'olive"
    /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cuillères?|tasses?|pincées?|branches?|gousses?|tranches?|unités?)\s+(.+)/i,
    // "2 poulets" ou "1 citron"
    /^(\d+(?:\.\d+)?)\s+(.+)/,
    // Juste le nom
    /^(.+)/,
  ];
  
  let quantity = "1";
  let unit = "";
  let name = clean;
  
  for (const pattern of quantityPatterns) {
    const match = clean.match(pattern);
    if (match) {
      if (match[1] && !isNaN(Number(match[1]))) {
        quantity = match[1];
        unit = match[2] || "";
        name = match[3] || clean;
      } else {
        name = match[1] || clean;
      }
      break;
    }
  }
  
  // Nettoyer le nom (enlever les mots parasites)
  name = name
    .replace(/^(de\s+|du\s+|des\s+|le\s+|la\s+|les\s+)/i, '') // Enlever les articles
    .replace(/\s+(frais|râpé|complet|entier|moulu|haché|concassé|découpé)$/i, '') // Enlever les qualificatifs
    .trim();
  
  // Déterminer la catégorie
  const category = categorizeIngredient(name);
  
  return {
    name: name,
    quantity,
    unit: unit.trim() || undefined,
    category,
    checked: false,
  };
}

// 🏷️ Catégoriser un ingrédient
function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Fruits
  if (/\b(pomme|banane|orange|fraise|framboise|myrtille|mangue|ananas|kiwi|pêche|poire|raisin|citron|citron vert|pamplemousse)\b/.test(lowerName)) {
    return "Fruits";
  }
  
  // Légumes
  if (/\b(carotte|poivron|courgette|brocoli|épinard|salade|tomate|oignon|ail|échalote|poireau|champignon|asperge|haricot|petit pois|maïs|patate|pomme de terre)\b/.test(lowerName)) {
    return "Légumes";
  }
  
  // Protéines
  if (/\b(poulet|dinde|boeuf|porc|agneau|poisson|saumon|thon|cabillaud|crevette|oeuf|fromage|yaourt|lait|amande|noix|noisette|pistache)\b/.test(lowerName)) {
    return "Protéines";
  }
  
  // Céréales
  if (/\b(riz|quinoa|avoine|blé|pâtes|pain|farine|semoule|couscous|boulgour|millet|sarrasin)\b/.test(lowerName)) {
    return "Céréales";
  }
  
  // Épicerie
  if (/\b(huile|vinaigre|sel|poivre|sucre|miel|sirop|épice|herbe|bouillon|sauce|ketchup|moutarde|mayonnaise)\b/.test(lowerName)) {
    return "Épicerie";
  }
  
  // Laitages
  if (/\b(lait|yaourt|fromage|beurre|crème|fromage blanc|cottage|ricotta|mozzarella|parmesan|cheddar)\b/.test(lowerName)) {
    return "Laitages";
  }
  
  // Par défaut
  return "Autres";
}

// 📊 Générer un résumé de la liste
export function generateShoppingSummary(items: ShoppingItem[]): string {
  const total = items.length;
  const checked = items.filter(item => item.checked).length;
  const unchecked = total - checked;
  
  const byCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);
  
  let summary = `🛒 Liste de courses (${total} articles)\n`;
  summary += `✅ Coché: ${checked} | ⏳ À acheter: ${unchecked}\n\n`;
  
  Object.entries(byCategory).forEach(([category, categoryItems]) => {
    const categoryChecked = categoryItems.filter(item => item.checked).length;
    summary += `${category} (${categoryItems.length}): ${categoryChecked}/${categoryItems.length} cochés\n`;
  });
  
  return summary;
}

// 🎯 Suggestions d'ingrédients courants par catégorie
export const COMMON_INGREDIENTS = {
  "Fruits": [
    { name: "Pommes", quantity: "6", unit: "unités" },
    { name: "Bananes", quantity: "1", unit: "kg" },
    { name: "Oranges", quantity: "4", unit: "unités" },
    { name: "Fraises", quantity: "500", unit: "g" },
    { name: "Citrons", quantity: "3", unit: "unités" },
  ],
  "Légumes": [
    { name: "Carottes", quantity: "500", unit: "g" },
    { name: "Poivrons", quantity: "3", unit: "unités" },
    { name: "Courgettes", quantity: "4", unit: "unités" },
    { name: "Brocoli", quantity: "1", unit: "unité" },
    { name: "Oignons", quantity: "500", unit: "g" },
    { name: "Ail", quantity: "1", unit: "tête" },
  ],
  "Protéines": [
    { name: "Poulet", quantity: "500", unit: "g" },
    { name: "Saumon", quantity: "400", unit: "g" },
    { name: "Oeufs", quantity: "6", unit: "unités" },
    { name: "Fromage", quantity: "200", unit: "g" },
    { name: "Yaourt", quantity: "4", unit: "unités" },
  ],
  "Céréales": [
    { name: "Riz", quantity: "500", unit: "g" },
    { name: "Quinoa", quantity: "250", unit: "g" },
    { name: "Pâtes", quantity: "400", unit: "g" },
    { name: "Pain", quantity: "1", unit: "baguette" },
    { name: "Flocons d'avoine", quantity: "500", unit: "g" },
  ],
  "Épicerie": [
    { name: "Huile d'olive", quantity: "1", unit: "bouteille" },
    { name: "Sel", quantity: "1", unit: "paquet" },
    { name: "Poivre", quantity: "1", unit: "moulin" },
    { name: "Sucre", quantity: "500", unit: "g" },
    { name: "Farine", quantity: "1", unit: "kg" },
  ],
  "Laitages": [
    { name: "Lait", quantity: "1", unit: "l" },
    { name: "Beurre", quantity: "250", unit: "g" },
    { name: "Crème fraîche", quantity: "200", unit: "ml" },
    { name: "Fromage blanc", quantity: "4", unit: "unités" },
  ],
} as const;

// 🔍 Recherche d'ingrédients par nom
export function searchIngredients(query: string): Array<{ name: string; category: string }> {
  const results: Array<{ name: string; category: string }> = [];
  const lowerQuery = query.toLowerCase();
  
  Object.entries(COMMON_INGREDIENTS).forEach(([category, items]) => {
    items.forEach(item => {
      if (item.name.toLowerCase().includes(lowerQuery)) {
        results.push({ name: item.name, category });
      }
    });
  });
  
  return results.slice(0, 10); // Limiter à 10 résultats
}
