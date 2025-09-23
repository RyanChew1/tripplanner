'use client'

import ProtectedLayout from '@/components/layout/ProtectedLayout'

const GroupsPage = () => {
  return (
    <ProtectedLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Travel Groups</h1>
        <p className="text-gray-600">Manage your travel groups and plan trips together.</p>
      </div>
    </ProtectedLayout>
  )
}

export default GroupsPage 