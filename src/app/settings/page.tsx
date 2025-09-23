'use client'

import ProtectedLayout from '@/components/layout/ProtectedLayout'

const SettingsPage = () => {
  return (
    <ProtectedLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>
    </ProtectedLayout>
  )
}

export default SettingsPage 