import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit, Trash2, X, KeyRound, Copy, Upload, Loader2 } from 'lucide-react'
import { companiesApi, plansApi, storeCategoriesApi } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'

interface Company {
  id: number
  name: string
  username: string
  phone?: string
  address?: string
  logoUrl?: string
  status: string
  planId?: number
  planName?: string
  planExpiryDate?: string
  createdAt: string
  storeCategoryId?: number
  storeCategoryName?: string
  isOnlineStoreEnabled: boolean
  isPremium: boolean
  premiumTier?: string
}

interface StoreCategory {
  id: number
  name: string
  isActive: boolean
}

interface Plan {
  id: number
  name: string
  price: number
  durationDays: number
  isActive: boolean
}

interface CompanyForm {
  name: string
  username: string
  password: string
  phone: string
  address: string
  logoUrl: string
  planId: number | null
  planExpiryDate: string
  status: string
  notes: string
  storeCategoryId: number | null
  isOnlineStoreEnabled: boolean
}

const initialForm: CompanyForm = {
  name: '',
  username: '',
  password: '',
  phone: '',
  address: '',
  logoUrl: '',
  planId: null,
  planExpiryDate: '',
  status: 'active',
  notes: '',
  storeCategoryId: null,
  isOnlineStoreEnabled: false
}

