import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { deleteProfile, loadProfile } from "../../../lib/profile";
import { getSupabaseClient } from "../../../lib/supabase";
import { theme } from "../../../theme";

export default function PrivacySettings() {
  const router = useRouter();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePrivacyPolicy = () => {
    setShowPrivacyModal(true);
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      // Récupérer les informations utilisateur depuis Supabase
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      
      // Récupérer le profil utilisateur
      const profile = await loadProfile();
      
      // Créer l'objet de données à exporter
      const exportData = {
        exportDate: new Date().toISOString(),
        userInfo: {
          email: user?.email || 'Non disponible',
          userId: user?.id || 'Non disponible',
          createdAt: user?.created_at || 'Non disponible'
        },
        profile: profile || 'Aucun profil trouvé',
        exportInfo: {
          appVersion: '1.0.0',
          exportType: 'Données personnelles complètes',
          description: 'Export de toutes vos données personnelles depuis TheSport'
        }
      };
      
      // Convertir en JSON formaté
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Partager les données
      const result = await Share.share({
        message: `Export de mes données TheSport - ${new Date().toLocaleDateString('fr-FR')}\n\n${jsonData}`,
        title: 'Export données TheSport'
      });
      
      if (result.action === Share.sharedAction) {
        Alert.alert('Succès', 'Vos données ont été exportées avec succès !');
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'export des données:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter vos données. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Deuxième confirmation
            Alert.alert(
              'Confirmation finale',
              'Cette action supprimera définitivement :\n\n• Votre compte utilisateur\n• Toutes vos données personnelles\n• Vos plans d\'entraînement et repas\n• Votre historique de progression\n\nÊtes-vous absolument certain ?',
              [
                {
                  text: 'Annuler',
                  style: 'cancel'
                },
                {
                  text: 'OUI, SUPPRIMER',
                  style: 'destructive',
                  onPress: confirmDeleteAccount
                }
              ]
            );
          }
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      // Supprimer le profil local
      await deleteProfile();
      
      // Supprimer le compte Supabase
      const client = getSupabaseClient();
      const { error } = await client.auth.admin.deleteUser(
        (await client.auth.getUser()).data.user?.id || ''
      );
      
      if (error) {
        // Si l'admin delete ne fonctionne pas, essayer de se déconnecter
        console.log('Admin delete failed, signing out user');
        await client.auth.signOut();
      }
      
      // Afficher le message de succès
      Alert.alert(
        'Compte supprimé',
        'Votre compte et toutes vos données ont été supprimés avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Rediriger vers l'écran de connexion ou fermer l'app
              router.replace('/');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer ou contacter le support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
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
          Données et confidentialité
        </Text>
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
        {/* Section Politique de confidentialité */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md
        }}>
          <Pressable
            onPress={handlePrivacyPolicy}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.xs
              }}>
                Politique de confidentialité
              </Text>
              <Text style={{
                color: theme.colors.textSecondary,
                ...theme.typography.caption
              }}>
                Consultez notre politique de confidentialité
              </Text>
            </View>
            <Text style={{
              color: theme.colors.textSecondary,
              fontSize: 18
            }}>›</Text>
          </Pressable>
        </View>

        {/* Section Exporter mes données */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md
        }}>
          <Pressable
            onPress={handleExportData}
            disabled={isExporting}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: isExporting ? 0.6 : 1
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.xs
              }}>
                Exporter mes données
              </Text>
              <Text style={{
                color: theme.colors.textSecondary,
                ...theme.typography.caption
              }}>
                {isExporting ? 'Export en cours...' : 'Télécharger toutes vos données personnelles'}
              </Text>
            </View>
            <Text style={{
              color: theme.colors.textSecondary,
              fontSize: 18
            }}>›</Text>
          </Pressable>
        </View>

        {/* Section Supprimer mon compte */}
        <View style={{
          ...theme.card,
          padding: theme.spacing.lg,
          borderColor: theme.colors.error,
          borderWidth: 1
        }}>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: isDeleting ? 0.6 : 1
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.colors.error,
                ...theme.typography.body,
                marginBottom: theme.spacing.xs,
                fontWeight: "600"
              }}>
                Supprimer mon compte et mes données
              </Text>
              <Text style={{
                color: theme.colors.textSecondary,
                ...theme.typography.caption
              }}>
                {isDeleting ? 'Suppression en cours...' : 'Supprimer définitivement votre compte'}
              </Text>
            </View>
            <Text style={{
              color: theme.colors.error,
              fontSize: 18
            }}>›</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal Politique de confidentialité */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header du modal */}
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
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.h2,
              flex: 1,
              textAlign: "center"
            }}>
              Politique de confidentialité
            </Text>
            <Pressable
              onPress={() => setShowPrivacyModal(false)}
              style={{
                backgroundColor: theme.colors.surface,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.sm,
                borderWidth: 1,
                borderColor: theme.colors.border
              }}
            >
              <Text style={{ 
                color: theme.colors.textSecondary, 
                ...theme.typography.h4 
              }}>✕</Text>
            </Pressable>
          </View>

          {/* Contenu du modal */}
          <ScrollView style={{ flex: 1, padding: theme.spacing.lg }}>
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
                Données collectées
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                Nous collectons les données suivantes :
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                • <Text style={{ fontWeight: "600" }}>Données de compte :</Text> Votre adresse email pour l'authentification
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                • <Text style={{ fontWeight: "600" }}>Données personnelles :</Text> Objectif sportif, préférences nutritionnelles, informations de profil (âge, poids, taille)
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                lineHeight: 24
              }}>
                • <Text style={{ fontWeight: "600" }}>Historique :</Text> Plans d'entraînement et repas générés, données de progression
              </Text>
            </View>

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
                Finalités d'utilisation
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                lineHeight: 24
              }}>
                Vos données sont utilisées exclusivement pour personnaliser et améliorer le fonctionnement de l'application, notamment pour générer des plans d'entraînement et nutritionnels adaptés à vos objectifs.
              </Text>
            </View>

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
                Hébergement et sécurité
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                Vos données sont stockées de manière sécurisée sur les serveurs de Supabase, conformément aux standards de sécurité européens.
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                lineHeight: 24
              }}>
                Nous nous engageons à ne jamais revendre vos données personnelles à des tiers.
              </Text>
            </View>

            <View style={{
              ...theme.card,
              padding: theme.spacing.lg
            }}>
              <Text style={{
                color: theme.colors.primary,
                ...theme.typography.h4,
                marginBottom: theme.spacing.md
              }}>
                Vos droits
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                Vous avez le droit de :
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                • Accéder à vos données personnelles
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                • Demander la suppression de vos données
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                marginBottom: theme.spacing.sm,
                lineHeight: 24
              }}>
                • Modifier vos informations de profil
              </Text>
              <Text style={{
                color: theme.colors.text,
                ...theme.typography.body,
                lineHeight: 24
              }}>
                Pour exercer ces droits, contactez notre support via l'application.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
