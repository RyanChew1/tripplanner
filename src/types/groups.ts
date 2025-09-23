export interface Group {

    id?: string;
    name: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
    groupMembers: Record<string, "manager" | "admin" | "traveler">
    ownerId: string;
    tripIds: string[];
    invitedUsers: string[]; // List of email addresses
}