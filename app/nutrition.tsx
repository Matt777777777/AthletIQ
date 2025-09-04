import { Pressable, ScrollView, Text, View } from "react-native";

const meals = [
  {
    title: "Petit-déj — Bowl protéiné",
    kcal: 420,
    macros: "P: 30g • G: 45g • L: 12g",
    ingredients: ["Fromage blanc 0%", "Flocons d'avoine", "Fruits rouges", "Amandes"],
  },
  {
    title: "Déjeuner — Poulet/quinoa/légumes",
    kcal: 550,
    macros: "P: 40g • G: 55g • L: 16g",
    ingredients: ["Poulet", "Quinoa", "Courgettes", "Poivrons", "Huile d'olive"],
  },
  {
    title: "Dîner — Poisson/riz/brocoli",
    kcal: 500,
    macros: "P: 38g • G: 50g • L: 14g",
    ingredients: ["Cabillaud", "Riz basmati", "Brocoli", "Citron"],
  },
];

export default function Nutrition() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 12 }}>
        Repas du jour
      </Text>
      <Text style={{ color: "#aaa", marginBottom: 16 }}>
        Exemple de plan — ajustable par l’IA
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {meals.map((m) => (
          <View
            key={m.title}
            style={{
              backgroundColor: "#0e1622",
              borderColor: "#152238",
              borderWidth: 1,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{m.title}</Text>
            <Text style={{ color: "#9fc0ff", marginTop: 6 }}>{m.kcal} kcal • {m.macros}</Text>
            <Text style={{ color: "#ccc", marginTop: 8, marginBottom: 10 }}>
              Ingrédients: {m.ingredients.join(", ")}
            </Text>

            <Pressable
              onPress={() => handleAddToShoppingList(m.title, m.ingredients)}
              style={{
                backgroundColor: "#0070F3",
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Ajouter à ma liste de courses
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
