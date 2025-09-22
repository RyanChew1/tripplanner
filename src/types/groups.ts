export interface GroupMember {
    id: string;
    role: "manager" | "admin" | "traveler";
}

export interface Group {
    id?: string;
    name: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
    groupMembers: GroupMember[];
    ownerId: string;
    tripIds: string[];
}