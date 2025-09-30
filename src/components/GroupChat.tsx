import React, { useState, useRef, useEffect } from 'react';
import { Message, SendMessageData } from '@/types/conversation';
import { useConversation } from '@/hooks/useConversation';
import { ConversationService } from '@/lib/conversationService';
import { User as UserType} from '@/types/users';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface GroupChatProps {
  conversationService: ConversationService;
  currentUser: User | null;
  groupId: string;
  groupMembers: Record<string, string>;
  memberMap: Map<string, UserType>;
}

export const GroupChat: React.FC<GroupChatProps> = ({
  conversationService,
  currentUser,
  groupId,
  groupMembers,
  memberMap
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    messagesLoading,
    messagesError,
    sendMessage,
    createConversation,
    getConversationByGroupId,
    setCurrentConversationId
  } = useConversation({ conversationService, currentUser });

  // Initialize conversation for the group
  useEffect(() => {
    const initializeGroupChat = async () => {
      if (!currentUser || !groupId) return;

      // Check if conversation already exists for this group
      // For now, we'll create a new conversation each time
      // In a real app, you'd want to check if a conversation already exists
      try {
        // check if conversation already exists
        const conversation = await getConversationByGroupId(groupId);
        if (conversation) {
          setConversationId(conversation.id);
          setCurrentConversationId(conversation.id);
          return;
        }

        const memberIds = Object.keys(groupMembers);
        const conversationId = await createConversation({
          members: memberIds,
          lastMessage: 'Group chat started'
        });
        setConversationId(conversationId);
        setCurrentConversationId(conversationId);
      } catch (error) {
        console.error('Error creating group conversation:', error);
      }
    };

    initializeGroupChat();
  }, [currentUser, groupId, groupMembers, createConversation, setCurrentConversationId, getConversationByGroupId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !currentUser) return;

    try {
      const messageData: SendMessageData = {
        text: newMessage.trim(),
        type: 'text',
        senderId: currentUser.uid
      };
      await sendMessage(conversationId, messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toDate());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplayName = (senderId: string) => {
    const user = memberMap.get(senderId);
    if (user) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    return 'User';
  };

  const getUserInitials = (senderId: string) => {
    const user = memberMap.get(senderId);
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return senderId.charAt(0).toUpperCase();
  };

  if (messagesLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Group Chat</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Group Chat</h2>
        </div>
        <div className="text-center py-8 text-red-500">
          <p>Error loading messages: {messagesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-semibold">Group Chat</h2>
      </div>

      {/* Messages Container */}
      <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUser?.uid;
            return (
              <div
                key={message.id}
                className="flex space-x-3"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {getUserInitials(message.senderId)}
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="inline-block p-3 rounded-lg">
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs mt-1">
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                  {!isCurrentUser && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getUserDisplayName(message.senderId)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={!conversationId}
        />
        <Button 
          type="submit" 
          disabled={!newMessage.trim() || !conversationId}
          className="px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
