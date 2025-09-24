import { useAuth } from "@/contexts/AuthContext";
import { useGetGroupById } from "@/hooks/useGroups";
import { TravelIcons } from "@/lib/iconList";
import { useRouter } from "next/navigation";
import CustomLoader from "../CustomLoader";

const GroupCard = ({ groupId }: { groupId: string }) => {
  const router = useRouter();
  const group = useGetGroupById(groupId);
  const { user, loading } = useAuth();

  if (group.isLoading) {
    return <div>Loading...</div>;
  }

  if (group.isError) {
    return <div>Error loading group</div>;
  }

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div
      className="bg-blue_secondary/20 rounded-lg shadow-md p-4 cursor-pointer hover:bg-blue_secondary/50 transition-all duration-300 flex flex-row items-center"
      onClick={() => router.push(`/groups/${groupId}`)}
    >
      <div className="flex flex-col w-full">
        <div className="flex flex-row items-center gap-x-2 w-full justify-between">
          <div className="flex flex-row items-center gap-x-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: group.data?.groupColor || "#6A8D73" }}
            >
              <div
                className="w-6 h-6 text-white"
                dangerouslySetInnerHTML={{
                  __html:
                    new TravelIcons().getIcon(
                      group.data?.groupIcon || "airplane"
                    ) || "",
                }}
              ></div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold">{group.data?.name}</h1>
            </div>
          </div>
          {/* Right side, list num members */}
          <div className="flex flex-row items-center gap-x-2 justify-end">
            <div className="flex flex-row items-center gap-x-2 justify-end">
              <div className="text-sm text-gray-700">
                {Object.keys(group.data?.groupMembers || {}).length} member
                {Object.keys(group.data?.groupMembers || {}).length === 1
                  ? ""
                  : "s"}
              </div>
            </div>
            {/* separator - dot */}
            <div className="flex flex-row items-center gap-x-2 self-center text-center">
              <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
            </div>
            {/* num trips */}
            <div className="flex flex-row items-center gap-x-2 justify-end">
              <div className="text-sm text-gray-700">
                {group.data?.tripIds.length} trip
                {group.data?.tripIds.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center gap-x-2 self-end">
          <div className="text-sm text-gray-700 font-semibold">
            {/* capitalize first letter */}
            {group.data?.groupMembers[user?.uid || ""]?.charAt(0).toUpperCase() + group.data?.groupMembers[user?.uid || ""]?.slice(1) || "Traveler"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
