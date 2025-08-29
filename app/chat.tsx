import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Salut 👋 Je suis ton coach IA. Pose-moi une question (ex: “Fais-moi une séance de 45 min sans matériel” ou “Plan repas 2000 kcal sans gluten”).",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    const userMsg: Message = { id: Date.now().toString(), text: content, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // --- SIMULATION de réponse IA (pour valider l’UI)
    const thinking: Message = {
      id: (Date.now() + 1).toString(),
      text: "Je réfléchis à la meilleure proposition pour toi… 🧠",
      sender: "ai",
    };
    setMessages((prev) => [...prev, thinking]);

    // petite pause pour l’effet
    setTimeout(() => {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== thinking.id)
          .concat({
            id: (Date.now() + 2).toString(),
            text:
              content.toLowerCase().includes("séance") || content.toLowerCase().includes("workout")
                ? "Voici un exemple de séance 45 min (sans matériel):\n• Échauffement 5’ (montées de genoux, rotations)\n• Circuit x4 : 12 pompes • 20 squats • 15 fentes (chaque jambe) • 30” gainage\n• Finisher 6’ : 30” burpees / 30” repos\n• Etirements 4’"
                : "Exemple de plan repas ~2000 kcal :\n• Petit-déj: bowl protéiné (flocons, skyr, fruits rouges)\n• Déj: poulet, quinoa, légumes rôtis (550 kcal)\n• Dîner: cabillaud, riz basmati, brocoli (500 kcal)\n• Snacks: pomme + amandes, yaourt grec",
            sender: "ai",
          })
      );
      listRef.current?.scrollToEnd({ animated: true });
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 12 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
          💬 Ton coach IA
        </Text>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.sender === "user" ? "#0070F3" : "#1b1b1b",
                marginVertical: 6,
                padding: 12,
                borderRadius: 12,
                maxWidth: "78%",
              }}
            >
              <Text style={{ color: "#fff", lineHeight: 20 }}>{item.text}</Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Écris ton message..."
            placeholderTextColor="#777"
            style={{
              flex: 1,
              backgroundColor: "#111",
              color: "#fff",
              padding: 12,
              borderRadius: 12,
              marginRight: 8,
            }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <Pressable
            onPress={sendMessage}
            style={{
              backgroundColor: "#0070F3",
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Envoyer</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}



