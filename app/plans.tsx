// app/plans.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { listPlans, SavedPlan } from "../lib/plans";
import { loadProfile } from "../lib/profile";
import { synthesizeWorkout } from "../lib/synthesis";

type Tab = "workout" | "meal" | "all";

export default function Plans() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Charger depuis le profil (source principale)
      const profile = await loadProfile();
      if (profile?.saved_plans) {
        const allPlans: SavedPlan[] = [];
        
        // Convertir les workouts du profil
        if (profile.saved_plans.workouts) {
          profile.saved_plans.workouts.forEach(workout => {
            allPlans.push({
              id: workout.id,
              type: 'workout' as const,
              title: workout.title,
              content: workout.content,
              dateISO: workout.date
            });
          });
        }
        
        // Convertir les meals du profil
        if (profile.saved_plans.meals) {
          profile.saved_plans.meals.forEach(meal => {
            allPlans.push({
              id: meal.id,
              type: 'meal' as const,
              title: meal.title,
              content: meal.content,
              dateISO: meal.date
            });
          });
        }
        
        // Trier par date (plus récent en premier)
        allPlans.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
        
        console.log(`📦 Plans chargés depuis le profil: ${allPlans.length} plans`);
        setPlans(allPlans);
        return;
      }
      
      // Fallback vers lib/plans.ts si pas de données dans le profil
      console.log(`📦 Fallback vers lib/plans.ts`);
      const all = await listPlans();
      setPlans(all);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des plans:", error);
      // Fallback vers lib/plans.ts en cas d'erreur
      try {
        const all = await listPlans();
        setPlans(all);
      } catch (fallbackError) {
        console.error("❌ Erreur fallback:", fallbackError);
        setPlans([]);
      }
    }
  }, []);

  // Recharge quand l’écran reprend le focus (retour depuis Chat/Dashboard)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onDelete(id: string) {
    // Optimistic update
    setDeletingId(id);
    const prev = plans;
    const planToDelete = plans.find(p => p.id === id);
    setPlans((cur) => cur.filter((p) => p.id !== id));
    
    try {
      if (planToDelete) {
        // Supprimer depuis le profil (source principale)
        const { deletePlan: deleteFromProfile } = await import('../lib/profile');
        await deleteFromProfile(planToDelete.type, id);
        console.log(`✅ Plan supprimé depuis le profil: ${id}`);
      }
    } catch (e) {
      // rollback si échec
      setPlans(prev);
      Alert.alert("Erreur", "Impossible de supprimer pour le moment.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = tab === "all" ? plans : plans.filter((p) => p.type === tab);

  const countWorkout = plans.filter((p) => p.type === "workout").length;
  const countMeal = plans.filter((p) => p.type === "meal").length;

  // 🏋️ Rendu spécial pour les séances avec cartes d'exercices
  const renderWorkoutCard = (plan: SavedPlan) => {
    try {
      const synthesized = synthesizeWorkout(plan.content);
      
      return (
        <View
          key={plan.id}
          style={{
            backgroundColor: "#111",
            borderWidth: 1,
            borderColor: "#1f1f1f",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          {/* En-tête de la séance */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 }}>
              {synthesized.title}
            </Text>
          </View>

          {/* Cartes d'exercices compactes */}
          <View style={{ gap: 6 }}>
            {synthesized.exercises.slice(0, 6).map((exercise, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "#2a2a2a",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  {exercise.name} - {exercise.sets} x {exercise.reps}
                </Text>
              </View>
            ))}
            {synthesized.exercises.length > 6 && (
              <Text style={{ color: "#888", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                +{synthesized.exercises.length - 6} exercices supplémentaires
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Pressable
              onPress={() =>
                Alert.alert("Supprimer", "Tu confirmes la suppression ?", [
                  { text: "Annuler" },
                  {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => onDelete(plan.id),
                  },
                ])
              }
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed || deletingId === plan.id ? "#3a0f14" : "#2a2a2a",
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: deletingId === plan.id ? "#7a1f28" : "#333",
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {deletingId === plan.id ? "Suppression…" : "Supprimer"}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    } catch (error) {
      // Fallback vers l'affichage normal si la synthèse échoue
      return renderNormalCard(plan);
    }
  };

  // 📝 Rendu normal pour les repas et séances qui échouent
  const renderNormalCard = (plan: SavedPlan) => (
    <View
      key={plan.id}
      style={{
        backgroundColor: "#111",
        borderWidth: 1,
        borderColor: "#1f1f1f",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "800", marginBottom: 4 }}>
        {plan.type === "workout" ? "Séance " : "Repas "}
        {plan.title}
      </Text>
      <Text style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
        {new Date(plan.dateISO).toLocaleString()}
      </Text>
      <Text style={{ color: "#ddd", marginBottom: 12 }}>{plan.content}</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() =>
            Alert.alert("Supprimer", "Tu confirmes la suppression ?", [
              { text: "Annuler" },
              {
                text: "Supprimer",
                style: "destructive",
                onPress: () => onDelete(plan.id),
              },
            ])
          }
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: pressed || deletingId === plan.id ? "#3a0f14" : "#2a2a2a",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: deletingId === plan.id ? "#7a1f28" : "#333",
          })}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {deletingId === plan.id ? "Suppression…" : "Supprimer"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
        📚 Mes plans enregistrés
      </Text>

      {/* Segmented control */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {([
          { key: "workout", label: `Séances (${countWorkout})` },
          { key: "meal", label: `Repas (${countMeal})` },
          { key: "all", label: "Tous" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: tab === t.key ? "#0070F3" : pressed ? "#222" : "#1b1b1b",
              borderWidth: 1,
              borderColor: "#2a2a2a",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {filtered.length === 0 && (
          <Text style={{ color: "#888" }}>
            Aucun plan {tab === "workout" ? "séance" : tab === "meal" ? "repas" : ""} pour l’instant.
            Enregistre depuis le Chat (boutons sous la zone de saisie).
          </Text>
        )}

        {filtered.map((p) => 
          p.type === "workout" ? renderWorkoutCard(p) : renderNormalCard(p)
        )}
      </ScrollView>
    </View>
  );
}


