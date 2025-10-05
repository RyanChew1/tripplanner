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
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Plus, MoreVertical, Edit2 } from 'lucide-react';
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
import { GroupChat } from '@/components/GroupChat';
import { Trip } from '@/types/trips';
import { getTripById } from '@/lib/tripService';
import LimitedAction from '@/components/LimitedAction';
import UsageIndicator from '@/components/UsageIndicator';
import AccessRestriction from '@/components/AccessRestriction';
import { Calendar, MapPin, Trash2 } from 'lucide-react';

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
  const router = useRouter();
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

  // Trip management state
  const [createTripDialogOpen, setCreateTripDialogOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [deleteTripDialogOpen, setDeleteTripDialogOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);

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
    createConversation,
    setCurrentConversationId,
    getConversationByGroupId
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

  // Helper function to reset trip form
  const resetTripForm = () => {
    setTripName('');
    setTripDescription('');
    setTripStartDate('');
    setTripEndDate('');
    setSelectedTripId('');
  };


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

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { createTrip } = await import('@/lib/tripService');
      return createTrip(tripData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setCreateTripDialogOpen(false);
      resetTripForm();
    },
  });

  // Update trip mutation
  const updateTripMutation = useMutation({
    mutationFn: async (tripData: Trip) => {
      const { updateTrip } = await import('@/lib/tripService');
      return updateTrip(tripData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setEditTripDialogOpen(false);
      resetTripForm();
    },
  });

  // Delete trip mutation
  const deleteTripMutation = useMutation({
    mutationFn: async ({ groupId, tripId }: { groupId: string; tripId: string }) => {
      const { deleteTrip } = await import('@/lib/tripService');
      return deleteTrip(groupId, tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setDeleteTripDialogOpen(false);
      setSelectedTripId('');
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

  // Load trips when group data changes
  useEffect(() => {
    const fetchTrips = async () => {
      if (!group?.tripIds || group.tripIds.length === 0) {
        setTrips([]);
        return;
      }

      try {
        const tripPromises = group.tripIds.map(id => getTripById(id));
        const loadedTrips = await Promise.all(tripPromises);
        setTrips(loadedTrips.filter(trip => trip !== null) as Trip[]);
      } catch (error) {
        console.error('Error loading trips:', error);
        setTrips([]);
      }
    };

    fetchTrips();
  }, [group?.tripIds]);

  // Create or find group conversation
  useEffect(() => {
    const initializeGroupChat = async () => {
      if (!currentUser || !group || !memberIds.length) return;

      // Look for existing conversation with all group members
      const groupConversation = await getConversationByGroupId(groupId);
      if (groupConversation) {
        setCurrentConversationId(groupConversation.id);
      } else if (memberIds.length > 1) {
        // Create new group conversation
        createConversation({ id: groupId, members: memberIds })
          .then(conversationId => {
            setCurrentConversationId(conversationId);
          })
          .catch(error => console.error('Error creating group conversation:', error));
      }
    }
    initializeGroupChat();
  }, [currentUser, group, memberIds, groupId, createConversation, setCurrentConversationId, getConversationByGroupId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

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



  const startEditing = () => {
    setEditedName(group?.name || '');
    setSelectedIcon(group?.groupIcon || 'airplane');
    setSelectedColor(group?.groupColor || '#6A8D73');
    setIsEditing(true);
  };

  // Trip handlers
  const handleCreateTrip = () => {
    if (!tripName || !tripStartDate || !tripEndDate) return;

    createTripMutation.mutate({
      name: tripName,
      description: tripDescription,
      groupId: groupId,
      startDate: tripStartDate,
      endDate: tripEndDate,
      flights: [],
      hotels: [],
    });
  };

  const handleEditTrip = (trip: Trip) => {
    setSelectedTripId(trip.id || '');
    setTripName(trip.name);
    setTripDescription(trip.description);
    setTripStartDate(trip.startDate);
    setTripEndDate(trip.endDate);
    setEditTripDialogOpen(true);
  };

  const handleUpdateTrip = () => {
    if (!selectedTripId || !tripName || !tripStartDate || !tripEndDate) return;

    updateTripMutation.mutate({
      id: selectedTripId,
      name: tripName,
      description: tripDescription,
      groupId: groupId,
      startDate: tripStartDate,
      endDate: tripEndDate,
      flights: [],
      hotels: [],
    });
  };

  const handleDeleteTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setDeleteTripDialogOpen(true);
  };

  const confirmDeleteTrip = () => {
    if (!selectedTripId) return;
    deleteTripMutation.mutate({ groupId, tripId: selectedTripId });
  };

  const formatTripDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleViewTrip = (tripId: string) => {
    router.push(`/trips/${tripId}`);
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
            <GroupChat
              conversationService={conversationService}
              currentUser={currentUser}
              groupId={groupId}
              groupMembers={group?.groupMembers || {}}
              memberMap={memberMap}
              canManageGroup={canManageGroup}
            />
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
                <h2 className='text-xl font-semibold'>Trips ({trips.length})</h2>
                {canManageGroup && (
                  <LimitedAction
                    actionType="trips"
                    onAction={() => setCreateTripDialogOpen(true)}
                  >
                    <Button 
                      className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                      <Plus className='h-4 w-4 mr-2' />
                      Create New Trip
                    </Button>
                  </LimitedAction>
                )}
              </div>
              <div className='space-y-4'>
                {trips.length > 0 ? (
                  trips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className='border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer'
                      onClick={() => handleViewTrip(trip.id!)}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-lg mb-2'>{trip.name}</h3>
                          {trip.description && (
                            <p className='text-sm text-gray-600 mb-3'>{trip.description}</p>
                          )}
                          <div className='flex items-center space-x-4 text-sm text-gray-500'>
                            <div className='flex items-center space-x-1'>
                              <Calendar className='h-4 w-4' />
                              <span>{formatTripDate(trip.startDate)}</span>
                            </div>
                            <span>-</span>
                            <div className='flex items-center space-x-1'>
                              <Calendar className='h-4 w-4' />
                              <span>{formatTripDate(trip.endDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2 ml-4'>
                          {canManageGroup && (
                            <>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTrip(trip);
                                }}
                                variant="outline"
                                size="sm"
                                className='px-3 py-1 text-sm'
                              >
                                <Edit2 className='h-3 w-3 mr-1' />
                                Edit
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTrip(trip.id!);
                                }}
                                variant="outline"
                                size="sm"
                                className='px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50'
                              >
                                <Trash2 className='h-3 w-3 mr-1' />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <div className='mb-4'>
                      <MapPin className='mx-auto h-12 w-12 text-gray-400' />
                    </div>
                    <p className='text-lg font-medium'>No trips yet</p>
                    <p className='text-sm mb-4'>Create your first trip to get started</p>
                    {canManageGroup && (
                      <LimitedAction
                        actionType="trips"
                        onAction={() => setCreateTripDialogOpen(true)}
                      >
                        <Button 
                          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                        >
                          <Plus className='h-4 w-4 mr-2' />
                          Create Your First Trip
                        </Button>
                      </LimitedAction>
                    )}
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
      <AccessRestriction resourceType="groups" resourceId={groupId}>
        <div className='flex min-h-screen flex-col gap-6 p-4'>
        {/* Header */}
        <div className='space-y-2'>
          <h1 className='text-5xl font-bold'>{group?.name}</h1>
          <p className='text-gray-600'>
            {trips.length} trips • {Object.keys(group?.groupMembers || {}).length} members
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
                  <div className='text-2xl font-bold text-blue-600'>{trips.length}</div>
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

            {/* Usage Indicator for Free Users */}
            <UsageIndicator className="mb-6" />

            {/* Quick Actions */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h3 className='text-lg font-semibold mb-4'>Quick Actions</h3>
              <div className='space-y-2'>
                {canManageGroup && (
                  <LimitedAction
                    actionType="trips"
                    onAction={() => setCreateTripDialogOpen(true)}
                  >
                    <button 
                      className='w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer'
                    >
                      Create New Trip
                    </button>
                  </LimitedAction>
                )}
                {canManageGroup && (
                  <button 
                    onClick={() => setInviteDialogOpen(true)}
                    className='w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer'
                  >
                    Invite Members
                  </button>
                )}
                <button className='w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer'>
                  Share Group
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </AccessRestriction>

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

      {/* Create Trip Dialog */}
      <Dialog open={createTripDialogOpen} onOpenChange={setCreateTripDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
            <DialogDescription>
              Add a new trip to your group. All group members will be able to see and participate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="tripName" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Name *
              </label>
              <Input
                id="tripName"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g., Summer Vacation 2025"
                required
              />
            </div>

            <div>
              <label htmlFor="tripDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="tripDescription"
                value={tripDescription}
                onChange={(e) => setTripDescription(e.target.value)}
                placeholder="Add details about your trip..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tripStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  id="tripStartDate"
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="tripEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  id="tripEndDate"
                  type="date"
                  value={tripEndDate}
                  onChange={(e) => setTripEndDate(e.target.value)}
                  min={tripStartDate}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setCreateTripDialogOpen(false);
              resetTripForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTrip}
              disabled={!tripName || !tripStartDate || !tripEndDate || createTripMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {createTripMutation.isPending ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Trip Dialog */}
      <Dialog open={editTripDialogOpen} onOpenChange={setEditTripDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
            <DialogDescription>
              Update the details for this trip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="editTripName" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Name *
              </label>
              <Input
                id="editTripName"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g., Summer Vacation 2025"
                required
              />
            </div>

            <div>
              <label htmlFor="editTripDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="editTripDescription"
                value={tripDescription}
                onChange={(e) => setTripDescription(e.target.value)}
                placeholder="Add details about your trip..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editTripStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  id="editTripStartDate"
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => setTripStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="editTripEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  id="editTripEndDate"
                  type="date"
                  value={tripEndDate}
                  onChange={(e) => setTripEndDate(e.target.value)}
                  min={tripStartDate}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setEditTripDialogOpen(false);
              resetTripForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTrip}
              disabled={!tripName || !tripStartDate || !tripEndDate || updateTripMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {updateTripMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trip Dialog */}
      <Dialog open={deleteTripDialogOpen} onOpenChange={setDeleteTripDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setDeleteTripDialogOpen(false);
              setSelectedTripId('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteTrip}
              disabled={deleteTripMutation.isPending}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  )
}

export default Page
