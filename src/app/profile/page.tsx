'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useGetUser, useUpdateUser } from '@/hooks/useUser'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Mail, Calendar, MapPin, Star, Settings, Trash2, Camera, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { User as UserType } from '@/types/users'


const ProfilePage = () => {
  const { user: firebaseUser } = useAuth()
  const { data: user, isLoading: userLoading } = useGetUser(firebaseUser?.uid || '')
  const updateUserMutation = useUpdateUser(user || {} as unknown as UserType)
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    home: ''
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        home: user.home || ''
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setMessage(null)
      
      // Update Firebase Auth profile if name changed
      if (firebaseUser && (formData.firstName !== user.firstName || formData.lastName !== user.lastName)) {
        await updateProfile(firebaseUser, {
          displayName: `${formData.firstName} ${formData.lastName}`.trim()
        })
      }

      // Update user document
      const updatedUser = {
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        home: formData.home,
        updatedAt: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0
        }
      }

      await updateUserMutation.mutateAsync()
      setIsEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        home: user.home || ''
      })
    }
    setIsEditing(false)
    setMessage(null)
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp || isNaN(timestamp.seconds)) return 'N/A'
    try {
      return format(new Date(timestamp.seconds * 1000), 'MMM dd, yyyy')
    } catch (error) {
      return 'N/A'
    }
  }

  if (userLoading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedLayout>
    )
  }

  if (!user) {
    return (
      <ProtectedLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Unable to load profile information.</p>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
            <p className="text-gray-600">View and edit your profile information</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                      <CardDescription>
                        Your basic profile information
                      </CardDescription>
                    </div>
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={updateUserMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={handleCancel} variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      {isEditing ? (
                        <Input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Enter your first name"
                        />
                      ) : (
                        <p className="text-gray-900">{user.firstName || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      {isEditing ? (
                        <Input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Enter your last name"
                        />
                      ) : (
                        <p className="text-gray-900">{user.lastName || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    {isEditing ? (
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                      />
                    ) : (
                      <p className="text-gray-900">{user.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Location
                    </label>
                    {isEditing ? (
                      <Input
                        name="home"
                        value={formData.home}
                        onChange={handleInputChange}
                        placeholder="Enter your home location"
                      />
                    ) : (
                      <p className="text-gray-900">{user.home || 'Not specified'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type
                      </label>
                      <Badge variant={user.tier === 'premium' ? 'default' : 'secondary'}>
                        {user.tier === 'premium' ? (
                          <Star className="h-3 w-3 mr-1" />
                        ) : null}
                        {user.tier?.charAt(0).toUpperCase() + user.tier?.slice(1)} Plan
                      </Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Member Since
                      </label>
                      <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Bucket List Locations</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {user.bucketListLocationIds?.length || 0} locations saved
                    </p>
                    {user.bucketListLocationIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.bucketListLocationIds.slice(0, 5).map((locationId, index) => (
                          <Badge key={index} variant="outline">
                            Location {index + 1}
                          </Badge>
                        ))}
                        {user.bucketListLocationIds.length > 5 && (
                          <Badge variant="outline">
                            +{user.bucketListLocationIds.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No bucket list locations yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Bucket List Activities</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {user.bucketListActivities?.length || 0} activities saved
                    </p>
                    {user.bucketListActivities?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.bucketListActivities.slice(0, 5).map((activity, index) => (
                          <Badge key={index} variant="outline">
                            {activity}
                          </Badge>
                        ))}
                        {user.bucketListActivities.length > 5 && (
                          <Badge variant="outline">
                            +{user.bucketListActivities.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No bucket list activities yet</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pinned Groups</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {user.pinnedGroups?.length || 0} groups pinned
                    </p>
                    {user.pinnedGroups?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.pinnedGroups.slice(0, 5).map((groupId, index) => (
                          <Badge key={index} variant="outline">
                            Group {index + 1}
                          </Badge>
                        ))}
                        {user.pinnedGroups.length > 5 && (
                          <Badge variant="outline">
                            +{user.pinnedGroups.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No pinned groups yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Account Management
                  </CardTitle>
                  <CardDescription>
                    Manage your account settings and data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">User ID:</span>
                          <span className="font-mono text-xs">{user.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Updated:</span>
                          <span>{formatDate(user.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email Verified:</span>
                          <span>{firebaseUser?.emailVerified ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Danger Zone</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        These actions are irreversible. Please proceed with caution.
                      </p>
                      <Button variant="destructive" size="sm" className="text-white">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedLayout>
  )
}

export default ProfilePage 