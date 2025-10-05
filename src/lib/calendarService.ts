import { Calendar, CalendarEvent } from "@/types/calendars";
import { db } from "./firebase";
import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";

// ==================== CALENDAR OPERATIONS ====================

/**
 * Create a new calendar
 */
export async function createCalendar(calendar: Omit<Calendar, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, "calendars"), {
            ...calendar,
            eventIds: calendar.eventIds || [],
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating calendar:", error);
        throw error;
    }
}

/**
 * Get calendar by ID
 */
export async function getCalendarById(id: string): Promise<Calendar | null> {
    try {
        const docRef = doc(db, "calendars", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return null;
        }
        
        return { id: docSnap.id, ...docSnap.data() } as Calendar;
    } catch (error) {
        console.error("Error getting calendar by id:", error);
        throw error;
    }
}

/**
 * Update calendar
 */
export async function updateCalendar(calendar: Calendar): Promise<void> {
    try {
        if (!calendar.id) {
            throw new Error("Calendar ID is required for update");
        }
        
        const docRef = doc(db, "calendars", calendar.id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...calendarData } = calendar;
        await updateDoc(docRef, calendarData);
    } catch (error) {
        console.error("Error updating calendar:", error);
        throw error;
    }
}

/**
 * Delete calendar (and all its events)
 */
export async function deleteCalendar(calendarId: string): Promise<void> {
    try {
        // First, get all events in the calendar
        const calendar = await getCalendarById(calendarId);
        if (calendar && calendar.eventIds.length > 0) {
            // Delete all events
            const deletePromises = calendar.eventIds.map(eventId => 
                deleteCalendarEvent(eventId)
            );
            await Promise.all(deletePromises);
        }
        
        // Then delete the calendar
        const docRef = doc(db, "calendars", calendarId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting calendar:", error);
        throw error;
    }
}

// ==================== CALENDAR EVENT OPERATIONS ====================

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(
    calendarId: string,
    event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    try {
        const now = new Date();
        const docRef = await addDoc(collection(db, "calendarEvents"), {
            ...event,
            createdAt: now,
            updatedAt: now,
        });
        
        // Add event ID to calendar
        const calendarRef = doc(db, "calendars", calendarId);
        await updateDoc(calendarRef, {
            eventIds: arrayUnion(docRef.id)
        });
        
        return docRef.id;
    } catch (error) {
        console.error("Error creating calendar event:", error);
        throw error;
    }
}

/**
 * Get calendar event by ID
 */
export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
    try {
        const docRef = doc(db, "calendarEvents", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return null;
        }
        
        return { id: docSnap.id, ...docSnap.data() } as CalendarEvent;
    } catch (error) {
        console.error("Error getting calendar event by id:", error);
        throw error;
    }
}

/**
 * Get all events for a calendar
 */
export async function getCalendarEvents(calendarId: string): Promise<CalendarEvent[]> {
    try {
        const calendar = await getCalendarById(calendarId);
        if (!calendar || calendar.eventIds.length === 0) {
            return [];
        }
        
        const eventPromises = calendar.eventIds.map(id => getCalendarEventById(id));
        const events = await Promise.all(eventPromises);
        
        return events.filter(event => event !== null) as CalendarEvent[];
    } catch (error) {
        console.error("Error getting calendar events:", error);
        throw error;
    }
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(event: CalendarEvent): Promise<void> {
    try {
        if (!event.id) {
            throw new Error("Event ID is required for update");
        }
        
        const docRef = doc(db, "calendarEvents", event.id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, ...eventData } = event;
        await updateDoc(docRef, {
            ...eventData,
            updatedAt: new Date(),
        });
    } catch (error) {
        console.error("Error updating calendar event:", error);
        throw error;
    }
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
    try {
        // Find which calendar this event belongs to
        const calendarsSnapshot = await getDocs(collection(db, "calendars"));
        
        for (const calendarDoc of calendarsSnapshot.docs) {
            const calendar = { id: calendarDoc.id, ...calendarDoc.data() } as Calendar;
            if (calendar.eventIds.includes(eventId)) {
                // Remove event from calendar
                const calendarRef = doc(db, "calendars", calendar.id!);
                await updateDoc(calendarRef, {
                    eventIds: arrayRemove(eventId)
                });
                break;
            }
        }
        
        // Delete the event
        const docRef = doc(db, "calendarEvents", eventId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting calendar event:", error);
        throw error;
    }
}

/**
 * Get events by date range
 */
export async function getEventsByDateRange(
    calendarId: string,
    startDate: Date,
    endDate: Date
): Promise<CalendarEvent[]> {
    try {
        const allEvents = await getCalendarEvents(calendarId);
        
        return allEvents.filter(event => {
            const eventStart = new Date(event.startDate.date);
            const eventEnd = new Date(event.endDate.date);
            
            return (eventStart >= startDate && eventStart <= endDate) ||
                   (eventEnd >= startDate && eventEnd <= endDate) ||
                   (eventStart <= startDate && eventEnd >= endDate);
        });
    } catch (error) {
        console.error("Error getting events by date range:", error);
        throw error;
    }
}

/**
 * Get events for a specific member
 */
export async function getEventsByMember(
    calendarId: string,
    memberId: string
): Promise<CalendarEvent[]> {
    try {
        const allEvents = await getCalendarEvents(calendarId);
        
        return allEvents.filter(event => event.memberIds.includes(memberId));
    } catch (error) {
        console.error("Error getting events by member:", error);
        throw error;
    }
} 