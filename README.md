# 🏃‍♂️ TheSport - Coach IA Personnel

Application mobile de coaching sportif et nutritionnel alimentée par l'intelligence artificielle.

## ✨ Fonctionnalités Principales

### 🤖 Coach IA Personnel
- **Conversation naturelle** avec un coach sportif et nutritionnel
- **Réponses personnalisées** basées sur votre profil
- **Conseils adaptés** à vos objectifs et contraintes
- **Génération de plans** d'entraînement et de repas

### 🛒 Liste de Courses

#### Fonctionnalités
- **Extraction automatique** des ingrédients depuis les réponses IA
- **Interface dédiée** avec organisation par catégories
- **Gestion complète** : ajout, suppression, validation
- **Export et partage** de la liste
- **Ajout manuel** d'ingrédients avec suggestions
- **Statistiques** en temps réel

#### 🆕 Système d'Extraction JSON (Nouveau !)
- **Format structuré** : L'IA utilise des balises `<INGREDIENTS>` avec JSON
- **100% de précision** dans l'identification des ingrédients
- **Catégorisation automatique** par l'IA (Fruits, Légumes, Protéines, etc.)
- **Quantités et unités** parfaitement identifiées
- **Fallback automatique** vers l'ancien système si nécessaire

##### Exemple de Format IA
```
<INGREDIENTS>
{
  "ingredients": [
    {"name": "poulet", "quantity": "200", "unit": "g", "category": "Protéines"},
    {"name": "quinoa", "quantity": "100", "unit": "g", "category": "Céréales"}
  ]
}
</INGREDIENTS>
```

### 📱 Interface Utilisateur
- **Design moderne** et intuitif
- **Navigation fluide** entre les écrans
- **Thème sombre** élégant
- **Responsive** sur tous les appareils

### 💾 Gestion des Données
- **Stockage local** avec AsyncStorage
- **Profils utilisateur** personnalisables
- **Plans sauvegardés** consultables
- **Historique** des conversations

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn
- Expo CLI
- Expo Go (application mobile)

### Installation
```bash
# Cloner le projet
git clone [URL_DU_REPO]
cd the-sport-backend

# Installer les dépendances
npm install

# Démarrer l'application
npm start
```

### Utilisation
1. **Scannez le QR code** avec Expo Go
2. **Configurez votre profil** lors de la première utilisation
3. **Commencez à discuter** avec votre coach IA
4. **Générez des plans** d'entraînement et de repas
5. **Gérez votre liste** de courses automatiquement

## 🏗️ Architecture Technique

### Frontend
- **React Native** avec Expo
- **Expo Router** pour la navigation
- **AsyncStorage** pour la persistance
- **TypeScript** pour la robustesse

### Backend
- **Vercel Serverless Functions**
- **OpenAI GPT-4o-mini** pour l'IA
- **API REST** pour la communication

### Structure des Fichiers
```
TheSport/
├── app/                    # Écrans de l'application
│   ├── _layout.tsx        # Layout principal
│   ├── index.tsx          # Écran d'accueil
│   ├── dashboard.tsx      # Tableau de bord
│   ├── chat.tsx           # Interface de chat
│   ├── shopping.tsx       # Liste de courses
│   └── ...
├── lib/                    # Logique métier
│   ├── shopping.ts        # Gestion des courses
│   ├── plans.ts           # Gestion des plans
│   └── profile.ts         # Gestion des profils
└── api/                    # Endpoints backend
    └── chat.ts            # API de chat IA
```

## 🎯 Roadmap

### ✅ Implémenté
- [x] Coach IA personnel
- [x] Liste de courses avec extraction automatique
- [x] Système JSON structuré pour l'IA
- [x] Interface utilisateur complète
- [x] Gestion des profils et plans

### 🚧 En Cours
- [ ] Streaming des réponses IA (style ChatGPT)
- [ ] "Synthèse du jour" (programme auto)

### 📋 Prévu
- [ ] Notifications push
- [ ] Synchronisation cloud
- [ ] Mode hors ligne
- [ ] Widgets iOS/Android

## 🔧 Configuration

### Variables d'Environnement
```bash
# Backend Vercel
OPENAI_API_KEY=your_openai_api_key_here
```

### Personnalisation
- **Thème** : Modifiez les couleurs dans `app/_layout.tsx`
- **Catégories** : Ajustez les catégories dans `lib/shopping.ts`
- **Prompt IA** : Personnalisez le prompt dans `app/chat.tsx`

## 📚 Documentation

- **Guide des ingrédients JSON** : `GUIDE-INGREDIENTS-JSON.md`
- **Exemples de prompts** : `exemple-prompt-ia.md`
- **Guide de démarrage rapide** : `README-quickstart.md`

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**TheSport** - Votre coach personnel intelligent pour un mode de vie sain et équilibré ! 🎯
