// components/OnboardingModal.tsx
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { theme } from '../theme';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 60,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border
        }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h2, 
            flex: 1 
          }}>
            Bienvenue sur AthletIQ !
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              ...theme.button.primary,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.button 
            }}>
              Commencer
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ 
          flex: 1, 
          padding: theme.spacing.lg 
        }}>
          {/* Section 1: Repas du jour */}
          <View style={{
            ...theme.card,
            marginBottom: theme.spacing.lg
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.sm 
            }}>
              Repas du jour
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.body, 
              marginBottom: theme.spacing.sm 
            }}>
              Gère tes repas de la journée (petit-déjeuner, déjeuner, collation, dîner)
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Coche les repas que tu as mangés pour suivre tes calories
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Ajoute des repas manuellement ou importe depuis tes plans
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • La barre de progression montre tes calories consommées
            </Text>
          </View>

          {/* Section 2: Sport */}
          <View style={{
            ...theme.card,
            marginBottom: theme.spacing.lg
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.sm 
            }}>
              Sport
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.body, 
              marginBottom: theme.spacing.sm 
            }}>
              Suis tes séances d'entraînement et tes calories dépensées
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Importe des séances depuis tes plans enregistrés
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Coche les séances terminées pour comptabiliser les calories
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Les calories sont calculées selon ton profil personnel
            </Text>
          </View>

          {/* Section 3: Liste de courses */}
          <View style={{
            ...theme.card,
            marginBottom: theme.spacing.lg
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.sm 
            }}>
              Liste de courses
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.body, 
              marginBottom: theme.spacing.sm 
            }}>
              Organise tes courses avec les ingrédients de tes repas
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Les ingrédients sont automatiquement extraits de tes repas
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Partage ta liste avec d'autres apps
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • Gère tes ingrédients facilement
            </Text>
          </View>

          {/* Section 4: Navigation */}
          <View style={{
            ...theme.card,
            marginBottom: theme.spacing.lg
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.sm 
            }}>
              Navigation
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.body, 
              marginBottom: theme.spacing.sm 
            }}>
              Utilise les onglets en bas pour naviguer
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • <Text style={{ color: theme.colors.primary }}>Dashboard</Text> : Vue d'ensemble de ta journée
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • <Text style={{ color: theme.colors.primary }}>Chat</Text> : Ton coach IA personnel
            </Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>
              • <Text style={{ color: theme.colors.primary }}>Profil</Text> : Tes informations et plans sauvegardés
            </Text>
          </View>

          {/* Section 5: Conseils */}
          <View style={{
            ...theme.card,
            marginBottom: theme.spacing.lg,
            backgroundColor: theme.colors.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.colors.border
          }}>
            <Text style={{ 
              color: "#ffd700", 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.sm 
            }}>
              Conseils pour bien commencer
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              1. Complète ton profil pour des calculs personnalisés
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              2. Utilise le chat IA pour générer des repas et séances
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>
              3. Coche tes repas et séances au fur et à mesure
            </Text>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.caption 
            }}>
              4. Consulte tes plans sauvegardés dans le profil
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
