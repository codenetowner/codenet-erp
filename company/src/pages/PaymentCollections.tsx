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
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">Payment Collections</h1>
          <p className="text-slate-400 text-sm mt-1">Van cash balances and driver deposits</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-all font-medium text-sm shadow-lg shadow-cyan-900/30"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cash in Vans</p>
              <p className="text-2xl font-bold text-emerald-400">${totalCashInVans.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Download className="text-cyan-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Deposits</p>
              <p className="text-2xl font-bold text-cyan-400">${totalDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Deposits</p>
              <p className="text-2xl font-bold text-amber-400">${pendingDepositsAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-green-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Check className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Confirmed Deposits</p>
              <p className="text-2xl font-bold text-green-400">${confirmedDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Truck className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Vans</p>
              <p className="text-2xl font-bold text-purple-400">{vanCash.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Filters:</span>
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
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
            className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
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
              className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
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
              className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
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
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'vans' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          Van Cash ({filteredVanCash.length})
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'deposits' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
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
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Van Cash Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Van</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Current Cash</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Max Cash</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usage</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredVanCash.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No van cash data found</td></tr>
            ) : filteredVanCash.map((vc) => {
              const usagePercent = vc.maxCash > 0 ? (vc.currentBalance / vc.maxCash) * 100 : 0
              return (
                <tr key={vc.vanId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-slate-500" />
                      <span className="font-medium text-slate-200">{vc.vanName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{vc.driverName || <span className="text-slate-600">Unassigned</span>}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">${vc.currentBalance.toFixed(3)}</td>
                  <td className="px-4 py-3 text-slate-400">${vc.maxCash.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={`h-full rounded-full ${
                            usagePercent > 80 ? 'bg-rose-500' : 
                            usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{usagePercent.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {vc.currentBalance > vc.maxCash * 0.8 ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Needs Deposit</span>
                    ) : vc.currentBalance > vc.maxCash * 0.5 ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
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
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Driver Deposits</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Deposit #</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredDeposits.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No deposits found</td></tr>
            ) : filteredDeposits.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-bold text-cyan-400">{deposit.depositNumber}</td>
                <td className="px-4 py-3 text-slate-200">{deposit.driverName}</td>
                <td className="px-4 py-3 font-bold text-emerald-400">${deposit.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    {deposit.depositType === 'bank' ? (
                      <Building size={16} className="text-cyan-400" />
                    ) : (
                      <Warehouse size={16} className="text-amber-400" />
                    )}
                    <span className="capitalize">{deposit.depositType}</span>
                    {deposit.bankName && <span className="text-slate-500 text-sm">({deposit.bankName})</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {new Date(deposit.depositDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {deposit.status === 'pending' ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                      <Clock size={12} /> Pending
                    </span>
                  ) : deposit.status === 'confirmed' ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                      <Check size={12} /> Confirmed
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
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
                        className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                        title="Confirm"
                      >
                        {updatingDeposit === deposit.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => handleUpdateDepositStatus(deposit.id, 'rejected')}
                        disabled={updatingDeposit === deposit.id}
                        className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
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
