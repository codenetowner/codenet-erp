import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingCart, 
  Wallet, 
  Package,
  TrendingUp,
  DollarSign,
  Users,
  ClipboardList,
  RefreshCw,
  RotateCcw,
  Truck,
  Play,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi, shiftApi } from '../lib/api'

interface DashboardData {
  todayTasks: number
  completedTasks: number
  pendingTasks: number
  totalSales: number
  totalCollections: number
  totalDeposits: number
  cashInHand: number
  customersVisited: number
}

interface CashSummary {
  previousBalance: number
  taskTotalSales: number
  taskCash: number
  taskDebts: number
  posTotalSales: number
  posSales: number
  collections: number
  todayInflows: number
  totalBeforeDeposit: number
  deposits: number
  cashInHand: number
}

const quickActions = [
  { label: 'POS / Sale', icon: ShoppingCart, path: '/pos', color: 'bg-blue-500' },
  { label: 'My Tasks', icon: ClipboardList, path: '/tasks', color: 'bg-indigo-500' },
  { label: 'Collect Cash', icon: Wallet, path: '/collect-cash', color: 'bg-green-500' },
  { label: 'Deposit', icon: DollarSign, path: '/deposit', color: 'bg-emerald-500' },
  { label: 'Returns', icon: RotateCcw, path: '/returns', color: 'bg-orange-500' },
  { label: 'End Shift', icon: TrendingUp, path: '/end-shift', color: 'bg-red-500' },
]

interface ShiftData {
  hasActiveShift: boolean
  id?: number
  startTime?: string
  status?: string
}

