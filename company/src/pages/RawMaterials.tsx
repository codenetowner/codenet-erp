import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, X, Loader2, Package, Warehouse, AlertTriangle } from 'lucide-react'
import { rawMaterialsApi, warehousesApi } from '../lib/api'

interface RawMaterial {
  id: number
  code: string | null
  name: string
  description: string | null
  unit: string
  costPrice: number
  lowStockAlert: number
  isActive: boolean
  totalStock: number
  createdAt: string
}

interface Warehouse {
  id: number
  name: string
}

interface InventoryItem {
  id: number
  rawMaterialId: number
  warehouseId: number
  warehouseName: string
  quantity: number
  updatedAt: string
}

export default function RawMaterials() {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryMaterial, setInventoryMaterial] = useState<RawMaterial | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'Unit',
    costPrice: 0,
    lowStockAlert: 10
  })

  const [adjustData, setAdjustData] = useState({
    warehouseId: '',
    quantity: 0,
    adjustmentType: 'set'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [materialsRes, warehousesRes] = await Promise.all([
        rawMaterialsApi.getAll(),
        warehousesApi.getAll()
      ])
      setMaterials(materialsRes)
      setWarehouses(warehousesRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = materials.filter(m => {
    if (!search) return true
    const s = search.toLowerCase()
    return m.name.toLowerCase().includes(s) || m.code?.toLowerCase().includes(s)
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      unit: 'Unit',
      costPrice: 0,
      lowStockAlert: 10
    })
  }

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material)
    setFormData({
      code: material.code || '',
      name: material.name,
      description: material.description || '',
      unit: material.unit,
      costPrice: material.costPrice,
      lowStockAlert: material.lowStockAlert
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      if (editingMaterial) {
        await rawMaterialsApi.update(editingMaterial.id, formData)
      } else {
        await rawMaterialsApi.create(formData)
      }
      await loadData()
      setShowModal(false)
      resetForm()
      setEditingMaterial(null)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this raw material?')) return
    try {
      await rawMaterialsApi.delete(id)
      setMaterials(materials.filter(m => m.id !== id))
    } catch (error: any) {
      alert(error.response?.data || 'Failed to delete')
    }
  }

  const openInventoryModal = async (material: RawMaterial) => {
    setInventoryMaterial(material)
    setShowInventoryModal(true)
    setLoadingInventory(true)
    setAdjustData({ warehouseId: '', quantity: 0, adjustmentType: 'set' })
    try {
      const inv = await rawMaterialsApi.getInventory(material.id)
      setInventory(inv)
    } catch (error) {
      console.error('Failed to load inventory:', error)
    } finally {
      setLoadingInventory(false)
    }
  }

  const handleAdjustInventory = async () => {
    if (!inventoryMaterial || !adjustData.warehouseId) return
    try {
      await rawMaterialsApi.adjustInventory(inventoryMaterial.id, {
        warehouseId: parseInt(adjustData.warehouseId),
        quantity: adjustData.quantity,
        adjustmentType: adjustData.adjustmentType
      })
      // Reload inventory
      const inv = await rawMaterialsApi.getInventory(inventoryMaterial.id)
      setInventory(inv)
      // Reload materials to update total stock
      await loadData()
      setAdjustData({ warehouseId: '', quantity: 0, adjustmentType: 'set' })
    } catch (error: any) {
      alert(error.response?.data || 'Failed to adjust inventory')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="text-orange-600" /> Raw Materials
        </h1>
        <button onClick={() => { resetForm(); setEditingMaterial(null); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          <Plus size={20} /> Add Raw Material
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="text-sm text-gray-600">
            Showing <strong>{filteredMaterials.length}</strong> of {materials.length} materials
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Code</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Unit</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Cost Price</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Stock</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMaterials.map(material => (
              <tr key={material.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{material.code || '-'}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{material.name}</div>
                  {material.description && <div className="text-xs text-gray-500">{material.description}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{material.unit}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">${material.costPrice.toFixed(3)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openInventoryModal(material)} className="inline-flex items-center gap-1 text-sm font-medium hover:text-orange-600">
                    {material.totalStock <= material.lowStockAlert && (
                      <AlertTriangle size={14} className="text-red-500" />
                    )}
                    <span className={material.totalStock <= material.lowStockAlert ? 'text-red-600' : 'text-gray-900'}>
                      {material.totalStock}
                    </span>
                    <Warehouse size={14} className="text-gray-400" />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${material.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {material.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(material)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(material.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMaterials.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No raw materials found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-orange-500 text-white">
              <h2 className="text-lg font-semibold">{editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Auto-generated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" step="0.001" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                  <input type="number" value={formData.lowStockAlert} onChange={(e) => setFormData({...formData, lowStockAlert: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editingMaterial ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && inventoryMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Warehouse size={24} /> Inventory: {inventoryMaterial.name}
              </h2>
              <button onClick={() => setShowInventoryModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6">
              {loadingInventory ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={32} /></div>
              ) : (
                <>
                  {/* Inventory by Warehouse */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">Stock by Warehouse</h3>
                    {inventory.length === 0 ? (
                      <p className="text-gray-500 text-sm">No inventory records</p>
                    ) : (
                      <div className="space-y-2">
                        {inventory.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{inv.warehouseName}</span>
                            <span className="text-lg font-bold text-gray-900">{inv.quantity} {inventoryMaterial.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Adjust Inventory */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-700 mb-3">Adjust Inventory</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <select value={adjustData.warehouseId} onChange={(e) => setAdjustData({...adjustData, warehouseId: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                      <select value={adjustData.adjustmentType} onChange={(e) => setAdjustData({...adjustData, adjustmentType: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="set">Set to</option>
                        <option value="add">Add</option>
                        <option value="subtract">Subtract</option>
                      </select>
                      <div className="flex gap-2">
                        <input type="number" step="0.01" value={adjustData.quantity} onChange={(e) => setAdjustData({...adjustData, quantity: parseFloat(e.target.value) || 0})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Qty" />
                        <button onClick={handleAdjustInventory} disabled={!adjustData.warehouseId} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
