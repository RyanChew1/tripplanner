import React from 'react'
import { Button } from './ui/button'
import { useAuth } from '@/contexts/AuthContext'

const Navbar = () => {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  return (
    <div className="flex justify-between items-center p-4">
      <Button onClick={handleLogout}>
          Logout
      </Button>
    </div>
  )
}

export default Navbar
