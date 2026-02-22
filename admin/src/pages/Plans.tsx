import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Power, X } from 'lucide-react'
import { plansApi } from '../lib/api'

interface Plan {
  id: number
  name: string
  price: number
  durationDays: number
  maxCustomers?: number
  maxEmployees?: number
  maxDrivers?: number
  maxVans?: number
  maxWarehouses?: number
  features?: string
  isActive: boolean
  companyCount?: number
}

interface PlanForm {
  name: string
  price: number
  durationDays: number
  maxCustomers: string
  maxEmployees: string
  maxDrivers: string
  maxVans: string
  maxWarehouses: string
  features: string
  isActive: boolean
}

const initialForm: PlanForm = {
  name: '',
  price: 0,
  durationDays: 30,
  maxCustomers: '',
  maxEmployees: '',
  maxDrivers: '',
  maxVans: '',
  maxWarehouses: '',
  features: '',
  isActive: true
}

export default function Plans() {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PlanForm>(initialForm)
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await plansApi.getAll()
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => plansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setShowModal(false)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to save plan. Please try again.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => plansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setShowModal(false)
      setEditingId(null)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to update plan. Please try again.')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => plansApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
    onError: () => alert('Failed to toggle plan status.')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => plansApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
    onError: () => alert('Failed to delete plan. It may have companies assigned to it.')
  })

  const handleEdit = (id: number) => {
    // Don't edit items with temporary IDs (from optimistic updates)
    if (id > 1000000000000) {
      alert('Please wait for the item to be saved before editing.')
      return
    }
    // Use cached data for instant edit
    const plan = plans.find(p => p.id === id)
    if (plan) {
      setForm({
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        maxCustomers: plan.maxCustomers?.toString() || '',
        maxEmployees: plan.maxEmployees?.toString() || '',
        maxDrivers: plan.maxDrivers?.toString() || '',
        maxVans: plan.maxVans?.toString() || '',
        maxWarehouses: plan.maxWarehouses?.toString() || '',
        features: '',
        isActive: plan.isActive
      })
      setEditingId(id)
      setShowModal(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name: form.name,
      price: form.price,
      durationDays: form.durationDays,
      maxCustomers: form.maxCustomers ? parseInt(form.maxCustomers) : null,
      maxEmployees: form.maxEmployees ? parseInt(form.maxEmployees) : null,
      maxDrivers: form.maxDrivers ? parseInt(form.maxDrivers) : null,
      maxVans: form.maxVans ? parseInt(form.maxVans) : null,
      maxWarehouses: form.maxWarehouses ? parseInt(form.maxWarehouses) : null,
      features: form.features || null,
      isActive: form.isActive
    }
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" plan?`)) {
      deleteMutation.mutate(id)
    }
  }

  // Only show loading if no cached data
  if (isLoading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
        <button 
          onClick={() => { setForm(initialForm); setEditingId(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plans.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            No plans found. Create your first plan!
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className={`card relative ${!plan.isActive ? 'opacity-60' : ''}`}>
              {!plan.isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Inactive
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400">/{plan.durationDays} days</span>
                </div>
                {plan.companyCount !== undefined && plan.companyCount > 0 && (
                  <p className="text-sm text-purple-400 mt-2">{plan.companyCount} companies</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Customers</span>
                  <span className="text-white font-medium">{plan.maxCustomers ?? 'Unlimited'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Employees</span>
                  <span className="text-white font-medium">{plan.maxEmployees ?? 'Unlimited'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Drivers</span>
                  <span className="text-white font-medium">{plan.maxDrivers ?? 'Unlimited'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Vans</span>
                  <span className="text-white font-medium">{plan.maxVans ?? 'Unlimited'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Warehouses</span>
                  <span className="text-white font-medium">{plan.maxWarehouses ?? 'Unlimited'}</span>
                </div>
              </div>

              {plan.features && (
                <div className="border-t border-gray-700 pt-4 mb-6">
                  <p className="text-sm text-gray-400">{plan.features}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(plan.id)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button 
                  onClick={() => toggleMutation.mutate(plan.id)}
                  className="p-2 btn-secondary"
                  title={plan.isActive ? 'Deactivate' : 'Activate'}
                >
                  <Power size={16} className={plan.isActive ? 'text-green-400' : 'text-gray-400'} />
                </button>
                <button 
                  onClick={() => handleDelete(plan.id, plan.name)}
                  className="p-2 btn-danger"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Plan' : 'Add Plan'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duration (days) *</label>
                <input
                  type="number"
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Customers</label>
                  <input
                    type="number"
                    value={form.maxCustomers}
                    onChange={(e) => setForm({ ...form, maxCustomers: e.target.value })}
                    className="input"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Employees</label>
                  <input
                    type="number"
                    value={form.maxEmployees}
                    onChange={(e) => setForm({ ...form, maxEmployees: e.target.value })}
                    className="input"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Drivers</label>
                  <input
                    type="number"
                    value={form.maxDrivers}
                    onChange={(e) => setForm({ ...form, maxDrivers: e.target.value })}
                    className="input"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Vans</label>
                  <input
                    type="number"
                    value={form.maxVans}
                    onChange={(e) => setForm({ ...form, maxVans: e.target.value })}
                    className="input"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Warehouses</label>
                  <input
                    type="number"
                    value={form.maxWarehouses}
                    onChange={(e) => setForm({ ...form, maxWarehouses: e.target.value })}
                    className="input"
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Features Description</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Describe plan features..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Active (visible to companies)</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingId ? 'Update' : 'Create')} Plan
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
