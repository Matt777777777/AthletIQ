# 🔍 Guide de Debug : Problème d'Extraction d'Ingrédients

## 🚨 Problème Identifié
L'IA génère bien le format JSON, mais **seul le premier ingrédient est enregistré** dans la liste de courses.

## 🔍 Diagnostic Étape par Étape

### 1. Testez l'IA
Posez cette question exacte dans le chat :
```
"Donne-moi une recette de salade composée pour 2 personnes"
```

### 2. Vérifiez la Réponse de l'IA
L'IA devrait répondre avec :
- ✅ Balises `<INGREDIENTS>` visibles
- ✅ Format JSON structuré
- ✅ **Plusieurs ingrédients** dans le tableau

### 3. Ouvrez la Console de Debug
- **iOS** : Xcode → Console
- **Android** : Android Studio → Logcat
- **Expo** : Terminal avec `npm start`

### 4. Cliquez sur "🛒 Ajouter à la liste de courses"

### 5. Vérifiez les Logs
Vous devriez voir dans la console :
```
🔍 Texte de l'IA reçu: [texte complet]
🔍 Contient <INGREDIENTS>: true
🔍 Ingrédients extraits: [tableau d'ingrédients]
🔍 Nombre d'ingrédients: X
🔍 Ajout de l'ingrédient: [détails de chaque ingrédient]
```

## 🚨 Scénarios de Problème

### Scénario A : L'IA ne génère pas le bon format
**Symptômes :**
- Pas de balises `<INGREDIENTS>`
- Format texte libre au lieu de JSON
- Logs montrent `Contient <INGREDIENTS>: false`

**Solutions :**
1. Relancez la conversation
2. Reformulez la question
3. Vérifiez le prompt système

### Scénario B : Extraction partielle
**Symptômes :**
- Balises `<INGREDIENTS>` présentes
- JSON valide
- Mais moins d'ingrédients extraits que prévu

**Solutions :**
1. Vérifiez la structure du JSON
2. Regardez les erreurs de parsing
3. Vérifiez les logs d'extraction

### Scénario C : Problème d'ajout à la liste
**Symptômes :**
- Extraction correcte
- Mais ingrédients non ajoutés à la liste

**Solutions :**
1. Vérifiez les erreurs d'ajout
2. Regardez les logs de `addShoppingItem`
3. Vérifiez la fonction `addShoppingItem`

## 🧪 Test de Validation

### Test 1 : Format JSON Parfait
```
<INGREDIENTS>
{
  "ingredients": [
    {"name": "poulet", "quantity": "200", "unit": "g", "category": "Protéines"},
    {"name": "quinoa", "quantity": "100", "unit": "g", "category": "Céréales"},
    {"name": "courgettes", "quantity": "2", "unit": "unités", "category": "Légumes"}
  ]
}
</INGREDIENTS>
```

**Résultat attendu :** 3 ingrédients extraits et ajoutés

### Test 2 : Format JSON avec Erreur
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

**Résultat attendu :** 2 ingrédients extraits et ajoutés

## 🔧 Solutions Possibles

### 1. Problème de Prompt IA
- L'IA peut ignorer le format JSON
- Le prompt système peut être trop long
- L'IA peut mélanger les formats

### 2. Problème de Parsing
- Regex trop strict
- Problème avec les balises
- Erreur de syntaxe JSON

### 3. Problème d'Ajout
- Fonction `addShoppingItem` défaillante
- Problème de base de données
- Erreur de synchronisation

## 📱 Comment Tester

### Étape 1 : Test Simple
1. Demandez une recette simple
2. Vérifiez le format de réponse
3. Testez l'extraction
4. Vérifiez la liste

### Étape 2 : Test Complexe
1. Demandez un plan repas complet
2. Vérifiez plusieurs recettes
3. Testez l'extraction multiple
4. Vérifiez la liste finale

### Étape 3 : Test de Fallback
1. Demandez une recette sans préciser "recette"
2. Vérifiez que l'ancien système fonctionne
3. Testez l'extraction regex
4. Vérifiez la liste

## 🎯 Résultat Attendu

Après correction, vous devriez obtenir :
- ✅ **Extraction complète** de tous les ingrédients
- ✅ **Ajout automatique** dans la liste
- ✅ **Catégorisation correcte** par l'IA
- ✅ **Quantités précises** avec unités
- ✅ **Interface fluide** et responsive

## 🚀 Prochaines Étapes

Une fois le problème résolu :
1. **Validez** le système complet
2. **Testez** avec différentes recettes
3. **Passez** aux fonctionnalités suivantes
4. **Documentez** les bonnes pratiques

---

**Suivez ce guide étape par étape et partagez les logs pour un diagnostic précis !** 🔍

