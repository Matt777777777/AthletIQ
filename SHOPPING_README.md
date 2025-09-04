# 🛒 Liste de Courses - TheSport

## Fonctionnalité Implémentée

La **Liste de courses** est maintenant intégrée dans TheSport ! Elle permet d'extraire automatiquement les ingrédients depuis les réponses de l'IA et de les organiser par rayon.

## ✨ Caractéristiques

### 🔍 **Extraction Automatique (IA)**
- **Détection intelligente** des ingrédients dans les réponses IA
- **Patterns supportés** :
  - "Ingrédients: ..."
  - "Pour X personnes: ..."
  - "Liste des ingrédients: ..."
  - "Vous aurez besoin de: ..."
  - "Recette: ..."
  - "Préparation: ..."
  - "Matériel: ..."

### ✋ **Ajout Manuel Simple**
- **Interface intuitive** pour ajouter des ingrédients manuellement
- **Suggestions rapides** par catégorie
- **Validation en temps réel** des données
- **Catégorisation automatique** lors de la saisie

### 🏷️ **Catégorisation Automatique**
- **Fruits** : pomme, banane, orange, fraise, etc.
- **Légumes** : carotte, poivron, courgette, brocoli, etc.
- **Protéines** : poulet, poisson, oeufs, fromage, etc.
- **Céréales** : riz, quinoa, avoine, pâtes, etc.
- **Épicerie** : huile, sel, poivre, épices, etc.
- **Laitages** : lait, yaourt, beurre, crème, etc.
- **Autres** : ingrédients non reconnus

### 📱 **Interface Utilisateur**
- **Cases à cocher** pour marquer les articles achetés
- **Organisation par rayon** pour faciliter les courses
- **Statistiques** : total, à acheter, acheté
- **Actions rapides** : partage, copie, suppression

## 🚀 Utilisation

### 1. **Ajout Manuel (Recommandé)**
- Allez dans **Dashboard → 🛒 Ma liste de courses**
- Cliquez sur **"➕ Ajouter un ingrédient"**
- Remplissez le formulaire avec nom, quantité, unité
- Choisissez la catégorie ou utilisez les suggestions rapides
- Validez pour ajouter à la liste

### 2. **Depuis le Chat IA**
- Demandez une recette ou un plan repas
- Cliquez sur **"🛒 Ajouter à la liste de courses"**
- Les ingrédients sont automatiquement extraits et ajoutés
- **Note** : L'extraction IA peut parfois être imprécise

### 3. **Depuis l'Écran Nutrition**
- Cliquez sur **"Ajouter à ma liste de courses"** sous chaque repas
- Les ingrédients sont extraits et ajoutés

### 4. **Gestion de la Liste**
- **Cases à cocher** pour marquer les articles achetés
- **Organisation par rayon** pour faciliter les courses
- **Actions rapides** : partage, copie, suppression
- **Nettoyage automatique** des articles cochés

## 🔧 Architecture Technique

### **Fichiers Créés/Modifiés**
- `lib/shopping.ts` - Logique métier et extraction d'ingrédients
- `app/shopping.tsx` - Écran dédié à la liste de courses
- `app/chat.tsx` - Intégration du bouton d'ajout
- `app/nutrition.tsx` - Bouton d'ajout depuis les repas
- `app/dashboard.tsx` - Lien vers la liste de courses

### **Fonctions Clés**
```typescript
// Extraction automatique
extractIngredientsFromAIResponse(text: string): ShoppingItem[]

// Gestion de la liste
addShoppingItem(item): Promise<ShoppingItem>
toggleItem(id: string): Promise<void>
removeItem(id: string): Promise<void>
clearChecked(): Promise<void>
getItemsByCategory(): Promise<Record<string, ShoppingItem[]>>
```

### **Types de Données**
```typescript
type ShoppingItem = {
  id: string;
  name: string;           // Nom de l'ingrédient
  quantity: string;       // Quantité (ex: "200g", "2")
  unit?: string;          // Unité optionnelle
  category: string;       // Rayon (ex: "Fruits", "Légumes")
  checked: boolean;       // Case cochée
  dateAdded: string;      // Date d'ajout
  source?: string;        // Source (ex: "Chat IA")
};
```

## 🎯 Exemples d'Extraction

### **Input IA**
```
"Voici une recette de salade composée. Ingrédients: 200g poulet, 100g quinoa, 2 courgettes, 1 poivron rouge, 2 cuillères d'huile d'olive"
```

### **Output Extraits**
- **Protéines** : poulet (200g)
- **Céréales** : quinoa (100g)  
- **Légumes** : courgettes (2), poivron rouge (1)
- **Épicerie** : huile d'olive (2 cuillères)

## 🔄 Prochaines Étapes

Cette fonctionnalité est la **première étape** de notre roadmap. Prochainement :

1. **Streaming des réponses IA** (style ChatGPT)
2. **"Synthèse du jour"** (programme auto complet)
3. **Amélioration continue** de l'extraction IA
4. **Synchronisation cloud** (optionnel)

## 🎯 Résolution des Problèmes

### **Extraction IA Imprécise ?**
- **Solution immédiate** : Utilisez l'ajout manuel (plus fiable)
- **Avantages** : Contrôle total, rapidité, précision
- **Suggestions rapides** disponibles par catégorie

### **Interface Manuelle**
- **Formulaire simple** : nom, quantité, unité, catégorie
- **Suggestions intelligentes** basées sur la catégorie sélectionnée
- **Validation en temps réel** des données
- **Catégorisation automatique** pour les ingrédients connus

## 🧪 Test

Pour tester la fonctionnalité :

### **Test de l'Ajout Manuel (Recommandé)**
1. **Lancez l'app** : `npm start`
2. **Allez dans Dashboard → 🛒 Ma liste de courses**
3. **Cliquez sur "➕ Ajouter un ingrédient"**
4. **Testez le formulaire** avec différents ingrédients
5. **Utilisez les suggestions rapides** par catégorie

### **Test de l'Extraction IA**
1. **Allez dans le Chat IA**
2. **Demandez une recette** : "Donne-moi une recette de salade composée"
3. **Cliquez sur "🛒 Ajouter à la liste de courses"**
4. **Vérifiez la liste** et corrigez si nécessaire

### **Test des Fonctionnalités**
- ✅ **Cases à cocher** : Marquez des articles comme achetés
- ✅ **Partage** : Testez le bouton "Partager 📤"
- ✅ **Copie** : Testez le bouton "Copier 📋"
- ✅ **Suppression** : Supprimez des articles
- ✅ **Nettoyage** : Videz les articles cochés

---

**🎉 La liste de courses est maintenant opérationnelle !** Elle améliore significativement l'expérience utilisateur en automatisant la gestion des ingrédients.
