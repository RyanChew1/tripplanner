// Re-export all TanStack Query hooks for easy access
export {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useQueryErrorResetBoundary,
} from '@tanstack/react-query';

// Re-export types for TypeScript support
export type {
  UseQueryResult,
  UseMutationResult,
  UseInfiniteQueryResult,
  UseSuspenseQueryResult,
  UseSuspenseInfiniteQueryResult,
  QueryKey,
  QueryFunction,
  MutationFunction,
  InfiniteData,
  QueryClient,
  Query,
  Mutation,
} from '@tanstack/react-query';
