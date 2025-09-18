import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { authService } from "../lib/auth";
import { theme } from "../theme";

const goals = ["Perdre du poids", "Prendre du muscle", "Être en forme"];
const diets = ["Végétarien", "Vegan", "Sans gluten", "Aucune restriction"];
const genders = ["Homme", "Femme"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [goal, setGoal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<number>(4);
  const [diet, setDiet] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  // Fonction pour vérifier si tous les champs obligatoires sont remplis
  const isStep4Complete = () => {
    return gender && firstName.trim() && age.trim() && weight.trim() && height.trim();
  };

  async function next() {
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      return;
    }

    // Vérifier que tous les champs obligatoires sont remplis à l'étape 4
    if (!isStep4Complete()) {
      return;
    }

    // Étape finale : on enregistre le profil via le service d'authentification
    const profile = {
      goal: goal ?? "Être en forme",
      sessions,
      diet: diet ?? "Aucune restriction",
      gender: gender === "Homme" ? "male" as const : gender === "Femme" ? "female" as const : undefined,
      first_name: firstName.trim(),
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      profile_photo: '',
      fitness_level: 'débutant',
      equipment: 'aucun',
      intolerances: '',
      limitations: '',
      preferred_time: 'matin',
      chat_responses: {},
      chat_questions_asked: false,
      daily_meals: {},
      daily_workout: {},
    };
    
    try {
      const result = await authService.updateProfile(profile);
      if (result.success) {
        console.log("Profil mis à jour avec succès, redirection automatique...");
        // La redirection se fera automatiquement via le layout principal
        // Pas besoin de redirection manuelle ici
      } else {
        console.error("Erreur mise à jour profil:", result.error);
        // En cas d'erreur, on peut essayer de continuer quand même
        // Le système de navigation gérera la suite
      }
    } catch (e) {
      console.warn("Erreur updateProfile:", e);
      // En cas d'erreur, on peut essayer de continuer quand même
      // Le système de navigation gérera la suite
    }
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={{ 
        flex: 1, 
        paddingTop: 80, 
        paddingHorizontal: theme.spacing.lg 
      }}>
      <Text style={{ 
        color: theme.colors.text, 
        ...theme.typography.h1, 
        marginBottom: theme.spacing.md 
      }}>
        Onboarding
      </Text>
        
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

      {step === 1 && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h3, 
            marginBottom: theme.spacing.xs 
          }}>
            Quel est ton objectif ?
          </Text>
          {goals.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              style={{
                backgroundColor: goal === g ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
              }}
            >
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>{g}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h3 
          }}>
            Combien de séances par semaine ?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.xs }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const val = i + 1; // 1 → 6 (ajout de l'option 1, suppression de l'option 7)
              const active = sessions === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setSessions(val)}
                  style={{
                    marginRight: theme.spacing.sm,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.borderRadius.lg,
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.h4 
                  }}>{val}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h3, 
            marginBottom: theme.spacing.xs 
          }}>
            Préférences alimentaires
          </Text>
          {diets.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDiet(d)}
              style={{
                backgroundColor: diet === d ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
              }}
            >
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>{d}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 4 && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h3, 
            marginBottom: theme.spacing.xs 
          }}>
            Quelques infos sur toi
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <View>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.body, 
                marginBottom: theme.spacing.xs 
              }}>
                Ton sexe <Text style={{ color: theme.colors.primary }}>*</Text>
              </Text>
              <View style={{ 
                flexDirection: "row", 
                gap: theme.spacing.sm 
              }}>
                {genders.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={{
                      flex: 1,
                      backgroundColor: gender === g ? theme.colors.primary : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: gender === g ? theme.colors.primary : theme.colors.border,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.lg,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ 
                      color: theme.colors.text, 
                      ...theme.typography.body 
                    }}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.body, 
                marginBottom: theme.spacing.xs 
              }}>
                Ton prénom <Text style={{ color: theme.colors.primary }}>*</Text>
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ex: Marie"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  ...theme.input,
                }}
              />
            </View>

            <View>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.body, 
                marginBottom: theme.spacing.xs 
              }}>
                Ton âge <Text style={{ color: theme.colors.primary }}>*</Text>
              </Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Ex: 25"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            </View>

            <View>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.body, 
                marginBottom: theme.spacing.xs 
              }}>
                Ton poids (kg) <Text style={{ color: theme.colors.primary }}>*</Text>
              </Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="Ex: 70"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            </View>

            <View>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.body, 
                marginBottom: theme.spacing.xs 
              }}>
                Ta taille (cm) <Text style={{ color: theme.colors.primary }}>*</Text>
              </Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="Ex: 175"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
                style={{
                  ...theme.input,
                }}
              />
            </View>
          </View>

          <Text style={{ 
            color: theme.colors.textTertiary, 
            ...theme.typography.caption, 
            textAlign: "center", 
            marginTop: theme.spacing.xs 
          }}>
            Ces informations nous aideront à personnaliser tes recommandations. 
            Tu pourras les modifier plus tard dans ton profil.
          </Text>
        </View>
      )}
        </ScrollView>

        <View style={{ paddingVertical: theme.spacing.lg }}>
        <Pressable
          onPress={next}
          disabled={(step === 1 && !goal) || (step === 3 && !diet) || (step === 4 && !isStep4Complete())}
          style={{
            backgroundColor:
              (step === 1 && !goal) || (step === 3 && !diet) || (step === 4 && !isStep4Complete()) 
                ? theme.colors.surface 
                : theme.colors.primary,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
            alignItems: "center",
          }}
        >
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.button 
          }}>
              {step < 4 ? "Continuer" : "Terminer"}
          </Text>
        </Pressable>

        {step > 1 && (
          <Pressable
              onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            style={{ 
              paddingVertical: theme.spacing.sm, 
              alignItems: "center" 
            }}
          >
            <Text style={{ 
              color: theme.colors.textSecondary 
            }}>Retour</Text>
          </Pressable>
        )}
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

