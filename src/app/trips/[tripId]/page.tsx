"use client";

import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useGetTripById } from '@/hooks/useTrip';
import { useGetGroupById } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Users, ArrowLeft, Edit2, Trash2, Plus, Clock, Plane, Hotel, Image } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getUserById } from '@/lib/userService';
import { User } from '@/types/users';
import { CalendarEvent, EventCategory } from '@/types/calendars';
import { FlightOffer } from '@/types/flights';
import { HotelOffer } from '@/types/hotels';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '@/lib/calendarService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import TripFlightSearch from '@/components/booking/TripFlightSearch';
import TripHotelSearch from '@/components/booking/TripHotelSearch';
import AccessRestriction from '@/components/AccessRestriction';
import AlbumView from '@/components/albums/AlbumView';
import { useGetAlbumByTripId, useCheckAllMembersPremium } from '@/hooks/useAlbum';

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

const TripPage = ({ params }: { params: Promise<{ tripId: string }> }) => {
  const { tripId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: trip, isLoading, error } = useGetTripById(tripId);
  const { data: group } = useGetGroupById(trip?.groupId || '');
  
  // Get tab from URL parameter, default to 'overview'
  const tabFromUrl = searchParams.get('tab') as 'overview' | 'itinerary' | 'flights' | 'hotels' | 'album' | 'settings' | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'flights' | 'hotels' | 'album' | 'settings'>(
    tabFromUrl || 'overview'
  );

  // Sync activeTab with URL changes
  React.useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [deleteTripDialogOpen, setDeleteTripDialogOpen] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');

  // Calendar event state
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventLocationId, setEventLocationId] = useState('');
  const [eventMemberIds, setEventMemberIds] = useState<string[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  
  // Filter state
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);

  // Get member user IDs from group
  const memberIds = useMemo(() => {
    return group?.groupMembers ? Object.keys(group.groupMembers) : [];
  }, [group?.groupMembers]);

  // Fetch user data for all members
  const { data: members = [] } = useGetUsersByIds(memberIds);

  // Check if all members are premium for album access
  const { data: isAllMembersPremium = false } = useCheckAllMembersPremium(memberIds);

  // Get album for this trip
  const { data: album } = useGetAlbumByTripId(tripId);

  // Handle URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'overview' | 'itinerary' | 'flights' | 'hotels' | 'album' | 'settings' | null;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Create a map of userId to user data
  const memberMap = useMemo(() => {
    const map = new Map<string, User>();
    members.forEach(member => {
      if (member.id) {
        map.set(member.id, member);
      }
    });
    return map;
  }, [members]);

  // Fetch calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["calendarEvents", trip?.calendarId],
    queryFn: () => {
      if (!trip?.calendarId) return [];
      return getCalendarEvents(trip.calendarId);
    },
    enabled: !!trip?.calendarId,
    staleTime: 1000 * 60 * 2,
  });

  // Filter events based on user participation and categories
  const filteredEvents = useMemo(() => {
    let filtered = calendarEvents;

    // Filter by user participation
    if (showMyEventsOnly && currentUser?.uid) {
      filtered = filtered.filter(event => event.memberIds.includes(currentUser.uid));
    }

    // Filter by categories (show events that have ANY of the selected categories)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => 
        event.categories && event.categories.some(cat => selectedCategories.includes(cat))
      );
    }

    return filtered;
  }, [calendarEvents, showMyEventsOnly, currentUser?.uid, selectedCategories]);

  // Get current user's role in the group
  const currentUserRole = useMemo(() => {
    if (!currentUser?.uid || !group?.groupMembers) return null;
    return group.groupMembers[currentUser.uid] || null;
  }, [currentUser?.uid, group?.groupMembers]);

  // Check if current user can manage the trip
  const canManageTrip = useMemo(() => {
    return currentUserRole === 'admin' || currentUserRole === 'manager';
  }, [currentUserRole]);

  // Update trip mutation
  const updateTripMutation = useMutation({
    mutationFn: async (tripData: {
      id: string;
      name: string;
      description: string;
      groupId: string;
      startDate: string;
      endDate: string;
      flights?: FlightOffer[];
      hotels?: HotelOffer[];
    }) => {
      const { updateTrip } = await import('@/lib/tripService');
      return updateTrip({
        ...tripData,
        flights: tripData.flights || [],
        hotels: tripData.hotels || []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      queryClient.invalidateQueries({ queryKey: ["group", trip?.groupId] });
      setEditTripDialogOpen(false);
      resetTripForm();
    },
    onError: (error) => {
      console.error('Error updating trip:', error);
      alert('Failed to update trip. Please try again.');
    },
  });

  // Delete trip mutation
  const deleteTripMutation = useMutation({
    mutationFn: async ({ groupId, tripId }: { groupId: string; tripId: string }) => {
      const { deleteTrip } = await import('@/lib/tripService');
      return deleteTrip(groupId, tripId);
    },
    onSuccess: () => {
      // Invalidate group query to update trip list
      queryClient.invalidateQueries({ queryKey: ["group", trip?.groupId] });
      
      // Navigate back to the group page after successful deletion
      if (trip?.groupId) {
        router.push(`/groups/${trip.groupId}`);
      }
    },
    onError: (error) => {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
      setDeleteTripDialogOpen(false);
    },
  });

  // Create calendar event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!trip?.calendarId) throw new Error('No calendar ID');
      return createCalendarEvent(trip.calendarId, eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents", trip?.calendarId] });
      setCreateEventDialogOpen(false);
      resetEventForm();
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    },
  });

  // Update calendar event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventData: CalendarEvent) => {
      return updateCalendarEvent(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents", trip?.calendarId] });
      setEditEventDialogOpen(false);
      resetEventForm();
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    },
  });

  // Delete calendar event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return deleteCalendarEvent(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents", trip?.calendarId] });
      setDeleteEventDialogOpen(false);
      setSelectedEventId('');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
      setDeleteEventDialogOpen(false);
    },
  });

  const formatTripDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const calculateTripDuration = () => {
    if (!trip?.startDate || !trip?.endDate) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end days
  };

  const formatFlightTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '--:--';
    }
  };


  const resetTripForm = () => {
    setTripName('');
    setTripDescription('');
    setTripStartDate('');
    setTripEndDate('');
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventStartDate('');
    setEventStartTime('');
    setEventEndDate('');
    setEventEndTime('');
    setEventNote('');
    setEventLocationId('');
    setEventMemberIds([]);
    setEventCategories([]);
    setSelectedEventId('');
  };

  const handleEditTrip = () => {
    if (!trip) return;
    setTripName(trip.name);
    setTripDescription(trip.description);
    setTripStartDate(trip.startDate);
    setTripEndDate(trip.endDate);
    setEditTripDialogOpen(true);
  };

  const handleUpdateTrip = () => {
    if (!tripId || !tripName || !tripStartDate || !tripEndDate || !trip?.groupId) return;

    updateTripMutation.mutate({
      id: tripId,
      name: tripName,
      description: tripDescription,
      groupId: trip.groupId,
      startDate: tripStartDate,
      endDate: tripEndDate,
      flights: trip.flights || [],
      hotels: trip.hotels || [],
    });
  };

  const handleCancelEdit = () => {
    setEditTripDialogOpen(false);
    resetTripForm();
  };

  const handleDeleteTrip = () => {
    setDeleteTripDialogOpen(true);
  };

  const confirmDeleteTrip = () => {
    if (!trip?.groupId) return;
    deleteTripMutation.mutate({ groupId: trip.groupId, tripId });
  };

  const handleCancelDelete = () => {
    setDeleteTripDialogOpen(false);
  };

  // Calendar event handlers
  const handleCreateEvent = () => {
    if (!eventTitle || !eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime) return;

    const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: eventTitle,
      startDate: {
        date: new Date(eventStartDate),
        time: eventStartTime,
      },
      endDate: {
        date: new Date(eventEndDate),
        time: eventEndTime,
      },
      locationId: eventLocationId || '',
      note: eventNote,
      memberIds: eventMemberIds.length > 0 ? eventMemberIds : memberIds,
      categories: eventCategories,
    };

    createEventMutation.mutate(eventData);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEventId(event.id || '');
    setEventTitle(event.title);
    setEventStartDate(new Date(event.startDate.date).toISOString().split('T')[0]);
    setEventStartTime(event.startDate.time);
    setEventEndDate(new Date(event.endDate.date).toISOString().split('T')[0]);
    setEventEndTime(event.endDate.time);
    setEventNote(event.note || '');
    setEventLocationId(event.locationId);
    setEventMemberIds(event.memberIds);
    setEventCategories(event.categories || []);
    setEditEventDialogOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!selectedEventId || !eventTitle || !eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime) return;

    const eventData: CalendarEvent = {
      id: selectedEventId,
      title: eventTitle,
      startDate: {
        date: new Date(eventStartDate),
        time: eventStartTime,
      },
      endDate: {
        date: new Date(eventEndDate),
        time: eventEndTime,
      },
      locationId: eventLocationId || '',
      note: eventNote,
      memberIds: eventMemberIds.length > 0 ? eventMemberIds : memberIds,
      categories: eventCategories,
    };

    updateEventMutation.mutate(eventData);
  };

  const handleDeleteEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setDeleteEventDialogOpen(true);
  };

  const confirmDeleteEvent = () => {
    if (!selectedEventId) return;
    deleteEventMutation.mutate(selectedEventId);
  };

  const toggleMemberForEvent = (memberId: string) => {
    setEventMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleCategoryForEvent = (category: EventCategory) => {
    setEventCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };

  const toggleCategoryFilter = (category: EventCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
  };

  const formatEventDateTime = (dateObj: { date: Date; time: string }) => {
    const date = new Date(dateObj.date);
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${dateObj.time}`;
  };

  const getCategoryIcon = (category: EventCategory) => {
    switch (category) {
      case 'excursion': return '🏔️';
      case 'dining': return '🍽️';
      case 'transportation': return '🚗';
      case 'accommodation': return '🏨';
      case 'leisure': return '🎭';
      case 'event': return '🎉';
      default: return '📌';
    }
  };

  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case 'excursion': return 'bg-green-100 text-green-800';
      case 'dining': return 'bg-orange-100 text-orange-800';
      case 'transportation': return 'bg-blue-100 text-blue-800';
      case 'accommodation': return 'bg-purple-100 text-purple-800';
      case 'leisure': return 'bg-pink-100 text-pink-800';
      case 'event': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <ProtectedLayout>
        <div className='flex min-h-screen flex-col items-center justify-center p-4'>
          <div className='text-center space-y-4'>
            <h1 className='text-2xl font-bold text-red-600'>Error Loading Trip</h1>
            <p className='text-gray-600'>Unable to load trip information. Please try again.</p>
            <Button 
              onClick={() => router.back()} 
              className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              Go Back
            </Button>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (isLoading || !trip) {
    return (
      <ProtectedLayout>
        <div className='flex min-h-screen flex-col gap-6 p-4'>
          {/* Loading skeleton */}
          <div className='space-y-3'>
            <div className='h-12 bg-gray-200 rounded animate-pulse w-1/3'></div>
            <div className='h-4 bg-gray-200 rounded animate-pulse w-1/4'></div>
          </div>
          <div className='bg-white rounded-lg shadow-sm border p-6 space-y-4'>
            <div className='h-6 bg-gray-200 rounded animate-pulse w-1/3'></div>
            <div className='space-y-2'>
              <div className='h-4 bg-gray-200 rounded animate-pulse w-full'></div>
              <div className='h-4 bg-gray-200 rounded animate-pulse w-3/4'></div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className='space-y-6'>
            {/* Trip Details */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold mb-4'>Trip Details</h2>
              <div className='space-y-4'>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Description</label>
                  <p className='text-base text-gray-700'>
                    {trip.description || 'No description provided.'}
                  </p>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium text-gray-500'>Start Date</label>
                    <p className='text-base text-gray-700'>{formatTripDate(trip.startDate)}</p>
                  </div>
                  <div>
                    <label className='text-sm font-medium text-gray-500'>End Date</label>
                    <p className='text-base text-gray-700'>{formatTripDate(trip.endDate)}</p>
                  </div>
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-500'>Duration</label>
                  <p className='text-base text-gray-700'>
                    {calculateTripDuration()} {calculateTripDuration() === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </div>

            {/* Group Members */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold mb-4'>
                Travelers ({members.length})
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {members.map(member => {
                  const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
                  const role = group?.groupMembers[member.id!];
                  
                  return (
                    <div key={member.id} className='flex items-center space-x-3 p-3 border rounded-lg'>
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        {initials}
                      </div>
                      <div className='flex-1'>
                        <p className='font-medium'>{`${member.firstName} ${member.lastName}`}</p>
                        <p className='text-sm text-gray-500'>{member.email}</p>
                      </div>
                      {role && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          role === 'manager' ? 'bg-purple-100 text-purple-800' :
                          role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {role}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Saved Flights */}
            {trip.flights && trip.flights.length > 0 && (
              <div className='bg-white rounded-lg shadow-sm border p-6'>
                <div className='flex items-center space-x-2 mb-4'>
                  <Plane className='h-6 w-6 text-blue-600' />
                  <h2 className='text-xl font-semibold'>Saved Flights ({trip.flights.length})</h2>
                </div>
                <div className='space-y-3'>
                  {trip.flights.map((flight, index) => (
                    <div key={flight.id || index} className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'>
                      <div className='flex justify-between items-start'>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-4 mb-2'>
                            <div className='text-center'>
                              <div className='text-lg font-bold text-blue-600'>
                                {formatFlightTime(flight.itineraries[0]?.segments[0]?.departure.at)}
                              </div>
                              <div className='text-sm text-gray-500'>
                                {flight.itineraries[0]?.segments[0]?.departure.iataCode}
                              </div>
                            </div>
                            <div className='flex-1 text-center'>
                              <div className='text-sm text-gray-500 mb-1'>
                                {flight.itineraries[0]?.duration}
                              </div>
                              <div className='flex items-center justify-center space-x-2'>
                                <div className='flex-1 h-px bg-gray-300'></div>
                                <Plane className='h-4 w-4 text-gray-400' />
                                <div className='flex-1 h-px bg-gray-300'></div>
                              </div>
                            </div>
                            <div className='text-center'>
                              <div className='text-lg font-bold text-blue-600'>
                                {formatFlightTime(flight.itineraries[0]?.segments[flight.itineraries[0].segments.length - 1]?.arrival.at)}
                              </div>
                              <div className='text-sm text-gray-500'>
                                {flight.itineraries[0]?.segments[flight.itineraries[0].segments.length - 1]?.arrival.iataCode}
                              </div>
                            </div>
                          </div>
                          <div className='text-sm text-gray-600'>
                            <span className='font-medium'>{flight.price.currency} {flight.price.total}</span>
                            <span className='ml-2'>• {flight.numberOfBookableSeats} seats available</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Hotels */}
            {trip.hotels && trip.hotels.length > 0 && (
              <div className='bg-white rounded-lg shadow-sm border p-6'>
                <div className='flex items-center space-x-2 mb-4'>
                  <Hotel className='h-6 w-6 text-green-600' />
                  <h2 className='text-xl font-semibold'>Saved Hotels ({trip.hotels.length})</h2>
                </div>
                <div className='space-y-3'>
                  {trip.hotels.map((hotel, index) => (
                    <div key={hotel.hotel.hotelId || index} className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'>
                      <div className='flex justify-between items-start'>
                        <div className='flex-1'>
                          <h4 className='font-semibold text-lg'>{hotel.hotel.name}</h4>
                          <p className='text-gray-600 text-sm mb-2'>{hotel.hotel.address?.lines?.[0]}</p>
                          
                          {hotel.hotel.rating && (
                            <div className='flex items-center space-x-2 mb-2'>
                              <span className='text-yellow-500'>★</span>
                              <span className='text-sm font-medium'>{hotel.hotel.rating}</span>
                            </div>
                          )}

                          {hotel.offers && hotel.offers.length > 0 && (
                            <div className='space-y-2'>
                              {hotel.offers.map((offer, offerIndex) => (
                                <div key={offerIndex} className='border-t pt-2'>
                                  <div className='flex justify-between items-center'>
                                    <div>
                                      <p className='font-medium'>{offer.room?.typeEstimated?.category || 'Standard Room'}</p>
                                      <p className='text-sm text-gray-600'>
                                        {offer.room?.typeEstimated?.beds} bed(s) • {offer.room?.typeEstimated?.bedType}
                                      </p>
                                    </div>
                                    <div className='text-right'>
                                      <p className='text-lg font-bold text-green-600'>
                                        {offer.price.currency} {offer.price.total}
                                      </p>
                                      <p className='text-sm text-gray-500'>total</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'itinerary':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex-1'>
                  <h2 className='text-xl font-semibold'>
                    Itinerary ({showMyEventsOnly ? filteredEvents.length : calendarEvents.length} events)
                  </h2>
                </div>
                {canManageTrip && (
                  <Button 
                    onClick={() => setCreateEventDialogOpen(true)}
                    className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Add Event
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className='mb-4 space-y-3'>
                {/* My Events Filter */}
                <div className='flex items-center space-x-2 p-3 bg-gray-50 rounded-lg'>
                  <input
                    type='checkbox'
                    id='myEventsFilter'
                    checked={showMyEventsOnly}
                    onChange={(e) => setShowMyEventsOnly(e.target.checked)}
                    className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                  />
                  <label htmlFor='myEventsFilter' className='text-sm font-medium text-gray-700 cursor-pointer'>
                    Show only events I&apos;m participating in
                  </label>
                  {showMyEventsOnly && (
                    <span className='ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full'>
                      Active
                    </span>
                  )}
                </div>

                {/* Category Filters */}
                <div className='p-3 bg-gray-50 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='text-sm font-medium text-gray-700'>
                      Filter by categories:
                    </label>
                    {selectedCategories.length > 0 && (
                      <button
                        onClick={() => setSelectedCategories([])}
                        className='px-2 py-1 text-xs text-gray-600 hover:text-gray-800 underline'
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                    {(['excursion', 'dining', 'transportation', 'accommodation', 'leisure', 'event'] as EventCategory[]).map(category => {
                      const isSelected = selectedCategories.includes(category);
                      return (
                        <label 
                          key={category} 
                          className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type='checkbox'
                            checked={isSelected}
                            onChange={() => toggleCategoryFilter(category)}
                            className='w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500'
                          />
                          <span className='text-sm flex items-center space-x-1'>
                            <span>{getCategoryIcon(category)}</span>
                            <span className='capitalize'>{category}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(showMyEventsOnly || selectedCategories.length > 0) && (
                  <div className='flex flex-wrap items-center gap-2 text-xs text-gray-600 px-3'>
                    <span className='font-medium'>Active filters:</span>
                    {showMyEventsOnly && (
                      <span className='px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full'>
                        My Events
                      </span>
                    )}
                    {selectedCategories.map(category => (
                      <span 
                        key={category}
                        className='px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full flex items-center space-x-1'
                      >
                        <span>{getCategoryIcon(category)}</span>
                        <span>{category}</span>
                        <button
                          onClick={() => toggleCategoryFilter(category)}
                          className='ml-1 hover:text-purple-900'
                          title='Remove filter'
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        setShowMyEventsOnly(false);
                        setSelectedCategories([]);
                      }}
                      className='ml-2 text-blue-600 hover:text-blue-800 underline'
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
              
              {eventsLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3].map(i => (
                    <div key={i} className='h-24 bg-gray-200 rounded animate-pulse'></div>
                  ))}
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className='space-y-3'>
                  {filteredEvents
                    .sort((a, b) => new Date(a.startDate.date).getTime() - new Date(b.startDate.date).getTime())
                    .map(event => {
                      const eventMembers = event.memberIds
                        .map(id => memberMap.get(id))
                        .filter(Boolean) as User[];
                      const isUserParticipating = currentUser?.uid && event.memberIds.includes(currentUser.uid);

                      return (
                        <div 
                          key={event.id} 
                          className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                            isUserParticipating ? 'border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center space-x-2 mb-2'>
                                <h3 className='font-semibold text-lg'>{event.title}</h3>
                                {isUserParticipating && (
                                  <span className='px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full'>
                                    You&apos;re going
                                  </span>
                                )}
                              </div>
                              
                              <div className='flex items-center space-x-2 text-sm text-gray-600 mb-2'>
                                <Clock className='h-4 w-4' />
                                <span>{formatEventDateTime(event.startDate)}</span>
                                <span>→</span>
                                <span>{formatEventDateTime(event.endDate)}</span>
                              </div>

                              {event.note && (
                                <p className='text-sm text-gray-600 mb-2'>{event.note}</p>
                              )}

                              {event.categories && event.categories.length > 0 && (
                                <div className='flex flex-wrap gap-1 mb-2'>
                                  {event.categories.map(category => (
                                    <span 
                                      key={category}
                                      className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(category)}`}
                                    >
                                      {getCategoryIcon(category)} {category}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {eventMembers.length > 0 && (
                                <div className='flex items-center space-x-2 mt-2'>
                                  <Users className='h-4 w-4 text-gray-500' />
                                  <div className='flex -space-x-2'>
                                    {eventMembers.slice(0, 3).map(member => {
                                      const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
                                      return (
                                        <div
                                          key={member.id}
                                          className='w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white'
                                          title={`${member.firstName} ${member.lastName}`}
                                        >
                                          {initials}
                                        </div>
                                      );
                                    })}
                                    {eventMembers.length > 3 && (
                                      <div className='w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white'>
                                        +{eventMembers.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {canManageTrip && (
                              <div className='flex items-center space-x-2 ml-4'>
                                <Button
                                  onClick={() => handleEditEvent(event)}
                                  variant="outline"
                                  size="sm"
                                  className='px-3 py-1 text-sm'
                                >
                                  <Edit2 className='h-3 w-3 mr-1' />
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeleteEvent(event.id!)}
                                  variant="outline"
                                  size="sm"
                                  className='px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50'
                                >
                                  <Trash2 className='h-3 w-3 mr-1' />
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className='text-center py-12 text-gray-500'>
                  <Calendar className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                  {(showMyEventsOnly || selectedCategories.length > 0) ? (
                    <>
                      <p className='text-lg font-medium'>No events matching filters</p>
                      <p className='text-sm mb-4'>
                        {showMyEventsOnly && selectedCategories.length > 0
                          ? `No ${selectedCategories.join(', ')} events you're participating in`
                          : showMyEventsOnly 
                            ? "You're not participating in any events yet"
                            : `No ${selectedCategories.join(', ')} events found`
                        }
                      </p>
                      <Button 
                        onClick={() => {
                          setShowMyEventsOnly(false);
                          setSelectedCategories([]);
                        }}
                        variant="outline"
                        className='px-4 py-2'
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className='text-lg font-medium'>No events yet</p>
                      <p className='text-sm mb-4'>Start planning your trip by adding events</p>
                      {canManageTrip && (
                        <Button 
                          onClick={() => setCreateEventDialogOpen(true)}
                          className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                        >
                          <Plus className='h-4 w-4 mr-2' />
                          Add Your First Event
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'flights':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center space-x-2 mb-4'>
                <Plane className='h-6 w-6 text-blue-600' />
                <h2 className='text-xl font-semibold'>Flight Search</h2>
              </div>
              <p className='text-gray-600 mb-6'>
                Search for flights for your trip. We&apos;ve pre-filled the departure and return dates based on your trip dates.
              </p>
              
              <TripFlightSearch 
                tripId={tripId}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                groupMembers={members.map(member => ({
                  id: member.id || '',
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email
                }))}
              />
            </div>
          </div>
        );

      case 'hotels':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <div className='flex items-center space-x-2 mb-4'>
                <Hotel className='h-6 w-6 text-green-600' />
                <h2 className='text-xl font-semibold'>Hotel Search</h2>
              </div>
              <p className='text-gray-600 mb-6'>
                Search for hotels for your trip. We&apos;ve pre-filled the check-in and check-out dates based on your trip dates.
              </p>
              
              <TripHotelSearch 
                tripId={tripId}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                groupMembers={members.map(member => ({
                  id: member.id || '',
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email
                }))}
              />
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold mb-4'>Trip Settings</h2>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Trip Name</label>
                  <p className='text-lg'>{trip.name}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Group</label>
                  <p className='text-base text-gray-700'>{group?.name || 'Loading...'}</p>
                </div>
                {canManageTrip && (
                  <div className='flex space-x-2 pt-4'>
                    <Button
                      onClick={handleEditTrip}
                      className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                      <Edit2 className='h-4 w-4 mr-2' />
                      Edit Trip
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {canManageTrip && (
              <div className='bg-white rounded-lg shadow-sm border p-6'>
                <h2 className='text-xl font-semibold mb-4 text-red-600'>Danger Zone</h2>
                <div className='space-y-3'>
                  <Button
                    onClick={handleDeleteTrip}
                    className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete Trip
                  </Button>
                  <p className='text-sm text-gray-500'>
                    Once you delete a trip, there is no going back. Please be certain.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'album':
        return (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h2 className='text-xl font-semibold mb-4'>Trip Album</h2>
              <AlbumView 
                albumId={album?.albumId || tripId} 
                tripId={tripId}
                isAllMembersPremium={isAllMembersPremium}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedLayout>
      <AccessRestriction resourceType="trips" resourceId={tripId}>
        <div className='flex min-h-screen flex-col gap-6 p-4'>
        {/* Back Button */}
        <Button
          onClick={() => router.push(`/groups/${trip.groupId}`)}
          variant="ghost"
          className='w-fit px-3 py-2'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Group
        </Button>

        {/* Header */}
        <div className='space-y-2'>
          <h1 className='text-5xl font-bold'>{trip.name}</h1>
          <div className='flex items-center space-x-4 text-gray-600'>
            <div className='flex items-center space-x-1'>
              <Calendar className='h-4 w-4' />
              <span>{formatShortDate(trip.startDate)} - {formatShortDate(trip.endDate)}</span>
            </div>
            <div className='flex items-center space-x-1'>
              <Users className='h-4 w-4' />
              <span>{members.length} travelers</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className='flex space-x-4 border-b pb-2'>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'itinerary', label: 'Itinerary' },
            { id: 'flights', label: 'Flights', icon: Plane },
            { id: 'hotels', label: 'Hotels', icon: Hotel },
            { id: 'album', label: 'Album', icon: Image },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const newTab = tab.id as 'overview' | 'itinerary' | 'flights' | 'hotels' | 'album' | 'settings';
                  setActiveTab(newTab);
                  
                  // Only clear URL parameter if it exists, otherwise just update the state
                  if (tabFromUrl) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('tab');
                    router.replace(url.pathname + url.search);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1'>
          {/* Left Column - Tab Content */}
          <div className='lg:col-span-2'>
            {renderTabContent()}
          </div>

          {/* Right Column - Sidebar */}
          <div className='space-y-6'>
            {/* Trip Stats */}
            <div className='bg-white rounded-lg shadow-sm border p-6'>
              <h3 className='text-lg font-semibold mb-4'>Trip Stats</h3>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>Duration</span>
                  <span className='font-medium'>{calculateTripDuration()} days</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>Events</span>
                  <span className='font-medium'>{calendarEvents.length}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>Travelers</span>
                  <span className='font-medium'>{members.length}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>Group</span>
                  <span className='font-medium'>{group?.name || 'Loading...'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {canManageTrip && (
              <div className='bg-white rounded-lg shadow-sm border p-6'>
                <h3 className='text-lg font-semibold mb-4'>Quick Actions</h3>
                <div className='space-y-2'>
                  <Button
                    onClick={handleEditTrip}
                    className='w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                  >
                    <Edit2 className='h-4 w-4 mr-2' />
                    Edit Trip Details
                  </Button>
                  <Button
                    onClick={handleDeleteTrip}
                    className='w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
                  >
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete Trip
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </AccessRestriction>

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
            <Button variant="outline" onClick={handleCancelEdit}>
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
              Are you sure you want to delete &ldquo;{trip.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleCancelDelete}>
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

      {/* Create Event Dialog */}
      <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new event to your trip itinerary.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <Input
                id="eventTitle"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., Visit Eiffel Tower"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  id="eventStartDate"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="eventStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <Input
                  id="eventStartTime"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  id="eventEndDate"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventStartDate}
                  required
                />
              </div>

              <div>
                <label htmlFor="eventEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <Input
                  id="eventEndTime"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="eventNote" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="eventNote"
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="Add any notes or details about this event..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['excursion', 'dining', 'transportation', 'accommodation', 'leisure', 'event'] as EventCategory[]).map(category => {
                  const isSelected = eventCategories.includes(category);
                  return (
                    <label 
                      key={category} 
                      className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCategoryForEvent(category)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex items-center space-x-1">
                        <span>{getCategoryIcon(category)}</span>
                        <span className="capitalize">{category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants (All members selected by default)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {members.map(member => {
                  const isSelected = eventMemberIds.length === 0 || eventMemberIds.includes(member.id!);
                  return (
                    <label key={member.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMemberForEvent(member.id!)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{`${member.firstName} ${member.lastName}`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setCreateEventDialogOpen(false);
              resetEventForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!eventTitle || !eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || createEventMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editEventDialogOpen} onOpenChange={setEditEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the details for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="editEventTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <Input
                id="editEventTitle"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., Visit Eiffel Tower"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editEventStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  id="editEventStartDate"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="editEventStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <Input
                  id="editEventStartTime"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editEventEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  id="editEventEndDate"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventStartDate}
                  required
                />
              </div>

              <div>
                <label htmlFor="editEventEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <Input
                  id="editEventEndTime"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="editEventNote" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="editEventNote"
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="Add any notes or details about this event..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['excursion', 'dining', 'transportation', 'accommodation', 'leisure', 'event'] as EventCategory[]).map(category => {
                  const isSelected = eventCategories.includes(category);
                  return (
                    <label 
                      key={category} 
                      className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCategoryForEvent(category)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex items-center space-x-1">
                        <span>{getCategoryIcon(category)}</span>
                        <span className="capitalize">{category}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {members.map(member => {
                  const isSelected = eventMemberIds.includes(member.id!);
                  return (
                    <label key={member.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMemberForEvent(member.id!)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{`${member.firstName} ${member.lastName}`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setEditEventDialogOpen(false);
              resetEventForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEvent}
              disabled={!eventTitle || !eventStartDate || !eventStartTime || !eventEndDate || !eventEndTime || updateEventMutation.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Dialog */}
      <Dialog open={deleteEventDialogOpen} onOpenChange={setDeleteEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setDeleteEventDialogOpen(false);
              setSelectedEventId('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteEvent}
              disabled={deleteEventMutation.isPending}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
};

export default TripPage;
