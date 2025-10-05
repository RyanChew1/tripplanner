'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useGetUser } from '@/hooks/useUser'
import { useBillingInfo } from '@/hooks/useBilling'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bell, 
  Shield, 
  CreditCard, 
  Download, 
  Trash2, 
  Save,
  CheckCircle,
  XCircle,
  Star,
  Database
} from 'lucide-react'
import { format } from 'date-fns'

const SettingsPage = () => {
  const { user: firebaseUser } = useAuth()
  const { data: user, isLoading: userLoading } = useGetUser(firebaseUser?.uid || '')
  const { data: billingInfo, isLoading: billingLoading } = useBillingInfo(user?.stripeCustomerId)
  
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    tripReminders: true,
    groupInvites: true,
    billingAlerts: true,
    marketingEmails: false
  })
  
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'friends',
    showEmail: false,
    showLocation: true,
    allowGroupInvites: true,
    dataSharing: false
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleNotificationChange = (key: string, checked: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: checked }))
  }

  const handlePrivacyChange = (key: string, value: string | boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    try {
      setMessage(null)
      // Here you would typically save settings to your backend
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    }
  }

  const handleExportData = async () => {
    try {
      setMessage(null)
      // Here you would implement data export functionality
      setMessage({ type: 'success', text: 'Data export initiated. You will receive an email when ready.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' })
    }
  }

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp || isNaN(timestamp)) return 'N/A'
    try {
      return format(new Date(timestamp * 1000), 'MMM dd, yyyy')
    } catch {
      return 'N/A'
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        setMessage(null)
        // Here you would implement account deletion
        setMessage({ type: 'success', text: 'Account deletion initiated. You will receive a confirmation email.' })
      } catch {
        setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' })
      }
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

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
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

          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="data">Data & Security</TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about updates and activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Email Updates</label>
                        <p className="text-sm text-gray-600">Receive updates about your trips and groups</p>
                      </div>
                      <Checkbox
                        checked={notifications.emailUpdates}
                        onCheckedChange={(checked) => handleNotificationChange('emailUpdates', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Trip Reminders</label>
                        <p className="text-sm text-gray-600">Get reminded about upcoming trips and bookings</p>
                      </div>
                      <Checkbox
                        checked={notifications.tripReminders}
                        onCheckedChange={(checked) => handleNotificationChange('tripReminders', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Group Invites</label>
                        <p className="text-sm text-gray-600">Notifications when you&apos;re invited to groups</p>
                      </div>
                      <Checkbox
                        checked={notifications.groupInvites}
                        onCheckedChange={(checked) => handleNotificationChange('groupInvites', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Billing Alerts</label>
                        <p className="text-sm text-gray-600">Important billing and subscription updates</p>
                      </div>
                      <Checkbox
                        checked={notifications.billingAlerts}
                        onCheckedChange={(checked) => handleNotificationChange('billingAlerts', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Marketing Emails</label>
                        <p className="text-sm text-gray-600">Product updates, tips, and promotional content</p>
                      </div>
                      <Checkbox
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked as boolean)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control who can see your information and how it&apos;s used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900 mb-2 block">Profile Visibility</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="public"
                            name="profileVisibility"
                            value="public"
                            checked={privacy.profileVisibility === 'public'}
                            onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="public" className="text-sm text-gray-700">Public</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="friends"
                            name="profileVisibility"
                            value="friends"
                            checked={privacy.profileVisibility === 'friends'}
                            onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="friends" className="text-sm text-gray-700">Friends Only</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="private"
                            name="profileVisibility"
                            value="private"
                            checked={privacy.profileVisibility === 'private'}
                            onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                            className="h-4 w-4"
                          />
                          <label htmlFor="private" className="text-sm text-gray-700">Private</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Show Email Address</label>
                        <p className="text-sm text-gray-600">Allow others to see your email address</p>
                      </div>
                      <Checkbox
                        checked={privacy.showEmail}
                        onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Show Location</label>
                        <p className="text-sm text-gray-600">Display your home location on your profile</p>
                      </div>
                      <Checkbox
                        checked={privacy.showLocation}
                        onCheckedChange={(checked) => handlePrivacyChange('showLocation', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Allow Group Invites</label>
                        <p className="text-sm text-gray-600">Let others invite you to groups</p>
                      </div>
                      <Checkbox
                        checked={privacy.allowGroupInvites}
                        onCheckedChange={(checked) => handlePrivacyChange('allowGroupInvites', checked as boolean)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Data Sharing</label>
                        <p className="text-sm text-gray-600">Allow anonymized data to improve our services</p>
                      </div>
                      <Checkbox
                        checked={privacy.dataSharing}
                        onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked as boolean)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription and billing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billingLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Current Plan</h4>
                          <p className="text-sm text-gray-600">Your active subscription plan</p>
                        </div>
                        <Badge variant={user?.tier === 'premium' ? 'default' : 'secondary'}>
                          {user?.tier === 'premium' ? (
                            <Star className="h-3 w-3 mr-1" />
                          ) : null}
                          {user?.tier ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1) : 'Free'} Plan
                        </Badge>
                      </div>

                      {billingInfo?.subscription && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${
                              billingInfo.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {billingInfo.subscription.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Next Billing:</span>
                            <span>{formatDate(billingInfo.subscription.currentPeriodEnd)}</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <Button asChild>
                          <a href="/billing">Manage Billing</a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data & Security
                  </CardTitle>
                  <CardDescription>
                    Manage your data and account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Data Export</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Download a copy of all your data including trips, groups, and preferences
                      </p>
                      <Button onClick={handleExportData} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export My Data
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Account Security</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email Verified:</span>
                          <span className="flex items-center gap-1">
                            {firebaseUser?.emailVerified ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">Verified</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">Not Verified</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Two-Factor Auth:</span>
                          <span className="text-gray-600">Not Enabled</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Danger Zone</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        These actions are irreversible. Please proceed with caution.
                      </p>
                      <Button onClick={handleDeleteAccount} variant="destructive" className="text-white">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleSaveSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}

export default SettingsPage