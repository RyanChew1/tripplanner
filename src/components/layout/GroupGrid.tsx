import { useAuth } from "@/contexts/AuthContext";
import GroupCard from "./GroupCard"
import { useGetUser } from "@/hooks/useUser";
import CustomLoader from "../CustomLoader";
import { useAddPinnedGroup, useRemovePinnedGroup } from "@/hooks/useUser";

interface GroupGridProps {
    groupIds: string[];
}

const GroupGrid = ({ groupIds }: GroupGridProps) => {
  const { user, loading } = useAuth();
  const { data: userData } = useGetUser(user?.uid || "");
  const { mutate: addPinnedGroup } = useAddPinnedGroup();
  const { mutate: removePinnedGroup } = useRemovePinnedGroup();

  const handlePinGroup = (isPinned: boolean, groupId: string) => {
    if (isPinned) {
      console.log("Removing pinned group", groupId);
      removePinnedGroup({ userId: user?.uid || "", groupId });
    } else {
      console.log("Adding pinned group", groupId);
      addPinnedGroup({ userId: user?.uid || "", groupId });
    }
  }

  if (loading) {
    return <CustomLoader />
  }


  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groupIds.map((groupId) => (
            <GroupCard key={groupId} groupId={groupId} isPinned={userData?.pinnedGroups.includes(groupId) || false} handlePinGroup={() => handlePinGroup(userData?.pinnedGroups.includes(groupId) || false, groupId)} />
        ))}
    </div>
  )
}

export default GroupGrid
