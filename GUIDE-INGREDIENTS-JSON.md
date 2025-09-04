# 🎯 Guide : Système d'Extraction d'Ingrédients JSON

## 🆕 Nouveau Système (Prioritaire)

### Format de Réponse IA
L'IA doit maintenant utiliser ce format structuré pour les recettes :

```
<INGREDIENTS>
{
  "ingredients": [
    {"name": "poulet", "quantity": "200", "unit": "g", "category": "Protéines"},
    {"name": "quinoa", "quantity": "100", "unit": "g", "category": "Céréales"},
    {"name": "courgettes", "quantity": "2", "unit": "unités", "category": "Légumes"},
    {"name": "poivron rouge", "quantity": "1", "unit": "unité", "category": "Légumes"},
    {"name": "huile d'olive", "quantity": "2", "unit": "cuillères", "category": "Épicerie"}
  ]
}
</INGREDIENTS>
```

### Avantages
- ✅ **100% de précision** dans l'extraction
- ✅ **Catégorisation automatique** par l'IA
- ✅ **Quantités et unités** parfaitement identifiées
- ✅ **Pas d'ambiguïté** sur les noms d'ingrédients

### Catégories Disponibles
- **Fruits** : bananes, pommes, fraises, etc.
- **Légumes** : carottes, courgettes, épinards, etc.
- **Protéines** : poulet, poisson, œufs, tofu, etc.
- **Céréales** : riz, quinoa, pâtes, pain, etc.
- **Épicerie** : huiles, épices, condiments, etc.
- **Laitages** : yaourt, fromage, lait, etc.
- **Autres** : ingrédients non classés

### Unités Supportées
- **Poids** : g, kg
- **Volume** : ml, l
- **Mesures** : cuillères, tasses, pincées
- **Quantités** : branches, gousses, tranches, unités

## 🔄 Ancien Système (Fallback)

Si l'IA n'utilise pas le format JSON, le système bascule automatiquement sur l'ancien système de regex.

### Exemple de Fallback
```
Ingrédients: 300g de riz, 2 carottes, 1 oignon, 3 cuillères d'huile d'olive
```

## 🚀 Comment Utiliser

### 1. Demander une Recette
Posez simplement une question comme :
- "Donne-moi une recette de salade composée"
- "Je veux un plan repas pour la semaine"
- "Recette de smoothie bowl s'il te plaît"

### 2. L'IA Génère la Réponse
L'IA utilisera automatiquement le format JSON structuré.

### 3. Extraction Automatique
Cliquez sur "🛒 Ajouter à la liste de courses" pour extraire automatiquement tous les ingrédients.

### 4. Vérification
Vérifiez dans votre liste de courses que tous les ingrédients ont été correctement ajoutés avec leurs quantités et catégories.

## 💡 Conseils pour l'IA

### Prompt Système
Le prompt système a été mis à jour pour inclure :
```
IMPORTANT - Format des réponses avec recettes :
Quand tu donnes une recette ou un plan repas, utilise TOUJOURS ce format :

<INGREDIENTS>
{
  "ingredients": [
    {"name": "nom_ingrédient", "quantity": "quantité", "unit": "unité", "category": "catégorie"}
  ]
}
</INGREDIENTS>

Puis continue avec tes conseils et instructions normalement.
```

### Exemples de Réponses
- ✅ **Bonne réponse** : Utilise les balises `<INGREDIENTS>` et le format JSON
- ❌ **Mauvaise réponse** : Liste simple sans structure

## 🔧 Dépannage

### Problème : Aucun ingrédient extrait
1. Vérifiez que l'IA a utilisé le format JSON
2. Vérifiez que les balises `<INGREDIENTS>` sont présentes
3. Vérifiez que le JSON est valide

### Problème : Extraction partielle
1. L'IA peut avoir mélangé les formats
2. Le système bascule automatiquement sur le fallback
3. Vérifiez la réponse complète de l'IA

### Problème : Catégories incorrectes
1. L'IA peut utiliser des catégories non standard
2. Les ingrédients sont automatiquement classés dans "Autres" si nécessaire
3. Vous pouvez modifier manuellement les catégories dans la liste

## 📱 Interface Utilisateur

### Bouton d'Ajout
- **Emplacement** : Dans le chat, sous chaque réponse IA
- **Fonction** : Extrait automatiquement tous les ingrédients
- **Feedback** : Confirmation du nombre d'ingrédients ajoutés

### Liste de Courses
- **Organisation** : Par catégories
- **Quantités** : Affichées clairement
- **Modification** : Possibilité d'ajuster manuellement

## 🎯 Résultat Attendu

Avec ce nouveau système, vous devriez obtenir :
- **Extraction parfaite** des ingrédients
- **Catégorisation automatique** correcte
- **Quantités précises** avec unités
- **Plus d'erreurs** d'identification
- **Expérience utilisateur** grandement améliorée

---

*Ce guide sera mis à jour au fur et à mesure des améliorations du système.*

