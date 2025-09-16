import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { loadProfile, saveProfile, UserProfile } from "../../../lib/profile";
import { getSupabaseClient } from "../../../lib/supabase";
import { theme } from "../../../theme";

export default function AccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (profile?.profileImage) {
      setProfileImage(profile.profileImage);
    }
  }, [profile]);

  const loadUserProfile = async () => {
    try {
      const userProfile = await loadProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const handleSelectProfileImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission requise", "L'accès à la galerie est nécessaire pour sélectionner une photo de profil.");
        return;
      }

      // Afficher les options (galerie ou appareil photo)
      Alert.alert(
        "Choisir une photo",
        "Comment souhaitez-vous ajouter une photo de profil ?",
        [
          {
            text: "Galerie",
            onPress: () => selectFromGallery(),
          },
          {
            text: "Appareil photo",
            onPress: () => takePhoto(),
          },
          {
            text: "Annuler",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une photo');
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (profile) {
          const updatedProfile = { ...profile, profileImage: result.assets[0].uri };
          await saveProfile(updatedProfile);
          setProfile(updatedProfile);
        }
        Alert.alert("Succès", "Photo de profil mise à jour !");
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const takePhoto = async () => {
    try {
      // Demander la permission d'accès à l'appareil photo
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission requise", "L'accès à l'appareil photo est nécessaire pour prendre une photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (profile) {
          const updatedProfile = { ...profile, profileImage: result.assets[0].uri };
          await saveProfile(updatedProfile);
          setProfile(updatedProfile);
        }
        Alert.alert("Succès", "Photo de profil mise à jour !");
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: confirmLogout
        }
      ]
    );
  };

  const confirmLogout = async () => {
    try {
      console.log('Début de la déconnexion...');
      
      const client = getSupabaseClient();
      console.log('Client Supabase récupéré');
      
      const { error } = await client.auth.signOut();
      
      if (error) {
        console.error('Erreur Supabase lors de la déconnexion:', error);
        throw error;
      }
      
      console.log('Déconnexion Supabase réussie');
      
      // Rediriger vers la page de connexion
      console.log('Redirection vers la page de connexion...');
      router.replace('/');
      
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert(
        'Erreur',
        `Une erreur est survenue lors de la déconnexion: ${error.message || 'Erreur inconnue'}. Veuillez réessayer.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 60,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.sm
          }}
        >
          <Text style={{ 
            color: theme.colors.textSecondary, 
            ...theme.typography.h4 
          }}>←</Text>
        </Pressable>
        
        <Text style={{ 
          color: theme.colors.text, 
          ...theme.typography.h2,
          flex: 1,
          textAlign: "center",
          marginRight: 40 // Compenser le bouton retour
        }}>
          Menu
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {/* Section Photo de profil */}
        <View style={{
          ...theme.card,
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{ 
            alignItems: "center", 
            marginBottom: theme.spacing.md 
          }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: theme.colors.primary,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: theme.spacing.sm,
              borderWidth: 3,
              borderColor: theme.colors.border,
              overflow: "hidden",
            }}>
              {profileImage || profile?.profileImage ? (
                <Image
                  source={{ uri: profileImage || profile?.profileImage }}
                  style={{
                    width: 94,
                    height: 94,
                    borderRadius: 47,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ 
                  color: theme.colors.text, 
                  fontSize: 40, 
                  fontWeight: "800" 
                }}>👤</Text>
              )}
            </View>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.h3, 
              marginBottom: theme.spacing.xs 
            }}>
              {profile?.first_name || "Utilisateur"}
            </Text>
            <Pressable
              onPress={handleSelectProfileImage}
              style={{
                ...theme.button.secondary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: 20,
              }}
            >
              <Text style={{ 
                color: theme.colors.primary, 
                ...theme.typography.caption 
              }}>
                {profileImage || profile?.profileImage ? "Modifier la photo" : "Ajouter une photo"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Section Informations de compte */}
        <View style={{
          ...theme.card,
          marginBottom: theme.spacing.lg,
        }}>
          <Pressable
            onPress={() => {
              router.push('/settings/account-info');
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: theme.spacing.sm,
            }}>
              <Text style={{ 
                color: theme.colors.primary, 
                fontSize: 18 
              }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>
                Informations de compte
              </Text>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.caption, 
                marginTop: theme.spacing.xs 
              }}>
                Email, nom, téléphone
              </Text>
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 18 
            }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.push('/settings/security-settings');
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: theme.spacing.sm,
            }}>
              <Text style={{ 
                color: theme.colors.primary, 
                fontSize: 18 
              }}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>
                Connexion et sécurité
              </Text>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.caption, 
                marginTop: theme.spacing.xs 
              }}>
                Mot de passe et authentification
              </Text>
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 18 
            }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.push('/settings/privacy');
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: theme.spacing.sm,
            }}>
              <Text style={{ 
                color: theme.colors.primary, 
                fontSize: 18 
              }}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>
                Données et confidentialité
              </Text>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.caption, 
                marginTop: theme.spacing.xs 
              }}>
                Gérer vos données personnelles
              </Text>
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 18 
            }}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.push('/settings/help');
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: theme.spacing.sm,
            }}>
              <Text style={{ 
                color: theme.colors.primary, 
                fontSize: 18 
              }}>❓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>
                Aide
              </Text>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.caption, 
                marginTop: theme.spacing.xs 
              }}>
                FAQ, contact et support
              </Text>
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 18 
            }}>›</Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginRight: theme.spacing.sm,
            }}>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                fontSize: 18 
              }}>🚪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.body 
              }}>
                Déconnexion
              </Text>
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.caption, 
                marginTop: theme.spacing.xs 
              }}>
                Se déconnecter de l'application
              </Text>
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 18 
            }}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
