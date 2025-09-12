import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { authService, AuthState } from "../lib/auth";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // S'abonner aux changements d'état d'authentification
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleNavigation = () => {
      // Si on est en train de charger, ne rien faire
      if (authState.loading) {
        return;
      }

      // Si pas d'utilisateur connecté, rediriger vers l'authentification
      if (!authState.user) {
        if (segments[0] !== "auth") {
          router.replace("/auth");
        }
        return;
      }

      // Si utilisateur connecté mais pas de profil complet, rediriger vers l'onboarding
      if (authState.user && !authState.user.profile?.first_name) {
        if (segments[0] !== "onboarding") {
          router.replace("/onboarding");
        }
        return;
      }

      // Si utilisateur connecté avec profil complet
      if (authState.user && authState.user.profile?.first_name) {
        // Si on est sur auth ou onboarding, rediriger vers les tabs
        if (segments[0] === "auth" || segments[0] === "onboarding") {
          router.replace("/(tabs)");
          return;
        }

        // Si on est sur la racine, rediriger vers les tabs
        if (segments.length === 0) {
          router.replace("/(tabs)");
        }
      }
    };

    handleNavigation();
  }, [authState, segments, router]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }} />;
}


