// app/shopping.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    Clipboard,
    Platform,
    Pressable,
    ScrollView,
    Share,
    Text,
    TextInput,
    View
} from "react-native";
import {
    addShoppingItem,
    clearChecked,
    COMMON_INGREDIENTS,
    generateShoppingSummary,
    getItemsByCategory,
    removeItem,
    ShoppingItem,
    toggleItem
} from "../lib/shopping";
import { theme } from "../theme";

export default function Shopping() {
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, ShoppingItem[]>>({});
  const [loading, setLoading] = useState(false);
  
  // États pour l'ajout manuel
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Autres");

  const refresh = useCallback(async () => {
    const grouped = await getItemsByCategory();
    setItemsByCategory(grouped);
  }, []);

  // Recharge quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleToggle = async (id: string) => {
    setLoading(true); // Désactiver les interactions pendant le toggle
    try {
    await toggleItem(id);
      await refresh();
    } catch (error) {
      console.error('Error toggling item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    console.log(`handleRemove called for id: ${id}`);
    
    // Pour la simulation sur ordinateur, on peut bypasser l'Alert
    const isSimulator = __DEV__ && Platform.OS === 'web';
    
    if (isSimulator) {
      // Suppression directe en simulation
      console.log(`Simulator mode: removing item ${id} directly`);
      await removeItem(id);
      refresh();
      return;
    }
    
    Alert.alert("Supprimer", "Supprimer cet ingrédient ?", [
      { text: "Annuler" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          console.log(`User confirmed removal of item ${id}`);
          await removeItem(id);
          refresh();
        },
      },
    ]);
  };

  const handleClearChecked = async () => {
    const checkedCount = Object.values(itemsByCategory)
      .flat()
      .filter(item => item.checked).length;
    
    console.log(`handleClearChecked called, checked items: ${checkedCount}`);
    
    if (checkedCount === 0) {
      console.log(`No checked items to clear`);
      Alert.alert("Aucun article coché", "Cochez d'abord les articles achetés !");
      return;
    }

    // Pour la simulation sur ordinateur, on peut bypasser l'Alert
    const isSimulator = __DEV__ && Platform.OS === 'web';
    
    if (isSimulator) {
      // Suppression directe en simulation
      console.log(`Simulator mode: clearing ${checkedCount} checked items directly`);
      await clearChecked();
      refresh();
      return;
    }

    Alert.alert(
      "Vider la liste",
      `Supprimer ${checkedCount} article(s) coché(s) ?`,
      [
        { text: "Annuler" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            console.log(`User confirmed clearing ${checkedCount} checked items`);
            await clearChecked();
            refresh();
          },
        },
      ]
    );
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert("Erreur", "Veuillez saisir un nom d'ingrédient");
      return;
    }

    try {
      await addShoppingItem({
        name: newItemName.trim(),
        quantity: newItemQuantity.trim() || "1",
        unit: newItemUnit.trim() || undefined,
        category: newItemCategory,
        checked: false,
        source: "Ajout manuel",
      });

      // Reset du formulaire
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemUnit("");
      setNewItemCategory("Autres");
      setShowAddForm(false);
      
      // Refresh de la liste
      refresh();
      
      Alert.alert("Succès", "Ingrédient ajouté à la liste !");
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ajouter l'ingrédient");
    }
  };

  const handleShare = async () => {
    const allItems = Object.values(itemsByCategory).flat();
    if (allItems.length === 0) {
      Alert.alert("Liste vide", "Ajoutez d'abord des ingrédients !");
      return;
    }

    const summary = generateShoppingSummary(allItems);
    const uncheckedItems = allItems.filter(item => !item.checked);
    
    // Créer un texte de partage optimisé pour tous les canaux
    let shareText = "Ma liste de courses AthletIQ\n\n";
    shareText += summary + "\n\nÀ acheter :\n";
    
    // Grouper par catégorie pour l'export
    const grouped = uncheckedItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);

    Object.entries(grouped).forEach(([category, categoryItems]) => {
      shareText += `\n${category}:\n`;
      categoryItems.forEach(item => {
        const quantityText = item.unit ? `${item.quantity} ${item.unit}` : item.quantity;
        shareText += `• ${item.name} (${quantityText})\n`;
      });
    });

    try {
      // Utiliser l'API de partage native qui propose automatiquement toutes les options
      const shareOptions = {
        message: shareText,
        title: "Ma liste de courses AthletIQ",
        // Ajouter des options pour améliorer la compatibilité
        url: undefined, // Pas d'URL pour le partage simple
        // Ces options permettront à l'OS de proposer toutes les apps disponibles
        subject: "Ma liste de courses AthletIQ", // Pour les emails
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        console.log("Liste partagée avec succès via:", result.activityType);
      } else if (result.action === Share.dismissedAction) {
        console.log("Partage annulé par l'utilisateur");
      }
    } catch (error) {
      console.error("Erreur partage:", error);
      Alert.alert("Erreur", "Impossible de partager la liste. Réessayez plus tard.");
    }
  };

  const handleCopyToClipboard = async () => {
    const allItems = Object.values(itemsByCategory).flat();
    if (allItems.length === 0) {
      Alert.alert("Liste vide", "Ajoutez d'abord des ingrédients !");
      return;
    }

    const summary = generateShoppingSummary(allItems);
    const uncheckedItems = allItems.filter(item => !item.checked);
    
    // Créer un texte de copie optimisé pour le presse-papiers
    let clipboardText = "Ma liste de courses AthletIQ\n\n";
    clipboardText += summary + "\n\nÀ acheter :\n";
    
    // Grouper par catégorie pour l'export
    const grouped = uncheckedItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingItem[]>);

    Object.entries(grouped).forEach(([category, categoryItems]) => {
      clipboardText += `\n📂 ${category}:\n`;
      categoryItems.forEach(item => {
        const quantityText = item.unit ? `${item.quantity} ${item.unit}` : item.quantity;
        clipboardText += `• ${item.name} (${quantityText})\n`;
      });
    });

    // Ajouter une ligne de séparation à la fin
    clipboardText += "\n\n---\nGénéré par AthletIQ";

    try {
      // Copier vraiment dans le presse-papiers
      await Clipboard.setString(clipboardText);
      
      // Afficher une confirmation
      Alert.alert(
        "Liste copiée !", 
        "La liste de courses a été copiée dans le presse-papiers. Tu peux maintenant la coller où tu veux !",
        [{ text: "OK", style: "default" }]
      );
      
      console.log("Liste copiée dans le presse-papiers avec succès");
    } catch (error) {
      console.error("Erreur copie:", error);
      Alert.alert("Erreur", "Impossible de copier la liste. Réessayez plus tard.");
    }
  };

  const totalItems = Object.values(itemsByCategory).flat().length;
  const checkedItems = Object.values(itemsByCategory).flat().filter(item => item.checked).length;
  const uncheckedItems = totalItems - checkedItems;

  const categories = ["Fruits", "Légumes", "Protéines", "Céréales", "Épicerie", "Laitages", "Autres"];



    return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header fixe */}
      <View style={{ 
        paddingTop: 60, 
        paddingHorizontal: theme.spacing.md, 
        paddingBottom: theme.spacing.md, 
        backgroundColor: theme.colors.background 
      }}>
        <View style={{ 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: theme.spacing.xs 
        }}>
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.h2 
          }}>
            Liste de courses
        </Text>
        </View>
        
        {/* Stats */}
        <View style={{ 
          flexDirection: "row", 
          gap: theme.spacing.sm, 
          marginBottom: theme.spacing.lg 
        }}>
          <View style={{ 
            ...theme.card, 
            padding: theme.spacing.md, 
            flex: 1 
          }}>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.h3 
            }}>{totalItems}</Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>Total</Text>
          </View>
          <View style={{ 
            ...theme.card, 
            padding: theme.spacing.md, 
            flex: 1 
          }}>
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.h3 
            }}>{uncheckedItems}</Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>À acheter</Text>
          </View>
          <View style={{ 
            ...theme.card, 
            padding: theme.spacing.md, 
            flex: 1 
          }}>
            <Text style={{ 
              color: "#4CAF50", 
              ...theme.typography.h3 
            }}>{checkedItems}</Text>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption 
            }}>Acheté</Text>
          </View>
        </View>

        {/* Bouton ajouter */}
        <Pressable
          onPress={() => setShowAddForm(!showAddForm)}
          style={({ pressed }) => ({
            ...theme.button.primary,
            opacity: pressed ? 0.8 : 1,
            marginBottom: theme.spacing.lg,
          })}
        >
          <Text style={{ 
            color: theme.colors.text, 
            ...theme.typography.button 
          }}>
            {showAddForm ? "Fermer" : "Ajouter un ingrédient"}
          </Text>
        </Pressable>
      </View>

      {/* Contenu scrollable */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingHorizontal: theme.spacing.md, 
          paddingBottom: theme.spacing.xl 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Formulaire d'ajout */}
        {showAddForm && (
          <View style={{ 
            ...theme.card, 
            padding: theme.spacing.md, 
            marginBottom: theme.spacing.lg 
          }}>
            <Text style={{ 
              color: theme.colors.text, 
              ...theme.typography.h4, 
              marginBottom: theme.spacing.md 
            }}>
              Nouvel ingrédient
            </Text>
            
            {/* Nom */}
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>Nom de l'ingrédient *</Text>
            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Ex: Pommes, Poulet, Riz..."
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                ...theme.input,
                marginBottom: theme.spacing.sm,
              }}
            />
            
            {/* Quantité et unité */}
            <View style={{ 
              flexDirection: "row", 
              gap: theme.spacing.sm, 
              marginBottom: theme.spacing.sm 
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  ...theme.typography.caption, 
                  marginBottom: theme.spacing.xs 
                }}>Quantité</Text>
                <TextInput
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  placeholder="Ex: 500, 2, 1..."
                  placeholderTextColor={theme.colors.textTertiary}
                  style={{
                    ...theme.input,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  ...theme.typography.caption, 
                  marginBottom: theme.spacing.xs 
                }}>Unité</Text>
                <TextInput
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                  placeholder="Ex: g, kg, ml, unités..."
                  placeholderTextColor={theme.colors.textTertiary}
                  style={{
                    ...theme.input,
                  }}
                />
              </View>
            </View>
            
            {/* Catégorie */}
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>Catégorie</Text>
            <View style={{ 
              flexDirection: "row", 
              flexWrap: "wrap", 
              gap: theme.spacing.sm, 
              marginBottom: theme.spacing.md 
            }}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewItemCategory(cat)}
                  style={{
                    backgroundColor: newItemCategory === cat ? theme.colors.primary : theme.colors.surface,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 1,
                    borderColor: newItemCategory === cat ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.caption 
                  }}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            {/* Suggestions rapides */}
            <Text style={{ 
              color: theme.colors.textSecondary, 
              ...theme.typography.caption, 
              marginBottom: theme.spacing.xs 
            }}>Suggestions rapides</Text>
            <View style={{ marginBottom: theme.spacing.md }}>
              {COMMON_INGREDIENTS[newItemCategory as keyof typeof COMMON_INGREDIENTS]?.slice(0, 6).map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setNewItemName(item.name);
                    setNewItemQuantity(item.quantity);
                    setNewItemUnit(item.unit);
                  }}
                  style={{
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    borderRadius: theme.borderRadius.md,
                    marginBottom: theme.spacing.xs,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.caption 
                  }}>
                     {item.name} ({item.quantity} {item.unit})
                   </Text>
                </Pressable>
              ))}
            </View>
            
            {/* Bouton valider */}
            <Pressable
              onPress={handleAddItem}
              style={{
                ...theme.button.primary,
              }}
            >
              <Text style={{ 
                color: theme.colors.text, 
                ...theme.typography.button 
              }}>Ajouter à la liste</Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={{ 
          flexDirection: "row", 
          gap: theme.spacing.sm, 
          marginBottom: theme.spacing.lg 
        }}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => ({
              flex: 1,
              ...theme.button.secondary,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.button 
            }}>Partager</Text>
          </Pressable>
          
          <Pressable
            onPress={handleCopyToClipboard}
            style={({ pressed }) => ({
              flex: 1,
              ...theme.button.secondary,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ 
              color: theme.colors.primary, 
              ...theme.typography.button 
            }}>Copier</Text>
          </Pressable>
        </View>

        {/* Bouton vider */}
        {checkedItems > 0 && (
          <Pressable
            onPress={handleClearChecked}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#3a0f14" : theme.colors.surface,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.borderRadius.lg,
              alignItems: "center",
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: "#3a0f14",
            })}
          >
            <Text style={{ 
              color: "#ff6b6b", 
              ...theme.typography.button 
            }}>
              Vider les articles cochés ({checkedItems})
            </Text>
          </Pressable>
        )}

        {/* Liste des ingrédients */}
        {totalItems === 0 ? (
          <View style={{ 
            alignItems: "center", 
            justifyContent: "center", 
            paddingVertical: theme.spacing.xxl 
          }}>
            <Text style={{ 
              color: theme.colors.textTertiary, 
              ...theme.typography.body, 
              textAlign: "center" 
            }}>
              Votre liste de courses est vide !{'\n'}
              Ajoutez des ingrédients manuellement ou{'\n'}
              depuis le chat IA.
            </Text>
          </View>
        ) : (
          <View>
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <View key={category} style={{ marginBottom: theme.spacing.lg }}>
                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: theme.spacing.sm 
                }}>
                  <Text style={{ 
                    color: theme.colors.text, 
                    ...theme.typography.h4 
                  }}>
                    {category}
                  </Text>
                  <Text style={{ 
                    color: theme.colors.textSecondary, 
                    ...theme.typography.caption 
                  }}>
                    {items.filter(item => item.checked).length}/{items.length}
                  </Text>
                </View>
                
                {items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: item.checked ? "#1a3a1a" : theme.colors.surface,
                      borderColor: item.checked ? "#2d5a2d" : theme.colors.border,
                      borderWidth: 1,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.md,
                      marginBottom: theme.spacing.sm,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Pressable
                      onPress={() => !loading && handleToggle(item.id)}
                      disabled={loading}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: item.checked ? "#4CAF50" : theme.colors.textTertiary,
                        backgroundColor: item.checked ? "#4CAF50" : "transparent",
                        marginRight: theme.spacing.md,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      {item.checked && (
                        <Text style={{ 
                          color: theme.colors.text, 
                          fontSize: 16, 
                          fontWeight: "bold" 
                        }}>✓</Text>
                      )}
                    </Pressable>
                    
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: item.checked ? theme.colors.textTertiary : theme.colors.text,
                          ...theme.typography.body,
                          textDecorationLine: item.checked ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text style={{ 
                        color: theme.colors.textSecondary, 
                        marginTop: theme.spacing.xs,
                        ...theme.typography.caption 
                      }}>
                        {item.quantity}
                        {item.unit && ` ${item.unit}`}
                      </Text>
                    </View>
                    
                    <Pressable
                      onPress={() => handleRemove(item.id)}
                      style={{
                        backgroundColor: "#3a0f14",
                        paddingHorizontal: theme.spacing.sm,
                        paddingVertical: theme.spacing.xs,
                        borderRadius: theme.borderRadius.md,
                      }}
                    >
                      <Text style={{ 
                        color: "#ff6b6b", 
                        ...theme.typography.button 
                      }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
