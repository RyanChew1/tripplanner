import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { ConversationService } from '../lib/conversationService';
import { Conversation, Message, CreateConversationData, SendMessageData } from '../types/conversation';

interface UseConversationProps {
  conversationService: ConversationService;
  currentUser: User | null;
}

interface UseConversationReturn {
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // Messages
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  
  // Actions
  createConversation: (data: CreateConversationData) => Promise<string>;
  sendMessage: (conversationId: string, data: SendMessageData) => Promise<void>;
  markMessagesAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  
  // State management
  setCurrentConversationId: (conversationId: string | null) => void;
  currentConversationId: string | null;
}

export const useConversation = ({ 
  conversationService, 
  currentUser 
}: UseConversationProps): UseConversationReturn => {
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  
  // State for messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  
  // Current conversation
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Refs for cleanup
  const conversationsUnsubscribe = useRef<(() => void) | null>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);

  // Listen to user conversations
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);
    setConversationsError(null);

    conversationsUnsubscribe.current = conversationService.listenToUserConversations(
      currentUser.uid,
      (conversations) => {
        setConversations(conversations);
        setConversationsLoading(false);
        setConversationsError(null);
      }
    );

    return () => {
      if (conversationsUnsubscribe.current) {
        conversationsUnsubscribe.current();
      }
    };
  }, [currentUser, conversationService]);

  // Listen to messages for current conversation
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setMessagesError(null);

    messagesUnsubscribe.current = conversationService.listenToMessages(
      currentConversationId,
      (messages) => {
        setMessages(messages);
        setMessagesLoading(false);
        setMessagesError(null);
      }
    );

    return () => {
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
      }
    };
  }, [currentConversationId, conversationService]);

  // Create conversation
  const createConversation = useCallback(async (data: CreateConversationData): Promise<string> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to create a conversation');
    }

    try {
      const conversationId = await conversationService.createConversation(data);
      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [conversationService, currentUser]);

  // Send message
  const sendMessage = useCallback(async (conversationId: string, data: SendMessageData): Promise<void> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to send a message');
    }

    try {
      const messageData: SendMessageData = {
        ...data,
        senderId: currentUser.uid
      };
      await conversationService.sendMessage(conversationId, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationService, currentUser]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string, messageIds: string[]): Promise<void> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to mark messages as read');
    }

    try {
      await conversationService.markMessagesAsRead(conversationId, currentUser.uid, messageIds);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }, [conversationService, currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationsUnsubscribe.current) {
        conversationsUnsubscribe.current();
      }
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
      }
    };
  }, []);

  return {
    // Conversations
    conversations,
    conversationsLoading,
    conversationsError,
    
    // Messages
    messages,
    messagesLoading,
    messagesError,
    
    // Actions
    createConversation,
    sendMessage,
    markMessagesAsRead,
    
    // State management
    setCurrentConversationId,
    currentConversationId
  };
};
