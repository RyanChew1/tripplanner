import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserById, updateUser, deleteUser } from "../lib/userService";
import { User } from "../types/users";

export function useGetUser(id: string) {
    return useQuery({
        queryKey: ["user", id],
        queryFn: () => getUserById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
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