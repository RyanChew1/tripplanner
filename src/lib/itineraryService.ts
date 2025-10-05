import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import { FlightOffer } from '@/types/flights';
import { HotelOffer } from '@/types/hotels';

export class ItineraryService {
  /**
   * Add a flight to a trip's itinerary
   */
  static async addFlightToTrip(tripId: string, flight: FlightOffer): Promise<void> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        flights: arrayUnion(flight),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error adding flight to trip:', error);
      throw new Error('Failed to add flight to trip');
    }
  }

  /**
   * Remove a flight from a trip's itinerary
   */
  static async removeFlightFromTrip(tripId: string, flight: FlightOffer): Promise<void> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        flights: arrayRemove(flight),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error removing flight from trip:', error);
      throw new Error('Failed to remove flight from trip');
    }
  }

  /**
   * Add a hotel to a trip's itinerary
   */
  static async addHotelToTrip(tripId: string, hotel: HotelOffer): Promise<void> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        hotels: arrayUnion(hotel),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error adding hotel to trip:', error);
      throw new Error('Failed to add hotel to trip');
    }
  }

  /**
   * Remove a hotel from a trip's itinerary
   */
  static async removeHotelFromTrip(tripId: string, hotel: HotelOffer): Promise<void> {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        hotels: arrayRemove(hotel),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error removing hotel from trip:', error);
      throw new Error('Failed to remove hotel from trip');
    }
  }
}
