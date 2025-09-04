# 🧪 Exemple de Prompt pour Tester l'IA

## 📝 Prompt à Tester

Voici des exemples de questions que vous pouvez poser à l'IA pour tester le nouveau système JSON :

### 🥗 Recette Simple
```
"Donne-moi une recette de salade composée pour 2 personnes"
```

**Résultat attendu :**
L'IA devrait répondre avec le format JSON structuré :
```
<INGREDIENTS>
{
  "ingredients": [
    {"name": "laitue", "quantity": "1", "unit": "salade", "category": "Légumes"},
    {"name": "tomates cerises", "quantity": "200", "unit": "g", "category": "Légumes"},
    {"name": "concombre", "quantity": "1", "unit": "unité", "category": "Légumes"},
    {"name": "poulet grillé", "quantity": "150", "unit": "g", "category": "Protéines"},
    {"name": "huile d'olive", "quantity": "2", "unit": "cuillères", "category": "Épicerie"}
  ]
}
</INGREDIENTS>
```

### 🍳 Plan Repas Complet
```
"Je veux un plan repas pour 3 jours avec des recettes équilibrées"
```

**Résultat attendu :**
L'IA devrait donner 3 recettes, chacune avec son format JSON d'ingrédients.

### 🥤 Smoothie
```
"Recette de smoothie protéiné pour après l'entraînement"
```

**Résultat attendu :**
```
<INGREDIENTS>
{
  "ingredients": [
    {"name": "banane", "quantity": "1", "unit": "unité", "category": "Fruits"},
    {"name": "protéine en poudre", "quantity": "30", "unit": "g", "category": "Protéines"},
    {"name": "lait d'amande", "quantity": "250", "unit": "ml", "category": "Laitages"},
    {"name": "beurre de cacahuète", "quantity": "1", "unit": "cuillère", "category": "Épicerie"}
  ]
}
</INGREDIENTS>
```

## 🔍 Comment Vérifier

### 1. Vérifiez le Format
- ✅ Balises `<INGREDIENTS>` présentes
- ✅ JSON valide et lisible
- ✅ Structure `{"ingredients": [...]}`

### 2. Testez l'Extraction
- Cliquez sur "🛒 Ajouter à la liste de courses"
- Vérifiez que tous les ingrédients sont extraits
- Vérifiez les quantités et catégories

### 3. Vérifiez la Liste
- Allez dans votre liste de courses
- Confirmez que tout est correctement organisé

## 🚨 Problèmes Courants

### L'IA n'utilise pas le format JSON
- **Cause** : L'IA peut ignorer le prompt système
- **Solution** : Relancez la conversation ou reformulez la question

### JSON malformé
- **Cause** : Erreur de syntaxe dans la réponse IA
- **Solution** : Le système bascule automatiquement sur le fallback

### Catégories manquantes
- **Cause** : L'IA peut oublier certaines catégories
- **Solution** : Les ingrédients sont classés dans "Autres" par défaut

## 💡 Conseils de Test

### Testez Progressivement
1. **Commencez simple** : Une recette basique
2. **Augmentez la complexité** : Plus d'ingrédients
3. **Testez les limites** : Recettes avec beaucoup d'ingrédients

### Vérifiez la Cohérence
- Les quantités sont-elles logiques ?
- Les unités sont-elles appropriées ?
- Les catégories sont-elles correctes ?

### Testez le Fallback
- Demandez une recette sans préciser "recette"
- L'IA peut utiliser l'ancien format
- Vérifiez que le fallback fonctionne

## 🎯 Objectif

Avec ces tests, vous devriez confirmer que :
- ✅ L'IA utilise le nouveau format JSON
- ✅ L'extraction est 100% précise
- ✅ Le fallback fonctionne en cas de problème
- ✅ L'expérience utilisateur est grandement améliorée

---

*Utilisez ces exemples pour tester et valider le nouveau système !*

