import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import { warehousesApi, employeesApi } from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface Warehouse {
  id: number
  name: string
  code: string | null
  address: string | null
  phone: string | null
  managerId: number | null
  managerName: string | null
  isActive: boolean
}

interface Manager { id: number; name: string }

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  
  const [formData, setFormData] = useState({
    name: '', code: '', address: '', phone: '', managerId: '', isActive: true
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [whRes, empRes] = await Promise.all([
        warehousesApi.getAll(),
        employeesApi.getAll()
      ])
      setWarehouses(whRes.data)
      // Only active employees can be managers
      setManagers(empRes.data.filter((e: any) => e.status === 'active').map((e: any) => ({ id: e.id, name: e.name })))
    } catch (error) {
      console.error('Failed to load warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', address: '', phone: '', managerId: '', isActive: true })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.managerId) {
      alert('Please select a manager')
      return
    }
    setSaving(true)
    try {
      await warehousesApi.create({
        ...formData,
        managerId: parseInt(formData.managerId),
      })
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create warehouse')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (wh: Warehouse) => {
    setSelectedWarehouse(wh)
    setFormData({
      name: wh.name,
      code: wh.code || '',
      address: wh.address || '',
      phone: wh.phone || '',
      managerId: wh.managerId?.toString() || '',
      isActive: wh.isActive
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWarehouse) return
    if (!formData.managerId) {
      alert('Please select a manager')
      return
    }
    setSaving(true)
    try {
      await warehousesApi.update(selectedWarehouse.id, {
        ...formData,
        managerId: parseInt(formData.managerId),
      })
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update warehouse')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return
    try {
      await warehousesApi.delete(id)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete warehouse')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
        <PermissionGate permission={PERMISSIONS.CREATE_WAREHOUSES}>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
            <Plus size={20} /> Add Warehouse
          </button>
        </PermissionGate>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Manager</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {warehouses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No warehouses found</td></tr>
            ) : warehouses.map((wh) => (
              <tr key={wh.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{wh.name}</td>
                <td className="px-4 py-3">{wh.address || '-'}</td>
                <td className="px-4 py-3">{wh.managerName || '-'}</td>
                <td className="px-4 py-3">{wh.phone || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {wh.isActive ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <PermissionGate permission={PERMISSIONS.EDIT_WAREHOUSES}>
                      <button onClick={() => handleEdit(wh)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.DELETE_WAREHOUSES}>
                      <button onClick={() => handleDelete(wh.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{showEditModal ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={() => { setShowModal(false); setShowEditModal(false) }}><X size={24} /></button>
            </div>
            <form onSubmit={showEditModal ? handleEditSubmit : handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter location" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter phone" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                  <select value={formData.managerId} onChange={(e) => setFormData({...formData, managerId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select Manager</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="rounded" />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setShowEditModal(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
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
