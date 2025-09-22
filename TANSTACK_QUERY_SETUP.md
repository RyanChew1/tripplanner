# TanStack Query Setup

This project is configured with TanStack Query (React Query) for universal data fetching and state management.

## Setup

The following files have been configured:

### 1. QueryProvider (src/app/providers/QueryProvider.tsx)
- Wraps the entire app with QueryClientProvider
- Includes React Query DevTools for development
- Configured with sensible defaults:
  - 1 minute stale time
  - Retry once on failure
  - Disabled refetch on window focus

### 2. Custom Hooks (src/app/hooks/useQuery.ts)
- Re-exports all TanStack Query hooks for easy access
- Includes TypeScript types
- Available hooks:
  - useQuery - For data fetching
  - useMutation - For data mutations
  - useInfiniteQuery - For paginated data
  - useSuspenseQuery - For suspense-based queries
  - useQueryClient - For accessing the query client
  - And more...

### 3. Root Layout (src/app/layout.tsx)
- QueryProvider wraps the entire app
- Ensures all components have access to query functionality

## Usage

### Basic Query
`	sx
import { useQuery } from '../hooks';

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
`

### Mutation
`	sx
import { useMutation, useQueryClient } from '../hooks';

function CreateUser() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newUser) => fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(newUser),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <button onClick={() => mutation.mutate({ name: 'John' })}>
      Create User
    </button>
  );
}
`

### Infinite Query
`	sx
import { useInfiniteQuery } from '../hooks';

function InfiniteUsers() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['users'],
    queryFn: ({ pageParam = 0 }) => fetch(/api/users?page=),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.users.map(user => <div key={user.id}>{user.name}</div>)}
        </div>
      ))}
      <button onClick={() => fetchNextPage()}>
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
`

## Development

- React Query DevTools are available in development mode
- Open the browser dev tools to access the Query DevTools panel
- Monitor queries, mutations, and cache state in real-time

## Best Practices

1. **Query Keys**: Use consistent, hierarchical query keys
2. **Error Handling**: Always handle loading and error states
3. **Stale Time**: Configure appropriate stale times for your data
4. **Cache Invalidation**: Invalidate related queries after mutations
5. **Suspense**: Use useSuspenseQuery for better UX with loading states
