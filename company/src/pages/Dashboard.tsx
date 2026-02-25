import { useState, useEffect } from 'react'
import { Users, UserCheck, Truck, ShoppingCart, HandCoins, ListChecks, TrendingUp, TrendingDown, Loader2, CreditCard, Wallet, RefreshCw } from 'lucide-react'
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
      const [dashboardRes, customersRes, employeesRes, vansRes] = await Promise.allSettled([
        reportsApi.getDashboard(),
        customersApi.getAll(),
        employeesApi.getAll(),
        vansApi.getAll()
      ])
      
      if (dashboardRes.status === 'fulfilled') setDashboard(dashboardRes.value)
      setCounts({
        customers: customersRes.status === 'fulfilled' ? (customersRes.value.data?.length || 0) : 0,
        drivers: employeesRes.status === 'fulfilled' ? (employeesRes.value.data?.filter((e: any) => e.role === 'Driver')?.length || 0) : 0,
        vans: vansRes.status === 'fulfilled' ? (vansRes.value.data?.length || 0) : 0
      })
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cyan-500" size={48} />
      </div>
    )
  }

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 - Total Revenue */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Today's Sales</p>
              <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(dashboard?.todaySales || 0)}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                <TrendingUp size={12} /> +12.5% today
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 text-xl border border-slate-700">
              <Wallet size={24} />
            </div>
          </div>
        </div>

        {/* Card 2 - Active Orders */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Today's Orders</p>
              <h3 className="text-3xl font-bold text-white mb-2">{dashboard?.todayOrders || 0}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                <TrendingUp size={12} /> +5.2% this week
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-purple-400 text-xl border border-slate-700">
              <ShoppingCart size={24} />
            </div>
          </div>
        </div>

        {/* Card 3 - Collections */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Collections</p>
              <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(dashboard?.todayCollections || 0)}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                <TrendingUp size={12} /> On track
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 text-xl border border-slate-700">
              <HandCoins size={24} />
            </div>
          </div>
        </div>

        {/* Card 4 - Outstanding Debt */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Outstanding Debt</p>
              <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(dashboard?.totalOutstandingDebt || 0)}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-md">
                <TrendingDown size={12} /> Needs attention
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-pink-400 text-xl border border-slate-700">
              <ListChecks size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tables Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Monthly Overview</h3>
            <button 
              onClick={loadDashboardData}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          
          {/* Monthly Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/20">
              <p className="text-cyan-400 text-sm mb-1">Month Sales</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboard?.monthSales || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
              <p className="text-purple-400 text-sm mb-1">Month Orders</p>
              <p className="text-2xl font-bold text-white">{dashboard?.monthOrders || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/20">
              <p className="text-emerald-400 text-sm mb-1">Month Collections</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboard?.monthCollections || 0)}</p>
            </div>
          </div>

          {/* Decorative Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-2 pb-2">
            {[40, 55, 45, 70, 85, 60, 90, 75, 65].map((height, i) => (
              <div 
                key={i}
                className={`w-full rounded-t-sm transition-colors cursor-pointer ${
                  i === 4 
                    ? 'bg-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'bg-slate-800/50 hover:bg-cyan-500/50'
                }`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div className="glass-card rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Quick Stats</h3>
          
          <div className="space-y-5 flex-1">
            {/* Stat Item */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Cash in Vans</p>
                  <p className="text-xs text-slate-500">Available float</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{formatCurrency(dashboard?.cashInVans || 0)}</p>
            </div>
            
            {/* Stat Item */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Active Drivers</p>
                  <p className="text-xs text-slate-500">On duty now</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{dashboard?.activeDrivers || 0}</p>
            </div>

            {/* Stat Item */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Total Customers</p>
                  <p className="text-xs text-slate-500">Registered</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{counts.customers}</p>
            </div>

            {/* Stat Item */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Total Vans</p>
                  <p className="text-xs text-slate-500">Fleet size</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{counts.vans}</p>
            </div>

            {/* Stat Item */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <CreditCard size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Today's Deposits</p>
                  <p className="text-xs text-slate-500">Bank transfers</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white">{formatCurrency(dashboard?.todayDeposits || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
