import { useEffect, useState } from 'react'
import {
  Truck, Search, CheckCircle, XCircle, Ban,
  Loader2, MapPin, Star, Package, DollarSign, Clock
} from 'lucide-react'
import { freelanceDriversApi } from '../lib/api'

interface Driver {
  id: number
  name: string
  phone: string
  email?: string
  photoUrl?: string
  vehicleType: string
  vehiclePlate?: string
  status: string
  isOnline: boolean
  rating: number
  totalDeliveries: number
  totalEarnings: number
  createdAt: string
  approvedAt?: string
}

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  suspended: number
  online: number
  totalDeliveries: number
  totalEarnings: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  suspended: 'bg-gray-500/20 text-gray-400',
}

export default function DeliveryDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)

  const load = async () => {
    try {
      const params: any = {}
      if (filter) params.status = filter
      if (search) params.search = search
      const [driversRes, statsRes] = await Promise.all([
        freelanceDriversApi.getAll(params),
        freelanceDriversApi.getStats(),
      ])
      setDrivers(driversRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to load drivers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, search])

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this driver?')) return
    try {
      await freelanceDriversApi.approve(id)
      load()
      if (selectedDriver?.id === id) viewDetail(id)
    } catch (err) { console.error(err) }
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    try {
      await freelanceDriversApi.reject(showRejectModal, rejectReason)
      setShowRejectModal(null)
      setRejectReason('')
      load()
    } catch (err) { console.error(err) }
  }

  const handleSuspend = async (id: number) => {
    if (!confirm('Suspend this driver?')) return
    try {
      await freelanceDriversApi.suspend(id)
      load()
      if (selectedDriver?.id === id) viewDetail(id)
    } catch (err) { console.error(err) }
  }

  const viewDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await freelanceDriversApi.getById(id)
      setSelectedDriver(res.data)
    } catch (err) { console.error(err) }
    finally { setDetailLoading(false) }
  }

  const filters = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'suspended', label: 'Suspended' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Drivers</h1>
          <p className="text-gray-400 text-sm">Manage freelance delivery drivers</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={Truck} label="Total Drivers" value={stats.total} color="bg-blue-600" />
          <StatBox icon={Clock} label="Pending" value={stats.pending} color="bg-yellow-600" />
          <StatBox icon={MapPin} label="Online Now" value={stats.online} color="bg-green-600" />
          <StatBox icon={DollarSign} label="Total Payouts" value={`$${stats.totalEarnings.toFixed(2)}`} color="bg-purple-600" />
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setLoading(true) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-xs relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Driver List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No drivers found</div>
          ) : (
            <div className="space-y-3">
              {drivers.map(d => (
                <div
                  key={d.id}
                  className={`bg-gray-900 rounded-xl p-4 border cursor-pointer transition-colors ${
                    selectedDriver?.id === d.id ? 'border-purple-500' : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => viewDetail(d.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
                        {d.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{d.name}</span>
                          {d.isOnline && <span className="w-2 h-2 rounded-full bg-green-400" />}
                        </div>
                        <span className="text-xs text-gray-400">{d.phone} · {d.vehicleType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[d.status] || ''}`}>
                        {d.status}
                      </span>
                      {d.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); handleApprove(d.id) }}
                            className="p-1 hover:bg-green-900/30 rounded" title="Approve">
                            <CheckCircle size={16} className="text-green-400" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setShowRejectModal(d.id) }}
                            className="p-1 hover:bg-red-900/30 rounded" title="Reject">
                            <XCircle size={16} className="text-red-400" />
                          </button>
                        </div>
                      )}
                      {d.status === 'approved' && (
                        <button onClick={e => { e.stopPropagation(); handleSuspend(d.id) }}
                          className="p-1 hover:bg-gray-700 rounded" title="Suspend">
                          <Ban size={14} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" /> {d.rating.toFixed(1)}</span>
                    <span className="flex items-center gap-1"><Package size={12} /> {d.totalDeliveries} deliveries</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} /> ${d.totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDriver && (
          <div className="w-96 bg-gray-900 rounded-xl border border-gray-700 p-5 h-fit sticky top-4">
            {detailLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-500" size={24} /></div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{selectedDriver.name}</h3>
                  <button onClick={() => setSelectedDriver(null)} className="text-gray-500 hover:text-white">&times;</button>
                </div>

                <div className="space-y-3 text-sm">
                  <InfoRow label="Phone" value={selectedDriver.phone} />
                  <InfoRow label="Email" value={selectedDriver.email || '—'} />
                  <InfoRow label="Vehicle" value={`${selectedDriver.vehicleType} · ${selectedDriver.vehiclePlate || 'No plate'} · ${selectedDriver.vehicleColor || ''}`} />
                  <InfoRow label="Status" value={selectedDriver.status} />
                  <InfoRow label="Rating" value={`${selectedDriver.rating.toFixed(1)} ★`} />
                  <InfoRow label="Deliveries" value={selectedDriver.totalDeliveries} />
                  <InfoRow label="Earnings" value={`$${selectedDriver.totalEarnings.toFixed(2)}`} />
                  <InfoRow label="Joined" value={new Date(selectedDriver.createdAt).toLocaleDateString()} />
                  {selectedDriver.approvedAt && <InfoRow label="Approved" value={new Date(selectedDriver.approvedAt).toLocaleDateString()} />}
                  {selectedDriver.rejectionReason && <InfoRow label="Rejection Reason" value={selectedDriver.rejectionReason} />}
                </div>

                {/* Documents */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Documents</p>
                  {selectedDriver.idDocumentUrl ? (
                    <a href={selectedDriver.idDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline block">ID Document ↗</a>
                  ) : <p className="text-xs text-gray-600">No ID uploaded</p>}
                  {selectedDriver.licenseUrl ? (
                    <a href={selectedDriver.licenseUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline block">License ↗</a>
                  ) : <p className="text-xs text-gray-600">No license uploaded</p>}
                </div>

                {/* Recent Orders */}
                {selectedDriver.recentOrders?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 font-medium mb-2">Recent Orders</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedDriver.recentOrders.map((o: any) => (
                        <div key={o.id} className="flex justify-between text-xs py-1 border-b border-gray-800">
                          <span className="text-gray-300">#{o.orderNumber}</span>
                          <span className="text-gray-500">{o.storeName}</span>
                          <span className={`capitalize ${o.status === 'delivered' ? 'text-green-400' : 'text-gray-400'}`}>{o.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {selectedDriver.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(selectedDriver.id)}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
                        Approve
                      </button>
                      <button onClick={() => setShowRejectModal(selectedDriver.id)}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium">
                        Reject
                      </button>
                    </>
                  )}
                  {selectedDriver.status === 'approved' && (
                    <button onClick={() => handleSuspend(selectedDriver.id)}
                      className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg font-medium">
                      Suspend
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowRejectModal(null)}>
          <div className="bg-gray-900 rounded-xl p-6 w-96 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-3">Reject Driver</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 resize-none h-24 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">Cancel</button>
              <button onClick={handleReject}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium">Reject</button>
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

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium capitalize">{value}</span>
    </div>
  )
}
