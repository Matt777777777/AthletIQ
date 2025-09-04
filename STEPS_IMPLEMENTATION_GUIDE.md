# Guide d'implémentation des données de pas

## 📱 État actuel

✅ **Fonctionnalité de base implémentée :**
- Interface utilisateur pour afficher les pas du jour
- Barre de progression avec objectif de 10 000 pas
- Boutons "Actualiser" et "Réinitialiser"
- Stockage local des données
- Simulation de données (nombre aléatoire entre 2000-8000 pas)

## 🔧 Options pour récupérer les vraies données de pas

### Option 1 : Expo Sensors (Recommandée pour commencer)

```bash
npx expo install expo-sensors
```

**Avantages :**
- Simple à implémenter
- Compatible avec Expo
- Pas de configuration native complexe

**Limitations :**
- Données limitées
- Pas d'accès à l'historique complet

**Implémentation :**
```typescript
import { Pedometer } from 'expo-sensors';

// Dans lib/steps.ts, remplacer getStepsFromSensor() par :
export async function getStepsFromSensor(): Promise<number> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      console.log('Compteur de pas non disponible');
      return 0;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const result = await Pedometer.getStepCountAsync(startOfDay, today);
    return result.steps;
  } catch (error) {
    console.error('Erreur lors de la récupération des pas:', error);
    return 0;
  }
}
```

### Option 2 : React Native Step Counter (Plus complète)

```bash
npm install react-native-step-counter
npx expo install expo-dev-client
```

**Avantages :**
- Données plus précises
- Accès à l'historique
- Meilleure intégration avec les capteurs

**Inconvénients :**
- Nécessite un build de développement
- Configuration plus complexe

### Option 3 : HealthKit (iOS) + Google Fit (Android)

**Pour iOS :**
```bash
npm install react-native-health
```

**Pour Android :**
```bash
npm install react-native-google-fit
```

**Avantages :**
- Accès complet aux données de santé
- Intégration avec les apps de santé natives
- Données historiques complètes

**Inconvénients :**
- Configuration complexe
- Nécessite des permissions spéciales
- Build natif requis

## 🚀 Prochaines étapes recommandées

1. **Phase 1 (Immédiate) :** Tester l'interface actuelle avec les données simulées
2. **Phase 2 (Court terme) :** Implémenter `expo-sensors` pour les vraies données
3. **Phase 3 (Long terme) :** Migrer vers une solution plus complète si nécessaire

## 📋 Permissions nécessaires

### iOS (Info.plist)
```xml
<key>NSMotionUsageDescription</key>
<string>Cette app utilise les données de mouvement pour compter vos pas quotidiens.</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
```

## 🧪 Test de la fonctionnalité actuelle

1. Lancer l'app : `npx expo start`
2. Aller sur l'onglet Dashboard
3. Voir la section "👟 PAS DU JOUR"
4. Cliquer sur "🔄 Actualiser" → Voir un nouveau nombre de pas aléatoire
5. Cliquer sur "Réinitialiser" → Voir revenir à 0

## 📊 Objectifs futurs

- [ ] Implémenter `expo-sensors` pour les vraies données
- [ ] Ajouter un graphique d'évolution des pas
- [ ] Intégrer avec les objectifs personnalisés
- [ ] Ajouter des notifications de rappel
- [ ] Synchroniser avec les apps de santé natives


