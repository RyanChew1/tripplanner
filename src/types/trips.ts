import { FlightOffer } from './flights';
import { HotelOffer } from './hotels';

export type Trip = {
  id?: string;
  name: string;
  description: string;
  groupId: string;
  startDate: string;
  endDate: string;
  createdAt?: Date;
  updatedAt?: Date;
  calendarId?: string;
  flights: FlightOffer[];
  hotels: HotelOffer[];
};