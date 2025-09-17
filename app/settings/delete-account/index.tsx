import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "../../../theme";

export default function DeleteAccountSettings() {
  const router = useRouter();

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
          Supprimer votre compte
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg
        }}>
          <Text style={{
            color: theme.colors.textSecondary,
            ...theme.typography.body,
            textAlign: "center",
            fontStyle: "italic"
          }}>
            Ici, j'ajouterai les éléments de suppression de compte (confirmation, suppression des données, etc.)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}


