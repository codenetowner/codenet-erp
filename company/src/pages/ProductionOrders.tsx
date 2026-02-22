import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Trash2, X, Loader2, Factory, Check, DollarSign, Package } from 'lucide-react'
import { rawMaterialsApi, productionOrdersApi, warehousesApi, productsApi } from '../lib/api'

interface RawMaterial {
  id: number
  code: string | null
  name: string
  unit: string
  costPrice: number
  totalStock: number
}

interface Product {
  id: number
  sku: string
  name: string
}

interface Warehouse {
  id: number
  name: string
}

interface MaterialItem {
  id?: number
  rawMaterialId: number
  rawMaterialName?: string
  rawMaterialCode?: string
  unit?: string
  warehouseId: number
  warehouseName?: string
  quantity: number
  unitCost: number
  totalCost: number
}

interface CostItem {
  id?: number
  description: string
  amount: number
  expenseId?: number
  expenseNumber?: string
}

interface ProductionOrder {
  id: number
  productionNumber: string
  productionDate: string
  productId: number
  productName: string
  productSku: string
  outputQuantity: number
  outputWarehouseId: number
  outputWarehouseName: string
  rawMaterialCost: number
  extraCost: number
  totalCost: number
  unitCost: number
  status: string
  notes: string | null
  completedAt: string | null
  createdAt: string
  materials?: MaterialItem[]
  costs?: CostItem[]
}

