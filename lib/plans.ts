// lib/plans.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedPlan[];
  } catch {
    return [];
  }
}

// 🔒 Sauvegarder toute la liste
async function setAll(plans: SavedPlan[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(plans));
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
