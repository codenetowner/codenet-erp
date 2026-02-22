import { useState, useEffect } from 'react'
import { Plus, Search, Loader2, ArrowUpDown, X, Check, ArrowUp, ArrowDown, Equal } from 'lucide-react'
import { productsApi, warehousesApi } from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface Product {
  id: number
  sku: string
  name: string
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
}

interface WarehouseItem {
  id: number
  name: string
}

interface AdjustmentHistory {
  id: number
  productId: number
  productName: string
  productSku: string
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
  warehouseId: number
  warehouseName: string
  quantity: number
  notes: string | null
  createdBy: number | null
  createdAt: string
}

export default function StockAdjustment() {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<AdjustmentHistory[]>([])
  const [total, setTotal] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterProduct, setFilterProduct] = useState<number | ''>('')
  const [filterWarehouse, setFilterWarehouse] = useState<number | ''>('')

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [formWarehouseId, setFormWarehouseId] = useState<number | ''>('')
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'add' | 'subtract'>('set')
  const [baseQty, setBaseQty] = useState('')
  const [secondQty, setSecondQty] = useState('')
  const [reason, setReason] = useState('')

  // Pre-selected product from URL/props
  const [preSelectedProductId, setPreSelectedProductId] = useState<number | null>(null)

  useEffect(() => {
    // Check URL params for pre-selected product
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('productId')
    if (pid) setPreSelectedProductId(parseInt(pid))
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsRes, warehousesRes, historyRes] = await Promise.all([
        productsApi.getAll(),
        warehousesApi.getAll(),
        productsApi.getStockAdjustments({
          productId: filterProduct || undefined,
          warehouseId: filterWarehouse || undefined,
        }),
      ])
      setProducts(productsRes.data)
      setWarehouses(warehousesRes.data)
      setHistory(historyRes.data.items)
      setTotal(historyRes.data.total)

      // If pre-selected product, open modal
      if (preSelectedProductId) {
        const prod = productsRes.data.find((p: Product) => p.id === preSelectedProductId)
        if (prod) {
          setSelectedProduct(prod)
          setProductSearch(prod.name)
          setShowModal(true)
        }
        setPreSelectedProductId(null)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterProduct, filterWarehouse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !formWarehouseId) return
    setSaving(true)
    try {
      await productsApi.adjustStock({
        productId: selectedProduct.id,
        warehouseId: formWarehouseId,
        adjustmentType,
        baseUnitQuantity: parseFloat(baseQty) || 0,
        secondUnitQuantity: secondQty ? parseFloat(secondQty) : null,
        reason: reason || null,
      })
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedProduct(null)
    setProductSearch('')
    setFormWarehouseId('')
    setAdjustmentType('set')
    setBaseQty('')
    setSecondQty('')
    setReason('')
  }

  const openModal = (product?: Product) => {
    resetForm()
    if (product) {
      setSelectedProduct(product)
      setProductSearch(product.name)
    }
    setShowModal(true)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowUpDown size={24} />
            Stock Adjustment
          </h1>
          <p className="text-gray-500 text-sm mt-1">{total} adjustment{total !== 1 ? 's' : ''} recorded</p>
        </div>
        <PermissionGate permission={PERMISSIONS.ADJUST_STOCK_LEVELS}>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            <Plus size={18} />
            New Adjustment
          </button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>
        <select
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Warehouse</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <ArrowUpDown size={32} className="mx-auto mb-2 opacity-50" />
                    No stock adjustments recorded yet
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-gray-400">{item.productSku}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.warehouseName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.quantity > 0 ? 'text-green-600' : item.quantity < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity} {item.baseUnit}
                      </span>
                      {item.secondUnit && item.unitsPerSecond > 0 && (
                        <div className="text-xs text-gray-400">
                          ({item.quantity > 0 ? '+' : ''}{(item.quantity / item.unitsPerSecond).toFixed(1)} {item.secondUnit})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[250px] truncate">{item.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowUpDown size={20} />
                Stock Adjustment
              </h3>
              <button onClick={() => { setShowModal(false); resetForm() }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Product Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductDropdown(true)
                      if (!e.target.value) setSelectedProduct(null)
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search by name or SKU..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                {showProductDropdown && productSearch && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p)
                          setProductSearch(p.name)
                          setShowProductDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex justify-between"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-gray-400">{p.sku}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-3 py-2 text-gray-400 text-sm">No products found</div>
                    )}
                  </div>
                )}
                {selectedProduct && (
                  <div className="mt-1 text-xs text-gray-500">
                    Unit: <strong>{selectedProduct.baseUnit}</strong>
                    {selectedProduct.secondUnit && (
                      <> | {selectedProduct.secondUnit} ({selectedProduct.unitsPerSecond} {selectedProduct.baseUnit} per {selectedProduct.secondUnit})</>
                    )}
                  </div>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                <select
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('set')}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 ${adjustmentType === 'set' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}
                  >
                    <Equal size={16} /> Set To
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 ${adjustmentType === 'add' ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-gray-50'}`}
                  >
                    <ArrowUp size={16} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('subtract')}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 ${adjustmentType === 'subtract' ? 'bg-red-50 border-red-500 text-red-700' : 'hover:bg-gray-50'}`}
                  >
                    <ArrowDown size={16} /> Subtract
                  </button>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedProduct?.baseUnit || 'Base Unit'} Qty *
                  </label>
                  <input
                    type="number"
                    value={baseQty}
                    onChange={(e) => setBaseQty(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0"
                    required
                  />
                </div>
                {selectedProduct?.secondUnit && selectedProduct.unitsPerSecond > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedProduct.secondUnit} Qty
                    </label>
                    <input
                      type="number"
                      value={secondQty}
                      onChange={(e) => setSecondQty(e.target.value)}
                      min="0"
                      step="any"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Select reason...</option>
                  <option value="Physical Count">Physical Count</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Expired">Expired</option>
                  <option value="Lost">Lost</option>
                  <option value="Returned to Supplier">Returned to Supplier</option>
                  <option value="Received from Supplier">Received from Supplier</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Correction">Correction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedProduct || !formWarehouseId}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
