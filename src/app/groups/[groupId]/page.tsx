"use client";

import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useGetGroupById } from '@/hooks/useGroups';
import { updateGroup } from '@/lib/groupService';
import { getUserById, getUserByEmail } from '@/lib/userService';
import { TravelIcons } from '@/lib/iconList';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { User } from '@/types/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Plus, MoreVertical, Edit2, Send, MessageCircle } from 'lucide-react';
import supabaseTimestampToDate from '@/lib/supabaseDateConverter';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationService } from '@/lib/conversationService';
import { useConversation } from '@/hooks/useConversation';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface GroupUpdateData {
  name?: string;
  groupIcon?: string;
  groupColor?: string;
  groupMembers?: Record<string, "manager" | "admin" | "traveler">;
}

// Custom hook to fetch multiple users
function useGetUsersByIds(userIds: string[]) {
  return useQuery({
    queryKey: ["users", userIds],
    queryFn: async () => {
      const userPromises = userIds.map(id => getUserById(id));
      const users = await Promise.all(userPromises);
      return users.filter(user => user !== null) as User[];
    },
    enabled: userIds.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

const Page = ({ params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId } = React.use(params);
  const { data: group, isLoading, error } = useGetGroupById(groupId);
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'trips' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const queryClient = useQueryClient();
  const [iconInstance] = useState(new TravelIcons());

  // Conversation service instance
  const [conversationService] = useState(() => new ConversationService(db));
  
  // Chat state
  const [messageInput, setMessageInput] = useState('');
  const [groupConversationId, setGroupConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Invite members state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');

  // Role management state
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserRole, setSelectedUserRole] = useState<"manager" | "admin" | "traveler" | ''>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Get current user's role in the group
  const currentUserRole = useMemo(() => {
    if (!currentUser?.uid || !group?.groupMembers) return null;
    return group.groupMembers[currentUser.uid] || null;
  }, [currentUser?.uid, group?.groupMembers]);

  // Check if current user can manage the group
  const canManageGroup = useMemo(() => {
    return currentUserRole === 'admin' || currentUserRole === 'manager';
  }, [currentUserRole]);

  // Check if current user can change roles (only managers and admins)
  const canChangeRoles = useMemo(() => {
    return currentUserRole === 'admin' || currentUserRole === 'manager';
  }, [currentUserRole]);

  // Get member user IDs from group
  const memberIds = useMemo(() => {
    return group?.groupMembers ? Object.keys(group.groupMembers) : [];
  }, [group?.groupMembers]);

  // Fetch user data for all members
  const { data: members = [] } = useGetUsersByIds(memberIds);

  // Create a map of userId to user data for easy lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, User>();
    members.forEach(member => {
      if (member.id) {
        map.set(member.id, member);
      }
    });
    return map;
  }, [members]);

  // Use conversation hook
  const {
    conversations,
    messages,
    messagesLoading,
    createConversation,
    sendMessage,
    setCurrentConversationId,
  } = useConversation({
    conversationService,
    currentUser
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: (updatedGroup: GroupUpdateData) => {
      if (!group) throw new Error('Group not loaded');
      return updateGroup({ 
        ...group, 
        ...updatedGroup, 
        id: groupId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      setIsEditing(false);
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: "manager" | "admin" | "traveler" }) => {
      if (!group) throw new Error('Group not loaded');
      
      const updatedGroupMembers: Record<string, "manager" | "admin" | "traveler"> = {
        ...group.groupMembers,
        [userId]: newRole
      };

      return updateGroup({
        ...group,
        groupMembers: updatedGroupMembers,
        id: groupId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      setRoleChangeDialogOpen(false);
      setSelectedUserId('');
      setSelectedUserRole('');
      setSelectedUserName('');
    },
  });

  // Invite members mutation
  const inviteMembersMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      if (!group) throw new Error('Group not loaded');
      
      const newGroupMembers = { ...group.groupMembers };
      const newInvitedUsers = [...(group.invitedUsers || [])];

      // Check each email to see if user exists
      for (const email of emails) {
        try {
          const existingUser = await getUserByEmail(email);
          if (existingUser) {
            newGroupMembers[existingUser.id!] = "traveler";
          } else {
            newInvitedUsers.push(email);
          }
        } catch (error) {
          console.error(`Error checking user for email ${email}:`, error);
          // If we can't check, add to invited users as fallback
          newInvitedUsers.push(email);
        }
      }

      return updateGroup({
        ...group,
        groupMembers: newGroupMembers,
        invitedUsers: newInvitedUsers,
        id: groupId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["userGroups"] });
      setInviteDialogOpen(false);
      setEmailList([]);
      setEmailInput('');
      setEmailError('');
    },
  });

  // Color options
  const colorOptions = [
    { name: "Green", value: "#6A8D73" },
    { name: "Blue", value: "#3A405A" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Indigo", value: "#6366F1" },
  ];

  // Role options
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Can manage group members and settings' },
    { value: 'traveler', label: 'Traveler', description: 'Can view and participate in trips' },
  ];

  // Create or find group conversation
  useEffect(() => {
    if (!currentUser || !group || !memberIds.length) return;

    // Look for existing conversation with all group members
    const groupConversation = conversations.find(conv => 
      conv.members.length === memberIds.length && 
      memberIds.every(memberId => conv.members.includes(memberId))
    );

    if (groupConversation) {
      setGroupConversationId(groupConversation.id);
      setCurrentConversationId(groupConversation.id);
    } else if (memberIds.length > 1) {
      // Create new group conversation
      createConversation({ members: memberIds })
        .then(conversationId => {
          setGroupConversationId(conversationId);
          setCurrentConversationId(conversationId);
        })
        .catch(error => console.error('Error creating group conversation:', error));
    }
  }, [currentUser, group, memberIds, conversations, createConversation, setCurrentConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate email input
  const validateEmail = (email: string): string => {
    const trimmedEmail = email.trim().toLowerCase();

    // Check if empty
    if (!trimmedEmail) {
      return "Email cannot be empty";
    }

    // Check email format
    if (!isValidEmail(trimmedEmail)) {
      return "Please enter a valid email address";
    }

    // Check if email is already in the list
    if (emailList.some((email) => email.toLowerCase() === trimmedEmail)) {
      return "This email has already been added";
    }

    // Check if user is already a member
    const existingMember = Object.values(memberMap).find(
      user => user.email.toLowerCase() === trimmedEmail
    );
    if (existingMember) {
      return "This user is already a member of the group";
    }

    return "";
  };

  const addEmail = () => {
    const error = validateEmail(emailInput);

    if (error) {
      setEmailError(error);
      return;
    }

    // Clear any previous error
    setEmailError("");

    // Add email to list (normalize to lowercase)
    setEmailList([...emailList, emailInput.trim().toLowerCase()]);
    setEmailInput("");
  };

  const removeEmail = (emailToRemove: string) => {
    setEmailList(emailList.filter((email) => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addEmail();
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const handleInviteMembers = () => {
    if (emailList.length === 0) return;
    inviteMembersMutation.mutate(emailList);
  };

  const handleChangeRole = (userId: string, currentRole: string) => {
    const user = memberMap.get(userId);
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : `User ${userId.slice(0, 8)}`;
    
    setSelectedUserId(userId);
    setSelectedUserRole(currentRole as "manager" | "admin" | "traveler");
    setSelectedUserName(userName);
    setRoleChangeDialogOpen(true);
  };

  const handleSaveRoleChange = () => {
    if (selectedUserId && selectedUserRole) {
      changeRoleMutation.mutate({
        userId: selectedUserId,
        newRole: selectedUserRole
      });
    }
  };

  const handleSaveChanges = () => {
    const updates: GroupUpdateData = {};
    if (editedName && editedName !== group?.name) {
      updates.name = editedName;
    }
    if (selectedIcon && selectedIcon !== group?.groupIcon) {
      updates.groupIcon = selectedIcon;
    }
    if (selectedColor && selectedColor !== group?.groupColor) {
      updates.groupColor = selectedColor;
    }
    
    if (Object.keys(updates).length > 0) {
      updateGroupMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName('');
    setSelectedIcon('');
    setSelectedColor('');
    setIsEditing(false);
  };

  // Chat message handling
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !groupConversationId || !currentUser) return;

    try {
      await sendMessage(groupConversationId, {
        senderId: currentUser.uid,
        text: messageInput.trim(),
        type: 'text'
      });
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const startEditing = () => {
    setEditedName(group?.name || '');
    setSelectedIcon(group?.groupIcon || 'airplane');
    setSelectedColor(group?.groupColor || '#6A8D73');
    setIsEditing(true);
  };

  if (error) {
    return (
      <ProtectedLayout>
        <div className='flex min-h-screen flex-col items-center justify-center p-4'>
          <div className='text-center space-y-4'>
            <h1 className='text-2xl font-bold text-red-600'>Error Loading Group</h1>
            <p className='text-gray-600'>Unable to load group information. Please try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              Retry
            </button>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className='flex min-h-screen flex-col gap-6 p-4'>
          {/* Header Skeleton */}
          <div className='space-y-3'>
            <div className='h-12 bg-gray-200 rounded animate-pulse w-1/3'></div>
            <div className='h-4 bg-gray-200 rounded animate-pulse w-1/4'></div>
          </div>

          {/* Navigation Tabs Skeleton */}
          <div className='flex space-x-4 border-b pb-2'>
            {['Overview', 'Members', 'Trips', 'Settings'].map((tab, i) => (
              <div key={i} className='h-10 bg-gray-200 rounded animate-pulse w-20'></div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1'>
            {/* Left Column - Main Content */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Group Info Card */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='h-6 bg-gray-200 rounded animate-pulse w-1/3'></div>
                <div className='space-y-2'>
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-full'></div>
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-3/4'></div>
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-1/2'></div>
                </div>
                <div className='flex space-x-2 pt-2'>
                  <div className='h-8 bg-gray-200 rounded animate-pulse w-16'></div>
                  <div className='h-8 bg-gray-200 rounded animate-pulse w-20'></div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='h-6 bg-gray-200 rounded animate-pulse w-1/4'></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='border-l-4 border-gray-200 pl-4 py-3 space-y-2'>
                    <div className='flex items-center space-x-3'>
                      <div className='h-6 w-6 bg-gray-200 rounded-full animate-pulse'></div>
                      <div className='h-4 bg-gray-200 rounded animate-pulse w-1/3'></div>
                      <div className='h-3 bg-gray-200 rounded animate-pulse w-16'></div>
                    </div>
                    <div className='h-4 bg-gray-200 rounded animate-pulse w-2/3'></div>
                  </div>
                ))}
              </div>

              {/* Upcoming Events */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='h-6 bg-gray-200 rounded animate-pulse w-1/3'></div>
                {[1, 2].map((i) => (
                  <div key={i} className='flex items-center space-x-4 p-3 border rounded-lg'>
                    <div className='h-12 w-12 bg-gray-200 rounded animate-pulse'></div>
                    <div className='flex-1 space-y-2'>
                      <div className='h-4 bg-gray-200 rounded animate-pulse w-1/2'></div>
                      <div className='h-3 bg-gray-200 rounded animate-pulse w-1/3'></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className='space-y-6'>
              {/* Group Stats */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='h-5 bg-gray-200 rounded animate-pulse w-1/2'></div>
                <div className='grid grid-cols-2 gap-4'>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className='text-center space-y-1'>
                      <div className='h-8 bg-gray-200 rounded animate-pulse w-full'></div>
                      <div className='h-3 bg-gray-200 rounded animate-pulse w-3/4 mx-auto'></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members List */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='h-5 bg-gray-200 rounded animate-pulse w-1/3'></div>
                  <div className='h-4 bg-gray-200 rounded animate-pulse w-12'></div>
                </div>
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className='flex items-center space-x-3'>
                      <div className='h-8 w-8 bg-gray-200 rounded-full animate-pulse'></div>
                      <div className='flex-1'>
                        <div className='h-4 bg-gray-200 rounded animate-pulse w-2/3'></div>
                      </div>
                      <div className='h-6 w-6 bg-gray-200 rounded animate-pulse'></div>
                    </div>
                  ))}
                </div>
                <div className='h-8 bg-gray-200 rounded animate-pulse w-full'></div>
              </div>

              {/* Quick Actions */}
              <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
                <div className='h-5 bg-gray-200 rounded animate-pulse w-1/2'></div>
                <div className='space-y-2'>
                  {['Invite Members', 'Create Trip', 'Share Group'].map((action, i) => (
                    <div key={i} className='h-10 bg-gray-200 rounded animate-pulse w-full'></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  // Tab content components
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className='space-y-6'>
            {/* Group Information */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold mb-4'>Group Information</h2>
              <div className='space-y-3'>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Group Name</label>
                  <p className='text-lg'>{group?.name}</p>
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Created</label>
                  <p className='text-sm text-gray-600'>
                    {/* DON'T CHANGE THIS */}
                    {group?.createdAt ? supabaseTimestampToDate(group.createdAt.seconds, group.createdAt.nanoseconds, 'MM/DD/YYYY') : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Total Trips</label>
                  <p className='text-sm text-gray-600'>{group?.tripIds?.length || 0}</p>
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Members</label>
                  <p className='text-sm text-gray-600'>{Object.keys(group?.groupMembers || {}).length}</p>
                </div>
              </div>
            </div>

            {/* Group Chat */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center mb-4'>
                <MessageCircle className='h-5 w-5 mr-2 text-blue-500' />
                <h2 className='text-xl font-semibold'>Group Chat</h2>
              </div>
              
              {/* Chat Messages */}
              <div className='h-80 border rounded-lg p-4 mb-4 overflow-y-auto bg-gray-50'>
                {messagesLoading ? (
                  <div className='flex items-center justify-center h-full'>
                    <div className='text-gray-500'>Loading messages...</div>
                  </div>
                ) : messages.length > 0 ? (
                  <div className='space-y-3'>
                    {messages.map((message) => {
                      const sender = memberMap.get(message.senderId);
                      const isOwnMessage = message.senderId === currentUser?.uid;
                      const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Unknown User';
                      const senderInitials = sender ? `${sender.firstName.charAt(0)}${sender.lastName.charAt(0)}`.toUpperCase() : '?';
                      
                      return (
                        <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {senderInitials}
                            </div>
                            <div className={`rounded-lg p-3 ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                              <div className={`text-xs mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                {isOwnMessage ? 'You' : senderName}
                              </div>
                              <p className='text-sm'>{message.text}</p>
                              <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                                {formatMessageTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className='flex items-center justify-center h-full text-gray-500'>
                    <div className='text-center'>
                      <MessageCircle className='h-8 w-8 mx-auto mb-2 text-gray-400' />
                      <p>No messages yet</p>
                      <p className='text-sm'>Start a conversation with your group!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className='flex space-x-2'>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder='Type a message...'
                  className='flex-1'
                  disabled={!groupConversationId}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !groupConversationId}
                  className='px-4 py-2 bg-blue-500 text-white hover:bg-blue-600'
                >
                  <Send className='h-4 w-4' />
                </Button>
              </div>
              
              {!groupConversationId && (
                <p className='text-sm text-gray-500 mt-2'>
                  Chat will be available once the group has multiple members.
                </p>
              )}
            </div>
          </div>
        );

      case 'members':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold'>Members ({Object.keys(group?.groupMembers || {}).length})</h2>
                {canManageGroup && (
                  <Button 
                    onClick={() => setInviteDialogOpen(true)}
                    className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Invite Members
                  </Button>
                )}
              </div>
              <div className='space-y-3'>
                {/* Actual Members */}
                {Object.entries(group?.groupMembers || {}).map(([userId, role]) => {
                  const user = memberMap.get(userId);
                  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : `User ${userId.slice(0, 8)}`;
                  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : userId.charAt(0).toUpperCase();
                  const isCurrentUser = userId === currentUser?.uid;
                  
                  return (
                    <div key={userId} className='flex items-center justify-between p-3 border rounded-lg'>
                      <div className='flex items-center space-x-3'>
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {initials}
                        </div>
                        <div>
                          <p className='font-medium'>{displayName}</p>
                          <p className='text-sm text-gray-500'>{user?.email || 'Loading...'}</p>
                        </div>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          role === 'manager' ? 'bg-purple-100 text-purple-800' :
                          role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {role}
                        </span>
                        {canChangeRoles && !isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(userId, role)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Invited Users */}
                {group?.invitedUsers && group.invitedUsers.length > 0 && (
                  <>
                    <div className='border-t pt-4 mt-4'>
                      <h3 className='text-lg font-medium text-gray-700 mb-3'>Invited Users ({group.invitedUsers.length})</h3>
                      <div className='space-y-3'>
                        {group.invitedUsers.map((email, index) => (
                          <div key={`invited-${index}`} className='flex items-center justify-between p-3 border rounded-lg bg-gray-50'>
                            <div className='flex items-center space-x-3'>
                              <div className="w-10 h-10 bg-gray-400 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                {email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className='font-medium text-gray-600'>{email}</p>
                                <p className='text-sm text-gray-500'>Pending invitation</p>
                              </div>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <span className='px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800'>
                                Invited
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'trips':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold'>Trips ({group?.tripIds?.length || 0})</h2>
                <button className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
                  Create New Trip
                </button>
              </div>
              <div className='space-y-4'>
                {group?.tripIds && group.tripIds.length > 0 ? (
                  group.tripIds.map((tripId, index) => (
                    <div key={tripId} className='border rounded-lg p-4 hover:bg-gray-50'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h3 className='font-medium'>Trip {index + 1}</h3>
                          <p className='text-sm text-gray-500'>Trip ID: {tripId}</p>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <button className='px-3 py-1 text-sm border rounded hover:bg-gray-50'>
                            View
                          </button>
                          <button className='px-3 py-1 text-sm border rounded hover:bg-gray-50'>
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <div className='mb-4'>
                      <svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                      </svg>
                    </div>
                    <p className='text-lg font-medium'>No trips yet</p>
                    <p className='text-sm'>Create your first trip to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold'>Group Settings</h2>
                {canManageGroup ? (
                  !isEditing ? (
                    <button 
                      onClick={startEditing}
                      className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                      Edit Settings
                    </button>
                  ) : (
                    <div className='flex space-x-2'>
                      <button 
                        onClick={handleCancelEdit}
                        className='px-4 py-2 border border-gray-300 rounded hover:bg-gray-50'
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveChanges}
                        disabled={updateGroupMutation.isPending}
                        className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50'
                      >
                        {updateGroupMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )
                ) : (
                  <div className='text-sm text-gray-500'>
                    Only managers and admins can edit settings
                  </div>
                )}
              </div>
              
              <div className='space-y-6'>
                {/* Group Name */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Group Name</label>
                  {isEditing && canManageGroup ? (
                    <input
                      type='text'
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      placeholder='Enter group name'
                    />
                  ) : (
                    <p className='text-lg'>{group?.name}</p>
                  )}
                </div>

                {/* Group Icon */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Group Icon</label>
                  {isEditing && canManageGroup ? (
                    <div className='space-y-4'>
                      <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3'>
                        {iconInstance.getAllIcons().map(({ name, svg }) => (
                          <button
                            key={name}
                            onClick={() => setSelectedIcon(name)}
                            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center hover:bg-gray-50 transition-colors ${
                              selectedIcon === name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                            }`}
                            title={name}
                          >
                            <div 
                              className={`w-6 h-6 transition-colors ${
                                selectedIcon === name ? 'text-blue-600' : 'text-gray-600'
                              }`}
                              dangerouslySetInnerHTML={{ __html: svg }}
                            />
                          </button>
                        ))}
                      </div>
                      <p className='text-sm text-gray-500'>
                        Selected: {selectedIcon ? iconInstance.getIconEntry(selectedIcon)?.name : 'None'}
                      </p>
                    </div>
                  ) : (
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 flex items-center justify-center'>
                        {group?.groupIcon ? (
                          <div 
                            className='w-6 h-6 text-gray-600'
                            dangerouslySetInnerHTML={{ 
                              __html: iconInstance.getIcon(group.groupIcon) || iconInstance.getIcon('airplane') || ''
                            }}
                          />
                        ) : (
                          <div 
                            className='w-6 h-6 text-gray-600'
                            dangerouslySetInnerHTML={{ __html: iconInstance.getIcon('airplane') || '' }}
                          />
                        )}
                      </div>
                      <span className='text-sm text-gray-600'>
                        {group?.groupIcon || 'airplane'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Group Color */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Group Color</label>
                  {isEditing && canManageGroup ? (
                    <div className='space-y-3'>
                      <div className='flex flex-wrap gap-2'>
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setSelectedColor(color.value)}
                            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center hover:opacity-80 ${
                              selectedColor === color.value ? 'border-gray-800' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <p className='text-sm text-gray-500'>Selected: {selectedColor}</p>
                    </div>
                  ) : (
                    <div className='flex items-center space-x-2'>
                      <div 
                        className='w-8 h-8 rounded-full border-2 border-gray-300'
                        style={{ backgroundColor: group?.groupColor || '#6A8D73' }}
                      ></div>
                      <span className='text-sm text-gray-600'>{group?.groupColor || '#6A8D73'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canManageGroup && (
              <div className='bg-white rounded-lg shadow-sm border p-6'>
                <h2 className='text-xl font-semibold mb-4 text-red-600'>Danger Zone</h2>
                <div className='space-y-3'>
                  <button className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'>
                    Delete Group
                  </button>
                  <p className='text-sm text-gray-500'>
                    Once you delete a group, there is no going back. Please be certain.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Actual content when data is loaded
  return (
    <ProtectedLayout>
      <div className='flex min-h-screen flex-col gap-6 p-4'>
        {/* Header */}
        <div className='space-y-2'>
          <h1 className='text-5xl font-bold'>{group?.name}</h1>
          <p className='text-gray-600'>
            {group?.tripIds?.length || 0} trips • {Object.keys(group?.groupMembers || {}).length} members
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className='flex space-x-4 border-b pb-2'>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'members', label: 'Members' },
            { id: 'trips', label: 'Trips' },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'members' | 'trips' | 'settings')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1'>
          {/* Left Column - Tab Content */}
          <div className='lg:col-span-2'>
            {renderTabContent()}
          </div>

          {/* Right Column - Sidebar */}
          <div className='space-y-6'>
            {/* Group Stats */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h3 className='text-lg font-semibold mb-4'>Group Stats</h3>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>{group?.tripIds?.length || 0}</div>
                  <div className='text-sm text-gray-500'>Trips</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-green-600'>{Object.keys(group?.groupMembers || {}).length}</div>
                  <div className='text-sm text-gray-500'>Members</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-purple-600'>{group?.invitedUsers?.length || 0}</div>
                  <div className='text-sm text-gray-500'>Invited</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-orange-600'>
                    {group?.createdAt ? supabaseTimestampToDate(group.createdAt.seconds, group.createdAt.nanoseconds, 'MM/DD/YYYY') : 'Unknown'}
                  </div>
                  <div className='text-sm text-gray-500'>Created</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h3 className='text-lg font-semibold mb-4'>Quick Actions</h3>
              <div className='space-y-2'>
                <button className='w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer'>
                  Create New Trip
                </button>
                {canManageGroup && (
                  <button 
                    onClick={() => setInviteDialogOpen(true)}
                    className='w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer'
                  >
                    Invite Members
                  </button>
                )}
                <button className='w-full px-4 py-2 border border-gray-300 rounde bg-gray-100 hover:bg-gray-200 cursor-pointer'>
                  Share Group
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Members Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Members</DialogTitle>
            <DialogDescription>
              Add email addresses to invite people to your group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="emailInput"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Addresses
              </label>
              <div className="flex gap-2">
                <Input
                  id="emailInput"
                  value={emailInput}
                  onChange={handleEmailInputChange}
                  placeholder="Enter email address"
                  onKeyPress={handleKeyPress}
                  type="email"
                  className={emailError ? "border-red-500" : ""}
                />
                <Button onClick={addEmail} disabled={!emailInput.trim()}>
                  Add
                </Button>
              </div>
              {emailError && (
                <p className="text-sm text-red-500 mt-1">{emailError}</p>
              )}
            </div>

            {emailList.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Added emails:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {emailList.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded"
                    >
                      <span className="text-sm">{email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail(email)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteMembers}
              disabled={emailList.length === 0 || inviteMembersMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {inviteMembersMutation.isPending ? "Inviting..." : "Send Invites"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUserName} in this group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <div className="space-y-2">
                {roleOptions.map((role) => (
                  <label key={role.value} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedUserRole === role.value}
                      onChange={(e) => setSelectedUserRole(e.target.value as "manager" | "admin" | "traveler")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{role.label}</div>
                      <div className="text-sm text-gray-500">{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setRoleChangeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoleChange}
              disabled={!selectedUserRole || changeRoleMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {changeRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}

export default Page
