import { Trip } from "../types/trips";
import { db } from "./firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { createCalendar, deleteCalendar } from "./calendarService";

export async function createTrip(trip: Trip) {
    try {
        // Create a calendar for this trip
        const calendarId = await createCalendar({ eventIds: [] });
        
        // Create the trip with the calendar ID
        const docRef = await addDoc(collection(db, "trips"), {
            ...trip,
            calendarId: calendarId,
        });

        // add trip to group
        const groupRef = doc(db, "groups", trip.groupId);
        await updateDoc(groupRef, {
            tripIds: arrayUnion(docRef.id)
        });

        return docRef.id;
    } catch (error) {
        console.error("Error creating trip", error);
        throw error;
    }
}

export async function getTripById(id: string) {
    try {
        const docRef = doc(db, "trips", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("Trip not found");
        }
        return { id: docSnap.id, ...docSnap.data() } as Trip;
    } catch (error) {
        console.error("Error getting trip by id", error);
        throw error;
    }
}

export async function updateTrip(trip: Trip) {
    try {
        const docRef = doc(db, "trips", trip.id!);
        await updateDoc(docRef, trip);
    } catch (error) {
        console.error("Error updating trip", error);
        throw error;
    }
}

export async function deleteTrip(groupId: string, tripId: string) {
    try {
        // Get the trip to find its calendar ID
        const tripDoc = await getTripById(tripId);
        
        // Remove trip from group
        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
            tripIds: arrayRemove(tripId)
        });

        // Delete the calendar if it exists
        if (tripDoc?.calendarId) {
            await deleteCalendar(tripDoc.calendarId);
        }

        // Delete the trip
        const docRef = doc(db, "trips", tripId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting trip", error);
        throw error;
    }
}