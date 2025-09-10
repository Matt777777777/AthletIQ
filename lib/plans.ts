// lib/plans.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageAdapter } from "./storage-adapter-simple";

export type PlanType = "workout" | "meal";

export type SavedPlan = {
  id: string;
  type: PlanType;
  title: string;      // Exemple : "Séance 45 min Full Body" ou "Menu ~2000 kcal"
  content: string;    // Texte complet de l’IA
  dateISO: string;    // Date de création en ISO (new Date().toISOString())
};

const KEY = "the_sport_saved_plans_v1";

// 🔄 Récupérer tous les plans enregistrés
async function getAll(): Promise<SavedPlan[]> {
  try {
    // Utiliser le storage adapter avec fallback automatique
    const plans = await storageAdapter.load(KEY);
    if (plans) return plans as SavedPlan[];
    
    // Fallback vers AsyncStorage si pas de données
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlan[];
  } catch (e) {
    console.error("Erreur en chargeant les plans:", e);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedPlan[];
    } catch (fallbackError) {
      console.error("❌ Erreur fallback AsyncStorage:", fallbackError);
      return [];
    }
  }
}

// 🔒 Sauvegarder toute la liste
async function setAll(plans: SavedPlan[]) {
  try {
    // Utiliser le storage adapter avec fallback automatique
    await storageAdapter.save(KEY, plans);
  } catch (e) {
    console.error("Erreur en sauvegardant les plans:", e);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(plans));
      console.log("✅ Plans sauvegardés en fallback (AsyncStorage)");
    } catch (fallbackError) {
      console.error("❌ Erreur fallback AsyncStorage:", fallbackError);
    }
  }
}

// ➕ Ajouter un plan (on génère un id + date automatiquement)
export async function addPlan(plan: Omit<SavedPlan, "id" | "dateISO">) {
  const all = await getAll();
  const item: SavedPlan = {
    id: String(Date.now()),
    dateISO: new Date().toISOString(),
    ...plan,
  };
  await setAll([item, ...all]); // on ajoute au début
  return item;
}

// 📋 Lister tous les plans
export async function listPlans(): Promise<SavedPlan[]> {
  return getAll();
}

// ❌ Supprimer un plan
export async function deletePlan(id: string) {
  const all = await getAll();
  await setAll(all.filter((p) => p.id !== id));
}

// 🔎 Récupérer le dernier plan d’un type donné (workout ou meal)
export async function latestByType(type: PlanType): Promise<SavedPlan | null> {
  const all = await getAll();
  const found = all.find((p) => p.type === type);
  return found ?? null;
}
