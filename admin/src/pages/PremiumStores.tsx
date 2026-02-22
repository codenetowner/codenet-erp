import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, X, Loader2, Crown, Building2 } from 'lucide-react'
import { premiumApi, companiesApi } from '../lib/api'

interface Subscription {
  id: number
  companyId: number
  companyName: string
  companyLogoUrl?: string
  tier: string
  startDate: string
  endDate: string
  amount: number
  paymentStatus: string
  features?: string
  createdAt: string
  isExpired: boolean
}

interface Company {
  id: number
  name: string
}

interface SubForm {
  companyId: number
  tier: string
  startDate: string
  endDate: string
  amount: number
  paymentStatus: string
  features: string
}

const initialForm: SubForm = {
  companyId: 0,
  tier: 'basic',
  startDate: '',
  endDate: '',
  amount: 0,
  paymentStatus: 'pending',
  features: '',
}

const tierColors: Record<string, string> = {
  basic: 'bg-blue-900/40 text-blue-400',
  premium: 'bg-purple-900/40 text-purple-400',
  enterprise: 'bg-yellow-900/40 text-yellow-400',
}

export default function PremiumStores() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SubForm>(initialForm)
  const queryClient = useQueryClient()

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['premium-subs', statusFilter],
    queryFn: async () => {
      const res = await premiumApi.getAll({ status: statusFilter || undefined })
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

  const createMutation = useMutation({
    mutationFn: (data: SubForm) => premiumApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-subs'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubForm }) => premiumApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-subs'] })
      closeModal()
    },
  })

  const openCreate = () => {
    setForm(initialForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (sub: Subscription) => {
    setForm({
      companyId: sub.companyId,
      tier: sub.tier,
      startDate: sub.startDate?.slice(0, 10) || '',
      endDate: sub.endDate?.slice(0, 10) || '',
      amount: sub.amount,
      paymentStatus: sub.paymentStatus,
      features: sub.features || '',
    })
    setEditingId(sub.id)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const activeSubs = subs.filter(s => !s.isExpired)
  const totalRevenue = subs.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Premium Stores</h1>
          <p className="text-gray-400 mt-1">Manage premium store subscriptions</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Add Subscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-gray-400 text-sm">Active Subscriptions</p>
          <p className="text-2xl font-bold text-white mt-1">{activeSubs.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm">Total Subscriptions</p>
          <p className="text-2xl font-bold text-white mt-1">{subs.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">${fmt(totalRevenue)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Period</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Payment</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-800 text-sm">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {sub.companyLogoUrl ? (
                        <img src={sub.companyLogoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <Building2 size={14} className="text-gray-400" />
                        </div>
                      )}
                      <span className="text-white">{sub.companyName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs capitalize flex items-center gap-1 w-fit ${tierColors[sub.tier] || 'bg-gray-700 text-gray-300'}`}>
                      <Crown size={12} /> {sub.tier}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">
                    {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-gray-300">${fmt(sub.amount)}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      sub.paymentStatus === 'paid' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                    }`}>
                      {sub.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      sub.isExpired ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                    }`}>
                      {sub.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button onClick={() => openEdit(sub)} className="p-1.5 text-gray-400 hover:text-purple-400">
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subs.length === 0 && <div className="text-center py-12 text-gray-500">No subscriptions found</div>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Subscription' : 'New Subscription'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company *</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: parseInt(e.target.value) })}
                  className="input-field"
                  required
                  disabled={!!editingId}
                >
                  <option value={0}>-- Select Company --</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Tier *</label>
                <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="input-field">
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date *</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-field" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Payment Status</label>
                  <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })} className="input-field">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin" size={16} />}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
