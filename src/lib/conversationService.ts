﻿import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Firestore,
  getDocs,
  where,
  setDoc
} from 'firebase/firestore';
import { Conversation, Message, CreateConversationData, SendMessageData } from '../types/conversation';

export class ConversationService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationData): Promise<string> {
    console.log('createConversation', data);
    const conversationData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(this.db, 'conversations', data.id || ''), conversationData);
    return data.id || '';
  }

  // Get conversation by group id
  async getConversationByGroupId(groupId: string): Promise<Conversation | null> {
    const conversationsRef = collection(this.db, 'conversations');
    const q = query(conversationsRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0] as Conversation | null;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(conversationId: string, data: SendMessageData): Promise<void> {
    const messagesRef = collection(this.db, 'conversations', conversationId, 'messages');
    
    const messageData = {
      ...data,
      type: data.type || 'text',
      createdAt: serverTimestamp(),
      readBy: data.readBy || []
    };

    // Add the message
    await addDoc(messagesRef, messageData);

    // Update conversation with last message
    const conversationRef = doc(this.db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: data.text,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Listen for messages in real-time
   */
  listenToMessages(
    conversationId: string, 
    onMessagesUpdate: (messages: Message[]) => void
  ): () => void {
    const messagesRef = collection(this.db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      onMessagesUpdate(messages);
    });
  }

  /**
   * Listen for conversations (for a user's conversation list)
   */
  listenToUserConversations(
    userId: string,
    onConversationsUpdate: (conversations: Conversation[]) => void
  ): () => void {
    const conversationsRef = collection(this.db, 'conversations');
    const conversationsQuery = query(conversationsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(conversationsQuery, (snapshot) => {
      const conversations = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Conversation))
        .filter((conv) => conv.members && conv.members.includes(userId));
      onConversationsUpdate(conversations);
    });
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    const batch = writeBatch(this.db);
    
    for (const messageId of messageIds) {
      const messageRef = doc(this.db, 'conversations', conversationId, 'messages', messageId);
      batch.update(messageRef, {
        readBy: [userId]
      });
    }
    
    await batch.commit();
  }
}
