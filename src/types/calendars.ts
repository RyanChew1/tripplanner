export type EventCategory = "excursion" | "dining" | "transportation" | "accommodation" | "leisure" | "event";

export interface CalendarEvent {
    id?: string;
    title: string;
    startDate: Datetime;
    endDate: Datetime;
    locationId: string;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
    memberIds: string[];
    categories: EventCategory[];
}

export interface Calendar {
    id?: string;
    eventIds: string[];
}

type Datetime = {
    date: Date;
    time: string;
}