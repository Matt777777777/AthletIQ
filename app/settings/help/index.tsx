import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "../../../theme";

export default function HelpSettings() {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqData = [
    {
      question: "Comment fonctionne AthletIQ ?",
      answer: "AthletIQ utilise l'intelligence artificielle pour créer des programmes sportifs et nutritionnels personnalisés en fonction de vos objectifs (prise de muscle, perte de poids, endurance…), de vos habitudes et de vos préférences."
    },
    {
      question: "Mes données personnelles sont-elles sécurisées ?",
      answer: "Oui. Vos données sont stockées de manière sécurisée sur Supabase et sont uniquement utilisées pour personnaliser votre expérience dans l'application. Elles ne sont jamais revendues ni partagées avec des tiers. Vous pouvez exporter ou supprimer vos données à tout moment dans la section \"Données & Confidentialité\"."
    },
    {
      question: "AthletIQ remplace-t-il un médecin ou un coach ?",
      answer: "Non. AthletIQ est un outil d'accompagnement et de motivation. Il ne remplace pas un avis médical ou les conseils d'un professionnel de santé. Avant de commencer un nouveau programme sportif ou nutritionnel, nous vous recommandons de consulter un médecin."
    },
    {
      question: "L'application est-elle gratuite ?",
      answer: "L'accès de base à AthletIQ est gratuit. Certaines fonctionnalités avancées ou premium pourront être proposées via un abonnement, mais vous serez toujours informé avant toute activation."
    },
    {
      question: "Comment réinitialiser mon mot de passe ?",
      answer: "Vous pouvez réinitialiser votre mot de passe depuis la section \"Connexions et sécurité\" dans le Menu. Suivez les instructions pour recevoir un email de réinitialisation sécurisé."
    }
  ];

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleContactSupport = async () => {
    try {
      const email = 'support@athletiq.com';
      const subject = 'Support AthletIQ';
      const body = 'Bonjour,\n\nJ\'ai besoin d\'aide concernant :\n\n';
      
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Erreur',
          'Impossible d\'ouvrir l\'application email. Veuillez contacter support@athletiq.com directement.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'email:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir l\'application email. Veuillez contacter support@athletiq.com directement.',
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
          Aide
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {/* Section FAQ */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg
        }}>
          <Text style={{
            color: theme.colors.primary,
            ...theme.typography.h4,
            marginBottom: theme.spacing.lg
          }}>
            Questions fréquentes
          </Text>

          {faqData.map((item, index) => {
            const isExpanded = expandedItems.includes(index);
            
            return (
              <View key={index} style={{
                marginBottom: theme.spacing.md,
                borderBottomWidth: index < faqData.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
                paddingBottom: index < faqData.length - 1 ? theme.spacing.md : 0
              }}>
                <Pressable
                  onPress={() => toggleExpanded(index)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: theme.spacing.sm
                  }}
                >
                  <Text style={{
                    color: theme.colors.text,
                    ...theme.typography.body,
                    fontWeight: "600",
                    flex: 1,
                    marginRight: theme.spacing.sm
                  }}>
                    {item.question}
                  </Text>
                  <Text style={{
                    color: theme.colors.primary,
                    fontSize: 18,
                    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                  }}>
                    ▼
                  </Text>
                </Pressable>

                {isExpanded && (
                  <View style={{
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.sm
                  }}>
                    <Text style={{
                      color: theme.colors.textSecondary,
                      ...theme.typography.body,
                      lineHeight: 24
                    }}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Section Contact Support */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg,
          marginTop: theme.spacing.md
        }}>
          <Text style={{
            color: theme.colors.primary,
            ...theme.typography.h4,
            marginBottom: theme.spacing.md
          }}>
            Contact support
          </Text>
          
          <Text style={{
            color: theme.colors.textSecondary,
            ...theme.typography.body,
            lineHeight: 24,
            marginBottom: theme.spacing.lg
          }}>
            Si vous ne trouvez pas la réponse à votre question dans la FAQ, notre équipe support est là pour vous aider.
          </Text>

          <View style={{
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.sm,
            marginBottom: theme.spacing.md
          }}>
            <Text style={{
              color: theme.colors.text,
              ...theme.typography.body,
              fontWeight: "600",
              marginBottom: theme.spacing.xs
            }}>
              Email de support
            </Text>
            <Text style={{
              color: theme.colors.primary,
              ...theme.typography.body,
              fontFamily: "monospace"
            }}>
              support@athletiq.com
            </Text>
          </View>

          <Pressable
            onPress={handleContactSupport}
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: theme.borderRadius.sm,
              alignItems: "center"
            }}
          >
            <Text style={{
              color: theme.colors.background,
              ...theme.typography.button,
              fontWeight: "600"
            }}>
              Écrire au support
            </Text>
          </Pressable>

          <Text style={{
            color: theme.colors.textTertiary,
            ...theme.typography.caption,
            textAlign: "center",
            marginTop: theme.spacing.sm,
            fontStyle: "italic"
          }}>
            Nous répondons généralement dans les 24h
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
