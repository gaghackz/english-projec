import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// Placeholder user ID until you add Firebase Auth
const userId = "student_user_123";

export async function createNewChat(firstMessage: string) {
  const chatsRef = collection(db, "chats");

  // Create a short title from the first message
  const title =
    firstMessage.length > 30
      ? firstMessage.substring(0, 30) + "..."
      : firstMessage;

  try {
    const docRef = await addDoc(chatsRef, {
      userId: userId,
      title: title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [],
    });
    return { id: docRef.id, title };
  } catch (e) {
    console.error("Error creating new chat:", e);
    return null;
  }
}

export async function addMessageToChat(
  chatId: string,
  role: "user" | "assistant",
  content: string,
) {
  const chatDocRef = doc(db, "chats", chatId);
  try {
    await updateDoc(chatDocRef, {
      messages: arrayUnion({
        id: Date.now().toString(), // Add a unique ID for React mapping
        role,
        content,
        timestamp: new Date().toISOString(), // Use ISO string to avoid React state serialization errors
      }),
      updatedAt: serverTimestamp(), // Update the main doc timestamp so it floats to the top of the sidebar
    });
  } catch (e) {
    console.error("Error adding message:", e);
  }
}

export async function getUserChatRooms() {
  const chatsRef = collection(db, "chats");
  // Query for this user's chats, ordered by most recently updated
  const q = query(chatsRef, orderBy("updatedAt", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
    }));
  } catch (e) {
    console.error("Error loading chat rooms:", e);
    return [];
  }
}

export async function getChatMessages(chatId: string) {
  const chatDocRef = doc(db, "chats", chatId);
  try {
    const docSnap = await getDoc(chatDocRef);
    if (docSnap.exists()) {
      return docSnap.data().messages || [];
    }
    return [];
  } catch (e) {
    console.error("Error loading messages:", e);
    return [];
  }
}
