export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  maxPrice?: number;
  currencyCode?: string;
}

export interface FlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: FlightItinerary[];
  price: FlightPrice;
  pricingOptions: FlightPricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
}

export interface FlightItinerary {
  duration: string;
  segments: FlightSegment[];
}

export interface FlightSegment {
  departure: FlightLocation;
  arrival: FlightLocation;
  carrierCode: string;
  number: string;
  aircraft: FlightAircraft;
  operating: FlightOperating;
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface FlightLocation {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface FlightAircraft {
  code: string;
}

export interface FlightOperating {
  carrierCode: string;
}

export interface FlightPrice {
  currency: string;
  total: string;
  base: string;
  fees: FlightFee[];
  grandTotal: string;
}

export interface FlightFee {
  amount: string;
  type: string;
}

export interface FlightPricingOptions {
  fareType: string[];
  includedCheckedBagsOnly: boolean;
  refundableFare: boolean;
  noRestrictionFare: boolean;
  noPenaltyFare: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: FlightPrice;
  fareDetailsBySegment: FareDetailsBySegment[];
}

export interface FareDetailsBySegment {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  class: string;
  includedCheckedBags: CheckedBags;
}

export interface CheckedBags {
  weight: number;
  weightUnit: string;
}

export interface FlightSearchResponse {
  data: FlightOffer[];
  meta: {
    count: number;
    links: {
      self: string;
    };
  };
  dictionaries: {
    locations: Record<string, LocationInfo>;
    aircraft: Record<string, string>;
    currencies: Record<string, string>;
    carriers: Record<string, string>;
  };
}

export interface LocationInfo {
  cityCode: string;
  countryCode: string;
}

export interface FlightBookingRequest {
  data: {
    type: string;
    flightOffers: FlightOffer[];
    travelers: Traveler[];
    remarks?: Remark[];
    ticketingAgreement?: TicketingAgreement;
    contacts?: Contact[];
  };
}

export interface Traveler {
  id: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  name: {
    firstName: string;
    lastName: string;
  };
  documents: TravelerDocument[];
  contact: TravelerContact;
}

export interface TravelerDocument {
  documentType: 'PASSPORT' | 'ID_CARD';
  number: string;
  expiryDate: string;
  issuanceCountry: string;
  validityCountry: string;
  nationality: string;
  holder: boolean;
}

export interface TravelerContact {
  purpose: 'STANDARD' | 'EMERGENCY';
  phones: Phone[];
  email: string;
}

export interface Phone {
  deviceType: 'MOBILE' | 'LANDLINE';
  countryCallingCode: string;
  number: string;
}

export interface Remark {
  type: 'FARE' | 'NEGOTIATED' | 'MISCELLANEOUS';
  text: string;
}

export interface TicketingAgreement {
  option: 'DELAY_TO_CANCEL' | 'IMMEDIATE';
  delay: string;
}

export interface Contact {
  addresseeName: {
    firstName: string;
    lastName: string;
  };
  companyName?: string;
  purpose: 'STANDARD' | 'EMERGENCY';
  phones: Phone[];
  emailAddress: string;
  address: Address;
}

export interface Address {
  lines: string[];
  postalCode: string;
  cityName: string;
  countryCode: string;
}
