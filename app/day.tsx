// app/day.tsx
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { DayPlan, deleteDayPlan, generateDayPlan, loadDayPlans, saveDayPlanToSections } from '../lib/dayplan';
import { loadProfile, UserProfile } from '../lib/profile';

export default function DayPlanScreen() {
  const [loading, setLoading] = useState(false);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plans, userProfile] = await Promise.all([
        loadDayPlans(),
        loadProfile()
      ]);
      setDayPlans(plans);
      setProfile(userProfile);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 🚀 Générer un nouveau plan de journée
  const handleGenerateDayPlan = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const newDayPlan = await generateDayPlan();
      setDayPlans(prev => [newDayPlan, ...prev]);
      
      Alert.alert(
        "Plan généré !",
        "Votre journée complète a été créée avec succès !",
        [
          {
            text: "Sauvegarder dans mes sections",
            onPress: () => saveToSections(newDayPlan)
          },
          {
            text: "Voir le plan",
            style: "default"
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        `Impossible de générer le plan: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 💾 Sauvegarder dans les sections existantes
  const saveToSections = async (dayPlan: DayPlan) => {
    try {
      await saveDayPlanToSections(dayPlan);
      Alert.alert(
        "Sauvegardé !",
        "Votre plan a été ajouté à vos séances, repas et liste de courses !"
      );
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        `Impossible de sauvegarder: ${error.message}`
      );
    }
  };

  // 🗑️ Supprimer un plan
  const handleDeletePlan = (planId: string) => {
    Alert.alert(
      "Supprimer le plan",
      "Êtes-vous sûr de vouloir supprimer ce plan de journée ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDayPlan(planId);
              setDayPlans(prev => prev.filter(plan => plan.id !== planId));
            } catch (error: any) {
              Alert.alert("Erreur", `Impossible de supprimer: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // 📱 Rendu d'un plan de journée
  const renderDayPlan = ({ item }: { item: DayPlan }) => (
    <View style={{
      backgroundColor: '#1b1b1b',
      margin: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2a2a2a'
    }}>
      {/* En-tête du plan */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            {item.title}
          </Text>
          <Text style={{ color: '#aaa', fontSize: 12 }}>
            {item.date} • {item.shoppingList.length} ingrédients
          </Text>
        </View>
        <Pressable
          onPress={() => handleDeletePlan(item.id)}
          style={{
            backgroundColor: '#ff4444',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            Supprimer
          </Text>
        </Pressable>
      </View>

      {/* Contenu du plan */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Séance */}
          <View style={{ width: 200, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#0070F3', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
              {item.workout.title}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12, lineHeight: 16 }} numberOfLines={4}>
              {item.workout.content}
            </Text>
          </View>

          {/* Petit-déjeuner */}
          <View style={{ width: 200, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#FFA500', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
              {item.meals.breakfast.title}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12, lineHeight: 16 }} numberOfLines={4}>
              {item.meals.breakfast.content}
            </Text>
          </View>

          {/* Déjeuner */}
          <View style={{ width: 200, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#FF6B6B', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
              {item.meals.lunch.title}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12, lineHeight: 16 }} numberOfLines={4}>
              {item.meals.lunch.content}
            </Text>
          </View>

          {/* Dîner */}
          <View style={{ width: 200, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#4ECDC4', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
              {item.meals.dinner.title}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12, lineHeight: 16 }} numberOfLines={4}>
              {item.meals.dinner.content}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => saveToSections(item)}
          style={{
            flex: 1,
            backgroundColor: '#0070F3',
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            💾 Sauvegarder dans mes sections
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 60 }}>
      {/* En-tête */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 }}>
          📅 Ma journée
        </Text>
        {profile && (
          <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>
            Profil: {profile.goal} • {profile.sessions} séances/sem • {profile.diet}
          </Text>
        )}
        
        {/* Bouton génération */}
        <Pressable
          onPress={handleGenerateDayPlan}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#333' : '#0070F3',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                Génération en cours...
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                🚀 Générer ma journée
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Liste des plans */}
      {dayPlans.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: '#666', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            📅 Aucun plan de journée
          </Text>
          <Text style={{ color: '#555', fontSize: 14, textAlign: 'center' }}>
            Appuyez sur "Générer ma journée" pour créer votre premier plan complet !
          </Text>
        </View>
      ) : (
        <FlatList
          data={dayPlans}
          keyExtractor={(item) => item.id}
          renderItem={renderDayPlan}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0070F3"
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}