export default function Companies() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CompanyForm>(initialForm)
  const [shownPasswords, setShownPasswords] = useState<Record<number, string>>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  
  const debouncedSearch = useDebounce(search, 400)

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies', debouncedSearch, statusFilter],
    queryFn: async () => {
      const res = await companiesApi.getAll({ search: debouncedSearch, status: statusFilter || undefined })
      return res.data
    }
  })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await plansApi.getAll({ isActive: true })
      return res.data
    }
  })

  const { data: storeCategories = [] } = useQuery<StoreCategory[]>({
    queryKey: ['store-categories'],
    queryFn: async () => {
      const res = await storeCategoriesApi.getAll()
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to create company. Please try again.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setShowModal(false)
      setEditingId(null)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to update company. Please try again.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => {
      alert('Failed to delete company. It may have employees or data.')
    }
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => 
      companiesApi.resetPassword(id, password),
    onSuccess: (_, { id, password }) => {
      setShownPasswords(prev => ({ ...prev, [id]: password }))
    },
    onError: () => {
      alert('Failed to reset password.')
    }
  })

  const handleResetPassword = (id: number, companyName: string) => {
    const newPassword = prompt(`Enter new password for ${companyName}:`, '123456')
    if (newPassword && newPassword.length >= 6) {
      resetPasswordMutation.mutate({ id, password: newPassword })
    } else if (newPassword) {
      alert('Password must be at least 6 characters')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Password copied!')
  }

  const handlePlanSelect = (planId: number | null) => {
    if (planId) {
      const plan = plans.find(p => p.id === planId)
      if (plan) {
        // Calculate expiry date from plan duration
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays)
        setForm(prev => ({
          ...prev,
          planId,
          planExpiryDate: expiryDate.toISOString().split('T')[0]
        }))
        return
      }
    }
    setForm(prev => ({ ...prev, planId, planExpiryDate: '' }))
  }

  const uploadLogoToCloudinary = async (file: File): Promise<string | null> => {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'Catalyst/logos')
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      return data.secure_url || null
    } catch (error) {
      console.error('Logo upload failed:', error)
      return null
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const url = await uploadLogoToCloudinary(file)
    setUploadingLogo(false)
    if (url) {
      setForm(prev => ({ ...prev, logoUrl: url }))
    } else {
      alert('Failed to upload logo')
    }
  }

  const handleEdit = (id: number) => {
    // Don't edit items with temporary IDs (from optimistic updates)
    if (id > 1000000000000) {
      alert('Please wait for the item to be saved before editing.')
      return
    }
    // Use cached data from list for instant edit
    const company = companies.find(c => c.id === id)
    if (company) {
      setForm({
        name: company.name,
        username: company.username,
        password: '',
        phone: company.phone || '',
        address: company.address || '',
        logoUrl: company.logoUrl || '',
        planId: company.planId || null,
        planExpiryDate: company.planExpiryDate?.split('T')[0] || '',
        status: company.status,
        notes: '',
        storeCategoryId: company.storeCategoryId || null,
        isOnlineStoreEnabled: company.isOnlineStoreEnabled || false
      })
      setEditingId(id)
      setShowModal(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...form,
      logoUrl: form.logoUrl || undefined,
      planId: form.planId || undefined,
      planExpiryDate: form.planExpiryDate || undefined,
      newPassword: form.password || undefined
    }
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <button 
          onClick={() => { setForm(initialForm); setEditingId(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Company
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      {isLoading && companies.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Username</th>
                <th>Password</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Expiry</th>
                <th>Store</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-8">
                    No companies found
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td className="font-medium text-white">{company.name}</td>
                    <td className="font-mono text-gray-400">{company.username}</td>
                    <td>
                      {shownPasswords[company.id] ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-green-400">{shownPasswords[company.id]}</span>
                          <button
                            onClick={() => copyToClipboard(shownPasswords[company.id])}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Copy"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleResetPassword(company.id, company.name)}
                          className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                        >
                          <KeyRound size={12} /> Reset
                        </button>
                      )}
                    </td>
                    <td>{company.phone || '-'}</td>
                    <td>
                      {company.planName ? (
                        <span className="px-2 py-1 rounded text-xs bg-purple-900 text-purple-300">
                          {company.planName}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td>
                      {company.planExpiryDate 
                        ? new Date(company.planExpiryDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {company.storeCategoryName && (
                          <span className="text-xs text-purple-300">{company.storeCategoryName}</span>
                        )}
                        {company.isOnlineStoreEnabled ? (
                          <span className="text-xs text-green-400">Online</span>
                        ) : (
                          <span className="text-xs text-gray-500">Offline</span>
                        )}
                        {company.isPremium && (
                          <span className="text-xs text-yellow-400">Premium</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        company.status === 'active' ? 'bg-green-900 text-green-300' : 
                        company.status === 'suspended' ? 'bg-red-900 text-red-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {company.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(company.id)}
                          className="p-1 hover:bg-gray-700 rounded" 
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-400" />
                        </button>
                        <button 
                          onClick={() => handleDelete(company.id, company.name)}
                          className="p-1 hover:bg-gray-700 rounded" 
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="input"
                    required
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password {editingId ? '(leave empty to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input"
                    required={!editingId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Logo</label>
                <div className="flex items-center gap-4">
                  {form.logoUrl ? (
                    <div className="relative">
                      <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-600" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, logoUrl: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500">
                      <Upload size={20} />
                    </div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                    >
                      {uploadingLogo ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Choose Image'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
                  <select
                    value={form.planId || ''}
                    onChange={(e) => handlePlanSelect(e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">No Plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price} ({plan.durationDays} days)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan Expiry</label>
                  <input
                    type="date"
                    value={form.planExpiryDate}
                    onChange={(e) => setForm({ ...form, planExpiryDate: e.target.value })}
                    className="input"
                  />
                  {form.planId && form.planExpiryDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      Auto-calculated from plan duration
                    </p>
                  )}
                </div>
              </div>

              {/* Store Category & Online Store */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Store Category</label>
                  <select
                    value={form.storeCategoryId || ''}
                    onChange={(e) => setForm({ ...form, storeCategoryId: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                  >
                    <option value="">No Category</option>
                    {storeCategories.filter(c => c.isActive).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={form.isOnlineStoreEnabled}
                      onChange={(e) => setForm({ ...form, isOnlineStoreEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-300">Enable Online Store</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingId ? 'Update' : 'Create')} Company
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
