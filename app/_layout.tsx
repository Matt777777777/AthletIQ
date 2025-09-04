import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { loadProfile } from "../lib/profile";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const profile = await loadProfile();
        
        // Si pas de profil, rediriger vers l'onboarding
        if (!profile) {
          router.replace("/onboarding");
          return;
        }

        // Si on est sur l'onboarding mais qu'on a déjà un profil, rediriger vers les tabs
        if (segments[0] === "onboarding") {
          router.replace("/(tabs)");
          return;
        }

        // Si on est sur la racine et qu'on a un profil, rediriger vers les tabs
        if (segments.length === 0) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'onboarding:", error);
        // En cas d'erreur, rediriger vers l'onboarding par sécurité
        router.replace("/onboarding");
      }
    };

    checkOnboarding();
  }, [segments]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }} />;
}


