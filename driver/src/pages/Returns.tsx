import { useState, useEffect } from 'react'
import { RotateCcw, ChevronLeft, Plus, Search, Trash2, Check, Loader2, User, Package } from 'lucide-react'
import { returnsApi, customersApi, inventoryApi } from '../lib/api'

interface Return {
  id: number
  returnNumber: string
  customerName: string
  returnDate: string
  totalAmount: number
  status: string
  itemCount: number
}

interface Customer {
  id: number
  name: string
  shopName?: string
}

interface Product {
  productId: number
  productName: string
  sku: string
  retailPrice: number
  quantity: number
}

interface ReturnItem {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  reason: string
}

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = useState('')

  useEffect(() => {
    loadReturns()
  }, [])

  useEffect(() => {
    if (showForm) {
      loadFormData()
    }
  }, [showForm])

  const loadReturns = async () => {
    try {
      setLoading(true)
      const res = await returnsApi.getAll()
      setReturns(res.data || [])
    } catch (err) {
      console.error('Failed to load returns:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    try {
      const [customersRes, inventoryRes] = await Promise.all([
        customersApi.getAll(),
        inventoryApi.getVanInventory()
      ])
      setCustomers(customersRes.data || [])
      setProducts(inventoryRes.data || [])
    } catch (err) {
      console.error('Failed to load form data:', err)
    }
  }

  const resetForm = () => {
    setSelectedCustomerId(null)
    setReturnItems([])
    setReturnReason('')
    setCustomerSearch('')
    setProductSearch('')
  }

  const addProduct = (product: Product) => {
    const existing = returnItems.find(i => i.productId === product.productId)
    if (existing) {
      setReturnItems(returnItems.map(i =>
        i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setReturnItems([...returnItems, {
        productId: product.productId,
        productName: product.productName,
        quantity: 1,
        unitPrice: product.retailPrice,
        reason: ''
      }])
    }
    setProductSearch('')
  }

  const updateItem = (productId: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(returnItems.map(i =>
      i.productId === productId ? { ...i, [field]: value } : i
    ))
  }

  const removeItem = (productId: number) => {
    setReturnItems(returnItems.filter(i => i.productId !== productId))
  }

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer')
      return
    }
    if (returnItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      await returnsApi.create({
        customerId: selectedCustomerId,
        reason: returnReason,
        items: returnItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          reason: i.reason
        }))
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setShowForm(false)
        resetForm()
        loadReturns()
      }, 1500)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create return')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'approved': return 'bg-blue-100 text-blue-700'
      case 'processed': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const returnTotal = returnItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 8)

  const filteredProducts = products.filter(p =>
    p.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 8)

  if (showForm) {
    return (
      <div className="page-container pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 -mx-4 -mt-4 mb-4">
          <button onClick={() => { setShowForm(false); resetForm() }} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">Create Return</h1>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check size={40} className="text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-600">Return Created!</p>
            <p className="text-gray-500 mt-1">Pending approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-1" />
                Customer *
              </label>
              {selectedCustomerId ? (
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <span className="font-medium">
                    {customers.find(c => c.id === selectedCustomerId)?.name}
                  </span>
                  <button onClick={() => setSelectedCustomerId(null)} className="text-gray-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg"
                  />
                  {customerSearch && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch('') }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        >
                          <p className="font-medium">{c.name}</p>
                          {c.shopName && <p className="text-sm text-gray-500">{c.shopName}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package size={16} className="inline mr-1" />
                Add Products
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg"
                />
                {productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button
                        key={p.productId}
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between"
                      >
                        <div>
                          <p className="font-medium">{p.productName}</p>
                          <p className="text-sm text-gray-500">{p.sku}</p>
                        </div>
                        <span className="text-primary-600 font-medium">{formatCurrency(p.retailPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Return Items */}
            {returnItems.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-medium mb-3">Return Items</h3>
                <div className="space-y-3">
                  {returnItems.map(item => (
                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} each</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 text-center border rounded px-2 py-1"
                      />
                      <span className="font-medium w-20 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button onClick={() => removeItem(item.productId)} className="text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(returnTotal)}</span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Why is the customer returning these items?"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedCustomerId || returnItems.length === 0}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Create Return
                </>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-primary-600 text-white px-4 py-4 -mx-4 -mt-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Returns</h1>
            <p className="text-primary-100 text-sm">Process customer returns</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-primary-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            New Return
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-primary-600">{returns.length}</p>
          <p className="text-sm text-gray-500">Total Returns</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">
            {returns.filter(r => r.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RotateCcw size={32} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">No Returns Yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Process returns when customers bring items back
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium"
          >
            Create First Return
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div key={ret.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{ret.returnNumber}</p>
                  <p className="text-sm text-gray-500">{ret.customerName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ret.returnDate).toLocaleDateString()} • {ret.itemCount} items
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ret.status)}`}>
                    {ret.status}
                  </span>
                  <p className="font-bold text-primary-600 mt-2">{formatCurrency(ret.totalAmount)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
