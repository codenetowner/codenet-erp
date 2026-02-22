import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2, Coins } from 'lucide-react'
import { currenciesApi } from '../lib/api'

interface Currency {
  id: number
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
  isActive: boolean
}

export default function Currencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)

  const [formData, setFormData] = useState({
    code: '', name: '', symbol: '', exchangeRate: 1, isBase: false, isActive: true
  })

  useEffect(() => { loadCurrencies() }, [])

  const loadCurrencies = async () => {
    try {
      setLoading(true)
      const res = await currenciesApi.getAll()
      setCurrencies(res.data)
    } catch (error) {
      console.error('Failed to load currencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setFormData({ code: '', name: '', symbol: '', exchangeRate: 1, isBase: false, isActive: true })

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency)
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
      isBase: currency.isBase,
      isActive: currency.isActive
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) return
    setSaving(true)
    try {
      if (editingCurrency) {
        await currenciesApi.update(editingCurrency.id, formData)
      } else {
        await currenciesApi.create(formData)
      }
      setShowModal(false)
      resetForm()
      setEditingCurrency(null)
      loadCurrencies()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save currency')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this currency?')) return
    try {
      await currenciesApi.delete(id)
      loadCurrencies()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete currency')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="text-blue-600" /> Currencies
          </h1>
          <p className="text-gray-500 text-sm">Manage currencies and exchange rates</p>
        </div>
        <button onClick={() => { resetForm(); setEditingCurrency(null); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
          <Plus size={20} /> Add Currency
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Exchange Rate</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Base</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currencies.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No currencies found</td></tr>
            ) : currencies.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 text-lg font-medium">{c.symbol}</td>
                <td className="px-4 py-3">{c.exchangeRate.toFixed(4)}</td>
                <td className="px-4 py-3">
                  {c.isBase ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Yes</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">No</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    {!c.isBase && (
                      <button onClick={() => handleDelete(c.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{editingCurrency ? 'Edit Currency' : 'Add Currency'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="USD" maxLength={10} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="US Dollar" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
                  <input type="text" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="$" maxLength={10} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate *</label>
                  <input type="number" step="0.0001" value={formData.exchangeRate} onChange={(e) => setFormData({...formData, exchangeRate: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.isBase} onChange={(e) => setFormData({...formData, isBase: e.target.checked})} className="rounded" />
                    <span className="text-sm">Is Base Currency</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="rounded" />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
