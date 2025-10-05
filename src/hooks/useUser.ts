import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserById, updateUser, deleteUser, addPinnedGroup, removePinnedGroup, reorderPinnedGroups, validateUserSubscription } from "../lib/userService";
import { User } from "../types/users";

export function useGetUser(id: string) {
    return useQuery({
        queryKey: ["user", id],
        queryFn: () => getUserById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    });
}

export function useUpdateUser(user: User) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => updateUser(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", user.id] });
        },
        onError: (error) => {
            console.error("Error updating user", error);
        },
    });
}

export function useDeleteUser(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", id] });
        },
        onError: (error) => {
            console.error("Error deleting user", error);
        },
    });
}

export function useAddPinnedGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, groupId }: { userId: string, groupId: string }) => {
            await addPinnedGroup(userId, groupId);
            return userId;
        },
        onSuccess: (userId: string) => {
            queryClient.invalidateQueries({ queryKey: ["user", userId] });
        },
        onError: (error) => {
            console.error("Error adding pinned group", error);
        },
    });
}

export function useRemovePinnedGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, groupId }: { userId: string, groupId: string }) => {
            await removePinnedGroup(userId, groupId);
            return userId;
        },
        onSuccess: (userId: string) => {
            queryClient.invalidateQueries({ queryKey: ["user", userId] });
        },
        onError: (error) => {
            console.error("Error removing pinned group", error);
        },
    });
}

export function useReorderPinnedGroups() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, groupIds }: { userId: string, groupIds: string[] }) => {
            await reorderPinnedGroups(userId, groupIds);
            return userId;
        },
        onSuccess: (userId: string) => {
            queryClient.invalidateQueries({ queryKey: ["user", userId] });
        },
        onError: (error) => {
            console.error("Error reordering pinned groups", error);
        },
    });
}