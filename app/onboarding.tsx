import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { saveProfile } from "../lib/profile";

const goals = ["Perdre du poids", "Prendre du muscle", "Être en forme"];
const diets = ["Végétarien", "Vegan", "Sans gluten", "Aucune restriction"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<number>(4);
  const [diet, setDiet] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  async function next() {
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      return;
    }

    // Étape finale : on enregistre le profil en local
    const profile = {
      goal: goal ?? "Être en forme",
      sessions,
      diet: diet ?? "Aucune restriction",
      firstName: firstName.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
    };
    try {
      await saveProfile(profile);
    } catch (e) {
      console.warn("saveProfile error", e);
    }

    // Puis on va aux onglets (on passe aussi les params pour compat)
    router.replace({
      pathname: "/(tabs)",
      params: {
        goal: profile.goal,
        sessions: String(profile.sessions),
        diet: profile.diet,
      },
    });
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#000" }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 20 }}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 16 }}>
        Onboarding
      </Text>
        
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

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

      {step === 4 && (
        <View style={{ gap: 20 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            Quelques infos sur toi
          </Text>
          
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 8 }}>
                Ton prénom
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ex: Marie"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#111",
                  borderWidth: 1,
                  borderColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 8 }}>
                Ton âge
              </Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Ex: 25"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#111",
                  borderWidth: 1,
                  borderColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 8 }}>
                Ton poids (kg)
              </Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Ex: 70"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#111",
                  borderWidth: 1,
                  borderColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 8 }}>
                Ta taille (cm)
              </Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="Ex: 175"
                placeholderTextColor="#666"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#111",
                  borderWidth: 1,
                  borderColor: "#222",
                  padding: 16,
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </View>
          </View>

          <Text style={{ color: "#666", fontSize: 14, textAlign: "center", marginTop: 8 }}>
            Ces informations nous aideront à personnaliser tes recommandations. 
            Tu pourras les modifier plus tard dans ton profil.
          </Text>
        </View>
      )}
        </ScrollView>

        <View style={{ paddingVertical: 24 }}>
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
              {step < 4 ? "Continuer" : "Terminer"}
          </Text>
        </Pressable>

        {step > 1 && (
          <Pressable
              onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            style={{ paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#aaa" }}>Retour</Text>
          </Pressable>
        )}
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

