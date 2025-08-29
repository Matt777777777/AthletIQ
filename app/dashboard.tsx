import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Dashboard() {
  const params = useLocalSearchParams<{ goal?: string; sessions?: string; diet?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      {/* Header */}
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
        Salut Matteo 👋
      </Text>
      <Text style={{ color: "#aaa", marginBottom: 24 }}>
        Voici ton plan du jour
        {params.goal ? ` • Objectif: ${params.goal}` : ""}
        {params.sessions ? ` • ${params.sessions} séances/semaine` : ""}
        {params.diet ? ` • ${params.diet}` : ""}
      </Text>

      {/* Bloc SPORT */}
      <View
        style={{
          backgroundColor: "#111",
          borderColor: "#1d1d1d",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
          SPORT
        </Text>
        <Text style={{ color: "#ccc", marginBottom: 12 }}>Séance Full Body • 45 min</Text>
        <Link href="/sport" asChild>
          <Pressable
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Voir séance complète</Text>
          </Pressable>
        </Link>
      </View>

      {/* Bloc NUTRITION */}
      <View
        style={{
          backgroundColor: "#0e1622",
          borderColor: "#152238",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
          NUTRITION
        </Text>
        <Text style={{ color: "#ccc", marginBottom: 12 }}>
          Déjeuner: Poulet, quinoa & légumes • 550 kcal
        </Text>
        <Link href="/nutrition" asChild>
          <Pressable
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Voir recettes</Text>
          </Pressable>
        </Link>
      </View>

      {/* === BOUTON CHAT — à la fin du contenu, dans la même View parent === */}
      <View style={{ marginTop: 24 }}>
        <Link href="/chat" asChild>
          <Pressable
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Ouvrir le Chat 💬</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}




