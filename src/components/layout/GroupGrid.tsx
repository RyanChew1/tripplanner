import GroupCard from "./GroupCard"

interface GroupGridProps {
    groupIds: string[]
}

const GroupGrid = ({ groupIds }: GroupGridProps) => {
    console.log("groupIds", groupIds);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groupIds.map((groupId) => (
            <GroupCard key={groupId} groupId={groupId} />
        ))}
    </div>
  )
}

export default GroupGrid
