import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2, Ruler } from 'lucide-react'
import { unitsApi } from '../lib/api'

interface Unit {
  id: number
  name: string
  abbreviation: string | null
  symbol: string | null
  isBase: boolean
}

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ name: '', symbol: '', isBase: false })

  useEffect(() => { loadUnits() }, [])

  const loadUnits = async () => {
    try {
      setLoading(true)
      const res = await unitsApi.getAll()
      setUnits(res.data)
    } catch (error) {
      console.error('Failed to load units:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setFormData({ name: '', symbol: '', isBase: false })

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({ 
      name: unit.name, 
      symbol: unit.symbol || '', 
      isBase: unit.isBase
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      if (editingUnit) {
        await unitsApi.update(editingUnit.id, formData)
      } else {
        await unitsApi.create(formData)
      }
      setShowModal(false)
      resetForm()
      setEditingUnit(null)
      loadUnits()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save unit')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return
    try {
      await unitsApi.delete(id)
      loadUnits()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete unit')
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
            <Ruler className="text-blue-600" /> Units
          </h1>
          <p className="text-gray-500 text-sm">Manage product measurement units</p>
        </div>
        <button onClick={() => { resetForm(); setEditingUnit(null); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
          <Plus size={20} /> Add Unit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Base Unit</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {units.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No units found</td></tr>
            ) : units.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{unit.name}</td>
                <td className="px-4 py-3 text-gray-500">{unit.symbol || '-'}</td>
                <td className="px-4 py-3">
                  {unit.isBase && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Base</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(unit)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(unit.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Piece, Box, Kg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                <input type="text" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. pc, box, kg" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isBase" checked={formData.isBase} onChange={(e) => setFormData({...formData, isBase: e.target.checked})} className="rounded" />
                <label htmlFor="isBase" className="text-sm">Base Unit</label>
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
