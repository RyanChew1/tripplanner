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
  getDoc,
  Firestore,
  getDocs,
  where,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { Conversation, Message, CreateConversationData, SendMessageData, CreatePollData } from '../types/conversation';

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
      lastMessage: data.text || (data.type === 'poll' ? 'Poll created' : 'Message'),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Create a poll in a conversation
   */
  async createPoll(conversationId: string, data: CreatePollData, senderId: string): Promise<void> {
    const poll: Message['poll'] = {
      question: data.question,
      options: data.options.map(option => ({
        ...option,
        votes: []
      })),
      allowMultiple: data.allowMultiple || false,
      expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : undefined
    };

    const messageData: SendMessageData = {
      senderId: senderId,
      type: 'poll',
      poll
    };

    await this.sendMessage(conversationId, messageData);
  }

  /**
   * Vote on a poll option
   */
  async voteOnPoll(
    conversationId: string, 
    messageId: string, 
    optionId: string, 
    userId: string
  ): Promise<void> {
    const messageRef = doc(this.db, 'conversations', conversationId, 'messages', messageId);
    
    // Get the current message to find the option index
    const messageDoc = await this.getMessageById(conversationId, messageId);
    if (!messageDoc || !messageDoc.poll) {
      throw new Error('Poll not found');
    }

    // Find the option index by optionId
    const optionIndex = messageDoc.poll.options.findIndex(option => option.id === optionId);
    if (optionIndex === -1) {
      throw new Error('Poll option not found');
    }

    // Check if user has already voted on this option
    if (messageDoc.poll.options[optionIndex].votes.includes(userId)) {
      throw new Error('User has already voted on this option');
    }

    // Check if poll allows multiple votes or if user hasn't voted on any option
    if (!messageDoc.poll.allowMultiple) {
      const hasVoted = messageDoc.poll.options.some(option => option.votes.includes(userId));
      if (hasVoted) {
        throw new Error('User has already voted on this poll and multiple votes are not allowed');
      }
    }

    // Create updated options array with the new vote
    const updatedOptions = [...messageDoc.poll.options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      votes: [...updatedOptions[optionIndex].votes, userId]
    };

    // Update the entire poll options array
    await updateDoc(messageRef, {
      'poll.options': updatedOptions
    });
  }

  /**
   * Remove a vote from a poll
   */
  async removeVoteFromPoll(
    conversationId: string, 
    messageId: string, 
    userId: string
  ): Promise<void> {
    const messageRef = doc(this.db, 'conversations', conversationId, 'messages', messageId);
    
    // Get the current message to find all options
    const messageDoc = await this.getMessageById(conversationId, messageId);
    if (!messageDoc || !messageDoc.poll) {
      throw new Error('Poll not found');
    }

    // Create updated options array with user votes removed
    const updatedOptions = messageDoc.poll.options.map(option => ({
      ...option,
      votes: option.votes.filter(vote => vote !== userId)
    }));

    // Check if user had any votes to remove
    const hasVotes = messageDoc.poll.options.some(option => option.votes.includes(userId));
    if (!hasVotes) {
      throw new Error('No votes found to remove');
    }

    // Update the entire poll options array
    await updateDoc(messageRef, {
      'poll.options': updatedOptions
    });
  }

  /**
   * Get a specific message by ID
   */
  private async getMessageById(conversationId: string, messageId: string): Promise<Message | null> {
    try {
      const messageRef = doc(this.db, 'conversations', conversationId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) return null;
      
      return {
        id: messageDoc.id,
        ...messageDoc.data()
      } as Message;
    } catch (error) {
      console.error('Error getting message:', error);
      return null;
    }
  }

  /**
   * Get poll results for a specific poll
   */
  async getPollResults(conversationId: string, messageId: string): Promise<{ optionId: string; text: string; votes: string[]; percentage: number }[]> {
    const messageDoc = await this.getMessageById(conversationId, messageId);
    if (!messageDoc || !messageDoc.poll) {
      throw new Error('Poll not found');
    }

    const totalVotes = messageDoc.poll.options.reduce((sum, option) => sum + option.votes.length, 0);
    
    return messageDoc.poll.options.map(option => ({
      optionId: option.id,
      text: option.text,
      votes: option.votes,
      percentage: totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0
    }));
  }

  /**
   * Check if a user has voted on a poll
   */
  async hasUserVoted(conversationId: string, messageId: string, userId: string): Promise<boolean> {
    const messageDoc = await this.getMessageById(conversationId, messageId);
    if (!messageDoc || !messageDoc.poll) {
      return false;
    }

    return messageDoc.poll.options.some(option => option.votes.includes(userId));
  }

  /**
   * Get user's votes for a poll (for multiple vote polls)
   */
  async getUserVotes(conversationId: string, messageId: string, userId: string): Promise<string[]> {
    const messageDoc = await this.getMessageById(conversationId, messageId);
    if (!messageDoc || !messageDoc.poll) {
      return [];
    }

    const userVotes: string[] = [];
    messageDoc.poll.options.forEach(option => {
      if (option.votes.includes(userId)) {
        userVotes.push(option.id);
      }
    });

    return userVotes;
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
