import React, { useState, useRef, useEffect } from 'react';
import { Message, SendMessageData, CreatePollData, Poll } from '@/types/conversation';
import { useConversation } from '@/hooks/useConversation';
import { ConversationService } from '@/lib/conversationService';
import { User as UserType} from '@/types/users';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Plus, X, BarChart3 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseTimestampToDate } from '@/lib/supabaseDateConverter';

interface GroupChatProps {
  conversationService: ConversationService;
  currentUser: User | null;
  groupId: string;
  groupMembers: Record<string, string>;
  memberMap: Map<string, UserType>;
  canManageGroup?: boolean;
}

export const GroupChat: React.FC<GroupChatProps> = ({
  conversationService,
  currentUser,
  groupId,
  groupMembers,
  memberMap,
  canManageGroup = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('messages');

  // Poll state
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [pollExpiry, setPollExpiry] = useState('');

  const {
    messages,
    messagesLoading,
    messagesError,
    sendMessage,
    createConversation,
    createPoll,
    removeVoteFromPoll,
    getConversationByGroupId,
    setCurrentConversationId
  } = useConversation({ conversationService, currentUser });

  // Initialize conversation for the group
  useEffect(() => {
    const initializeGroupChat = async () => {
      if (!currentUser || !groupId) return;

      try {
        const conversation = await getConversationByGroupId(groupId);
        if (conversation) {
          setConversationId(conversation.id);
          setCurrentConversationId(conversation.id);
          return;
        }

        const memberIds = Object.keys(groupMembers);
        const conversationId = await createConversation({
          id: groupId,
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

  // Poll handling functions
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2 || !conversationId) return;

    const validOptions = pollOptions.filter(opt => opt.trim());
    const pollData: CreatePollData = {
      question: pollQuestion.trim(),
      options: validOptions.map((text, index) => ({
        id: `opt${index + 1}`,
        text: text.trim()
      })),
      allowMultiple: allowMultipleVotes,
      expiresAt: pollExpiry ? new Date(pollExpiry) : undefined
    };

    try {
      await createPoll(conversationId, pollData);
      setPollDialogOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowMultipleVotes(false);
      setPollExpiry('');
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };


  const handleRemoveVote = async (messageId: string) => {
    if (!conversationId) return;

    try {
      await removeVoteFromPoll(conversationId, messageId);
    } catch (error) {
      console.error('Error removing vote:', error);
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const formatMessageTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toDate());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPollExpiry = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = supabaseTimestampToDate(timestamp.seconds, timestamp.nanoseconds);
    return date;
  };

  const isPollExpired = (poll: Poll) => {
    if (!poll.expiresAt) return false;
    // Convert timestamp to milliseconds and create Date object for proper time comparison
    const totalMilliseconds = (poll.expiresAt.seconds * 1000) + (poll.expiresAt.nanoseconds / 1_000_000);
    const expiryDate = new Date(totalMilliseconds);
    const now = new Date();
    return now > expiryDate;
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

  // Render poll message
  const renderPollMessage = (message: Message) => {
    const isCurrentUser = message.senderId === currentUser?.uid;
    const senderName = getUserDisplayName(message.senderId);
    const senderInitials = getUserInitials(message.senderId);

    if (!message.poll) return null;

    const isExpired = isPollExpired(message.poll);
    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    
    // Sort options by vote count (highest first) when expired
    const sortedOptions = isExpired 
      ? [...message.poll.options].sort((a, b) => b.votes.length - a.votes.length)
      : message.poll.options;
    
    // Find the highest vote count for highlighting winners
    const maxVotes = isExpired ? Math.max(...message.poll.options.map(opt => opt.votes.length)) : 0;
    const isTie = isExpired && message.poll.options.filter(opt => opt.votes.length === maxVotes).length > 1;

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-md ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-start space-x-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {senderInitials}
            </div>
            <div className={`rounded-lg p-4 ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
              <div className={`text-xs mb-2 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                {isCurrentUser ? 'You' : senderName}
              </div>
              
              {/* Poll Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                    {message.poll.question}
                  </h4>
                  {isExpired && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isCurrentUser ? 'bg-red-400 text-white' : 'bg-red-100 text-red-800'
                    }`}>
                      Poll Closed
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {sortedOptions.map((option, index) => {
                    const hasVoted = option.votes.includes(currentUser?.uid || '');
                    const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                    const isWinner = isExpired && option.votes.length === maxVotes && maxVotes > 0;
                    const rank = isExpired ? index + 1 : null;
                    
                    return (
                      <div key={option.id} className="space-y-1">
                        <div
                          className={`w-full text-left p-2 rounded border transition-colors ${
                            isExpired
                              ? isWinner
                                ? isCurrentUser
                                  ? 'bg-yellow-400 border-yellow-300 text-yellow-900'
                                  : 'bg-yellow-50 border-yellow-300 text-yellow-900'
                                : isCurrentUser
                                  ? 'bg-gray-400 border-gray-300 text-gray-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700'
                              : hasVoted 
                                ? isCurrentUser 
                                  ? 'bg-blue-400 border-blue-300 text-white' 
                                  : 'bg-blue-50 border-blue-300 text-blue-900'
                                : isCurrentUser
                                  ? 'border-blue-300 hover:bg-blue-400 text-white'
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-900'
                          } ${isExpired ? 'opacity-75' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {isExpired && (
                                <span className={`text-xs font-bold ${
                                  isWinner 
                                    ? isCurrentUser ? 'text-yellow-800' : 'text-yellow-700'
                                    : isCurrentUser ? 'text-gray-600' : 'text-gray-500'
                                }`}>
                                  #{rank}
                                </span>
                              )}
                              <span className="text-sm">{option.text}</span>
                              {isWinner && isExpired && (
                                <span className={`text-xs font-bold ${
                                  isCurrentUser ? 'text-yellow-800' : 'text-yellow-700'
                                }`}>
                                  {isTie ? 'TIE' : 'WINNER'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs">
                              {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {totalVotes > 0 && (
                            <div className={`mt-1 h-1 rounded-full ${
                              isExpired
                                ? isWinner
                                  ? isCurrentUser ? 'bg-yellow-200' : 'bg-yellow-200'
                                  : isCurrentUser ? 'bg-gray-300' : 'bg-gray-300'
                                : isCurrentUser ? 'bg-blue-200' : 'bg-gray-200'
                            }`}>
                              <div 
                                className={`h-full rounded-full ${
                                  isExpired
                                    ? isWinner
                                      ? isCurrentUser ? 'bg-yellow-600' : 'bg-yellow-500'
                                      : isCurrentUser ? 'bg-gray-500' : 'bg-gray-400'
                                    : isCurrentUser ? 'bg-white' : 'bg-blue-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.poll.allowMultiple ? 'Multiple votes allowed' : 'Single vote only'}
                  {message.poll.expiresAt && (
                    <span className={isExpired ? 'text-red-300' : ''}>
                      • {isExpired ? 'Expired' : 'Expires'} {formatPollExpiry(message.poll.expiresAt)}
                    </span>
                  )}
                </div>
                
                {message.poll.options.some(opt => opt.votes.includes(currentUser?.uid || '')) && !isExpired && (
                  <button
                    onClick={() => handleRemoveVote(message.id)}
                    className={`text-xs underline ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    Remove my vote
                  </button>
                )}
              </div>
              
              <div className={`text-xs mt-2 ${isCurrentUser ? 'text-blue-100' : 'text-gray-400'}`}>
                {formatMessageTime(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter messages to get only polls
  const pollMessages = messages.filter(message => message.type === 'poll');

  // Render poll list item for polls tab
  const renderPollListItem = (message: Message) => {
    const isCurrentUser = message.senderId === currentUser?.uid;
    const senderName = getUserDisplayName(message.senderId);
    const senderInitials = getUserInitials(message.senderId);

    if (!message.poll) return null;

    const isExpired = isPollExpired(message.poll);
    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const maxVotes = Math.max(...message.poll.options.map(opt => opt.votes.length));
    const isTie = message.poll.options.filter(opt => opt.votes.length === maxVotes).length > 1;

    // Sort options by vote count (highest first) when expired
    const sortedOptions = isExpired 
      ? [...message.poll.options].sort((a, b) => b.votes.length - a.votes.length)
      : message.poll.options;

    return (
      <div key={message.id} className="bg-gray-200 border rounded-lg p-4 mb-3">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {senderInitials}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">
                {isCurrentUser ? 'You' : senderName}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">
                  {formatMessageTime(message.createdAt)}
                </span>
                {isExpired && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                    Closed
                  </span>
                )}
              </div>
            </div>
            
            <h4 className="font-medium text-gray-900 mb-3">
              {message.poll.question}
            </h4>
            
            <div className="space-y-2">
              {sortedOptions.map((option, index) => {
                const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                const isWinner = isExpired && option.votes.length === maxVotes && maxVotes > 0;
                const rank = isExpired ? index + 1 : null;
                
                return (
                  <div key={option.id} className="space-y-1">
                    <div className={`p-2 rounded border ${
                      isExpired && isWinner
                        ? 'bg-yellow-50 border-yellow-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          {isExpired && (
                            <span className={`text-xs font-bold ${
                              isWinner ? 'text-yellow-700' : 'text-gray-500'
                            }`}>
                              #{rank}
                            </span>
                          )}
                          <span className="text-sm">{option.text}</span>
                          {isWinner && isExpired && (
                            <span className="text-xs font-bold text-yellow-700">
                              {isTie ? 'TIE' : 'WINNER'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {totalVotes > 0 && (
                        <div className="mt-1 h-1 rounded-full bg-gray-200">
                          <div 
                            className={`h-full rounded-full ${
                              isExpired && isWinner ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {message.poll.allowMultiple ? 'Multiple votes allowed' : 'Single vote only'}
              {message.poll.expiresAt && (
                <span className={isExpired ? 'text-red-500' : ''}>
                  • {isExpired ? 'Expired' : 'Expires'} {formatPollExpiry(message.poll.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render regular text message
  const renderTextMessage = (message: Message) => {
    const isCurrentUser = message.senderId === currentUser?.uid;
    const senderName = getUserDisplayName(message.senderId);
    const senderInitials = getUserInitials(message.senderId);

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {senderInitials}
          </div>
          <div className={`rounded-lg p-3 ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
            <div className={`text-xs mb-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {isCurrentUser ? 'You' : senderName}
            </div>
            <p className='text-sm'>{message.text}</p>
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-400'}`}>
              {formatMessageTime(message.createdAt)}
            </div>
          </div>
        </div>
      </div>
    );
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Polls ({pollMessages.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          {/* Messages Container */}
          <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                if (message.type === 'poll') {
                  return renderPollMessage(message);
                } else {
                  return renderTextMessage(message);
                }
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <form onSubmit={handleSendMessage} className="flex space-x-2 flex-1">
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
            
            {/* Create Poll Button - only show for managers/admins */}
            {canManageGroup && (
              <Button
                onClick={() => setPollDialogOpen(true)}
                disabled={!conversationId}
                className="px-4 bg-green-500 text-white hover:bg-green-600"
                title="Create Poll"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="polls" className="mt-4">
          <div className="h-96 overflow-y-auto">
            {pollMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No polls yet. Create one to get started!</p>
              </div>
            ) : (
              pollMessages.map(renderPollListItem)
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Poll Dialog */}
      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
            <DialogDescription>
              Create a poll to get group input on decisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What should we decide on?"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePollOption(index)}
                        className="px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPollOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowMultiple"
                checked={allowMultipleVotes}
                onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allowMultiple" className="text-sm text-gray-700">
                Allow multiple votes
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={pollExpiry}
                onChange={(e) => setPollExpiry(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setPollDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
