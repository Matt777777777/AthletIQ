// lib/chat.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseStorageAdapter as storageAdapter } from './storage-adapter-supabase';

export type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  originalText?: string; // Texte original avec balises JSON
};

const CHAT_MESSAGES_KEY = 'the_sport_chat_messages_v1';
const LAST_CHAT_RESET_KEY = 'lastChatReset';

/**
 * Charge les messages de chat depuis le stockage
 */
export async function loadChatMessages(): Promise<Message[]> {
  try {
    const data = await storageAdapter.load(CHAT_MESSAGES_KEY);
    return data || [];
  } catch (error) {
    console.error('Erreur chargement messages chat:', error);
    // Fallback vers AsyncStorage
    try {
      const data = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erreur en chargeant les messages de chat:", e);
      return [];
    }
  }
}

/**
 * Sauvegarde les messages de chat dans le stockage
 */
export async function saveChatMessages(messages: Message[]): Promise<void> {
  try {
    await storageAdapter.save(CHAT_MESSAGES_KEY, messages);
  } catch (error) {
    console.error('Erreur sauvegarde messages chat:', error);
    // Fallback vers AsyncStorage
    try {
      await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Erreur en sauvegardant les messages de chat:", e);
    }
  }
}

/**
 * Vérifie et réinitialise le chat quotidiennement
 */
export async function checkAndResetDailyChat(): Promise<void> {
  try {
    const today = new Date().toDateString();
    const lastChatReset = await AsyncStorage.getItem(LAST_CHAT_RESET_KEY);
    
    if (lastChatReset !== today) {
      // Nouveau jour, réinitialiser le chat
      await saveChatMessages([]);
      await AsyncStorage.setItem(LAST_CHAT_RESET_KEY, today);
      console.log("Chat réinitialisé automatiquement pour le nouveau jour");
    }
  } catch (error) {
    console.log("Erreur lors de la vérification de réinitialisation quotidienne:", error);
  }
}

/**
 * Ajoute un message au chat
 */
export async function addChatMessage(message: Message): Promise<void> {
  try {
    const messages = await loadChatMessages();
    const updatedMessages = [...messages, message];
    await saveChatMessages(updatedMessages);
  } catch (error) {
    console.error('Erreur ajout message chat:', error);
  }
}

/**
 * Met à jour un message existant
 */
export async function updateChatMessage(messageId: string, updates: Partial<Message>): Promise<void> {
  try {
    const messages = await loadChatMessages();
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    await saveChatMessages(updatedMessages);
  } catch (error) {
    console.error('Erreur mise à jour message chat:', error);
  }
}

/**
 * Supprime tous les messages de chat
 */
export async function clearChatMessages(): Promise<void> {
  try {
    await saveChatMessages([]);
  } catch (error) {
    console.error('Erreur suppression messages chat:', error);
  }
}
