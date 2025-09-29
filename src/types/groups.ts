export interface Group {
    id?: string;
    name: string;
    image?: string;
    createdAt?: {
        seconds: number;
        nanoseconds: number;
    };
    updatedAt?: {
        seconds: number;
        nanoseconds: number;
    };
    groupMembers: Record<string, "manager" | "admin" | "traveler">
    ownerId: string;
    tripIds: string[];
    invitedUsers: string[]; // List of email addresses
    groupIcon?: string;
    groupColor?: string;
}