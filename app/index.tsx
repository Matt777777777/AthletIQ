import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 42, fontWeight: "800", letterSpacing: 2 }}>
        AthletIQ
      </Text>
      <Text style={{ color: "#aaa", fontSize: 16, marginTop: 12, textAlign: "center" }}>
        Ton coach IA pour le sport et la nutrition
      </Text>

      <Pressable
        onPress={() => router.push("/onboarding")}
        style={{
          marginTop: 40,
          backgroundColor: "#0070F3",
          paddingVertical: 14,
          paddingHorizontal: 26,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Commencer</Text>
      </Pressable>
    </View>
  );
}


