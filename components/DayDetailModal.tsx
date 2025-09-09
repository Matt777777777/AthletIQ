// components/DayDetailModal.tsx
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../lib/profile';

interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  dayData: NonNullable<UserProfile['dailyHistory']>[string] | null;
  date: string;
}

export default function DayDetailModal({ visible, onClose, dayData, date }: DayDetailModalProps) {
  console.log('🔍 DayDetailModal - visible:', visible, 'date:', date, 'dayData:', dayData);
  console.log('🔍 DayDetailModal - visible type:', typeof visible);
  console.log('🔍 DayDetailModal - dayData type:', typeof dayData);
  
  // Données par défaut si pas de données
  const defaultData = {
    nutrition: { kcal: 0, carbs: 0, protein: 0, fat: 0 },
    steps: { count: 0, target: 10000 },
    workouts: { completed: 0, total: 0, caloriesBurned: 0, target: 500 },
    meals: {
      breakfast: undefined,
      lunch: undefined,
      snack: undefined,
      dinner: undefined
    }
  };
  
  const displayData = dayData || defaultData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#0070F3';
    if (percentage >= 60) return '#3B82F6';
    if (percentage >= 40) return '#60A5FA';
    return '#93C5FD';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{formatDate(date)}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Section Nutrition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nutrition</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Calories</Text>
                  <Text style={styles.progressValue}>
                    {displayData.nutrition.kcal} / 2000 kcal
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(displayData.nutrition.kcal, 2000)}%`,
                        backgroundColor: getProgressColor(getProgressPercentage(displayData.nutrition.kcal, 2000))
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.macrosContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Glucides</Text>
                  <Text style={styles.macroValue}>{displayData.nutrition.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Protéines</Text>
                  <Text style={styles.macroValue}>{displayData.nutrition.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Graisses</Text>
                  <Text style={styles.macroValue}>{displayData.nutrition.fat}g</Text>
                </View>
              </View>
            </View>

            {/* Section Pas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pas</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Pas effectués</Text>
                  <Text style={styles.progressValue}>
                    {displayData.steps.count.toLocaleString()} / {displayData.steps.target.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(displayData.steps.count, displayData.steps.target)}%`,
                        backgroundColor: getProgressColor(getProgressPercentage(displayData.steps.count, displayData.steps.target))
                      }
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Section Sport */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sport</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Séances terminées</Text>
                  <Text style={styles.progressValue}>
                    {displayData.workouts.completed} / {displayData.workouts.total}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${displayData.workouts.total > 0 ? (displayData.workouts.completed / displayData.workouts.total) * 100 : 0}%`,
                        backgroundColor: getProgressColor(displayData.workouts.total > 0 ? (displayData.workouts.completed / displayData.workouts.total) * 100 : 0)
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.workoutStats}>
                <Text style={styles.workoutStatText}>
                  Calories brûlées : {displayData.workouts.caloriesBurned} kcal
                </Text>
                <Text style={styles.workoutStatText}>
                  Objectif : {displayData.workouts.target} kcal
                </Text>
              </View>
            </View>

            {/* Section Repas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Repas</Text>
              
              <View style={styles.mealsContainer}>
                {displayData.meals.breakfast && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Petit-déjeuner</Text>
                    <Text style={[
                      styles.mealTitle,
                      displayData.meals.breakfast.eaten && styles.mealEaten
                    ]}>
                      {displayData.meals.breakfast.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {displayData.meals.breakfast.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {displayData.meals.lunch && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Déjeuner</Text>
                    <Text style={[
                      styles.mealTitle,
                      displayData.meals.lunch.eaten && styles.mealEaten
                    ]}>
                      {displayData.meals.lunch.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {displayData.meals.lunch.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {displayData.meals.snack && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Collation</Text>
                    <Text style={[
                      styles.mealTitle,
                      displayData.meals.snack.eaten && styles.mealEaten
                    ]}>
                      {displayData.meals.snack.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {displayData.meals.snack.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {displayData.meals.dinner && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Dîner</Text>
                    <Text style={[
                      styles.mealTitle,
                      displayData.meals.dinner.eaten && styles.mealEaten
                    ]}>
                      {displayData.meals.dinner.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {displayData.meals.dinner.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}
                
                {!displayData.meals.breakfast && !displayData.meals.lunch && !displayData.meals.snack && !displayData.meals.dinner && (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Aucun repas enregistré ce jour</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#111',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1d1d1d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    color: '#0070F3',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  macroValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutStats: {
    marginTop: 8,
  },
  workoutStatText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  mealsContainer: {
    gap: 12,
  },
  mealItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  mealType: {
    color: '#0070F3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  mealEaten: {
    textDecorationLine: 'line-through',
    color: '#22c55e',
  },
  mealStatus: {
    color: '#888',
    fontSize: 12,
  },
});



