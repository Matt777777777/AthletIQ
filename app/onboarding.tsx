import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const goals = ["Perdre du poids", "Prendre du muscle", "Être en forme"];
const diets = ["Végétarien", "Vegan", "Sans gluten", "Aucune restriction"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<number>(4);
  const [diet, setDiet] = useState<string | null>(null);

  function next() {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else {
      router.replace({
        pathname: "/dashboard",
        params: { goal: goal ?? "", sessions: String(sessions), diet: diet ?? "" },
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 80, paddingHorizontal: 20 }}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 16 }}>
        Onboarding
      </Text>

      {step === 1 && (
        <View style={{ gap: 12 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            Quel est ton objectif ?
          </Text>
          {goals.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={{
                backgroundColor: goal === g ? "#0070F3" : "#111",
                borderWidth: 1,
                borderColor: "#222",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{g}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 16 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Combien de séances par semaine ?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const val = i + 2; // 2 → 7
              const active = sessions === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setSessions(val)}
                  style={{
                    marginRight: 10,
                    backgroundColor: active ? "#0070F3" : "#111",
                    borderWidth: 1,
                    borderColor: "#222",
                    paddingVertical: 14,
                    paddingHorizontal: 22,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{val}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: 12 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            Préférences alimentaires
          </Text>
          {diets.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDiet(d)}
              style={{
                backgroundColor: diet === d ? "#0070F3" : "#111",
                borderWidth: 1,
                borderColor: "#222",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{d}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ marginTop: "auto", paddingVertical: 24 }}>
        <Pressable
          onPress={next}
          disabled={(step === 1 && !goal) || (step === 3 && !diet)}
          style={{
            backgroundColor:
              (step === 1 && !goal) || (step === 3 && !diet) ? "#333" : "#0070F3",
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
            {step < 3 ? "Continuer" : "Terminer"}
          </Text>
        </Pressable>

        {step > 1 && (
          <Pressable
            onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            style={{ paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#aaa" }}>Retour</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
