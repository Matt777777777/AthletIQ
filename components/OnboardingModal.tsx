// components/OnboardingModal.tsx
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

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
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#333"
        }}>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", flex: 1 }}>
            Bienvenue sur AthletIQ !
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: "#1a1a1a",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#333"
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              Commencer
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* Section 1: Repas du jour */}
          <View style={{
            backgroundColor: "#111",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{ color: "#0070F3", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              Repas du jour
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              Gère tes repas de la journée (petit-déjeuner, déjeuner, collation, dîner)
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Coche les repas que tu as mangés pour suivre tes calories
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Ajoute des repas manuellement ou importe depuis tes plans
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • La barre de progression montre tes calories consommées
            </Text>
          </View>

          {/* Section 2: Sport */}
          <View style={{
            backgroundColor: "#111",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{ color: "#0070F3", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              Sport
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              Suis tes séances d'entraînement et tes calories dépensées
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Importe des séances depuis tes plans enregistrés
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Coche les séances terminées pour comptabiliser les calories
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Les calories sont calculées selon ton profil personnel
            </Text>
          </View>

          {/* Section 3: Liste de courses */}
          <View style={{
            backgroundColor: "#111",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{ color: "#0070F3", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              Liste de courses
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              Organise tes courses avec les ingrédients de tes repas
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Les ingrédients sont automatiquement extraits de tes repas
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Partage ta liste avec d'autres apps
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • Gère tes ingrédients facilement
            </Text>
          </View>

          {/* Section 4: Navigation */}
          <View style={{
            backgroundColor: "#111",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{ color: "#0070F3", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              Navigation
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              Utilise les onglets en bas pour naviguer
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • <Text style={{ color: "#0070F3" }}>Dashboard</Text> : Vue d'ensemble de ta journée
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • <Text style={{ color: "#0070F3" }}>Chat</Text> : Ton coach IA personnel
            </Text>
            <Text style={{ color: "#aaa", fontSize: 14, lineHeight: 20 }}>
              • <Text style={{ color: "#0070F3" }}>Profil</Text> : Tes informations et plans sauvegardés
            </Text>
          </View>

          {/* Section 5: Conseils */}
          <View style={{
            backgroundColor: "#1a1a1a",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#333"
          }}>
            <Text style={{ color: "#ffd700", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
              Conseils pour bien commencer
            </Text>
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
              1. Complète ton profil pour des calculs personnalisés
            </Text>
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
              2. Utilise le chat IA pour générer des repas et séances
            </Text>
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
              3. Coche tes repas et séances au fur et à mesure
            </Text>
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}>
              4. Consulte tes plans sauvegardés dans le profil
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
