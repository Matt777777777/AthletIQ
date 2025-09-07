// components/Calendar.tsx
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../lib/profile';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  dailyHistory?: UserProfile['dailyHistory'];
  onDayPress?: (date: string) => void;
}

export default function Calendar({ selectedDate, onDateSelect, dailyHistory, onDayPress }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Générer les jours du mois
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Commencer au dimanche
    
    const days = [];
    const today = new Date();
    const selectedDateObj = new Date(selectedDate);
    
    for (let i = 0; i < 42; i++) { // 6 semaines * 7 jours
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = dateString === selectedDate;
      const hasData = dailyHistory && dailyHistory[dateString];
      
      days.push({
        date,
        dateString,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        hasData
      });
    }
    
    return days;
  }, [currentMonth, selectedDate, dailyHistory]);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDayStatus = (day: typeof monthDays[0]) => {
    if (!day.hasData || !dailyHistory || !dailyHistory[day.dateString]) return 'no-data';
    
    const dayData = dailyHistory[day.dateString];
    if (!dayData) return 'no-data';
    
    const nutritionProgress = (dayData.nutrition.kcal / 2000) * 100; // Objectif par défaut
    const stepsProgress = dayData.steps.target > 0 ? (dayData.steps.count / dayData.steps.target) * 100 : 0;
    const workoutProgress = dayData.workouts.total > 0 ? (dayData.workouts.completed / dayData.workouts.total) * 100 : 0;
    
    const avgProgress = (nutritionProgress + stepsProgress + workoutProgress) / 3;
    
    if (avgProgress >= 80) return 'excellent';
    if (avgProgress >= 60) return 'good';
    if (avgProgress >= 40) return 'average';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'average': return '#eab308';
      case 'poor': return '#ef4444';
      default: return '#333';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header du calendrier */}
      <View style={styles.header}>
        <Pressable onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        
        <Text style={styles.monthTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        
        <Pressable onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {/* Noms des jours */}
      <View style={styles.dayNamesRow}>
        {dayNames.map(dayName => (
          <Text key={dayName} style={styles.dayName}>
            {dayName}
          </Text>
        ))}
      </View>

      {/* Grille du calendrier */}
      <View style={styles.calendarGrid}>
        {monthDays.map((day, index) => {
          const status = getDayStatus(day);
          const statusColor = getStatusColor(status);
          
          return (
            <Pressable
              key={index}
              onPress={() => {
                onDateSelect(day.dateString);
                onDayPress?.(day.dateString);
              }}
              style={[
                styles.dayCell,
                !day.isCurrentMonth && styles.otherMonthDay,
                day.isToday && styles.todayDay,
                day.isSelected && styles.selectedDay,
                day.hasData && styles.hasDataDay,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && styles.otherMonthText,
                  day.isToday && styles.todayText,
                  day.isSelected && styles.selectedText,
                ]}
              >
                {day.day}
              </Text>
              
              {/* Indicateur de statut */}
              {day.hasData && (
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: statusColor }
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende :</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Excellent (80%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#84cc16' }]} />
            <Text style={styles.legendText}>Bien (60-79%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>Moyen (40-59%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Faible (&lt;40%)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d1d1d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  todayDay: {
    backgroundColor: '#0070F3',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#0070F3',
    borderRadius: 8,
  },
  hasDataDay: {
    // Style pour les jours avec des données
  },
  dayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  otherMonthText: {
    color: '#666',
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  legendTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#ccc',
    fontSize: 12,
  },
});
