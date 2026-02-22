import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { billingApi, companiesApi } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'

interface Billing {
  id: number
  companyId: number
  companyName: string
  planName?: string
  amount: number
  paymentDate: string
  nextRenewalDate?: string
  paymentMethod: string
  transactionReference?: string
  notes?: string
}

interface Company {
  id: number
  name: string
  planId?: number
  planName?: string
  planPrice?: number
  planDurationDays?: number
}

interface BillingForm {
  companyId: number | null
  planId: number | null
  planName: string
  amount: number
  paymentDate: string
  nextRenewalDate: string
  paymentMethod: string
  transactionReference: string
  notes: string
}

const initialForm: BillingForm = {
  companyId: null,
  planId: null,
  planName: '',
  amount: 0,
  paymentDate: new Date().toISOString().split('T')[0],
  nextRenewalDate: '',
  paymentMethod: 'cash',
  transactionReference: '',
  notes: ''
}

export default function Billing() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BillingForm>(initialForm)
  const queryClient = useQueryClient()

  const debouncedStart = useDebounce(startDate, 500)
  const debouncedEnd = useDebounce(endDate, 500)

  const { data: billings = [], isLoading } = useQuery<Billing[]>({
    queryKey: ['billings', debouncedStart, debouncedEnd],
    queryFn: async () => {
      const res = await billingApi.getAll({ 
        startDate: debouncedStart || undefined, 
        endDate: debouncedEnd || undefined 
      })
      return res.data
    }
  })

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const res = await companiesApi.getAll()
      return res.data
    }
  })


  const createMutation = useMutation({
    mutationFn: (data: any) => billingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to record payment. Please try again.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => billingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setEditingId(null)
      setForm(initialForm)
    },
    onError: () => {
      alert('Failed to update payment. Please try again.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => {
      alert('Failed to delete payment.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyId) return
    
    const data = {
      companyId: form.companyId,
      planId: form.planId || undefined,
      amount: form.amount,
      paymentDate: form.paymentDate,
      nextRenewalDate: form.nextRenewalDate || undefined,
      paymentMethod: form.paymentMethod,
      transactionReference: form.transactionReference || undefined,
      notes: form.notes || undefined
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (billing: Billing) => {
    const company = companies.find(c => c.id === billing.companyId)
    setForm({
      companyId: billing.companyId,
      planId: company?.planId || null,
      planName: billing.planName || 'No Plan',
      amount: billing.amount,
      paymentDate: billing.paymentDate.split('T')[0],
      nextRenewalDate: billing.nextRenewalDate?.split('T')[0] || '',
      paymentMethod: billing.paymentMethod,
      transactionReference: billing.transactionReference || '',
      notes: billing.notes || ''
    })
    setEditingId(billing.id)
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCompanySelect = (companyId: number | null) => {
    if (companyId) {
      const company = companies.find(c => c.id === companyId)
      if (company) {
        // Calculate next renewal date based on plan duration
        const nextRenewal = new Date(form.paymentDate)
        nextRenewal.setDate(nextRenewal.getDate() + (company.planDurationDays || 30))
        
        setForm({
          ...form,
          companyId,
          planId: company.planId || null,
          planName: company.planName || 'No Plan',
          amount: company.planPrice || 0,
          nextRenewalDate: nextRenewal.toISOString().split('T')[0]
        })
        return
      }
    }
    setForm({ ...form, companyId, planId: null, planName: '', amount: 0, nextRenewalDate: '' })
  }

  const totalRevenue = billings.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Billing & Payments</h1>
        <button 
          onClick={() => { setForm(initialForm); setEditingId(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <p className="text-sm text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold text-white mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Payments Count</p>
          <p className="text-3xl font-bold text-white mt-1">{billings.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Average Payment</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${billings.length > 0 ? Math.round(totalRevenue / billings.length) : 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-40" 
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-40" 
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate('') }}
              className="btn-secondary self-end"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Billing Table */}
      {isLoading && billings.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Next Renewal</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {billings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-8">
                    No billing records found
                  </td>
                </tr>
              ) : (
                billings.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="font-medium text-white">{payment.companyName}</td>
                    <td>
                      {payment.planName ? (
                        <span className="px-2 py-1 rounded text-xs bg-purple-900 text-purple-300">
                          {payment.planName}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="font-medium text-green-400">${payment.amount.toLocaleString()}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.paymentMethod === 'cash' ? 'bg-green-900 text-green-300' :
                        payment.paymentMethod === 'bank_transfer' ? 'bg-blue-900 text-blue-300' :
                        'bg-purple-900 text-purple-300'
                      }`}>
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-mono text-gray-400">{payment.transactionReference || '-'}</td>
                    <td>
                      {payment.nextRenewalDate 
                        ? new Date(payment.nextRenewalDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Payment' : 'Record Payment'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company *</label>
                <select
                  value={form.companyId || ''}
                  onChange={(e) => handleCompanySelect(e.target.value ? Number(e.target.value) : null)}
                  className="input"
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
                  <input
                    type="text"
                    value={form.planName || 'No Plan'}
                    className="input bg-gray-700 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Next Renewal</label>
                  <input
                    type="date"
                    value={form.nextRenewalDate}
                    onChange={(e) => setForm({ ...form, nextRenewalDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Payment Method *</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={form.transactionReference}
                    onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                    className="input"
                    placeholder="TRF-001234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Update Payment' : 'Record Payment'}
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
