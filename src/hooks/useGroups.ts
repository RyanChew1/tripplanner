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