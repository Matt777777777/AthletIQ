# Test du Design Dashboard - AthletIQ

## Instructions de test visuel

### 1. **Vérification du thème Apple**
- [ ] Le fond est noir profond (`#000000`)
- [ ] Les cartes utilisent un gris sombre (`#111111`) avec des bordures subtiles
- [ ] La couleur principale est le bleu lapis lazuli (`#26619c`)
- [ ] Les textes sont blancs avec des nuances de gris pour la hiérarchie

### 2. **Header et salutation**
- [ ] "Bonjour" en grand, suivi du prénom en gris
- [ ] Bouton calendrier minimaliste avec icône épurée
- [ ] Espacement généreux et alignement propre

### 3. **Section Nutrition (3/4 largeur)**
- [ ] Titre "Nutrition" en majuscules avec espacement des lettres
- [ ] Affichage des calories : nombre principal en bleu, total en gris
- [ ] Barre de progression arrondie et fluide
- [ ] Cercles de macronutriments plus petits et équilibrés
- [ ] Couleurs distinctes : rose (glucides), bleu (protéines), orange (graisses)

### 4. **Section Pas (1/4 largeur)**
- [ ] Cercle de progression plus petit et élégant
- [ ] Pourcentage au centre en grand
- [ ] Nombre de pas en dessous avec séparateur visuel

### 5. **Section Repas**
- [ ] Cases à cocher carrées avec coins arrondis
- [ ] États visuels clairs : vide, coché, désactivé
- [ ] Typographie hiérarchisée (titre en bleu, contenu en blanc/gris)
- [ ] Bouton d'ajout rond et minimaliste

### 6. **Section Sport**
- [ ] Carte des calories dépensées avec fond surélevé
- [ ] Cartes de séances avec bordures colorées selon l'état
- [ ] Boutons d'action circulaires et bien espacés
- [ ] Bouton d'import avec style secondaire

### 7. **Liste de courses**
- [ ] Design cohérent avec le reste de l'interface
- [ ] Bouton principal pour accéder à la fonctionnalité

### 8. **Éléments généraux**
- [ ] Espacement cohérent entre les sections
- [ ] Bordures arrondies uniformes (12-16px)
- [ ] Ombres subtiles sur les éléments interactifs
- [ ] Typographie SF Pro-like (système)

## Couleurs de référence

### Couleurs principales
- **Fond principal** : `#000000` (noir)
- **Surfaces** : `#111111` (gris très sombre)
- **Surfaces surélevées** : `#1a1a1a` (gris sombre)
- **Accent principal** : `#26619c` (bleu lapis lazuli)

### Couleurs de texte
- **Texte principal** : `#ffffff` (blanc)
- **Texte secondaire** : `#b3b3b3` (gris clair)
- **Texte tertiaire** : `#808080` (gris moyen)

### Couleurs des macronutriments
- **Glucides** : `#ff6b9d` (rose)
- **Protéines** : `#4dabf7` (bleu clair)
- **Graisses** : `#ffa94d` (orange)

### Couleurs d'état
- **Succès** : `#00d4aa` (vert)
- **Erreur** : `#ff4444` (rouge)
- **Avertissement** : `#ffa94d` (orange)

## Test de responsivité

### Sur iPhone (375px)
- [ ] Les sections s'adaptent correctement
- [ ] Les cercles de macronutriments restent lisibles
- [ ] Les boutons sont facilement tappables

### Sur iPhone Plus (414px)
- [ ] L'espacement est optimal
- [ ] Les proportions sont équilibrées

### Sur iPad (768px+)
- [ ] L'interface s'adapte aux écrans plus larges
- [ ] Les cartes ne s'étirent pas excessivement

## Test d'interaction

### États des boutons
- [ ] **Normal** : Couleur de fond, bordure visible
- [ ] **Pressé** : Légère opacité ou changement de couleur
- [ ] **Désactivé** : Opacité réduite, pas d'interaction

### États des cases à cocher
- [ ] **Vide** : Fond transparent, bordure grise
- [ ] **Coché** : Fond vert, croix blanche
- [ ] **Désactivé** : Opacité réduite

### Transitions
- [ ] Les changements d'état sont fluides
- [ ] Pas de saccades ou de clignotements

## Performance visuelle

### Lisibilité
- [ ] Contraste suffisant entre texte et fond
- [ ] Taille de police appropriée pour tous les éléments
- [ ] Hiérarchie visuelle claire

### Cohérence
- [ ] Tous les éléments suivent le même système de design
- [ ] Espacement uniforme et prévisible
- [ ] Couleurs utilisées de manière cohérente

## Notes d'amélioration

Si des éléments ne respectent pas le design Apple :
1. Vérifier l'utilisation du thème centralisé
2. Ajuster les espacements selon `theme.spacing`
3. Corriger les couleurs selon `theme.colors`
4. Harmoniser la typographie selon `theme.typography`

## Validation finale

- [ ] L'interface ressemble à une app Apple native
- [ ] L'expérience utilisateur est fluide et intuitive
- [ ] Tous les éléments sont accessibles et fonctionnels
- [ ] Le design est cohérent sur toute l'interface
