export interface HotelSearchParams {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  roomQuantity: number;
  adults: number;
  children?: number;
  infants?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  currencyCode?: string;
  ratings?: number[];
  amenities?: string[];
  hotelIds?: string[];
  view?: 'FULL' | 'LIGHT';
}

export interface HotelOffer {
  type: string;
  hotel: Hotel;
  offers: HotelOfferDetails[];
  self: string;
}

export interface Hotel {
  hotelId: string;
  name: string;
  rating: number;
  contact: HotelContact;
  description: HotelDescription;
  amenities: string[];
  media: HotelMedia[];
  address: HotelAddress;
  distance: HotelDistance;
  geoCode: HotelGeoCode;
  chainCode: string;
  dupeId: string;
  iataCode: string;
  hotelDistance: HotelDistance;
}

export interface HotelContact {
  phone: string;
  fax?: string;
  email?: string;
}

export interface HotelDescription {
  lang: string;
  text: string;
}

export interface HotelMedia {
  uri: string;
  category: string;
}

export interface HotelAddress {
  lines: string[];
  postalCode: string;
  cityName: string;
  countryCode: string;
  stateCode?: string;
}

export interface HotelDistance {
  distance: number;
  distanceUnit: string;
}

export interface HotelGeoCode {
  latitude: number;
  longitude: number;
}

export interface HotelOfferDetails {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  room: HotelRoom;
  guests: HotelGuests;
  price: HotelPrice;
  policies: HotelPolicies;
  self: string;
  type: string;
  description: HotelOfferDescription;
}

export interface HotelRoom {
  type: string;
  typeEstimated: HotelRoomTypeEstimated;
  description: HotelRoomDescription;
}

export interface HotelRoomTypeEstimated {
  category: string;
  beds: number;
  bedType: string;
}

export interface HotelRoomDescription {
  text: string;
  lang: string;
}

export interface HotelGuests {
  adults: number;
  childAges?: number[];
}

export interface HotelPrice {
  currency: string;
  base: string;
  total: string;
  variations: HotelPriceVariations;
}

export interface HotelPriceVariations {
  average: HotelPriceVariation;
      changes: HotelPriceVariation[];
}

export interface HotelPriceVariation {
  startDate: string;
      endDate: string;
      total: string;
}

export interface HotelPolicies {
  paymentType: string;
  cancellation: HotelCancellation;
  checkInOut: HotelCheckInOut;
}

export interface HotelCancellation {
  type: string;
  amount: string;
  numberOfNights: number;
  deadline: string;
  text: HotelCancellationText;
}

export interface HotelCancellationText {
  lang: string;
  text: string;
}

export interface HotelCheckInOut {
  checkIn: string;
  checkOut: string;
}

export interface HotelOfferDescription {
  lang: string;
  text: string;
}

export interface HotelSearchResponse {
  data: HotelOffer[];
  meta?: {
    count: number;
    links: {
      self: string;
    };
  };
  dictionaries?: {
    currencies: Record<string, string>;
    amenities: Record<string, string>;
  };
}

export interface HotelBookingRequest {
  data: {
    type: string;
    hotelId: string;
    offerId: string;
    guests: HotelBookingGuest[];
    payments: HotelPayment[];
    rooms: HotelBookingRoom[];
    holder: HotelBookingHolder;
  };
}

export interface HotelBookingGuest {
  name: {
    firstName: string;
    lastName: string;
  };
  contact: {
    phone: string;
    email: string;
  };
}

export interface HotelPayment {
  id: string;
  method: string;
  card: HotelPaymentCard;
}

export interface HotelPaymentCard {
  vendorCode: string;
  cardNumber: string;
  expiryDate: string;
}

export interface HotelBookingRoom {
  guestIds: string[];
  paymentId: string;
}

export interface HotelBookingHolder {
  name: {
    firstName: string;
    lastName: string;
  };
  document: {
    documentType: 'PASSPORT' | 'ID_CARD';
    documentNumber: string;
    documentIssuingCountry: string;
    documentValidityDate: string;
  };
  contact: {
    phone: string;
    email: string;
  };
}

export interface HotelBookingResponse {
  data: {
    type: string;
    id: string;
    hotel: Hotel;
    offers: HotelOfferDetails[];
    guests: HotelBookingGuest[];
    rooms: HotelBookingRoom[];
    payments: HotelPayment[];
    holder: HotelBookingHolder;
    bookingStatus: string;
    confirmationNumber: string;
    createdAt: string;
    modifiedAt: string;
  };
  meta: {
    count: number;
    links: {
      self: string;
    };
  };
}