export default function ProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [formData, setFormData] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    productId: '',
    outputQuantity: 1,
    outputWarehouseId: '',
    notes: ''
  })

  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([])
  const [newMaterial, setNewMaterial] = useState({
    rawMaterialId: '',
    warehouseId: '',
    quantity: 1
  })

  const [newCost, setNewCost] = useState({
    description: '',
    amount: 0,
    paymentMethod: 'cash'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ordersRes, materialsRes, productsRes, warehousesRes] = await Promise.all([
        productionOrdersApi.getAll(),
        rawMaterialsApi.getAll({ isActive: true }),
        productsApi.getAll({ isActive: true }),
        warehousesApi.getAll()
      ])
      setOrders(ordersRes)
      setMaterials(materialsRes)
      setProducts(productsRes.data)
      setWarehouses(warehousesRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return o.productionNumber.toLowerCase().includes(s) || o.productName.toLowerCase().includes(s)
    }
    return true
  })

  const resetForm = () => {
    setFormData({
      productionDate: new Date().toISOString().split('T')[0],
      productId: '',
      outputQuantity: 1,
      outputWarehouseId: '',
      notes: ''
    })
    setMaterialItems([])
    setNewMaterial({ rawMaterialId: '', warehouseId: '', quantity: 1 })
  }

  const handleAddMaterial = () => {
    if (!newMaterial.rawMaterialId || !newMaterial.warehouseId) return

    const material = materials.find(m => m.id === parseInt(newMaterial.rawMaterialId))
    const warehouse = warehouses.find(w => w.id === parseInt(newMaterial.warehouseId))
    if (!material || !warehouse) return

    const totalCost = newMaterial.quantity * material.costPrice

    setMaterialItems([...materialItems, {
      rawMaterialId: material.id,
      rawMaterialName: material.name,
      rawMaterialCode: material.code || undefined,
      unit: material.unit,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantity: newMaterial.quantity,
      unitCost: material.costPrice,
      totalCost
    }])

    setNewMaterial({ rawMaterialId: '', warehouseId: '', quantity: 1 })
  }

  const handleRemoveMaterial = (index: number) => {
    setMaterialItems(materialItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const rawMaterialCost = materialItems.reduce((sum, item) => sum + item.totalCost, 0)
    const unitCost = formData.outputQuantity > 0 ? rawMaterialCost / formData.outputQuantity : 0
    return { rawMaterialCost, unitCost }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productId || !formData.outputWarehouseId) {
      alert('Please select product and output warehouse')
      return
    }
    if (materialItems.length === 0) {
      alert('Please add at least one raw material')
      return
    }

    setSaving(true)
    try {
      await productionOrdersApi.create({
        ...formData,
        productId: parseInt(formData.productId),
        outputWarehouseId: parseInt(formData.outputWarehouseId),
        materials: materialItems.map(item => ({
          rawMaterialId: item.rawMaterialId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitCost: item.unitCost
        }))
      })
      await loadData()
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create production order')
    } finally {
      setSaving(false)
    }
  }

  const handleViewDetail = async (order: ProductionOrder) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
    setLoadingDetail(true)
    try {
      const detail = await productionOrdersApi.getById(order.id)
      setSelectedOrder(detail)
    } catch (error) {
      console.error('Failed to load detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddCost = async () => {
    if (!selectedOrder || !newCost.description || newCost.amount <= 0) return
    try {
      await productionOrdersApi.addCost(selectedOrder.id, newCost)
      // Reload detail
      const detail = await productionOrdersApi.getById(selectedOrder.id)
      setSelectedOrder(detail)
      await loadData()
      setNewCost({ description: '', amount: 0, paymentMethod: 'cash' })
    } catch (error: any) {
      alert(error.response?.data || 'Failed to add cost')
    }
  }

  const handleRemoveCost = async (costId: number) => {
    if (!selectedOrder || !confirm('Remove this cost? The associated expense will also be deleted.')) return
    try {
      await productionOrdersApi.removeCost(selectedOrder.id, costId)
      const detail = await productionOrdersApi.getById(selectedOrder.id)
      setSelectedOrder(detail)
      await loadData()
    } catch (error: any) {
      alert(error.response?.data || 'Failed to remove cost')
    }
  }

  const handleComplete = async () => {
    if (!selectedOrder) return
    if (!confirm('Complete this production order? This will:\n- Deduct raw materials from inventory\n- Add finished products to inventory\n- Update product cost price\n\nThis action cannot be undone.')) return
    
    try {
      const result = await productionOrdersApi.complete(selectedOrder.id)
      alert(`Production completed!\n${result.productQuantityAdded} units added to inventory.\nNew product cost: $${result.newProductCost.toFixed(3)}`)
      const detail = await productionOrdersApi.getById(selectedOrder.id)
      setSelectedOrder(detail)
      await loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || error.response?.data || 'Failed to complete production')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this production order?')) return
    try {
      await productionOrdersApi.delete(id)
      setOrders(orders.filter(o => o.id !== id))
    } catch (error: any) {
      alert(error.response?.data || 'Failed to delete')
    }
  }

  const { rawMaterialCost, unitCost } = calculateTotals()

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Factory className="text-indigo-600" /> Production Orders
        </h1>
        <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
          <Plus size={20} /> New Production
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by number or product..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Order #</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Product</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Date</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Output Qty</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Total Cost</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Unit Cost</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-indigo-600">{order.productionNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{order.productName}</div>
                  <div className="text-xs text-gray-500">{order.productSku}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(order.productionDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">{order.outputQuantity}</td>
                <td className="px-4 py-3 text-sm text-right">${order.totalCost.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-indigo-600">${order.unitCost.toFixed(3)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleViewDetail(order)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye size={18} />
                    </button>
                    {order.status !== 'completed' && (
                      <button onClick={() => handleDelete(order.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No production orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
              <h2 className="text-lg font-semibold">New Production Order</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Output Product */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-medium text-indigo-800 mb-3 flex items-center gap-2">
                  <Package size={18} /> Output Product
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                    <select value={formData.productId} onChange={(e) => setFormData({...formData, productId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Output Qty *</label>
                    <input type="number" step="0.01" value={formData.outputQuantity} onChange={(e) => setFormData({...formData, outputQuantity: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required min="0.01" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Output Warehouse *</label>
                    <select value={formData.outputWarehouseId} onChange={(e) => setFormData({...formData, outputWarehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                    <input type="date" value={formData.productionDate} onChange={(e) => setFormData({...formData, productionDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Raw Materials */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Raw Materials</h3>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <select value={newMaterial.rawMaterialId} onChange={(e) => setNewMaterial({...newMaterial, rawMaterialId: e.target.value})} className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Select Raw Material</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Stock: {m.totalStock} {m.unit})
                      </option>
                    ))}
                  </select>
                  <select value={newMaterial.warehouseId} onChange={(e) => setNewMaterial({...newMaterial, warehouseId: e.target.value})} className="px-2 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={newMaterial.quantity} onChange={(e) => setNewMaterial({...newMaterial, quantity: parseFloat(e.target.value) || 0})} className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Qty" />
                    <button type="button" onClick={handleAddMaterial} className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm">Add</button>
                  </div>
                </div>

                {materialItems.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-2">Material</th>
                        <th className="text-left px-2 py-2">Warehouse</th>
                        <th className="text-right px-2 py-2">Qty</th>
                        <th className="text-right px-2 py-2">Unit Cost</th>
                        <th className="text-right px-2 py-2">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {materialItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2">{item.rawMaterialName}</td>
                          <td className="px-2 py-2">{item.warehouseName}</td>
                          <td className="px-2 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-2 py-2 text-right">${item.unitCost.toFixed(3)}</td>
                          <td className="px-2 py-2 text-right font-medium">${item.totalCost.toFixed(3)}</td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => handleRemoveMaterial(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Raw Material Cost:</span>
                  <span className="font-medium">${rawMaterialCost.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-indigo-600">
                  <span>Unit Cost:</span>
                  <span>${unitCost.toFixed(3)} / unit</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">* Extra costs can be added after creating the order</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || materialItems.length === 0} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Create Production Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
              <h2 className="text-lg font-semibold">Production: {selectedOrder.productionNumber}</h2>
              <button onClick={() => setShowDetailModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingDetail ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={32} /></div>
              ) : (
                <>
                  {/* Header Info */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Product</p>
                      <p className="font-medium">{selectedOrder.productName}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.productSku}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Output Quantity</p>
                      <p className="font-medium text-lg">{selectedOrder.outputQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Output Warehouse</p>
                      <p className="font-medium">{selectedOrder.outputWarehouseName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Production Date</p>
                      <p className="font-medium">{new Date(selectedOrder.productionDate).toLocaleDateString()}</p>
                    </div>
                    {selectedOrder.completedAt && (
                      <div>
                        <p className="text-sm text-gray-500">Completed At</p>
                        <p className="font-medium">{new Date(selectedOrder.completedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Raw Materials */}
                  {selectedOrder.materials && selectedOrder.materials.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-700 mb-3">Raw Materials Used</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Material</th>
                            <th className="text-left px-3 py-2">Warehouse</th>
                            <th className="text-right px-3 py-2">Qty</th>
                            <th className="text-right px-3 py-2">Unit Cost</th>
                            <th className="text-right px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedOrder.materials.map(mat => (
                            <tr key={mat.id}>
                              <td className="px-3 py-2">{mat.rawMaterialName}</td>
                              <td className="px-3 py-2">{mat.warehouseName}</td>
                              <td className="px-3 py-2 text-right">{mat.quantity} {mat.unit}</td>
                              <td className="px-3 py-2 text-right">${mat.unitCost.toFixed(3)}</td>
                              <td className="px-3 py-2 text-right font-medium">${mat.totalCost.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Extra Costs */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">Extra Costs (goes to Expenses)</h3>
                    {selectedOrder.costs && selectedOrder.costs.length > 0 && (
                      <table className="w-full text-sm mb-3">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Description</th>
                            <th className="text-left px-3 py-2">Expense #</th>
                            <th className="text-right px-3 py-2">Amount</th>
                            {selectedOrder.status !== 'completed' && <th className="px-3 py-2"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedOrder.costs.map(cost => (
                            <tr key={cost.id}>
                              <td className="px-3 py-2">{cost.description}</td>
                              <td className="px-3 py-2 text-purple-600">{cost.expenseNumber || '-'}</td>
                              <td className="px-3 py-2 text-right font-medium">${cost.amount.toFixed(3)}</td>
                              {selectedOrder.status !== 'completed' && (
                                <td className="px-3 py-2 text-center">
                                  <button onClick={() => handleRemoveCost(cost.id!)} className="text-red-500 hover:text-red-700">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {selectedOrder.status !== 'completed' && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input type="text" value={newCost.description} onChange={(e) => setNewCost({...newCost, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Labor, Packaging, Electricity" />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-500 mb-1">Amount</label>
                          <input type="number" step="0.001" value={newCost.amount} onChange={(e) => setNewCost({...newCost, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <button onClick={handleAddCost} disabled={!newCost.description || newCost.amount <= 0} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm flex items-center gap-1">
                          <DollarSign size={16} /> Add Cost
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cost Summary */}
                  <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between mb-2">
                      <span>Raw Material Cost</span>
                      <span>${selectedOrder.rawMaterialCost.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Extra Costs</span>
                      <span>${selectedOrder.extraCost.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-indigo-200 pt-2">
                      <span>Total Cost</span>
                      <span>${selectedOrder.totalCost.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-medium mt-2">
                      <span>Unit Cost ({selectedOrder.outputQuantity} units)</span>
                      <span>${selectedOrder.unitCost.toFixed(3)} / unit</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedOrder.status !== 'completed' && (
                    <button onClick={handleComplete} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">
                      <Check size={20} /> Complete Production
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
