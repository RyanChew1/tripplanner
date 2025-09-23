"use client";

import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { useAuth } from "@/contexts/AuthContext";
import CustomLoader from "@/components/CustomLoader";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, ArrowLeft } from "lucide-react";
import GroupGrid from "@/components/layout/GroupGrid";
import { useCreateGroup, useUserGroups } from "@/hooks/useGroups";
import { Input } from "@/components/ui/input";
import { getUserByEmail } from "@/lib/userService";

const HomePage = () => {
  const { user, loading } = useAuth();
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'name' | 'emails'>('name');
  const [emailError, setEmailError] = useState("");
  const createGroupMutation = useCreateGroup();
  
  // Only call useUserGroups when user is loaded and has a valid UID
  const { data: userGroups, isLoading: isLoadingUserGroups } = useUserGroups(user?.uid || "", {
    enabled: !!user?.uid && !loading
  });

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
    if (emailList.some(email => email.toLowerCase() === trimmedEmail)) {
      return "This email has already been added";
    }
    
    return "";
  };

  const handleCreateGroup = async () => {
    const groupMembers: Record<string, "manager" | "admin" | "traveler"> = {
      [user?.uid || ""]: "manager"
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
    });

    // Reset form
    setGroupName("");
    setEmailList([]);
    setEmailInput("");
    setCurrentStep('name');
    setEmailError("");
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
    setEmailList(emailList.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
      setCurrentStep('emails');
    }
  };

  const prevStep = () => {
    setCurrentStep('name');
  };

  const resetForm = () => {
    setCreateGroupDialogOpen(false);
    setGroupName("");
    setEmailList([]);
    setEmailInput("");
    setCurrentStep('name');
    setEmailError("");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || !loaderComplete || isLoadingUserGroups) {
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
  const groupIds = userGroups?.filter(group => group.id).map(group => group.id!) || [];

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

        <Button className="bg-green_primary text-white my-3" onClick={() => setCreateGroupDialogOpen(true)}>
          <Plus />
          Create Group
        </Button>
        <GroupGrid groupIds={groupIds} />
      </div>
      
      <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 'name' ? 'Create Group' : 'Add Members'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {currentStep === 'name' 
              ? 'Give your group a name to get started.' 
              : 'Add email addresses to invite people to your group.'
            }
          </DialogDescription>

          {currentStep === 'name' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  onKeyPress={(e) => e.key === 'Enter' && nextStep()}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <p className="text-sm font-medium text-gray-700">Added emails:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {emailList.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
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
              {currentStep === 'emails' && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={resetForm}
              >
                Cancel
              </Button>
              {currentStep === 'name' ? (
                <Button 
                  onClick={nextStep}
                  disabled={!groupName.trim()}
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
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
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
