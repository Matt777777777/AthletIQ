import { ScrollView, Text, View } from "react-native";

const exercises = [
  { name: "Pompes", detail: "4 x 12 • Poitrine/Triceps" },
  { name: "Squats", detail: "4 x 10 • Jambes/Fessiers" },
  { name: "Rowing haltères", detail: "3 x 12 • Dos/Biceps" },
  { name: "Gainage", detail: "3 x 45s • Core" },
];

export default function Sport() {  // <-- export default OK
  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 }}>
        Séance du jour
      </Text>
      <Text style={{ color: "#aaa", marginBottom: 16 }}>Full Body • 45 min</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {exercises.map((e) => (
          <View
            key={e.name}
            style={{
              backgroundColor: "#111",
              borderColor: "#1d1d1d",
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{e.name}</Text>
            <Text style={{ color: "#ccc", marginTop: 4 }}>{e.detail}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

