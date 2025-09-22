export interface Trip {
    id?: string;
    groupId: string;
    name: string;
    calendarId: string;
    createdAt?: Date;
    updatedAt?: Date;
    startDate: Date;
    endDate: Date;
    locationIds: string[];
}