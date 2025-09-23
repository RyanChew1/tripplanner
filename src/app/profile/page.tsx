'use client'

import ProtectedLayout from '@/components/layout/ProtectedLayout'

const ProfilePage = () => {
  return (
    <ProtectedLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>
        <p className="text-gray-600">View and edit your profile information.</p>
      </div>
    </ProtectedLayout>
  )
}

export default ProfilePage 