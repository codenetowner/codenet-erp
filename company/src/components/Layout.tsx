import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  ShoppingCart,
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
  BookMarked,
  Menu,
  ChevronRight,
  Zap,
  Bell,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePermissions, PERMISSIONS } from '../contexts/PermissionContext'
import api from '../lib/api'

// Page metadata mapping - used to build dynamic sidebar (Odoo/Enterprise naming)
const PAGE_META: Record<string, { label: string; icon: any; permission?: string }> = {
  'dashboard': { label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD },
  // Sales & CRM
  'leads': { label: 'CRM / Pipeline', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
  'quotes': { label: 'Quotations', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
  'sales-history': { label: 'Sales Orders', icon: History, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'direct-sales': { label: 'Point of Sale (POS)', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'tasks': { label: 'Activities', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
  'returns': { label: 'Credit Notes / Refunds', icon: Receipt, permission: PERMISSIONS.VIEW_RETURNS },
  'cash': { label: 'Payment Collections', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
  // Inventory
  'products': { label: 'Products & Variants', icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
  'stock-adjustment': { label: 'Inventory Adjustments', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
  'warehouses': { label: 'Locations & Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
  'valuation': { label: 'Inventory Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
  'inventory-settings': { label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
  // Manufacturing & Purchasing
  'raw-materials': { label: 'Bill of Materials (BOM)', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
  'raw-material-purchases': { label: 'Purchase Orders (PO)', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
  'production-orders': { label: 'Manufacturing Orders (MO)', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
  // Contacts
  'customers': { label: 'Customers', icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
  'suppliers': { label: 'Vendors', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
  // Human Resources
  'employees': { label: 'Employees', icon: UserCog, permission: PERMISSIONS.VIEW_EMPLOYEES },
  'salesmen': { label: 'Sales Teams', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
  'vans': { label: 'Fleet', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
  'attendance': { label: 'Attendances & Time Off', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
  // Accounting
  'expenses': { label: 'Employee Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
  'chart-of-accounts': { label: 'Chart of Accounts', icon: BookOpen, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'journal-entries': { label: 'Journal Entries', icon: BookMarked, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'account-ledger': { label: 'General Ledger', icon: Landmark, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'financial-reports': { label: 'Reporting', icon: FileBarChart, permission: PERMISSIONS.VIEW_FINANCIAL_REPORTS },
  'currencies': { label: 'Currencies', icon: Coins, permission: PERMISSIONS.VIEW_CURRENCIES },
  // Reporting & Analytics
  'reports': { label: 'Sales Analysis', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
  'deep-report': { label: 'Advanced Analytics', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
  // eCommerce
  'online-orders': { label: 'Web Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
  'online-store-settings': { label: 'eCommerce Configuration', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
  // Settings
  'settings': { label: 'General Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
  'sidebar-settings': { label: 'User Interface', icon: Menu, permission: PERMISSIONS.VIEW_SETTINGS },
  'roles': { label: 'Users & Companies', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
  'categories': { label: 'Product Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
  'units': { label: 'Units of Measure (UoM)', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
}

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
    title: 'Sales & CRM',
    items: [
      { path: '/leads', label: 'CRM / Pipeline', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
      { path: '/quotes', label: 'Quotations', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
      { path: '/sales-history', label: 'Sales Orders', icon: History, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      { path: '/direct-sales', label: 'Point of Sale (POS)', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      { path: '/tasks', label: 'Activities', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
      { path: '/returns', label: 'Credit Notes / Refunds', icon: Receipt, permission: PERMISSIONS.VIEW_RETURNS },
      { path: '/cash', label: 'Payment Collections', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { path: '/products', label: 'Products & Variants', icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/stock-adjustment', label: 'Inventory Adjustments', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
      { path: '/warehouses', label: 'Locations & Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
      { path: '/valuation', label: 'Inventory Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
      { path: '/inventory-settings', label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
    ]
  },
  {
    title: 'Manufacturing',
    items: [
      { path: '/raw-materials', label: 'Bill of Materials (BOM)', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/production-orders', label: 'Manufacturing Orders (MO)', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
    ]
  },
  {
    title: 'Purchasing',
    items: [
      { path: '/raw-material-purchases', label: 'Purchase Orders (PO)', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
    ]
  },
  {
    title: 'Contacts',
    items: [
      { path: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
      { path: '/suppliers', label: 'Vendors', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
    ]
  },
  {
    title: 'Human Resources',
    items: [
      { path: '/employees', label: 'Employees', icon: UserCog, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/salesmen', label: 'Sales Teams', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/vans', label: 'Fleet', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
      { path: '/attendance', label: 'Attendances & Time Off', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
    ]
  },
  {
    title: 'Accounting',
    items: [
      { path: '/expenses', label: 'Employee Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
      { path: '/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/journal-entries', label: 'Journal Entries', icon: BookMarked, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/account-ledger', label: 'General Ledger', icon: Landmark, permission: PERMISSIONS.VIEW_ACCOUNTING },
      { path: '/financial-reports', label: 'Reporting', icon: FileBarChart, permission: PERMISSIONS.VIEW_FINANCIAL_REPORTS },
      { path: '/currencies', label: 'Currencies', icon: Coins, permission: PERMISSIONS.VIEW_CURRENCIES },
    ]
  },
  {
    title: 'Reporting & Analytics',
    items: [
      { path: '/reports', label: 'Sales Analysis', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
      { path: '/deep-report', label: 'Advanced Analytics', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
    ]
  },
  {
    title: 'eCommerce',
    items: [
      { path: '/online-orders', label: 'Web Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
      { path: '/online-store-settings', label: 'eCommerce Configuration', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
    ]
  },
  {
    title: 'Settings',
    items: [
      { path: '/settings', label: 'General Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
      { path: '/sidebar-settings', label: 'User Interface', icon: Menu, permission: PERMISSIONS.VIEW_SETTINGS },
      { path: '/roles', label: 'Users & Companies', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
      { path: '/categories', label: 'Product Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
      { path: '/units', label: 'Units of Measure (UoM)', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
    ]
  },
]

interface SidebarConfig {
  sections: { id?: number; name: string; pages: string[] }[]
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { hasPermission, isCompanyAdmin } = usePermissions()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [customConfig, setCustomConfig] = useState<SidebarConfig | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Fetch custom sidebar configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/sidebar/config')
        if (response.data.sections && response.data.sections.length > 0) {
          setCustomConfig(response.data)
        }
      } catch (error) {
        // No custom config, use default
        console.log('Using default sidebar config')
      }
    }
    fetchConfig()
  }, [])

  const handleLogout = () => {
    logout()
    window.location.href = (import.meta.env.BASE_URL || '/') + 'login'
  }

  // Build dynamic sections from custom config or use default
  const dynamicSections: NavSection[] = customConfig 
    ? customConfig.sections.map(section => ({
        title: section.name,
        items: section.pages
          .filter(pageId => PAGE_META[pageId]) // Only include valid pages
          .map(pageId => ({
            path: pageId === 'dashboard' ? '/' : `/${pageId}`,
            label: PAGE_META[pageId].label,
            icon: PAGE_META[pageId].icon,
            permission: PAGE_META[pageId].permission
          }))
      }))
    : navSections

  // Check if current page is allowed based on pagePermissions
  useEffect(() => {
    if (user?.pagePermissions && user.pagePermissions.length > 0) {
      const currentPageId = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1)
      
      // If current page is not in allowed list, redirect to first allowed page
      if (!user.pagePermissions.includes(currentPageId)) {
        const firstAllowedPage = user.pagePermissions[0]
        const redirectPath = firstAllowedPage === 'dashboard' ? '/' : `/${firstAllowedPage}`
        navigate(redirectPath, { replace: true })
      }
    }
  }, [location.pathname, user?.pagePermissions, navigate])

  // Filter nav sections and items based on permissions, page permissions, and search
  const visibleSections = dynamicSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Permission check (role-based)
      if (item.permission && !isCompanyAdmin && !hasPermission(item.permission)) return false
      
      // Page permissions check (company-level restrictions)
      // If pagePermissions is set and not empty, only show allowed pages
      if (user?.pagePermissions && user.pagePermissions.length > 0) {
        // Extract page ID from path: '/' -> 'dashboard', '/employees' -> 'employees'
        const pageId = item.path === '/' ? 'dashboard' : item.path.slice(1)
        if (!user.pagePermissions.includes(pageId)) return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        return item.label.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
  })).filter(section => section.items.length > 0)

  // Get current page for active state
  const currentPath = location.pathname

  // Section icon mapping
  const sectionIcons: Record<string, any> = {
    'Sales & CRM': ShoppingCart,
    'Inventory': Package,
    'Manufacturing': Factory,
    'Purchasing': FileText,
    'Contacts': Users,
    'Human Resources': UserCog,
    'Accounting': BookOpen,
    'Reporting & Analytics': BarChart3,
    'eCommerce': Store,
    'Settings': Settings,
  }

  return (
    <div className="h-screen flex bg-slate-900 text-slate-300 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`bg-slate-950 border-r border-slate-800 flex flex-col h-full flex-shrink-0 relative z-20 transition-all duration-300 ${
        sidebarOpen ? 'w-72' : 'w-16'
      }`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Zap className="text-white" size={20} />
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-wide">
                {user?.companyName || 'ERP System'}
              </span>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="ml-auto p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PanelLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Dashboard (Always visible at top) */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium mb-2 transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <LayoutDashboard size={18} className="w-5" />
            {sidebarOpen && <span>Dashboard</span>}
          </NavLink>

          {/* Collapsible Sections */}
          {visibleSections.map((section) => {
            const SectionIcon = sectionIcons[section.title] || Package
            
            if (!sidebarOpen) {
              // Collapsed mode - just show first item icon
              return (
                <div key={section.title} className="mb-1">
                  {section.items.slice(0, 1).map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/10 to-transparent text-cyan-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`
                      }
                      title={section.title}
                    >
                      <SectionIcon size={18} />
                    </NavLink>
                  ))}
                </div>
              )
            }

            return (
              <details key={section.title} className="group" open={section.items.some(item => item.path === currentPath)}>
                <summary className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer transition-colors font-medium select-none">
                  <div className="flex items-center gap-3">
                    <SectionIcon size={18} className="w-5" />
                    <span>{section.title}</span>
                  </div>
                  <ChevronRight size={14} className="transition-transform duration-200 chevron-icon" />
                </summary>
                <div className="pl-11 pr-3 py-1 space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `block py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'text-cyan-400'
                            : 'text-slate-500 hover:text-cyan-400'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
        
        {/* User Profile Area (Bottom of Sidebar) */}
        <div className="h-16 border-t border-slate-800/60 p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D8ABC&color=fff`} 
              alt="User" 
              className="w-8 h-8 rounded-full"
            />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.companyName}</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Background Magic Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-600/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

        {/* Top Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              {PAGE_META[currentPath === '/' ? 'dashboard' : currentPath.slice(1)]?.label || 'Page'}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">Welcome back, {user?.name}</p>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-full focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block w-64 pl-10 p-2 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Notifications */}
            <button className="relative text-slate-400 hover:text-cyan-400 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 text-[9px] text-white items-center justify-center font-bold border border-slate-900">3</span>
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 z-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
