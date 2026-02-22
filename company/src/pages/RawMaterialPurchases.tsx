import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Trash2, X, Loader2, FileText, DollarSign, Check } from 'lucide-react'
import { rawMaterialsApi, rawMaterialPurchasesApi, warehousesApi, suppliersApi } from '../lib/api'

interface Supplier {
  id: number
  name: string
  phone: string | null
  isManufacturer: boolean
}

interface RawMaterial {
  id: number
  code: string | null
  name: string
  unit: string
  costPrice: number
}

interface Warehouse {
  id: number
  name: string
}

interface PurchaseItem {
  id?: number
  rawMaterialId: number
  rawMaterialName?: string
  rawMaterialCode?: string
  unit?: string
  warehouseId: number
  warehouseName?: string
  quantity: number
  unitPrice: number
  taxAmount: number
  discountAmount: number
  lineTotal: number
}

interface Purchase {
  id: number
  purchaseNumber: string
  supplierId: number | null
  supplierName: string | null
  supplierContact: string | null
  purchaseDate: string
  dueDate: string | null
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  notes: string | null
  reference: string | null
  itemCount: number
  createdAt: string
  items?: PurchaseItem[]
}

export default function RawMaterialPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [formData, setFormData] = useState({
    supplierId: '' as string | number,
    supplierName: '',
    supplierContact: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxAmount: 0,
    discountAmount: 0,
    shippingCost: 0,
    paidAmount: 0,
    notes: '',
    reference: ''
  })

  const [items, setItems] = useState<PurchaseItem[]>([])
  const [newItem, setNewItem] = useState({
    rawMaterialId: '',
    warehouseId: '',
    quantity: 1,
    unitPrice: 0,
    taxAmount: 0,
    discountAmount: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [purchasesRes, materialsRes, warehousesRes, suppliersRes] = await Promise.all([
        rawMaterialPurchasesApi.getAll(),
        rawMaterialsApi.getAll({ isActive: true }),
        warehousesApi.getAll(),
        suppliersApi.getAll({ isActive: true })
      ])
      setPurchases(purchasesRes)
      setMaterials(materialsRes)
      setWarehouses(warehousesRes.data)
      setSuppliers(suppliersRes.data || suppliersRes)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPurchases = purchases.filter(p => {
    if (statusFilter && p.paymentStatus !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return p.purchaseNumber.toLowerCase().includes(s) || p.supplierName?.toLowerCase().includes(s)
    }
    return true
  })

  const resetForm = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      supplierContact: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxAmount: 0,
      discountAmount: 0,
      shippingCost: 0,
      paidAmount: 0,
      notes: '',
      reference: ''
    })
    setItems([])
    setNewItem({ rawMaterialId: '', warehouseId: '', quantity: 1, unitPrice: 0, taxAmount: 0, discountAmount: 0 })
  }

  const handleAddItem = () => {
    if (!newItem.rawMaterialId || !newItem.warehouseId) return
    
    const material = materials.find(m => m.id === parseInt(newItem.rawMaterialId))
    const warehouse = warehouses.find(w => w.id === parseInt(newItem.warehouseId))
    if (!material || !warehouse) return

    const lineTotal = (newItem.quantity * newItem.unitPrice) + newItem.taxAmount - newItem.discountAmount
    
    setItems([...items, {
      rawMaterialId: material.id,
      rawMaterialName: material.name,
      rawMaterialCode: material.code || undefined,
      unit: material.unit,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      taxAmount: newItem.taxAmount,
      discountAmount: newItem.discountAmount,
      lineTotal
    }])

    setNewItem({ rawMaterialId: '', warehouseId: '', quantity: 1, unitPrice: 0, taxAmount: 0, discountAmount: 0 })
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const itemTax = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const itemDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0)
    const total = subtotal + formData.taxAmount + itemTax + formData.shippingCost - formData.discountAmount - itemDiscount
    return { subtotal, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      await rawMaterialPurchasesApi.create({
        supplierId: formData.supplierId ? Number(formData.supplierId) : null,
        supplierName: formData.supplierName || null,
        supplierContact: formData.supplierContact || null,
        purchaseDate: formData.purchaseDate || null,
        dueDate: formData.dueDate || null,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        shippingCost: formData.shippingCost,
        paidAmount: formData.paidAmount,
        notes: formData.notes || null,
        reference: formData.reference || null,
        items: items.map(item => ({
          rawMaterialId: item.rawMaterialId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount,
          discountAmount: item.discountAmount
        }))
      })
      await loadData()
      setShowModal(false)
      resetForm()
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data || 'Failed to create purchase'
      const errDetails = error.response?.data?.errors ? '\n' + error.response.data.errors.join('\n') : ''
      console.error('Purchase error:', error.response?.data)
      alert(errMsg + errDetails)
    } finally {
      setSaving(false)
    }
  }

  const handleViewDetail = async (purchase: Purchase) => {
    setSelectedPurchase(purchase)
    setShowDetailModal(true)
    setLoadingDetail(true)
    try {
      const detail = await rawMaterialPurchasesApi.getById(purchase.id)
      setSelectedPurchase(detail)
    } catch (error) {
      console.error('Failed to load detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleRecordPayment = async (amount: number) => {
    if (!selectedPurchase) return
    try {
      await rawMaterialPurchasesApi.recordPayment(selectedPurchase.id, { amount })
      await loadData()
      const detail = await rawMaterialPurchasesApi.getById(selectedPurchase.id)
      setSelectedPurchase(detail)
    } catch (error: any) {
      alert(error.response?.data || 'Failed to record payment')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this purchase? This will reverse inventory additions.')) return
    try {
      await rawMaterialPurchasesApi.delete(id)
      setPurchases(purchases.filter(p => p.id !== id))
    } catch (error: any) {
      alert(error.response?.data || 'Failed to delete')
    }
  }

  const { subtotal, total } = calculateTotals()

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-purple-600" /> Raw Material Purchases
        </h1>
        <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
          <Plus size={20} /> New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by number or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Purchase #</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Supplier</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Date</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Total</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Paid</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPurchases.map(purchase => (
              <tr key={purchase.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-purple-600">{purchase.purchaseNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{purchase.supplierName || '-'}</div>
                  {purchase.supplierContact && <div className="text-xs text-gray-500">{purchase.supplierContact}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">${purchase.totalAmount.toFixed(3)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-green-600">${purchase.paidAmount.toFixed(3)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {purchase.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleViewDetail(purchase)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleDelete(purchase.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No purchases found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
              <h2 className="text-lg font-semibold">New Raw Material Purchase</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Supplier Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
                  <select 
                    value={formData.supplierId} 
                    onChange={(e) => {
                      const suppId = e.target.value
                      const supp = suppliers.find(s => s.id === parseInt(suppId))
                      setFormData({
                        ...formData, 
                        supplierId: suppId,
                        supplierName: supp?.name || '',
                        supplierContact: supp?.phone || ''
                      })
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">-- Manual Entry --</option>
                    {suppliers.filter(s => s.isManufacturer).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input type="text" value={formData.supplierName} onChange={(e) => setFormData({...formData, supplierName: e.target.value})} disabled={!!formData.supplierId} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Contact</label>
                  <input type="text" value={formData.supplierContact} onChange={(e) => setFormData({...formData, supplierContact: e.target.value})} disabled={!!formData.supplierId} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input type="text" value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Items</h3>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  <select value={newItem.rawMaterialId} onChange={(e) => {
                    const mat = materials.find(m => m.id === parseInt(e.target.value))
                    setNewItem({...newItem, rawMaterialId: e.target.value, unitPrice: mat?.costPrice || 0})
                  }} className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select value={newItem.warehouseId} onChange={(e) => setNewItem({...newItem, warehouseId: e.target.value})} className="px-2 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <input type="number" step="0.01" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} className="px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Qty" />
                  <input type="number" step="0.001" value={newItem.unitPrice} onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})} className="px-2 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Unit Price" />
                  <button type="button" onClick={handleAddItem} className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">Add</button>
                </div>

                {items.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-2">Material</th>
                        <th className="text-left px-2 py-2">Warehouse</th>
                        <th className="text-right px-2 py-2">Qty</th>
                        <th className="text-right px-2 py-2">Price</th>
                        <th className="text-right px-2 py-2">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2">{item.rawMaterialName}</td>
                          <td className="px-2 py-2">{item.warehouseName}</td>
                          <td className="px-2 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-2 py-2 text-right">${item.unitPrice.toFixed(3)}</td>
                          <td className="px-2 py-2 text-right font-medium">${item.lineTotal.toFixed(3)}</td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                  <input type="number" step="0.001" value={formData.taxAmount} onChange={(e) => setFormData({...formData, taxAmount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input type="number" step="0.001" value={formData.discountAmount} onChange={(e) => setFormData({...formData, discountAmount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping</label>
                  <input type="number" step="0.001" value={formData.shippingCost} onChange={(e) => setFormData({...formData, shippingCost: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input type="number" step="0.001" value={formData.paidAmount} onChange={(e) => setFormData({...formData, paidAmount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="ml-2 font-medium">${subtotal.toFixed(3)}</span>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  Total: ${total.toFixed(3)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || items.length === 0} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Create Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
              <h2 className="text-lg font-semibold">Purchase: {selectedPurchase.purchaseNumber}</h2>
              <button onClick={() => setShowDetailModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingDetail ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={32} /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Supplier</p>
                      <p className="font-medium">{selectedPurchase.supplierName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedPurchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                        selectedPurchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedPurchase.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Reference</p>
                      <p className="font-medium">{selectedPurchase.reference || '-'}</p>
                    </div>
                  </div>

                  {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-700 mb-3">Items</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2">Material</th>
                            <th className="text-left px-3 py-2">Warehouse</th>
                            <th className="text-right px-3 py-2">Qty</th>
                            <th className="text-right px-3 py-2">Price</th>
                            <th className="text-right px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedPurchase.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.rawMaterialName}</td>
                              <td className="px-3 py-2">{item.warehouseName}</td>
                              <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                              <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(3)}</td>
                              <td className="px-3 py-2 text-right font-medium">${item.lineTotal.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>${selectedPurchase.subtotal.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax</span>
                      <span>${selectedPurchase.taxAmount.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Discount</span>
                      <span>-${selectedPurchase.discountAmount.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Shipping</span>
                      <span>${selectedPurchase.shippingCost.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>${selectedPurchase.totalAmount.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 mt-2">
                      <span>Paid</span>
                      <span>${selectedPurchase.paidAmount.toFixed(3)}</span>
                    </div>
                    {selectedPurchase.totalAmount > selectedPurchase.paidAmount && (
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>Balance Due</span>
                        <span>${(selectedPurchase.totalAmount - selectedPurchase.paidAmount).toFixed(3)}</span>
                      </div>
                    )}
                  </div>

                  {selectedPurchase.paymentStatus !== 'paid' && (
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const amount = prompt('Enter payment amount:')
                        if (amount) handleRecordPayment(parseFloat(amount))
                      }} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <DollarSign size={18} /> Record Payment
                      </button>
                      <button onClick={() => handleRecordPayment(selectedPurchase.totalAmount - selectedPurchase.paidAmount)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <Check size={18} /> Pay Full
                      </button>
                    </div>
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
