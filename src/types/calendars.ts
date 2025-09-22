export interface CalendarEvent {
    id?: string;
    title: string;
    datetime: Date;
    locationId: string;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
    memberIds: string[];
}

export interface Calendar {
    id?: string;
    eventIds: string[];
}