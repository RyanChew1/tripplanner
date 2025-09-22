export interface User {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    tier: "Free" | "Premium";
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
    home: string;
    bucketListLocationIds: string[];
    bucketListActivities: string[];
}