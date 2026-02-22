import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  UserCog,
  LogOut,
  Truck,
  Briefcase,
  Warehouse,
  ListChecks,
  HandCoins,
  TruckIcon,
  Receipt,
  BarChart3,
  Settings,
  Shield,
  Tags,
  Coins,
  Scale,
  SlidersHorizontal,
  UserPlus,
  // RotateCcw,  // Commented out - Returns moved to Direct Sales
  ShoppingCart,
  PanelLeftClose,
  PanelLeft,
  History,
  Ruler,
  CalendarCheck,
  FileText,
  Search,
  X,
  Factory,
  Boxes,
  Store,
  ShoppingBag,
  ArrowUpDown,
  Landmark,
  BookOpen,
  FileBarChart,
  BookMarked
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePermissions, PERMISSIONS } from '../contexts/PermissionContext'

interface NavItem {
  path: string
  label: string
  icon: any
  permission?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD },
    ]
  },
  {
    title: 'Team',
    items: [
      { path: '/employees', label: 'Employees', icon: UserCog, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/attendance', label: 'Attendance', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
      { path: '/roles', label: 'Roles', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/vans', label: 'Vans', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
      { path: '/salesmen', label: 'Salesmen', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/warehouses', label: 'Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { path: '/products', label: 'Products', icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/categories', label: 'Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
      { path: '/units', label: 'Units', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
      { path: '/stock-adjustment', label: 'Stock Adjust', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
      { path: '/valuation', label: 'Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
      { path: '/inventory-settings', label: 'Inv Settings', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
    ]
  },
  {
    title: 'Production',
    items: [
      { path: '/raw-materials', label: 'Raw Materials', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/raw-material-purchases', label: 'RM Purchases', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
      { path: '/production-orders', label: 'Production', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
    ]
  },
  {
    title: 'Sales',
    items: [
      { path: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
      { path: '/leads', label: 'Leads', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
      { path: '/tasks', label: 'Orders & Tasks', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
      { path: '/quotes', label: 'Quotes', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
      { path: '/direct-sales', label: 'Direct Sales', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      // { path: '/sales-history', label: 'Sales History', icon: Receipt, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      // { path: '/returns', label: 'Returns', icon: RotateCcw, permission: PERMISSIONS.VIEW_RETURNS },
    ]
  },
  {
    title: 'Finance',
    items: [
      { path: '/cash', label: 'Cash', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
      { path: '/suppliers', label: 'Suppliers', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
      { path: '/expenses', label: 'Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
      { path: '/currencies', label: 'Currencies', icon: Coins, permission: PERMISSIONS.VIEW_CURRENCIES },
    ]
  },
  {
    title: 'Accounting',
    items: [
      { path: '/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/journal-entries', label: 'Journal Entries', icon: BookMarked, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/account-ledger', label: 'Account Ledger', icon: Landmark, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/financial-reports', label: 'Financial Reports', icon: FileBarChart, permission: PERMISSIONS.VIEW_FINANCIAL_REPORTS },
    ]
  },
  {
    title: 'Reports',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
      { path: '/deep-report', label: 'Deep Report', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
    ]
  },
  {
    title: 'Online Store',
    items: [
      { path: '/online-store-settings', label: 'Store Settings', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
      { path: '/online-orders', label: 'Online Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
    ]
  },
  {
    title: 'Settings',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
    ]
  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { hasPermission, isCompanyAdmin } = usePermissions()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    logout()
    window.location.href = (import.meta.env.BASE_URL || '/') + 'login'
  }

  // Filter nav sections and items based on permissions, page permissions, and search
  const visibleSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Permission check (role-based)
      if (item.permission && !isCompanyAdmin && !hasPermission(item.permission)) return false
      
      // Page permissions check (company-level restrictions)
      // If pagePermissions is set and not empty, only show allowed pages
      if (user?.pagePermissions && user.pagePermissions.length > 0) {
        const pageId = item.path.replace('/', '') || 'dashboard'
        if (!user.pagePermissions.includes(pageId)) return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        return item.label.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  })).filter(section => section.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen bg-[#003366] flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-60' : 'w-16'
      }`}>
        <div className="p-4 border-b border-[#002244] flex-shrink-0 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 size={24} className="text-emerald-400" />
              Company Admin
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-white hover:bg-[#002244] rounded-lg"
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
        </div>

        {/* Search Input */}
        {sidebarOpen && (
          <div className="px-3 py-2 border-b border-[#002244]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-[#002244] border border-[#001a33] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        <nav className="py-2 flex-1 overflow-y-auto">
          {visibleSections.map((section) => (
            <div key={section.title} className="mb-2">
              {sidebarOpen && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-white transition-colors ${
                      isActive
                        ? 'bg-[#002244] text-emerald-400'
                        : 'hover:bg-[#002244]'
                    }`
                  }
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-[#002244] bg-[#003366]">
          {sidebarOpen && (
            <div className="mb-3">
              <p className="font-medium text-white text-sm">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.companyName}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:bg-[#002244] rounded-lg text-sm ${
              !sidebarOpen ? 'justify-center px-2' : ''
            }`}
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`p-6 min-h-screen transition-all duration-300 ${
        sidebarOpen ? 'ml-60' : 'ml-16'
      }`}>
        <Outlet />
      </main>
    </div>
  )
}
