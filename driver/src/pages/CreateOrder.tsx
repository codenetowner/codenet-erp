import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Minus, ShoppingCart, RefreshCw, DollarSign, CreditCard, User, ChevronDown, X } from 'lucide-react'
import { inventoryApi, ordersApi, customersApi } from '../lib/api'

interface Product {
  productId: number
  productName: string
  sku: string
  quantity: number
  baseUnit: string
  retailPrice: number
}

interface CartItem {
  product: Product
  quantity: number
}

interface Customer {
  id: number
  name: string
  currentBalance: number
  creditLimit: number
}

export default function CreateOrder() {
  const { customerId: urlCustomerId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'split'>('cash')
  const [cashAmount, setCashAmount] = useState('')

  useEffect(() => {
    loadData()
  }, [urlCustomerId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, custRes] = await Promise.all([
        inventoryApi.getVanInventory(),
        customersApi.getAll()
      ])
      setProducts(invRes.data)
      setCustomers(custRes.data)
      
      if (urlCustomerId) {
        const customer = custRes.data.find((c: Customer) => c.id === parseInt(urlCustomerId))
        if (customer) setSelectedCustomer(customer)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.productId === product.productId)
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId
            ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.productId === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return { ...item, quantity: 0 }
        if (newQty > item.product.quantity) return item
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const total = cart.reduce((sum, item) => sum + item.product.retailPrice * item.quantity, 0)
  const creditAmount = paymentType === 'split' ? total - (parseFloat(cashAmount) || 0) : (paymentType === 'credit' ? total : 0)

  const handleSubmitOrder = async () => {
    if (!selectedCustomer || cart.length === 0) return
    
    // Validate split payment
    if (paymentType === 'split') {
      const cash = parseFloat(cashAmount) || 0
      if (cash <= 0 || cash >= total) {
        alert('Please enter a valid cash amount for split payment')
        return
      }
    }
    
    setSubmitting(true)
    try {
      await ordersApi.create({
        customerId: selectedCustomer.id,
        paymentType,
        cashAmount: paymentType === 'split' ? parseFloat(cashAmount) : (paymentType === 'cash' ? total : 0),
        items: cart.map(item => ({
          productId: item.product.productId,
          quantity: item.quantity,
          discount: 0
        }))
      })
      alert('Order created successfully!')
      navigate('/')
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to={urlCustomerId ? `/customers/${urlCustomerId}` : '/'} className="p-2 -ml-2 hover:bg-primary-500 rounded-lg">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">New Order</h1>
            <p className="text-primary-200 text-sm">
              {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
            </p>
          </div>
        </div>
      </div>

      <div className="page-content pb-48">
        {/* Customer Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          {selectedCustomer ? (
            <div className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-500">Balance: ${selectedCustomer.currentBalance.toFixed(2)}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCustomer(null); setShowCustomerPicker(true) }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerPicker(true)}
              className="w-full card flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-gray-400" />
                </div>
                <span className="text-gray-500">Select a customer...</span>
              </div>
              <ChevronDown size={20} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Customer Picker Modal */}
        {showCustomerPicker && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-lg">Select Customer</h3>
                <button onClick={() => setShowCustomerPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 border-b flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="input pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setShowCustomerPicker(false)
                      setCustomerSearch('')
                    }}
                    className="w-full card flex items-center gap-3 text-left active:bg-gray-50 hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-gray-500 truncate">Balance: ${customer.currentBalance.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No customers found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Products */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Products */}
        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products in van inventory
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.productId === product.productId)
              return (
                <div key={product.productId} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.productName}</h3>
                    <p className="text-sm text-gray-500">{product.sku} • Stock: {product.quantity}</p>
                    <p className="text-primary-600 font-semibold">${product.retailPrice.toFixed(2)}</p>
                  </div>
                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.productId, -1)}
                        className="p-2 bg-gray-100 rounded-lg active:bg-gray-200"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-semibold">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.productId, 1)}
                        className="p-2 bg-primary-100 text-primary-600 rounded-lg active:bg-primary-200"
                        disabled={cartItem.quantity >= product.quantity}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.quantity <= 0}
                      className="p-2 bg-primary-600 text-white rounded-lg active:bg-primary-700 disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t shadow-lg">
            <div className="max-w-lg mx-auto space-y-3">
              {/* Payment Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentType('cash'); setCashAmount('') }}
                  className={`flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${
                    paymentType === 'cash' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200'
                  }`}
                >
                  <DollarSign size={16} />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentType('credit'); setCashAmount('') }}
                  className={`flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${
                    paymentType === 'credit' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200'
                  }`}
                >
                  <CreditCard size={16} />
                  Credit
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('split')}
                  className={`flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${
                    paymentType === 'split' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200'
                  }`}
                >
                  Split
                </button>
              </div>

              {/* Split Payment Input */}
              {paymentType === 'split' && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-gray-500 text-xs">Cash Amount</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="input pl-6 py-1.5 text-sm"
                        placeholder="0.00"
                        max={total}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">On Account</label>
                    <div className="input py-1.5 text-sm bg-gray-50 text-gray-600">
                      ${creditAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
                  <p className="text-xl font-bold">${total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={handleSubmitOrder}
                  disabled={submitting || !selectedCustomer}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <ShoppingCart size={20} />
                  {submitting ? 'Processing...' : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
