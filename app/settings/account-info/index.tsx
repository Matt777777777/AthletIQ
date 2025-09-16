import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { loadProfile, saveProfile, UserProfile } from "../../../lib/profile";
import { getSupabaseClient } from "../../../lib/supabase";
import { theme } from "../../../theme";

export default function AccountInfoSettings() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userCreationDate, setUserCreationDate] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les informations utilisateur
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer les informations d'authentification Supabase
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      
      if (user) {
        setUserEmail(user.email || "");
        setUserCreationDate(user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : "");
      }
      
      // Récupérer le profil utilisateur pour le numéro de téléphone
      const profile = await loadProfile();
      if (profile?.phone) {
        setPhoneNumber(profile.phone);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des informations utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du compte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Sauvegarder le numéro de téléphone dans le profil
      const profile = await loadProfile();
      if (profile) {
        const updatedProfile: UserProfile = {
          ...profile,
          phone: phoneNumber
        };
        await saveProfile(updatedProfile);
      }
      
      setIsEditing(false);
      Alert.alert('Succès', 'Informations sauvegardées avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
    }
  };

  const handleCancel = () => {
    // Recharger les données originales
    loadUserInfo();
    setIsEditing(false);
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
          Informations de compte
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {isLoading ? (
          <View style={{
            ...theme.card,
            padding: theme.spacing.lg,
            alignItems: "center"
          }}>
            <Text style={{
              color: theme.colors.textSecondary,
              ...theme.typography.body
            }}>
              Chargement des informations...
            </Text>
          </View>
        ) : (
          <>
            {/* Informations de base */}
            <View style={{
              ...theme.card,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.md
            }}>
              <Text style={{
                color: theme.colors.primary,
                ...theme.typography.h4,
                marginBottom: theme.spacing.md
              }}>
                Informations de base
              </Text>
              
              {/* Email */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={{
                  color: theme.colors.textSecondary,
                  ...theme.typography.caption,
                  marginBottom: theme.spacing.xs
                }}>
                  Adresse email
                </Text>
                <Text style={{
                  color: theme.colors.text,
                  ...theme.typography.body,
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }}>
                  {userEmail}
                </Text>
              </View>
              
              {/* Date de création */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text style={{
                  color: theme.colors.textSecondary,
                  ...theme.typography.caption,
                  marginBottom: theme.spacing.xs
                }}>
                  Compte créé le
                </Text>
                <Text style={{
                  color: theme.colors.text,
                  ...theme.typography.body,
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  borderWidth: 1,
                  borderColor: theme.colors.border
                }}>
                  {userCreationDate}
                </Text>
              </View>
            </View>

            {/* Numéro de téléphone */}
            <View style={{
              ...theme.card,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.md
            }}>
              <Text style={{
                color: theme.colors.primary,
                ...theme.typography.h4,
                marginBottom: theme.spacing.md
              }}>
                Numéro de téléphone
              </Text>
              
              {!isEditing ? (
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: theme.spacing.md
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: phoneNumber ? theme.colors.text : theme.colors.textTertiary,
                      ...theme.typography.body,
                      backgroundColor: theme.colors.surface,
                      padding: theme.spacing.sm,
                      borderRadius: theme.borderRadius.sm,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      fontStyle: phoneNumber ? "normal" : "italic"
                    }}>
                      {phoneNumber || "Aucun numéro de téléphone"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setIsEditing(true)}
                    style={{
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.borderRadius.sm,
                      marginLeft: theme.spacing.sm
                    }}
                  >
                    <Text style={{
                      color: theme.colors.background,
                      ...theme.typography.caption,
                      fontWeight: "600"
                    }}>
                      Modifier
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Entrez votre numéro de téléphone"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={{
                      ...theme.input,
                      color: theme.colors.text,
                      marginBottom: theme.spacing.md
                    }}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  <View style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: theme.spacing.sm
                  }}>
                    <Pressable
                      onPress={handleCancel}
                      style={{
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.borderRadius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        minWidth: 100,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{
                        color: theme.colors.textSecondary,
                        ...theme.typography.caption
                      }}>
                        Annuler
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSave}
                      style={{
                        backgroundColor: theme.colors.primary,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.borderRadius.sm,
                        minWidth: 100,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{
                        color: theme.colors.background,
                        ...theme.typography.caption,
                        fontWeight: "600"
                      }}>
                        Sauvegarder
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
