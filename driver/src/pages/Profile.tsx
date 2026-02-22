import { useNavigate } from 'react-router-dom'
import { User, Truck, Phone, Mail, LogOut, ChevronRight, Target, Bell, HelpCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  const menuItems = [
    { label: 'My Targets', icon: Target, path: '/targets' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
    { label: 'Help & Support', icon: HelpCircle, path: '/help' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="page-content">
        {/* Profile Card */}
        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="text-primary-600" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Driver'}</h2>
              <p className="text-gray-500">@{user?.username || 'driver'}</p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-3 mb-6">
          <div className="card flex items-center gap-3">
            <Truck className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">Van</p>
              <p className="font-medium text-gray-900">Van #12 - Toyota Hiace</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <Phone className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-gray-900">+961 71 123456</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <Mail className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="font-medium text-gray-900">driver@company.com</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2 mb-6">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className="card w-full flex items-center justify-between active:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <item.icon className="text-gray-400" size={20} />
                <span className="font-medium text-gray-700">{item.label}</span>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full btn btn-danger flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Logout
        </button>

        {/* Version */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Catalyst Driver v1.0.0
        </p>
      </div>
    </div>
  )
}
