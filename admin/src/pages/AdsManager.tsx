import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, X, Loader2, Eye, MousePointerClick, DollarSign, BarChart3 } from 'lucide-react'
import { adsApi, adPlacementsApi, companiesApi } from '../lib/api'

interface Ad {
  id: number
  companyId?: number
  companyName?: string
  placementId: number
  placementName: string
  title?: string
  imageUrl: string
  linkUrl?: string
  startDate: string
  endDate: string
  isActive: boolean
  impressions: number
  clicks: number
  amountPaid: number
  paymentStatus: string
  createdAt: string
  ctr: number
}

interface Placement {
  id: number
  name: string
  description?: string
  maxWidth?: number
  maxHeight?: number
  pricePerDay: number
  pricePerWeek: number
  pricePerMonth: number
  isActive: boolean
  activeAdsCount: number
}

interface Company {
  id: number
  name: string
}

interface Revenue {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  totalAds: number
  activeAds: number
  totalImpressions: number
  totalClicks: number
  averageCtr: number
}

type Tab = 'ads' | 'placements' | 'revenue'

export default function AdsManager() {
  const [tab, setTab] = useState<Tab>('ads')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdModal, setShowAdModal] = useState(false)
  const [showPlacementModal, setShowPlacementModal] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)
  const queryClient = useQueryClient()

  const [adForm, setAdForm] = useState({
    companyId: null as number | null,
    placementId: 0,
    title: '',
    imageUrl: '',
    linkUrl: '',
    startDate: '',
    endDate: '',
    isActive: true,
    amountPaid: 0,
    paymentStatus: 'pending',
  })

  const [placementForm, setPlacementForm] = useState({
    name: '',
    description: '',
    maxWidth: 0,
    maxHeight: 0,
    pricePerDay: 0,
    pricePerWeek: 0,
    pricePerMonth: 0,
    isActive: true,
  })

  const { data: ads = [], isLoading: adsLoading } = useQuery<Ad[]>({
    queryKey: ['ads', statusFilter],
    queryFn: async () => {
      const res = await adsApi.getAll({ status: statusFilter || undefined })
      return res.data
    },
  })

  const { data: placements = [] } = useQuery<Placement[]>({
    queryKey: ['ad-placements'],
    queryFn: async () => {
      const res = await adPlacementsApi.getAll()
      return res.data
    },
  })

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const res = await companiesApi.getAll()
      return res.data
    },
  })

  const { data: revenue } = useQuery<Revenue>({
    queryKey: ['ad-revenue'],
    queryFn: async () => {
      const res = await adsApi.getRevenue()
      return res.data
    },
  })

  const createAdMutation = useMutation({
    mutationFn: (data: any) => adsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad-revenue'] })
      setShowAdModal(false)
    },
  })

  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad-revenue'] })
      setShowAdModal(false)
    },
  })

  const deleteAdMutation = useMutation({
    mutationFn: (id: number) => adsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad-revenue'] })
    },
  })

  const createPlacementMutation = useMutation({
    mutationFn: (data: any) => adPlacementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-placements'] })
      setShowPlacementModal(false)
    },
  })

  const updatePlacementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adPlacementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-placements'] })
      setShowPlacementModal(false)
    },
  })

  const openCreateAd = () => {
    setAdForm({ companyId: null, placementId: placements[0]?.id || 0, title: '', imageUrl: '', linkUrl: '', startDate: '', endDate: '', isActive: true, amountPaid: 0, paymentStatus: 'pending' })
    setEditingAd(null)
    setShowAdModal(true)
  }

  const openEditAd = (ad: Ad) => {
    setAdForm({
      companyId: ad.companyId || null,
      placementId: ad.placementId,
      title: ad.title || '',
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl || '',
      startDate: ad.startDate?.slice(0, 10) || '',
      endDate: ad.endDate?.slice(0, 10) || '',
      isActive: ad.isActive,
      amountPaid: ad.amountPaid,
      paymentStatus: ad.paymentStatus,
    })
    setEditingAd(ad)
    setShowAdModal(true)
  }

  const openCreatePlacement = () => {
    setPlacementForm({ name: '', description: '', maxWidth: 0, maxHeight: 0, pricePerDay: 0, pricePerWeek: 0, pricePerMonth: 0, isActive: true })
    setEditingPlacement(null)
    setShowPlacementModal(true)
  }

  const openEditPlacement = (p: Placement) => {
    setPlacementForm({
      name: p.name,
      description: p.description || '',
      maxWidth: p.maxWidth || 0,
      maxHeight: p.maxHeight || 0,
      pricePerDay: p.pricePerDay,
      pricePerWeek: p.pricePerWeek,
      pricePerMonth: p.pricePerMonth,
      isActive: p.isActive,
    })
    setEditingPlacement(p)
    setShowPlacementModal(true)
  }

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...adForm }
    if (editingAd) {
      updateAdMutation.mutate({ id: editingAd.id, data })
    } else {
      createAdMutation.mutate(data)
    }
  }

  const handlePlacementSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingPlacement) {
      updatePlacementMutation.mutate({ id: editingPlacement.id, data: placementForm })
    } else {
      createPlacementMutation.mutate(placementForm)
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ads Manager</h1>
          <p className="text-gray-400 mt-1">Manage advertisements and placements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {(['ads', 'placements', 'revenue'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Ads Tab */}
      {tab === 'ads' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={openCreateAd} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={18} /> Create Ad
            </button>
          </div>

          {adsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
                    <th className="pb-3 pr-4">Ad</th>
                    <th className="pb-3 pr-4">Company</th>
                    <th className="pb-3 pr-4">Placement</th>
                    <th className="pb-3 pr-4">Period</th>
                    <th className="pb-3 pr-4">Stats</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => (
                    <tr key={ad.id} className="border-b border-gray-800 text-sm">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <img src={ad.imageUrl} alt="" className="w-16 h-10 rounded object-cover bg-gray-700" />
                          <span className="text-white">{ad.title || `Ad #${ad.id}`}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{ad.companyName || '-'}</td>
                      <td className="py-3 pr-4 text-gray-400">{ad.placementName}</td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">
                        {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Eye size={12} /> {ad.impressions}</span>
                          <span className="flex items-center gap-1"><MousePointerClick size={12} /> {ad.clicks}</span>
                          <span className="text-purple-400">{ad.ctr}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">${fmt(ad.amountPaid)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          ad.isActive && new Date(ad.endDate) >= new Date()
                            ? 'bg-green-900/40 text-green-400'
                            : 'bg-red-900/40 text-red-400'
                        }`}>
                          {ad.isActive && new Date(ad.endDate) >= new Date() ? 'Active' : 'Expired/Off'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditAd(ad)} className="p-1.5 text-gray-400 hover:text-purple-400"><Edit size={14} /></button>
                          <button onClick={() => { if (confirm('Delete this ad?')) deleteAdMutation.mutate(ad.id) }} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ads.length === 0 && <div className="text-center py-12 text-gray-500">No ads found</div>}
            </div>
          )}
        </div>
      )}

      {/* Placements Tab */}
      {tab === 'placements' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openCreatePlacement} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Placement
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {placements.map((p) => (
              <div key={p.id} className="card p-5 border border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{p.name}</h3>
                    {p.description && <p className="text-gray-400 text-sm mt-1">{p.description}</p>}
                  </div>
                  <button onClick={() => openEditPlacement(p)} className="text-gray-400 hover:text-purple-400"><Edit size={16} /></button>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-400">
                  {p.maxWidth && p.maxHeight && <p>Size: {p.maxWidth} x {p.maxHeight}</p>}
                  <p>Day: ${fmt(p.pricePerDay)} | Week: ${fmt(p.pricePerWeek)} | Month: ${fmt(p.pricePerMonth)}</p>
                  <p className="text-purple-400">{p.activeAdsCount} active ads</p>
                </div>
                <div className="mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.isActive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {placements.length === 0 && <div className="text-center py-12 text-gray-500">No placements yet</div>}
        </div>
      )}

      {/* Revenue Tab */}
      {tab === 'revenue' && revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-green-400" size={20} />
              <span className="text-gray-400 text-sm">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">${fmt(revenue.totalRevenue)}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-blue-400" size={20} />
              <span className="text-gray-400 text-sm">Paid</span>
            </div>
            <p className="text-2xl font-bold text-white">${fmt(revenue.paidRevenue)}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-yellow-400" size={20} />
              <span className="text-gray-400 text-sm">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">${fmt(revenue.pendingRevenue)}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-purple-400" size={20} />
              <span className="text-gray-400 text-sm">Active Ads</span>
            </div>
            <p className="text-2xl font-bold text-white">{revenue.activeAds} / {revenue.totalAds}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="text-cyan-400" size={20} />
              <span className="text-gray-400 text-sm">Total Impressions</span>
            </div>
            <p className="text-2xl font-bold text-white">{revenue.totalImpressions.toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <MousePointerClick className="text-orange-400" size={20} />
              <span className="text-gray-400 text-sm">Total Clicks</span>
            </div>
            <p className="text-2xl font-bold text-white">{revenue.totalClicks.toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-pink-400" size={20} />
              <span className="text-gray-400 text-sm">Avg CTR</span>
            </div>
            <p className="text-2xl font-bold text-white">{revenue.averageCtr}%</p>
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editingAd ? 'Edit Ad' : 'Create Ad'}</h2>
              <button onClick={() => setShowAdModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company</label>
                <select value={adForm.companyId || ''} onChange={(e) => setAdForm({ ...adForm, companyId: e.target.value ? parseInt(e.target.value) : null })} className="input-field">
                  <option value="">-- No Company --</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Placement *</label>
                <select value={adForm.placementId} onChange={(e) => setAdForm({ ...adForm, placementId: parseInt(e.target.value) })} className="input-field" required>
                  <option value={0}>-- Select --</option>
                  {placements.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input type="text" value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Image URL *</label>
                <input type="text" value={adForm.imageUrl} onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Link URL</label>
                <input type="text" value={adForm.linkUrl} onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date *</label>
                  <input type="date" value={adForm.startDate} onChange={(e) => setAdForm({ ...adForm, startDate: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date *</label>
                  <input type="date" value={adForm.endDate} onChange={(e) => setAdForm({ ...adForm, endDate: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount Paid</label>
                  <input type="number" step="0.01" value={adForm.amountPaid} onChange={(e) => setAdForm({ ...adForm, amountPaid: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Payment Status</label>
                  <select value={adForm.paymentStatus} onChange={(e) => setAdForm({ ...adForm, paymentStatus: e.target.value })} className="input-field">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createAdMutation.isPending || updateAdMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {(createAdMutation.isPending || updateAdMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                  {editingAd ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placement Modal */}
      {showPlacementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editingPlacement ? 'Edit Placement' : 'New Placement'}</h2>
              <button onClick={() => setShowPlacementModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handlePlacementSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input type="text" value={placementForm.name} onChange={(e) => setPlacementForm({ ...placementForm, name: e.target.value })} className="input-field" required placeholder="e.g. home_banner" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input type="text" value={placementForm.description} onChange={(e) => setPlacementForm({ ...placementForm, description: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Width</label>
                  <input type="number" value={placementForm.maxWidth} onChange={(e) => setPlacementForm({ ...placementForm, maxWidth: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Height</label>
                  <input type="number" value={placementForm.maxHeight} onChange={(e) => setPlacementForm({ ...placementForm, maxHeight: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">$/Day</label>
                  <input type="number" step="0.01" value={placementForm.pricePerDay} onChange={(e) => setPlacementForm({ ...placementForm, pricePerDay: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">$/Week</label>
                  <input type="number" step="0.01" value={placementForm.pricePerWeek} onChange={(e) => setPlacementForm({ ...placementForm, pricePerWeek: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">$/Month</label>
                  <input type="number" step="0.01" value={placementForm.pricePerMonth} onChange={(e) => setPlacementForm({ ...placementForm, pricePerMonth: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPlacementModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createPlacementMutation.isPending || updatePlacementMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {(createPlacementMutation.isPending || updatePlacementMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                  {editingPlacement ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
