import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { getSupabaseClient } from "../../../lib/supabase";
import { theme } from "../../../theme";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    // Validation des champs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setIsLoading(true);
      
      const client = getSupabaseClient();
      
      // Mettre à jour le mot de passe
      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      // Réinitialiser les champs
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      Alert.alert('Erreur', error.message || 'Impossible de modifier le mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = async () => {
    try {
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      
      if (!user?.email) {
        Alert.alert('Erreur', 'Aucun email associé à ce compte');
        return;
      }

      const { error } = await client.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'athletiq://reset-password'
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Email envoyé', 
        'Un email de réinitialisation de mot de passe a été envoyé à votre adresse email.'
      );
      
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'email de réinitialisation');
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
          Connexions et sécurité
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {/* Section Changement de mot de passe */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg
        }}>
          <Text style={{
            color: theme.colors.primary,
            ...theme.typography.h4,
            marginBottom: theme.spacing.lg
          }}>
            Modifier le mot de passe
          </Text>

          {/* Mot de passe actuel */}
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{
              color: theme.colors.textSecondary,
              ...theme.typography.caption,
              marginBottom: theme.spacing.xs
            }}>
              Mot de passe actuel
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Entrez votre mot de passe actuel"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                ...theme.input,
                color: theme.colors.text
              }}
              secureTextEntry
              autoFocus
            />
          </View>

          {/* Nouveau mot de passe */}
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{
              color: theme.colors.textSecondary,
              ...theme.typography.caption,
              marginBottom: theme.spacing.xs
            }}>
              Nouveau mot de passe
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Entrez votre nouveau mot de passe"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                ...theme.input,
                color: theme.colors.text
              }}
              secureTextEntry
            />
          </View>

          {/* Confirmation du nouveau mot de passe */}
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text style={{
              color: theme.colors.textSecondary,
              ...theme.typography.caption,
              marginBottom: theme.spacing.xs
            }}>
              Confirmer le nouveau mot de passe
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmez votre nouveau mot de passe"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                ...theme.input,
                color: theme.colors.text
              }}
              secureTextEntry
            />
          </View>

          <Text style={{
            color: theme.colors.textTertiary,
            ...theme.typography.caption,
            fontStyle: "italic",
            marginBottom: theme.spacing.md
          }}>
            Le mot de passe doit contenir au moins 6 caractères
          </Text>

          {/* Lien Mot de passe oublié */}
          <Pressable
            onPress={handleForgotPassword}
            style={{
              alignSelf: "flex-start",
              marginBottom: theme.spacing.lg
            }}
          >
            <Text style={{
              color: theme.colors.primary,
              ...theme.typography.caption,
              textDecorationLine: "underline"
            }}>
              Mot de passe oublié ?
            </Text>
          </Pressable>

          {/* Boutons d'action */}
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
                borderColor: theme.colors.border
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
              onPress={handleChangePassword}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? theme.colors.textTertiary : theme.colors.primary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm
              }}
            >
              <Text style={{
                color: theme.colors.background,
                ...theme.typography.caption,
                fontWeight: "600"
              }}>
                {isLoading ? "Modification..." : "Sauvegarder"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
