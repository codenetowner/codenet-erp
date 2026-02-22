import { useEffect, useState } from 'react'
import {
  DollarSign, Truck, Clock, CheckCircle,
  Loader2, Search, Download
} from 'lucide-react'
import { freelanceDriversApi } from '../lib/api'

interface Driver {
  id: number
  name: string
  phone: string
  vehicleType: string
  totalDeliveries: number
  totalEarnings: number
  status: string
  isOnline: boolean
}

interface PayoutSummary {
  totalDrivers: number
  totalEarnings: number
  totalDeliveries: number
  pendingPayouts: number
}

export default function DriverPayouts() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [stats, setStats] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const [driversRes, statsRes] = await Promise.all([
        freelanceDriversApi.getAll({ status: 'approved' }),
        freelanceDriversApi.getStats(),
      ])
      setDrivers(driversRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to load payouts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  )

  // Sort by earnings descending
  const sorted = [...filtered].sort((a, b) => b.totalEarnings - a.totalEarnings)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Driver Payouts</h1>
          <p className="text-gray-400 text-sm">Track and manage driver earnings and payouts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={Truck} label="Active Drivers" value={stats.totalDrivers} color="bg-blue-600" />
          <StatBox icon={DollarSign} label="Total Earnings" value={`$${stats.totalEarnings.toFixed(2)}`} color="bg-green-600" />
          <StatBox icon={CheckCircle} label="Total Deliveries" value={stats.totalDeliveries} color="bg-purple-600" />
          <StatBox icon={Clock} label="Avg per Driver" value={stats.totalDrivers > 0 ? `$${(stats.totalEarnings / stats.totalDrivers).toFixed(2)}` : '$0'} color="bg-yellow-600" />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search driver..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Payouts Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No drivers found</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Vehicle</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Deliveries</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Total Earned</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Avg/Delivery</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const avg = d.totalDeliveries > 0 ? d.totalEarnings / d.totalDeliveries : 0
                return (
                  <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm font-bold">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{d.name}</p>
                          <p className="text-xs text-gray-500">{d.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 capitalize">{d.vehicleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{d.totalDeliveries}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-green-400">${d.totalEarnings.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 text-right">${avg.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {d.isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                          Offline
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals Row */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-t border-gray-700">
            <span className="text-sm font-medium text-gray-400">{sorted.length} drivers</span>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-400">
                Total Deliveries: <span className="text-white font-semibold">{sorted.reduce((s, d) => s + d.totalDeliveries, 0)}</span>
              </span>
              <span className="text-sm text-gray-400">
                Total Payable: <span className="text-green-400 font-semibold">${sorted.reduce((s, d) => s + d.totalEarnings, 0).toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
