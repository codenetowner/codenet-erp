import { Outlet, NavLink } from 'react-router-dom'
import { Home, Users, User, UserPlus } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/leads', label: 'Leads', icon: UserPlus },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function Layout() {
  return (
    <div className="mobile-container">
      <Outlet />
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
