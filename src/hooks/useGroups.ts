import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupById, createGroup, getUserGroups } from "../lib/groupService";
import { Group } from "../types/groups";

export function useGetGroupById(id: string) {
    return useQuery({
        queryKey: ["group", id],
        queryFn: () => getGroupById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
}

export function useUserGroups(userId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["userGroups", userId],
        queryFn: () => getUserGroups(userId),
        enabled: options?.enabled !== false && !!userId,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
}

export function useCreateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (group: Group) => createGroup(group),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            queryClient.invalidateQueries({ queryKey: ["userGroups"] });
        },
    });
}

// Get pinned groups by their IDs
export async function getPinnedGroups(groupIds: string[]) {
    try {
        if (!groupIds || groupIds.length === 0) {
            return [];
        }
        
        const groups = await Promise.all(
            groupIds.map(async (id) => {
                const group = await getGroupById(id);
                return group ? { ...group, id } : null;
            })
        );
        
        return groups.filter(group => group !== null) as Group[];
    } catch (error) {
        console.error("Error getting pinned groups", error);
        throw error;
    }
}

export function usePinnedGroups(groupIds: string[]) {
    return useQuery({
        queryKey: ["pinnedGroups", groupIds],
        queryFn: () => getPinnedGroups(groupIds),
        enabled: groupIds.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
}