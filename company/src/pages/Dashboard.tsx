import { useState, useEffect } from 'react'
import { Users, UserCheck, Truck, ShoppingCart, HandCoins, ListChecks, DollarSign, TrendingUp, Loader2, Package, CreditCard } from 'lucide-react'
import { reportsApi, customersApi, employeesApi, vansApi } from '../lib/api'

interface DashboardData {
  todaySales: number
  todayOrders: number
  todayCollections: number
  todayDeposits: number
  monthSales: number
  monthOrders: number
  monthCollections: number
  totalOutstandingDebt: number
  cashInVans: number
  activeDrivers: number
}

interface Counts {
  customers: number
  drivers: number
  vans: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [counts, setCounts] = useState<Counts>({ customers: 0, drivers: 0, vans: 0 })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [dashboardRes, customersRes, employeesRes, vansRes] = await Promise.all([
        reportsApi.getDashboard(),
        customersApi.getAll(),
        employeesApi.getAll(),
        vansApi.getAll()
      ])
      
      setDashboard(dashboardRes)
      setCounts({
        customers: customersRes.data?.length || 0,
        drivers: employeesRes.data?.filter((e: any) => e.role === 'Driver')?.length || 0,
        vans: vansRes.data?.length || 0
      })
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(3)}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button 
          onClick={loadDashboardData}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
        >
          Refresh
        </button>
      </div>

      {/* Today's Overview */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Today's Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Today's Sales</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboard?.todaySales || 0)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Today's Orders</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard?.todayOrders || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Collections</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(dashboard?.todayCollections || 0)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <HandCoins className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Deposits</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(dashboard?.todayDeposits || 0)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <CreditCard className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">This Month</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Month Sales</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboard?.monthSales || 0)}</p>
            </div>
            <TrendingUp size={32} className="text-emerald-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Month Orders</p>
              <p className="text-3xl font-bold">{dashboard?.monthOrders || 0}</p>
            </div>
            <Package size={32} className="text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Month Collections</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboard?.monthCollections || 0)}</p>
            </div>
            <HandCoins size={32} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Key Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Outstanding Debt</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboard?.totalOutstandingDebt || 0)}</p>
            </div>
            <ListChecks className="text-red-400" size={28} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Cash in Vans</p>
              <p className="text-2xl font-bold text-cyan-600">{formatCurrency(dashboard?.cashInVans || 0)}</p>
            </div>
            <Truck className="text-cyan-400" size={28} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Drivers</p>
              <p className="text-2xl font-bold text-green-600">{dashboard?.activeDrivers || 0}</p>
            </div>
            <UserCheck className="text-green-400" size={28} />
          </div>
        </div>
      </div>

      {/* Totals */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">System Totals</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{counts.customers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{counts.drivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Truck className="text-cyan-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Vans</p>
              <p className="text-2xl font-bold text-gray-900">{counts.vans}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
