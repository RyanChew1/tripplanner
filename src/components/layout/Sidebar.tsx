"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Home, Settings, LogOut, User, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGetUser, useReorderPinnedGroups } from "@/hooks/useUser";
import { usePinnedGroups } from "@/hooks/useGroups";
import CustomLoader from "../CustomLoader";
import { TravelIcons } from "@/lib/iconList";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Group } from "@/types/groups";

// Draggable item component for pinned groups
const DraggableGroupItem = ({ 
  group, 
  isActive, 
  onNavigate, 
  travelIcons 
}: { 
  group: Group; 
  isActive: boolean; 
  onNavigate: (path: string) => void; 
  travelIcons: TravelIcons;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id as string });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "z-50 opacity-50"
      )}
    >
      <button
        onClick={() => onNavigate(`/groups/${group.id}`)}
        className={cn(
          "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 group",
          isActive
            ? "bg-blue-100 text-blue-700 border border-blue-200"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: group.groupColor as string || "#6A8D73"}}
        >
          <div
            className="w-5 h-5 text-white"
            dangerouslySetInnerHTML={{
              __html: travelIcons.getIcon(group.groupIcon as string || "airplane") || "",
            }}
          />
        </div>
        <span className="font-medium truncate flex-1">{group.name}</span>
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </button>
    </li>
  );
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { data: userData, isLoading: loadingUser } = useGetUser(
    user?.uid || ""
  );

  // Get pinned groups
  const { data: pinnedGroups, isLoading: loadingPinnedGroups } = usePinnedGroups(
    userData?.pinnedGroups || []
  );

  // Reorder pinned groups mutation
  const reorderPinnedGroups = useReorderPinnedGroups();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get user initials from display name or email
  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(" ");
      return names
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  // Static navigation items
  const staticNavigationItems = useMemo(() => [
    {
      name: "Home",
      icon: Home,
      path: "/home",
    },
  ], []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !pinnedGroups || !user?.uid) return;

    if (active.id !== over.id) {
      const oldIndex = pinnedGroups.findIndex(group => group.id === active.id);
      const newIndex = pinnedGroups.findIndex(group => group.id === over.id);

      const reorderedGroups = arrayMove(pinnedGroups, oldIndex, newIndex);
      const newGroupIds = reorderedGroups.map(group => group.id);

      reorderPinnedGroups.mutate({
        userId: user.uid,
        groupIds: newGroupIds as string[],
      });
    }
  };

  // Create TravelIcons instance
  const travelIcons = new TravelIcons();

  if (loadingUser || loadingPinnedGroups) {
    return <CustomLoader />;
  }

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Brand Area */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Trip Planner</h2>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-6">
          {/* Static Navigation Items */}
          <ul className="space-y-2">
            {staticNavigationItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200",
                      isActive
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pinned Groups Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 px-2">Pinned Groups</h3>
            {!pinnedGroups || pinnedGroups.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 italic">
                Pinned groups will show up here
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pinnedGroups.map(group => group.id as string)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {pinnedGroups.map((group) => {
                      const isActive = pathname === `/groups/${group.id}`;
                      return (
                        <DraggableGroupItem
                          key={group.id}
                          group={group}
                          isActive={isActive}
                          onNavigate={handleNavigation}
                          travelIcons={travelIcons}
                        />
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200">
        {/* Profile Section with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center space-x-3 my-2 rounded-lg text-left transition-colors duration-200 hover:bg-gray-100">
              <div className="flex flex-col">
                <div className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 hover:bg-gray-100">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user?.displayName ||
                        user?.email?.split("@")[0] ||
                        "User"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex self-end mr-5 mb-3 text-center px-3 rounded-md bg-blue_secondary text-white w-fit py-1">
                  {(() => {
                    const role = userData?.tier || "";
                    if (role && typeof role === "string" && role.length > 0) {
                      return role.charAt(0).toUpperCase() + role.slice(1) + " Plan";
                    }
                    return "Free Plan";
                  })()}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => handleNavigation("/profile")}
              className="cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>View Profile</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleNavigation("/settings")}
              className="cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <div className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Sidebar;
