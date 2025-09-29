import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Firestore
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
    const conversationData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(this.db, 'conversations'), conversationData);
    return docRef.id;
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
        }))
        .filter((conv: any) => conv.members && conv.members.includes(userId)) as Conversation[];
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
