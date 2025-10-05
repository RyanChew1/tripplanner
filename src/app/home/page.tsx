"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import CustomLoader from "@/components/CustomLoader";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {  } from "@/components/ui/checkbox";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  X,
  ArrowLeft,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  SortAsc,
  SortDesc,
} from "lucide-react";
import GroupGrid from "@/components/layout/GroupGrid";
import { useCreateGroup, useUserGroups } from "@/hooks/useGroups";
import { getUserByEmail } from "@/lib/userService";
import { TravelIconSelector, TravelIcons } from "@/lib/iconList";
import { Group } from "@/types/groups";
import { useGetUser } from "@/hooks/useUser";
import LimitedAction from "@/components/LimitedAction";
import UsageIndicator from "@/components/UsageIndicator";
import AccessTest from "@/components/AccessTest";
import { useUserLimits } from "@/hooks/useLimits";

const HomePage = () => {
  const { user, loading } = useAuth();
  const { userTier, groupLimitReached, tripLimitReached } = useUserLimits();
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<
    "name" | "customize" | "emails"
  >("name");
  const [groupIcon, setGroupIcon] = useState("airplane");
  const [groupColor, setGroupColor] = useState("#6A8D73");
  const [emailError, setEmailError] = useState("");

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState({
    manager: false,
    admin: false,
    traveler: false,
    pinned: false,
  });
  const [sortBy, setSortBy] = useState<
    "alphabetical" | "lastUpdated" | "lastCreated" | "groupSize" | "trips"
  >("alphabetical");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const createGroupMutation = useCreateGroup();
  const { data: userData } = useGetUser(user?.uid || "");

  // Only call useUserGroups when user is loaded and has a valid UID
  const { data: userGroups, isLoading: isLoadingUserGroups } = useUserGroups(
    user?.uid || "",
    {
      enabled: !!user?.uid && !loading,
    }
  );

  // Predefined color options
  const colorOptions = [
    { name: "Green", value: "#6A8D73" },
    { name: "Blue", value: "#3A405A" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Indigo", value: "#6366F1" },
  ];

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    if (!userGroups) return [];

    const filtered = userGroups.filter((group: Group) => {
      // Search filter
      if (
        searchQuery &&
        !group.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Check if any role filters are selected (excluding pinned)
      const hasRoleFilters = roleFilters.manager || roleFilters.admin || roleFilters.traveler;
      
      // Role filters (only apply if role filters are selected)
      if (hasRoleFilters) {
        const userRole = group.groupMembers[user?.uid || ""];
        const hasRoleFilter =
          (roleFilters.manager && userRole === "manager") ||
          (roleFilters.admin && userRole === "admin") ||
          (roleFilters.traveler && userRole === "traveler");

        if (!hasRoleFilter) return false;
      }

      // Pinned filter (only apply if pinned filter is selected)
      if (roleFilters.pinned) {
        if (userData?.pinnedGroups?.length && userData?.pinnedGroups?.length > 0) {
          if (userData?.pinnedGroups.includes(group?.id || "")) return true;
          return false;
        }
        return false;
      }

      // If no filters are selected, show all groups
      return true;
    });

    // Sort groups
    filtered.sort((a: Group, b: Group) => {
      let comparison = 0;

      switch (sortBy) {
        case "alphabetical":
          comparison = a.name.localeCompare(b.name);
          break;
        case "lastUpdated":
          const aUpdated = a.updatedAt ? a.updatedAt.seconds : 0;
          const bUpdated = b.updatedAt ? b.updatedAt.seconds : 0;
          comparison = aUpdated - bUpdated;
          break;
        case "lastCreated":
          const aCreated = a.createdAt ? a.createdAt.seconds : 0;
          const bCreated = b.createdAt ? b.createdAt.seconds : 0;
          comparison = aCreated - bCreated;
          break;
        case "groupSize":
          const aSize = Object.keys(a.groupMembers || {}).length;
          const bSize = Object.keys(b.groupMembers || {}).length;
          comparison = aSize - bSize;
          break;
        case "trips":
          const aTrips = a.tripIds?.length || 0;
          const bTrips = b.tripIds?.length || 0;
          comparison = aTrips - bTrips;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [userGroups, searchQuery, roleFilters, sortBy, sortOrder, user?.uid, userData?.pinnedGroups]);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate email input
  const validateEmail = (email: string): string => {
    const trimmedEmail = email.trim().toLowerCase();

    // Check if empty
    if (!trimmedEmail) {
      return "Email cannot be empty";
    }

    // Check email format
    if (!isValidEmail(trimmedEmail)) {
      return "Please enter a valid email address";
    }

    // Check if it's the user's own email
    if (trimmedEmail === user?.email?.toLowerCase()) {
      return "You cannot add your own email address";
    }

    // Check if email is already in the list
    if (emailList.some((email) => email.toLowerCase() === trimmedEmail)) {
      return "This email has already been added";
    }

    return "";
  };

  const handleCreateGroup = async () => {
    const groupMembers: Record<string, "manager" | "admin" | "traveler"> = {
      [user?.uid || ""]: "manager",
    };
    const invitedUsers: string[] = [];

    // Check each email to see if user exists
    for (const email of emailList) {
      try {
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
          groupMembers[existingUser.id!] = "traveler";
        } else {
          invitedUsers.push(email);
        }
      } catch (error) {
        console.error(`Error checking user for email ${email}:`, error);
        // If we can't check, add to invited users as fallback
        invitedUsers.push(email);
      }
    }

    createGroupMutation.mutate({
      name: groupName,
      groupMembers,
      ownerId: user?.uid || "",
      tripIds: [],
      invitedUsers,
      groupIcon: groupIcon,
      groupColor: groupColor,
    });

    // Reset form
    setGroupName("");
    setEmailList([]);
    setEmailInput("");
    setCurrentStep("name");
    setEmailError("");
    setGroupIcon("");
    setGroupColor("#6A8D73");
    setCreateGroupDialogOpen(false);
  };

  const addEmail = () => {
    const error = validateEmail(emailInput);

    if (error) {
      setEmailError(error);
      return;
    }

    // Clear any previous error
    setEmailError("");

    // Add email to list (normalize to lowercase)
    setEmailList([...emailList, emailInput.trim().toLowerCase()]);
    setEmailInput("");
  };

  const removeEmail = (emailToRemove: string) => {
    setEmailList(emailList.filter((email) => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addEmail();
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const nextStep = () => {
    if (groupName.trim()) {
      setCurrentStep("customize");
    }
  };

  const nextToEmails = () => {
    setCurrentStep("emails");
  };

  const prevStep = () => {
    if (currentStep === "customize") {
      setCurrentStep("name");
    } else if (currentStep === "emails") {
      setCurrentStep("customize");
    }
  };

  const resetForm = () => {
    setCreateGroupDialogOpen(false);
    setGroupName("");
    setEmailList([]);
    setEmailInput("");
    setCurrentStep("name");
    setEmailError("");
    setGroupIcon("");
    setGroupColor("#6A8D73");
  };

  const handleIconSelect = (iconData: { name: string; svg: string }) => {
    setGroupIcon(iconData.name);
  };

  const handleRoleFilterChange = (role: keyof typeof roleFilters) => {
    setRoleFilters((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const getSortByLabel = () => {
    switch (sortBy) {
      case "alphabetical":
        return "Alphabetical";
      case "lastUpdated":
        return "Last Updated";
      case "lastCreated":
        return "Last Created";
      case "groupSize":
        return "Group Size";
      case "trips":
        return "Number of Trips";
      default:
        return "Alphabetical";
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "name":
        return "Create Group";
      case "customize":
        return "Customize Group";
      case "emails":
        return "Add Members";
      default:
        return "Create Group";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "name":
        return "Give your group a name to get started.";
      case "customize":
        return "Choose an icon and color for your group.";
      case "emails":
        return "Add email addresses to invite people to your group.";
      default:
        return "Give your group a name to get started.";
    }
  };

  if (loading || isLoadingUserGroups) {
    return (
      <div className="min-h-screen bg-gray-300 bg-opacity-50 flex items-center justify-center">
        <div className="flex items-center space-x-12">
          <div className="text-center">
            <CustomLoader size={200} />
          </div>
        </div>
      </div>
    );
  }

  // Filter out groups without IDs and map to string array
  const groupIds =
    filteredAndSortedGroups
      ?.filter((group) => group.id)
      .map((group) => group.id!) || [];

  return (
    <ProtectedLayout>
      <div>
        <div className="flex flex-row text-3xl font-bold text-gray-900 mb-2 items-center gap-x-2">
          Where to next,{" "}
          <h1 className="font-bold text-green_primary">
            {" " + user?.displayName?.split(" ")[0] + "?"}
          </h1>
        </div>
        <p className="text-gray-600">
          This is your dashboard where you can plan your trips and manage your
          travel groups.
        </p>

        {/* Usage Indicator for Free Users */}
        <UsageIndicator className="mb-4" />
        
        {/* Access Control Test - Only show for free users who have surpassed limits */}
        {userTier === 'free' && (groupLimitReached || tripLimitReached) && (
          <AccessTest />
        )}

        {/* Search and Filter Controls */}
        <div className="space-y-4 w-full">
          <LimitedAction
            actionType="groups"
            onAction={() => setCreateGroupDialogOpen(true)}
          >
            <Button
              className="bg-green_primary text-white my-3"
            >
              <Plus />
              Create Group
            </Button>
          </LimitedAction>
          {/* Search Bar and Filter Buttons */}
          <div className="flex gap-4 items-center flex-wrap mb-7">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10  text-black placeholder:text-black border-2 border-gray-300 rounded-md"
              />
            </div>

            {/* Filters Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-blue_secondary/70 text-white border-none hover:bg-blue_secondary/80 hover:text-white"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Role Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={roleFilters.manager}
                  onCheckedChange={() => handleRoleFilterChange("manager")}
                >
                  Manager
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilters.admin}
                  onCheckedChange={() => handleRoleFilterChange("admin")}
                >
                  Admin
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilters.traveler}
                  onCheckedChange={() => handleRoleFilterChange("traveler")}
                >
                  Traveler
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilters.pinned}
                  onCheckedChange={() => handleRoleFilterChange("pinned")}
                >
                  Pinned
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort By Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-blue_secondary/70 text-white border-none hover:bg-blue_secondary/80 hover:text-white"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {getSortByLabel()}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>
                  Alphabetical
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("lastUpdated")}>
                  Last Updated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("lastCreated")}>
                  Last Created
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("groupSize")}>
                  Group Size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("trips")}>
                  Number of Trips
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Order Button */}
            <Button
              variant="outline"
              onClick={toggleSortOrder}
              className="flex items-center gap-2 bg-blue_secondary/70 text-white border-none hover:bg-blue_secondary/80 hover:text-white"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </div>

        <GroupGrid groupIds={groupIds} />
      </div>

      <Dialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{getStepTitle()}</DialogTitle>
            <DialogDescription>{getStepDescription()}</DialogDescription>
          </DialogHeader>

          {/* Group Preview */}
          {currentStep === "customize" && (
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl"
                style={{ backgroundColor: groupColor }}
              >
                {groupIcon && (
                  <div
                    className="w-10 h-10"
                    dangerouslySetInnerHTML={{
                      __html: new TravelIcons().getIcon(groupIcon) || "",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {currentStep === "name" ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="groupName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Group Name
                </label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  onKeyPress={(e) => e.key === "Enter" && nextStep()}
                />
              </div>
            </div>
          ) : currentStep === "customize" ? (
            <div className="space-y-4">
              <Tabs defaultValue="icon" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="icon">Icon</TabsTrigger>
                  <TabsTrigger value="color">Color</TabsTrigger>
                </TabsList>

                <TabsContent value="icon" className="space-y-4">
                  <div className="max-h-64 overflow-y-auto">
                    <TravelIconSelector
                      onIconSelect={handleIconSelect}
                      className="p-0"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="color" className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setGroupColor(color.value)}
                        className={`
                          w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110
                          ${
                            groupColor === color.value
                              ? "border-gray-800 shadow-lg"
                              : "border-gray-300 hover:border-gray-400"
                          }
                        `}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="emailInput"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Addresses
                </label>
                <div className="flex gap-2">
                  <Input
                    id="emailInput"
                    value={emailInput}
                    onChange={handleEmailInputChange}
                    placeholder="Enter email address"
                    onKeyPress={handleKeyPress}
                    type="email"
                    className={emailError ? "border-red-500" : ""}
                  />
                  <Button onClick={addEmail} disabled={!emailInput.trim()}>
                    Add
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm text-red-500 mt-1">{emailError}</p>
                )}
              </div>

              {emailList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Added emails:
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {emailList.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded"
                      >
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmail(email)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div>
              {currentStep !== "name" && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              {currentStep === "name" ? (
                <Button
                  onClick={nextStep}
                  disabled={!groupName.trim()}
                  className="bg-green_primary text-white hover:bg-green_primary/80"
                >
                  Next
                </Button>
              ) : currentStep === "customize" ? (
                <Button
                  onClick={nextToEmails}
                  className="bg-green_primary text-white hover:bg-green_primary/80"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreateGroup}
                  disabled={createGroupMutation.isPending}
                  className="bg-green_primary text-white hover:bg-green_primary/80"
                >
                  {createGroupMutation.isPending
                    ? "Creating..."
                    : "Create Group"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
};

export default HomePage;
