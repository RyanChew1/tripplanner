export interface User {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    tier: "free" | "premium";
    image?: string;
    createdAt?: {
        seconds: number;
        nanoseconds: number;
    };
    updatedAt?: {
        seconds: number;
        nanoseconds: number;
    };
    home: string;
    bucketListLocationIds: string[];
    bucketListActivities: string[];
    pinnedGroups: string[];
    stripeCustomerId?: string;
    subscriptionId?: string;
    // Google Calendar integration
    googleCalendarAccessToken?: string;
    googleCalendarRefreshToken?: string;
    googleCalendarTokenExpiry?: Date;
}