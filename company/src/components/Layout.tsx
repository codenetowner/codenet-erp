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
  'crm-pipeline': { label: 'CRM / Pipeline', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
  'quotations': { label: 'Quotations', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
  'sales-orders': { label: 'Sales Orders', icon: History, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'point-of-sale': { label: 'Point of Sale (POS)', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'activities': { label: 'Activities', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
  'credit-notes': { label: 'Credit Notes / Refunds', icon: Receipt, permission: PERMISSIONS.VIEW_RETURNS },
  'payment-collections': { label: 'Payment Collections', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
  // Inventory
  'products': { label: 'Products & Variants', icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
  'inventory-adjustments': { label: 'Inventory Adjustments', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
  'locations-warehouses': { label: 'Locations & Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
  'inventory-valuation': { label: 'Inventory Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
  'configuration': { label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
  // Manufacturing & Purchasing
  'bill-of-materials': { label: 'Bill of Materials (BOM)', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
  'purchase-orders': { label: 'Purchase Orders (PO)', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
  'manufacturing-orders': { label: 'Manufacturing Orders (MO)', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
  // Contacts
  'customers': { label: 'Customers', icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
  'vendors': { label: 'Vendors', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
  // Human Resources
  'employees': { label: 'Employees', icon: UserCog, permission: PERMISSIONS.VIEW_EMPLOYEES },
  'sales-teams': { label: 'Sales Teams', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
  'fleet': { label: 'Fleet', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
  'attendances-time-off': { label: 'Attendances & Time Off', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
  // Accounting
  'employee-expenses': { label: 'Employee Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
  'chart-of-accounts': { label: 'Chart of Accounts', icon: BookOpen, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'journal-entries': { label: 'Journal Entries', icon: BookMarked, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'account-ledger': { label: 'General Ledger', icon: Landmark, permission: PERMISSIONS.VIEW_ACCOUNTING },
  'financial-reports': { label: 'Reporting', icon: FileBarChart, permission: PERMISSIONS.VIEW_FINANCIAL_REPORTS },
  'currencies': { label: 'Currencies', icon: Coins, permission: PERMISSIONS.VIEW_CURRENCIES },
  // Reporting & Analytics
  'sales-analysis': { label: 'Sales Analysis', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
  'advanced-analytics': { label: 'Advanced Analytics', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
  // eCommerce
  'web-orders': { label: 'Web Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
  'ecommerce-config': { label: 'eCommerce Configuration', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
  // Settings
  'general-settings': { label: 'General Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
  'user-interface': { label: 'User Interface', icon: Menu, permission: PERMISSIONS.VIEW_SETTINGS },
  'users-companies': { label: 'Users & Companies', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
  'product-categories': { label: 'Product Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
  'units-of-measure': { label: 'Units of Measure (UoM)', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
  // Backward compatibility aliases for old IDs stored in database
  'leads': { label: 'CRM / Pipeline', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
  'quotes': { label: 'Quotations', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
  'direct-sales': { label: 'Point of Sale (POS)', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'sales-history': { label: 'Sales Orders', icon: History, permission: PERMISSIONS.VIEW_DIRECT_SALES },
  'tasks': { label: 'Activities', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
  'returns': { label: 'Credit Notes / Refunds', icon: Receipt, permission: PERMISSIONS.VIEW_RETURNS },
  'cash': { label: 'Payment Collections', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
  'stock-adjustment': { label: 'Inventory Adjustments', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
  'warehouses': { label: 'Locations & Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
  'valuation': { label: 'Inventory Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
  'inventory-settings': { label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
  'raw-materials': { label: 'Bill of Materials (BOM)', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
  'raw-material-purchases': { label: 'Purchase Orders (PO)', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
  'production-orders': { label: 'Manufacturing Orders (MO)', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
  'suppliers': { label: 'Vendors', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
  'salesmen': { label: 'Sales Teams', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
  'vans': { label: 'Fleet', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
  'attendance': { label: 'Attendances & Time Off', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
  'expenses': { label: 'Employee Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
  'reports': { label: 'Sales Analysis', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
  'deep-report': { label: 'Advanced Analytics', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
  'online-orders': { label: 'Web Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
  'online-store-settings': { label: 'eCommerce Configuration', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
  'settings': { label: 'General Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
  'sidebar-settings': { label: 'User Interface', icon: Menu, permission: PERMISSIONS.VIEW_SETTINGS },
  'roles': { label: 'Users & Companies', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
  'categories': { label: 'Product Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
  'units': { label: 'Units of Measure (UoM)', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
}

// Map old page IDs to new route paths
const PAGE_PATH_MAP: Record<string, string> = {
  'leads': 'crm-pipeline',
  'quotes': 'quotations',
  'direct-sales': 'point-of-sale',
  'sales-history': 'sales-orders',
  'tasks': 'activities',
  'returns': 'credit-notes',
  'cash': 'payment-collections',
  'stock-adjustment': 'inventory-adjustments',
  'warehouses': 'locations-warehouses',
  'valuation': 'inventory-valuation',
  'inventory-settings': 'configuration',
  'raw-materials': 'bill-of-materials',
  'raw-material-purchases': 'purchase-orders',
  'production-orders': 'manufacturing-orders',
  'suppliers': 'vendors',
  'salesmen': 'sales-teams',
  'vans': 'fleet',
  'attendance': 'attendances-time-off',
  'expenses': 'employee-expenses',
  'reports': 'sales-analysis',
  'deep-report': 'advanced-analytics',
  'online-orders': 'web-orders',
  'online-store-settings': 'ecommerce-config',
  'settings': 'general-settings',
  'sidebar-settings': 'user-interface',
  'roles': 'users-companies',
  'categories': 'product-categories',
  'units': 'units-of-measure',
}

// Helper to get the correct route path for a page ID
const getPagePath = (pageId: string): string => {
  if (pageId === 'dashboard') return '/'
  const mappedPath = PAGE_PATH_MAP[pageId] || pageId
  return `/${mappedPath}`
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
      { path: '/crm-pipeline', label: 'CRM / Pipeline', icon: UserPlus, permission: PERMISSIONS.VIEW_LEADS },
      { path: '/quotations', label: 'Quotations', icon: FileText, permission: PERMISSIONS.VIEW_QUOTES },
      { path: '/sales-orders', label: 'Sales Orders', icon: History, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      { path: '/point-of-sale', label: 'Point of Sale (POS)', icon: ShoppingCart, permission: PERMISSIONS.VIEW_DIRECT_SALES },
      { path: '/activities', label: 'Activities', icon: ListChecks, permission: PERMISSIONS.VIEW_ORDERS },
      { path: '/credit-notes', label: 'Credit Notes / Refunds', icon: Receipt, permission: PERMISSIONS.VIEW_RETURNS },
      { path: '/payment-collections', label: 'Payment Collections', icon: HandCoins, permission: PERMISSIONS.VIEW_COLLECTIONS },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { path: '/products', label: 'Products & Variants', icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/inventory-adjustments', label: 'Inventory Adjustments', icon: ArrowUpDown, permission: PERMISSIONS.ADJUST_STOCK_LEVELS },
      { path: '/locations-warehouses', label: 'Locations & Warehouses', icon: Warehouse, permission: PERMISSIONS.VIEW_WAREHOUSES },
      { path: '/inventory-valuation', label: 'Inventory Valuation', icon: Scale, permission: PERMISSIONS.VIEW_INVENTORY_VALUATION },
      { path: '/configuration', label: 'Configuration', icon: SlidersHorizontal, permission: PERMISSIONS.EDIT_INVENTORY_SETTINGS },
    ]
  },
  {
    title: 'Manufacturing',
    items: [
      { path: '/bill-of-materials', label: 'Bill of Materials (BOM)', icon: Boxes, permission: PERMISSIONS.VIEW_PRODUCTS },
      { path: '/manufacturing-orders', label: 'Manufacturing Orders (MO)', icon: Factory, permission: PERMISSIONS.VIEW_PRODUCTS },
    ]
  },
  {
    title: 'Purchasing',
    items: [
      { path: '/purchase-orders', label: 'Purchase Orders (PO)', icon: FileText, permission: PERMISSIONS.VIEW_SUPPLIERS },
    ]
  },
  {
    title: 'Contacts',
    items: [
      { path: '/customers', label: 'Customers', icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
      { path: '/vendors', label: 'Vendors', icon: TruckIcon, permission: PERMISSIONS.VIEW_SUPPLIERS },
    ]
  },
  {
    title: 'Human Resources',
    items: [
      { path: '/employees', label: 'Employees', icon: UserCog, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/sales-teams', label: 'Sales Teams', icon: Briefcase, permission: PERMISSIONS.VIEW_EMPLOYEES },
      { path: '/fleet', label: 'Fleet', icon: Truck, permission: PERMISSIONS.VIEW_VANS },
      { path: '/attendances-time-off', label: 'Attendances & Time Off', icon: CalendarCheck, permission: PERMISSIONS.VIEW_ATTENDANCE },
    ]
  },
  {
    title: 'Accounting',
    items: [
      { path: '/employee-expenses', label: 'Employee Expenses', icon: Receipt, permission: PERMISSIONS.VIEW_EXPENSES },
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
      { path: '/sales-analysis', label: 'Sales Analysis', icon: BarChart3, permission: PERMISSIONS.VIEW_SALES_REPORT },
      { path: '/advanced-analytics', label: 'Advanced Analytics', icon: History, permission: PERMISSIONS.VIEW_DEEP_REPORT },
    ]
  },
  {
    title: 'eCommerce',
    items: [
      { path: '/web-orders', label: 'Web Orders', icon: ShoppingBag, permission: PERMISSIONS.VIEW_ONLINE_ORDERS },
      { path: '/ecommerce-config', label: 'eCommerce Configuration', icon: Store, permission: PERMISSIONS.VIEW_ONLINE_STORE },
    ]
  },
  {
    title: 'Settings',
    items: [
      { path: '/general-settings', label: 'General Settings', icon: Settings, permission: PERMISSIONS.VIEW_SETTINGS },
      { path: '/user-interface', label: 'User Interface', icon: Menu, permission: PERMISSIONS.VIEW_SETTINGS },
      { path: '/users-companies', label: 'Users & Companies', icon: Shield, permission: PERMISSIONS.VIEW_ROLES },
      { path: '/product-categories', label: 'Product Categories', icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
      { path: '/units-of-measure', label: 'Units of Measure (UoM)', icon: Ruler, permission: PERMISSIONS.VIEW_UNITS },
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
            path: getPagePath(pageId),
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
