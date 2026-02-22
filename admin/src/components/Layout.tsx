import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Receipt,
  LogOut,
  Shield,
  Grid3X3,
  Megaphone,
  Crown,
  BarChart3,
  Truck,
  Wallet
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/companies', label: 'Companies', icon: Building2 },
  { path: '/plans', label: 'Plans', icon: CreditCard },
  { path: '/billing', label: 'Billing', icon: Receipt },
  { path: '/store-categories', label: 'Store Categories', icon: Grid3X3 },
  { path: '/ads', label: 'Ads Manager', icon: Megaphone },
  { path: '/premium', label: 'Premium Stores', icon: Crown },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/drivers', label: 'Delivery Drivers', icon: Truck },
  { path: '/payouts', label: 'Driver Payouts', icon: Wallet },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Catalyst</h1>
              <p className="text-xs text-gray-400">SuperAdmin</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="mb-3">
            <p className="font-medium text-white">{user?.name || 'SuperAdmin'}</p>
            <p className="text-sm text-gray-400">{user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
