import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface DashboardGuideProps {
  visible: boolean;
  onClose: () => void;
}

export default function DashboardGuide({ visible, onClose }: DashboardGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Réinitialiser l'étape quand le guide devient visible
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const steps = [
    {
      title: "Bienvenue sur votre Dashboard !",
      description: "Voici votre tableau de bord personnel pour suivre vos objectifs sportifs et nutritionnels.",
      highlight: { x: 16, y: 100, width: width - 32, height: 60 },
      position: "top"
    },
    {
      title: "Section Nutrition",
      description: "Suivez vos calories consommées et vos macronutriments. Cliquez sur le + pour ajouter des repas.",
      highlight: { x: 16, y: 200, width: (width - 32) * 0.75 - 6, height: 140 },
      position: "bottom"
    },
    {
      title: "Section Sport",
      description: "Planifiez vos séances et suivez vos calories brûlées. Importez des séances depuis vos plans enregistrés.",
      highlight: { x: 16, y: 360, width: width - 32, height: 180 },
      position: "top"
    },
    {
      title: "Liste de Courses",
      description: "Gérez vos ingrédients et créez votre liste de courses automatiquement.",
      highlight: { x: 16, y: 560, width: width - 32, height: 100 },
      position: "top"
    },
    {
      title: "Calendrier",
      description: "Consultez votre historique et vos performances passées. Cliquez sur l'icône calendrier en haut.",
      highlight: { x: width - 56, y: 60, width: 40, height: 40 },
      position: "bottom"
    },
    {
      title: "C'est parti !",
      description: "Vous êtes maintenant prêt à utiliser votre dashboard. Bonne séance !",
      highlight: null,
      position: "center"
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* Zone highlightée avec trou dans l'overlay */}
        {currentStepData.highlight && (
          <>
            {/* Overlay avec trou pour la zone highlightée */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              }}
            />
            
            {/* Zone claire pour la section mise en évidence */}
            <View
              style={{
                position: 'absolute',
                top: currentStepData.highlight.y - 4,
                left: currentStepData.highlight.x - 4,
                width: currentStepData.highlight.width + 8,
                height: currentStepData.highlight.height + 8,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: 16,
              }}
            />
            
            {/* Bordure de mise en évidence */}
            <View
              style={{
                position: 'absolute',
                top: currentStepData.highlight.y - 6,
                left: currentStepData.highlight.x - 6,
                width: currentStepData.highlight.width + 12,
                height: currentStepData.highlight.height + 12,
                backgroundColor: 'transparent',
                borderRadius: 18,
                borderWidth: 4,
                borderColor: '#0070F3',
                shadowColor: '#0070F3',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
                elevation: 15,
              }}
            />
            
            {/* Effet de pulsation */}
            <View
              style={{
                position: 'absolute',
                top: currentStepData.highlight.y - 10,
                left: currentStepData.highlight.x - 10,
                width: currentStepData.highlight.width + 20,
                height: currentStepData.highlight.height + 20,
                backgroundColor: 'transparent',
                borderRadius: 22,
                borderWidth: 2,
                borderColor: 'rgba(0, 112, 243, 0.4)',
                shadowColor: '#0070F3',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 5,
              }}
            />
          </>
        )}

        {/* Contenu du guide positionné intelligemment */}
        <View style={{ 
          flex: 1, 
          justifyContent: currentStepData.position === 'top' ? 'flex-start' : 
                         currentStepData.position === 'bottom' ? 'flex-end' : 'center',
          padding: 20,
          paddingTop: currentStepData.position === 'top' ? 60 : 20,
          paddingBottom: currentStepData.position === 'bottom' ? 60 : 20,
        }}>
          <View
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: '#333',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {/* Titre */}
            <Text
              style={{
                color: '#fff',
                fontSize: 24,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {currentStepData.title}
            </Text>

            {/* Description */}
            <Text
              style={{
                color: '#ccc',
                fontSize: 16,
                lineHeight: 24,
                textAlign: 'center',
                marginBottom: 32,
              }}
            >
              {currentStepData.description}
            </Text>

            {/* Indicateur de progression */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginBottom: 32,
              }}
            >
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentStep ? '#0070F3' : '#333',
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Bouton Précédent */}
              {currentStep > 0 && (
                <Pressable
                  onPress={handlePrevious}
                  style={{
                    flex: 1,
                    backgroundColor: '#333',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    Précédent
                  </Text>
                </Pressable>
              )}

              {/* Bouton Suivant */}
              <Pressable
                onPress={handleNext}
                style={{
                  flex: 1,
                  backgroundColor: '#0070F3',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {currentStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
                </Text>
              </Pressable>
            </View>

            {/* Bouton Passer */}
            <Pressable
              onPress={handleSkip}
              style={{
                marginTop: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#666', fontSize: 14 }}>
                Passer le guide
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
