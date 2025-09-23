import { useGetGroupById } from '@/hooks/useGroups'
import { useRouter } from 'next/navigation';

const GroupCard = ({ groupId }: { groupId: string }) => {

    const router = useRouter();
    const group = useGetGroupById(groupId)

  if (group.isLoading) {
    return <div>Loading...</div>
  }

  if (group.isError) {
    return <div>Error loading group</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4" onClick={() => router.push(`/groups/${groupId}`)}>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-x-2">
          <div className="w-10 h-10 rounded-full bg-green_primary">
            {group.data?.name}
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">{group.data?.name}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupCard
