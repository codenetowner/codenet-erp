import { useState, useEffect } from 'react'
import { Loader2, Truck, DollarSign, RefreshCw, Check, X, Clock, Building, Warehouse, Filter, Download } from 'lucide-react'
import { cashApi } from '../lib/api'

interface VanCash {
  id: number
  vanId: number
  vanName: string
  driverId: number | null
  driverName: string | null
  currentBalance: number
  maxCash: number
  lastUpdated: string
}

interface Overview {
  todayCollections: number
  todayDeposits: number
  cashInVans: number
  pendingDeposits: number
}

interface Deposit {
  id: number
  depositNumber: string
  driverId: number
  driverName: string
  amount: number
  depositType: string
  depositDate: string
  bankName: string | null
  slipNumber: string | null
  status: string
  notes: string | null
  createdAt: string
}

export default function Cash() {
  const [vanCash, setVanCash] = useState<VanCash[]>([])
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([])
  const [_overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingDeposit, setUpdatingDeposit] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'vans' | 'deposits'>('vans')
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today')
  const [driverFilter, setDriverFilter] = useState<string>('')
  const [vanFilter, setVanFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vanRes, overviewRes, depositsRes] = await Promise.all([
        cashApi.getVanCash(),
        cashApi.getOverview(),
        cashApi.getDeposits()
      ])
      setVanCash(vanRes.data)
      setOverview(overviewRes.data)
      setAllDeposits(depositsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateDepositStatus = async (depositId: number, status: 'confirmed' | 'rejected') => {
    try {
      setUpdatingDeposit(depositId)
      await cashApi.updateDepositStatus(depositId, { status })
      await loadData()
    } catch (error) {
      console.error('Failed to update deposit status:', error)
      alert('Failed to update deposit status')
    } finally {
      setUpdatingDeposit(null)
    }
  }

  // Filter logic
  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (dateFilter) {
      case 'today': return today
      case 'week': return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month': return new Date(today.getFullYear(), today.getMonth(), 1)
      case 'year': return new Date(today.getFullYear(), 0, 1)
      default: return null
    }
  }

  const filteredDeposits = allDeposits.filter(d => {
    const dateStart = getDateRange()
    if (dateStart && new Date(d.depositDate) < dateStart) return false
    if (driverFilter && d.driverId.toString() !== driverFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  })

  const filteredVanCash = vanCash.filter(v => {
    if (vanFilter && v.vanId.toString() !== vanFilter) return false
    if (driverFilter && v.driverId?.toString() !== driverFilter) return false
    return true
  })

  // Get unique drivers and vans for filter dropdowns
  const uniqueDrivers = Array.from(new Set(vanCash.filter(v => v.driverId).map(v => JSON.stringify({ id: v.driverId, name: v.driverName }))))
    .map(s => JSON.parse(s))
  const uniqueVans = vanCash.map(v => ({ id: v.vanId, name: v.vanName }))

  const totalCashInVans = filteredVanCash.reduce((sum, v) => sum + v.currentBalance, 0)
  const totalDeposits = filteredDeposits.reduce((sum, d) => sum + d.amount, 0)
  const confirmedDeposits = filteredDeposits.filter(d => d.status === 'confirmed').reduce((sum, d) => sum + d.amount, 0)
  const pendingDepositsAmount = filteredDeposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Van Cash Management</h1>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cash in Vans</p>
              <p className="text-2xl font-bold text-emerald-600">${totalCashInVans.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Download className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Deposits</p>
              <p className="text-2xl font-bold text-blue-600">${totalDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Deposits</p>
              <p className="text-2xl font-bold text-amber-600">${pendingDepositsAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Check className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Confirmed Deposits</p>
              <p className="text-2xl font-bold text-green-600">${confirmedDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Truck className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Vans</p>
              <p className="text-2xl font-bold text-purple-600">{vanCash.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Drivers</option>
            {uniqueDrivers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {activeTab === 'vans' && (
            <select
              value={vanFilter}
              onChange={(e) => setVanFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Vans</option>
              {uniqueVans.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
          {activeTab === 'deposits' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('vans')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'vans' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Van Cash ({filteredVanCash.length})
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'deposits' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Deposits ({filteredDeposits.length})
          {filteredDeposits.filter(d => d.status === 'pending').length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
              {filteredDeposits.filter(d => d.status === 'pending').length} pending
            </span>
          )}
        </button>
      </div>

      {/* Van Cash Table */}
      {activeTab === 'vans' && (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Van Cash Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Van</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Cash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Max Cash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredVanCash.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No van cash data found</td></tr>
            ) : filteredVanCash.map((vc) => {
              const usagePercent = vc.maxCash > 0 ? (vc.currentBalance / vc.maxCash) * 100 : 0
              return (
                <tr key={vc.vanId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-gray-400" />
                      <span className="font-medium">{vc.vanName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{vc.driverName || <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">${vc.currentBalance.toFixed(3)}</td>
                  <td className="px-4 py-3 text-gray-600">${vc.maxCash.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={`h-full rounded-full ${
                            usagePercent > 80 ? 'bg-red-500' : 
                            usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{usagePercent.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {vc.currentBalance > vc.maxCash * 0.8 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Needs Deposit</span>
                    ) : vc.currentBalance > vc.maxCash * 0.5 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Medium</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(vc.lastUpdated).toLocaleDateString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Deposits Table */}
      {activeTab === 'deposits' && (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Driver Deposits</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Deposit #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDeposits.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No deposits found</td></tr>
            ) : filteredDeposits.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{deposit.depositNumber}</td>
                <td className="px-4 py-3">{deposit.driverName}</td>
                <td className="px-4 py-3 font-bold text-emerald-600">${deposit.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {deposit.depositType === 'bank' ? (
                      <Building size={16} className="text-blue-500" />
                    ) : (
                      <Warehouse size={16} className="text-amber-500" />
                    )}
                    <span className="capitalize">{deposit.depositType}</span>
                    {deposit.bankName && <span className="text-gray-400 text-sm">({deposit.bankName})</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(deposit.depositDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {deposit.status === 'pending' ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                      <Clock size={12} /> Pending
                    </span>
                  ) : deposit.status === 'confirmed' ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                      <Check size={12} /> Confirmed
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                      <X size={12} /> Rejected
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {deposit.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDepositStatus(deposit.id, 'confirmed')}
                        disabled={updatingDeposit === deposit.id}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                        title="Confirm"
                      >
                        {updatingDeposit === deposit.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => handleUpdateDepositStatus(deposit.id, 'rejected')}
                        disabled={updatingDeposit === deposit.id}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
