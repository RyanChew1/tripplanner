export interface User {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    tier: "free" | "premium";
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
    home: string;
    bucketListLocationIds: string[];
    bucketListActivities: string[];
    pinnedGroups: string[];
}