export default function Home() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null)
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [startingShift, setStartingShift] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, cashRes, shiftRes] = await Promise.all([
        dashboardApi.getDashboard(),
        dashboardApi.getCashSummary(),
        shiftApi.getCurrent()
      ])
      setDashboard(dashRes.data)
      setCashSummary(cashRes.data)
      setShiftData(shiftRes.data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartShift = async () => {
    setStartingShift(true)
    try {
      await shiftApi.start({})
      alert('Shift started! Attendance recorded.')
      loadData()
    } catch (error: any) {
      console.error('Failed to start shift:', error)
      alert(error.response?.data?.error || 'Failed to start shift')
    } finally {
      setStartingShift(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }


  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-primary-200 text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold">{user?.name || 'Driver'}</h1>
          </div>
          <button onClick={loadData} className="p-2 rounded-full bg-primary-700 hover:bg-primary-600">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Shift Status / Start Shift */}
        {!shiftData?.hasActiveShift ? (
          <button
            onClick={handleStartShift}
            disabled={startingShift}
            className="w-full mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
          >
            <Truck size={28} />
            <div className="text-left">
              <p className="font-bold text-lg">{startingShift ? 'Starting...' : 'Load Truck & Start Shift'}</p>
              <p className="text-green-100 text-sm">Tap to begin your day</p>
            </div>
            <Play size={24} className="ml-auto" />
          </button>
        ) : (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <div>
              <p className="font-medium text-green-800">Shift Active</p>
              <p className="text-sm text-green-600">
                Started at {shiftData.startTime ? (() => {
                  const d = new Date(shiftData.startTime);
                  const hours = d.getUTCHours();
                  const minutes = d.getUTCMinutes();
                  const seconds = d.getUTCSeconds();
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const h12 = hours % 12 || 12;
                  return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
                })() : 'Today'}
              </p>
            </div>
          </div>
        )}

        {/* Today's Stats */}
        <div className={`grid grid-cols-2 gap-3 mb-6 ${!shiftData?.hasActiveShift ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="card">
            <div className="flex items-center gap-3">
              <Package className="text-blue-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Tasks</p>
                <p className="text-lg font-bold text-gray-900">
                  {dashboard?.completedTasks || 0}/{dashboard?.todayTasks || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Sales</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboard?.totalSales || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <DollarSign className="text-purple-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Collections</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(dashboard?.totalCollections || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <Users className="text-orange-600" size={20} />
              <div>
                <p className="text-xs text-gray-500">Customers</p>
                <p className="text-lg font-bold text-gray-900">
                  {dashboard?.customersVisited || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={!shiftData?.hasActiveShift ? 'opacity-40 pointer-events-none' : ''}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path} className="quick-action">
              <div className={`${action.color} p-3 rounded-xl mb-2`}>
                <action.icon className="text-white" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
        </div>

        {/* Cash Summary */}
        <div className={!shiftData?.hasActiveShift ? 'opacity-40 pointer-events-none' : ''}>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cash Summary</h2>
        <div className="card">
          <div className="space-y-3">
            {/* Cash Carried Over - only show if > 0 */}
            {(cashSummary?.previousBalance || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Cash Carried Over</span>
                <span className="font-semibold text-blue-600">{formatCurrency(cashSummary?.previousBalance || 0)}</span>
              </div>
            )}
            
            {/* Today's Activity Header */}
            <div className={`${(cashSummary?.previousBalance || 0) > 0 ? 'border-t pt-3' : ''}`}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Today's Activity</span>
            </div>
            
            {/* Task Sales Breakdown */}
            {(cashSummary?.taskTotalSales || 0) > 0 && (
              <div className="bg-gray-50 rounded-lg p-2 -mx-2">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 font-medium">Task Sales</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(cashSummary?.taskTotalSales || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pl-3">
                  <span className="text-gray-500">↳ Cash received</span>
                  <span className="font-medium text-green-600">+{formatCurrency(cashSummary?.taskCash || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pl-3">
                  <span className="text-gray-500">↳ On credit</span>
                  <span className="font-medium text-orange-500">{formatCurrency(cashSummary?.taskDebts || 0)}</span>
                </div>
              </div>
            )}
            
            {/* POS Sales Breakdown */}
            {(cashSummary?.posTotalSales || 0) > 0 && (
              <div className="bg-gray-50 rounded-lg p-2 -mx-2">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 font-medium">POS Sales</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(cashSummary?.posTotalSales || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pl-3">
                  <span className="text-gray-500">↳ Cash received</span>
                  <span className="font-medium text-green-600">+{formatCurrency(cashSummary?.posSales || 0)}</span>
                </div>
                {(cashSummary?.posTotalSales || 0) - (cashSummary?.posSales || 0) > 0 && (
                  <div className="flex justify-between text-sm pl-3">
                    <span className="text-gray-500">↳ On credit</span>
                    <span className="font-medium text-orange-500">{formatCurrency((cashSummary?.posTotalSales || 0) - (cashSummary?.posSales || 0))}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Collections</span>
              <span className="font-medium text-green-600">+{formatCurrency(cashSummary?.collections || 0)}</span>
            </div>
            
            {/* Total Before Deposit */}
            <div className="border-t pt-2 flex justify-between bg-blue-50 -mx-4 px-4 py-2">
              <span className="text-gray-700 font-medium">Total Cash Available</span>
              <span className="font-bold text-blue-600">{formatCurrency(cashSummary?.totalBeforeDeposit || 0)}</span>
            </div>
            
            {/* Deposits */}
            <div className="flex justify-between">
              <span className="text-gray-500">Today's Deposits</span>
              <span className="font-medium text-red-600">-{formatCurrency(cashSummary?.deposits || 0)}</span>
            </div>
            
            {/* Total Cash in Hand */}
            <div className="border-t-2 border-gray-300 pt-3 flex justify-between bg-gray-50 -mx-4 px-4 py-3 rounded-b-xl">
              <span className="font-bold text-gray-900">Cash in Hand</span>
              <span className="font-bold text-xl text-primary-600">{formatCurrency(cashSummary?.cashInHand || 0)}</span>
            </div>
          </div>
        </div>
        </div>

        {/* Pending Tasks Alert */}
        {(dashboard?.pendingTasks || 0) > 0 && shiftData?.hasActiveShift && (
          <Link to="/tasks" className="block mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="text-amber-600" size={24} />
                <div>
                  <p className="font-medium text-amber-800">
                    {dashboard?.pendingTasks} pending task{dashboard?.pendingTasks !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-600">Tap to view and complete</p>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
