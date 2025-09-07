// components/DayDetailModal.tsx
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../lib/profile';

interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  dayData: UserProfile['dailyHistory'][string] | null;
  date: string;
}

export default function DayDetailModal({ visible, onClose, dayData, date }: DayDetailModalProps) {
  if (!dayData) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {new Date(date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible pour cette journée</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

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
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#84cc16';
    if (percentage >= 40) return '#eab308';
    return '#ef4444';
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
              <Text style={styles.sectionTitle}>🍎 Nutrition</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Calories</Text>
                  <Text style={styles.progressValue}>
                    {dayData.nutrition.kcal} / 2000 kcal
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dayData.nutrition.kcal, 2000)}%`,
                        backgroundColor: getProgressColor(getProgressPercentage(dayData.nutrition.kcal, 2000))
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.macrosContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Glucides</Text>
                  <Text style={styles.macroValue}>{dayData.nutrition.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Protéines</Text>
                  <Text style={styles.macroValue}>{dayData.nutrition.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Graisses</Text>
                  <Text style={styles.macroValue}>{dayData.nutrition.fat}g</Text>
                </View>
              </View>
            </View>

            {/* Section Pas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👟 Pas</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Pas effectués</Text>
                  <Text style={styles.progressValue}>
                    {dayData.steps.count.toLocaleString()} / {dayData.steps.target.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgressPercentage(dayData.steps.count, dayData.steps.target)}%`,
                        backgroundColor: getProgressColor(getProgressPercentage(dayData.steps.count, dayData.steps.target))
                      }
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Section Sport */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💪 Sport</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Séances terminées</Text>
                  <Text style={styles.progressValue}>
                    {dayData.workouts.completed} / {dayData.workouts.total}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${dayData.workouts.total > 0 ? (dayData.workouts.completed / dayData.workouts.total) * 100 : 0}%`,
                        backgroundColor: getProgressColor(dayData.workouts.total > 0 ? (dayData.workouts.completed / dayData.workouts.total) * 100 : 0)
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.workoutStats}>
                <Text style={styles.workoutStatText}>
                  Calories brûlées : {dayData.workouts.caloriesBurned} kcal
                </Text>
                <Text style={styles.workoutStatText}>
                  Objectif : {dayData.workouts.target} kcal
                </Text>
              </View>
            </View>

            {/* Section Repas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🍽️ Repas</Text>
              
              <View style={styles.mealsContainer}>
                {dayData.meals.breakfast && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Petit-déjeuner</Text>
                    <Text style={[
                      styles.mealTitle,
                      dayData.meals.breakfast.eaten && styles.mealEaten
                    ]}>
                      {dayData.meals.breakfast.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {dayData.meals.breakfast.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {dayData.meals.lunch && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Déjeuner</Text>
                    <Text style={[
                      styles.mealTitle,
                      dayData.meals.lunch.eaten && styles.mealEaten
                    ]}>
                      {dayData.meals.lunch.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {dayData.meals.lunch.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {dayData.meals.snack && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Collation</Text>
                    <Text style={[
                      styles.mealTitle,
                      dayData.meals.snack.eaten && styles.mealEaten
                    ]}>
                      {dayData.meals.snack.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {dayData.meals.snack.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
                  </View>
                )}

                {dayData.meals.dinner && (
                  <View style={styles.mealItem}>
                    <Text style={styles.mealType}>Dîner</Text>
                    <Text style={[
                      styles.mealTitle,
                      dayData.meals.dinner.eaten && styles.mealEaten
                    ]}>
                      {dayData.meals.dinner.title}
                    </Text>
                    <Text style={styles.mealStatus}>
                      {dayData.meals.dinner.eaten ? '✅ Mangé' : '❌ Non mangé'}
                    </Text>
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
