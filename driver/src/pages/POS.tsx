import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, Search, Plus, Minus, ShoppingCart, RefreshCw, 
  DollarSign, CreditCard, User, X, Barcode,
  Trash2, Percent, Package, Grid3X3, List,
  ChevronRight, AlertCircle, Check, Printer
} from 'lucide-react'
import { inventoryApi, ordersApi, customersApi } from '../lib/api'

interface Product {
  productId: number
  productName: string
  sku: string
  barcode: string | null
  boxBarcode: string | null
  quantity: number
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
  retailPrice: number
  wholesalePrice: number
  boxRetailPrice: number
  boxWholesalePrice: number
  imageUrl: string | null
}

interface CartItem {
  product: Product
  quantity: number
  unitType: 'piece' | 'box'
  unitPrice: number
  discount: number
}

interface Customer {
  id: number
  name: string
  phone: string | null
  currentBalance: number
  creditLimit: number
}

interface CustomerPrice {
  productId: number
  specialPrice: number | null
  boxSpecialPrice: number | null
  hasSpecialPrice: boolean
  hasBoxSpecialPrice: boolean
}

type ViewMode = 'grid' | 'list'
type PaymentType = 'cash' | 'credit' | 'split'

export default function POS() {
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI state
  const [search, setSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  
  // Discount modal state
  const [editingDiscount, setEditingDiscount] = useState<number | null>(null)
  const [discountValue, setDiscountValue] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Load customer-specific prices when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerPrices(selectedCustomer.id)
    } else {
      setCustomerPrices([])
    }
  }, [selectedCustomer])

  // Auto-focus barcode input
  useEffect(() => {
    if (!showCustomerPicker && !showCart && !editingDiscount) {
      barcodeInputRef.current?.focus()
    }
  }, [showCustomerPicker, showCart, editingDiscount])

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, custRes] = await Promise.all([
        inventoryApi.getVanInventory(),
        customersApi.getAll()
      ])
      setProducts(invRes.data)
      setCustomers(custRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerPrices = async (customerId: number) => {
    try {
      const res = await inventoryApi.getCustomerPrices(customerId)
      setCustomerPrices(res.data)
    } catch (error) {
      console.error('Failed to load customer prices:', error)
      setCustomerPrices([])
    }
  }

  // Get effective price for a product (special price if available, otherwise retail)
  const getEffectivePrice = (product: Product, unitType: 'piece' | 'box'): { price: number; isSpecial: boolean } => {
    const customerPrice = customerPrices.find(cp => cp.productId === product.productId)
    
    if (unitType === 'box') {
      if (customerPrice?.hasBoxSpecialPrice && customerPrice.boxSpecialPrice != null) {
        return { price: customerPrice.boxSpecialPrice, isSpecial: true }
      }
      return { price: product.boxRetailPrice, isSpecial: false }
    } else {
      if (customerPrice?.hasSpecialPrice && customerPrice.specialPrice != null) {
        return { price: customerPrice.specialPrice, isSpecial: true }
      }
      return { price: product.retailPrice, isSpecial: false }
    }
  }

  // Barcode scanning
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return
    
    const barcode = barcodeInput.trim()
    const product = products.find(p => 
      p.barcode === barcode || p.boxBarcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    )
    
    if (product) {
      const isBox = product.boxBarcode === barcode
      addToCart(product, isBox ? 'box' : 'piece')
    } else {
      alert('Product not found')
    }
    setBarcodeInput('')
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  )

  const filteredProducts = products.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  // Quick products (first 6 with stock)
  const quickProducts = products.filter(p => p.quantity > 0).slice(0, 6)

  const addToCart = (product: Product, unitType: 'piece' | 'box' = 'piece') => {
    const { price } = getEffectivePrice(product, unitType)
    const maxQty = unitType === 'box' 
      ? Math.floor(product.quantity / product.unitsPerSecond)
      : product.quantity
    
    if (maxQty <= 0) {
      alert('Out of stock')
      return
    }
    
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.productId === product.productId && item.unitType === unitType
      )
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId && item.unitType === unitType
            ? { ...item, quantity: Math.min(item.quantity + 1, maxQty), unitPrice: price }
            : item
        )
      }
      return [...prev, { product, quantity: 1, unitType, unitPrice: price, discount: 0 }]
    })
  }

  const updateQuantity = (productId: number, unitType: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.productId === productId && item.unitType === unitType) {
        const maxQty = item.unitType === 'box' 
          ? Math.floor(item.product.quantity / item.product.unitsPerSecond)
          : item.product.quantity
        const newQty = item.quantity + delta
        if (newQty <= 0) return { ...item, quantity: 0 }
        if (newQty > maxQty) return item
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (productId: number, unitType: string) => {
    setCart(prev => prev.filter(item => 
      !(item.product.productId === productId && item.unitType === unitType)
    ))
  }

  const applyDiscount = (productId: number, unitType: string) => {
    const discount = parseFloat(discountValue) || 0
    setCart(prev => prev.map(item => {
      if (item.product.productId === productId && item.unitType === unitType) {
        return { ...item, discount: Math.min(discount, item.unitPrice) }
      }
      return item
    }))
    setEditingDiscount(null)
    setDiscountValue('')
  }

  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear all items from cart?')) {
      setCart([])
    }
  }

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0)
  const total = subtotal - totalDiscount
  const creditAmount = paymentType === 'split' 
    ? total - (parseFloat(cashAmount) || 0) 
    : (paymentType === 'credit' ? total : 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleSubmitOrder = async () => {
    if (!selectedCustomer || cart.length === 0) {
      alert('Please select a customer and add items to cart')
      return
    }
    
    if (paymentType === 'split') {
      const cash = parseFloat(cashAmount) || 0
      if (cash <= 0 || cash >= total) {
        alert('Please enter a valid cash amount for split payment')
        return
      }
    }
    
    setSubmitting(true)
    try {
      const orderData = {
        customerId: selectedCustomer.id,
        paymentType,
        cashAmount: paymentType === 'split' ? parseFloat(cashAmount) : (paymentType === 'cash' ? total : 0),
        notes: orderNotes,
        items: cart.map(item => ({
          productId: item.product.productId,
          quantity: item.quantity,
          unitType: item.unitType,
          unitPrice: item.unitPrice,
          discount: item.discount
        }))
      }
      
      const response = await ordersApi.create(orderData)
      setLastOrder({
        ...orderData,
        orderNumber: response.data?.orderNumber || 'ORD-' + Date.now(),
        customer: selectedCustomer,
        items: cart,
        subtotal,
        totalDiscount,
        total,
        date: new Date()
      })
      setShowReceipt(true)
      
      // Reset cart
      setCart([])
      setPaymentType('cash')
      setCashAmount('')
      setOrderNotes('')
      setShowCart(false)
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const closeReceipt = () => {
    setShowReceipt(false)
    setLastOrder(null)
    setSelectedCustomer(null)
  }

  const printReceipt = () => {
    if (!lastOrder) return
    
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) {
      alert('Please allow popups to print receipt')
      return
    }
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${lastOrder.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 48mm;
            padding: 2mm;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
          .item-name { max-width: 60%; }
          .total-row { font-size: 14px; font-weight: bold; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin-bottom: 2px; }
          .header { margin-bottom: 8px; }
          .footer { margin-top: 12px; font-size: 10px; }
          @media print {
            body { width: 48mm; }
            @page { size: 58mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <h1>Catalyst</h1>
          <p>Sales Receipt</p>
        </div>
        
        <div class="line"></div>
        
        <div>
          <p><strong>Receipt:</strong> ${lastOrder.orderNumber}</p>
          <p><strong>Date:</strong> ${new Date(lastOrder.date).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${lastOrder.customer.name}</p>
        </div>
        
        <div class="line"></div>
        
        <div>
          ${lastOrder.items.map((item: CartItem) => `
            <div class="row">
              <span class="item-name">${item.product.productName}</span>
              <span>x${item.quantity}</span>
            </div>
            <div class="row">
              <span>@ $${item.unitPrice.toFixed(2)}${item.discount > 0 ? ` (-$${item.discount.toFixed(2)})` : ''}</span>
              <span>$${((item.unitPrice - item.discount) * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="line"></div>
        
        ${lastOrder.totalDiscount > 0 ? `
          <div class="row">
            <span>Subtotal</span>
            <span>$${lastOrder.subtotal.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Discount</span>
            <span>-$${lastOrder.totalDiscount.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div class="row total-row">
          <span>TOTAL</span>
          <span>$${lastOrder.total.toFixed(2)}</span>
        </div>
        
        <div class="row">
          <span>Payment</span>
          <span>${lastOrder.paymentType.toUpperCase()}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="footer center">
          <p>Thank you for your business!</p>
          <p>--------------------------------</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
    
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 hover:bg-primary-500 rounded-lg">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-lg font-bold">Point of Sale</h1>
              <p className="text-primary-200 text-xs">
                {selectedCustomer ? selectedCustomer.name : 'No customer selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 hover:bg-primary-500 rounded-lg">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selection Bar */}
      <div className="bg-white border-b px-4 py-2">
        {selectedCustomer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">Balance: ${selectedCustomer.currentBalance.toFixed(2)}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCustomerPicker(true)}
              className="text-primary-600 text-sm font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomerPicker(true)}
            className="w-full flex items-center justify-between py-2 text-gray-500"
          >
            <div className="flex items-center gap-2">
              <User size={20} />
              <span>Select Customer</span>
            </div>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Barcode Scanner Input */}
      <div className="bg-white border-b px-4 py-3">
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode or enter SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="input pl-10 bg-gray-50"
            />
          </div>
          <button type="submit" className="btn btn-primary px-4">
            <Plus size={20} />
          </button>
        </form>
      </div>

      {/* Quick Products */}
      {quickProducts.length > 0 && (
        <div className="bg-white border-b px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2">QUICK ADD</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickProducts.map((product) => {
              const { price, isSpecial } = getEffectivePrice(product, 'piece')
              return (
                <button
                  key={product.productId}
                  onClick={() => addToCart(product)}
                  className={`flex-shrink-0 border rounded-lg px-3 py-2 text-left min-w-[120px] ${
                    isSpecial ? 'bg-green-50 border-green-200' : 'bg-primary-50 border-primary-200'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{product.productName}</p>
                  <div className="flex items-center gap-1">
                    <p className={`font-semibold text-sm ${isSpecial ? 'text-green-600' : 'text-primary-600'}`}>
                      ${price.toFixed(2)}
                    </p>
                    {isSpecial && <span className="text-xs text-green-500">★</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Search & View Toggle */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'bg-white text-gray-400'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'bg-white text-gray-400'}`}
            >
              <Grid3X3 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="p-4 pb-32">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No products in van inventory</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.productId === product.productId && item.unitType === 'piece')
              const cartBoxItem = cart.find(item => item.product.productId === product.productId && item.unitType === 'box')
              const maxBoxes = Math.floor(product.quantity / product.unitsPerSecond)
              const piecePrice = getEffectivePrice(product, 'piece')
              const boxPrice = getEffectivePrice(product, 'box')
              
              return (
                <div key={product.productId} className={`bg-white rounded-xl p-3 shadow-sm ${piecePrice.isSpecial ? 'ring-1 ring-green-300' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{product.productName}</h3>
                        {piecePrice.isSpecial && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Special Price</span>}
                      </div>
                      <p className="text-xs text-gray-500">{product.sku} • Stock: {product.quantity} {product.baseUnit}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`font-semibold ${piecePrice.isSpecial ? 'text-green-600' : 'text-primary-600'}`}>
                          ${piecePrice.price.toFixed(2)}/{product.baseUnit}
                          {piecePrice.isSpecial && <span className="text-xs text-gray-400 line-through ml-1">${product.retailPrice.toFixed(2)}</span>}
                        </span>
                        {product.secondUnit && maxBoxes > 0 && (
                          <span className={`font-semibold text-sm ${boxPrice.isSpecial ? 'text-green-600' : 'text-purple-600'}`}>
                            ${boxPrice.price.toFixed(2)}/{product.secondUnit}
                            {boxPrice.isSpecial && <span className="text-xs text-gray-400 line-through ml-1">${product.boxRetailPrice.toFixed(2)}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {/* Piece controls */}
                      {cartItem ? (
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(product.productId, 'piece', -1)}
                            className="p-1.5 bg-white rounded shadow-sm"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.productId, 'piece', 1)}
                            className="p-1.5 bg-primary-600 text-white rounded shadow-sm"
                            disabled={cartItem.quantity >= product.quantity}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product, 'piece')}
                          disabled={product.quantity <= 0}
                          className="btn btn-primary btn-sm"
                        >
                          <Plus size={16} className="mr-1" />
                          {product.baseUnit}
                        </button>
                      )}
                      
                      {/* Box controls */}
                      {product.secondUnit && maxBoxes > 0 && (
                        cartBoxItem ? (
                          <div className="flex items-center gap-1 bg-purple-100 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(product.productId, 'box', -1)}
                              className="p-1.5 bg-white rounded shadow-sm"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-semibold text-sm">{cartBoxItem.quantity}</span>
                            <button
                              onClick={() => updateQuantity(product.productId, 'box', 1)}
                              className="p-1.5 bg-purple-600 text-white rounded shadow-sm"
                              disabled={cartBoxItem.quantity >= maxBoxes}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product, 'box')}
                            className="btn bg-purple-600 text-white btn-sm"
                          >
                            <Plus size={16} className="mr-1" />
                            {product.secondUnit}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.productId}
                onClick={() => addToCart(product)}
                disabled={product.quantity <= 0}
                className="bg-white rounded-xl p-3 shadow-sm text-left disabled:opacity-50"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={32} className="text-gray-300" />
                  )}
                </div>
                <h3 className="font-medium text-sm text-gray-900 truncate">{product.productName}</h3>
                <p className="text-xs text-gray-500">Stock: {product.quantity}</p>
                <p className="text-primary-600 font-semibold">${product.retailPrice.toFixed(2)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary Bar */}
      {cart.length > 0 && (
        <div 
          className="fixed bottom-16 left-0 right-0 bg-primary-600 text-white p-4 shadow-lg cursor-pointer z-40"
          onClick={() => setShowCart(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div>
                <p className="text-sm text-primary-200">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                <p className="font-bold text-lg">${total.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">View Cart</span>
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl max-h-[85vh] flex flex-col animate-slide-up shadow-xl">
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
                  className="w-full bg-white border rounded-xl p-3 flex items-center gap-3 text-left active:bg-gray-50 hover:bg-gray-50"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {customer.phone || 'No phone'} • Balance: ${customer.currentBalance.toFixed(2)}
                    </p>
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

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end pb-16">
          <div className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Cart ({itemCount} items)</h3>
              <div className="flex items-center gap-2">
                <button onClick={clearCart} className="p-2 text-red-500">
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setShowCart(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={`${item.product.productId}-${item.unitType}`} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.unitType === 'box' ? item.product.secondUnit : item.product.baseUnit} × {item.quantity}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.productId, item.unitType)}
                      className="p-1 text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.productId, item.unitType, -1)}
                        className="p-1.5 bg-white rounded-lg border"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.productId, item.unitType, 1)}
                        className="p-1.5 bg-primary-600 text-white rounded-lg"
                      >
                        <Plus size={14} />
                      </button>
                      
                      {/* Discount button */}
                      <button
                        onClick={() => {
                          setEditingDiscount(idx)
                          setDiscountValue(item.discount.toString())
                        }}
                        className={`ml-2 p-1.5 rounded-lg border ${item.discount > 0 ? 'bg-green-100 border-green-300 text-green-600' : 'bg-white'}`}
                      >
                        <Percent size={14} />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      {item.discount > 0 && (
                        <p className="text-xs text-green-600">-${(item.discount * item.quantity).toFixed(2)}</p>
                      )}
                      <p className="font-semibold">
                        ${((item.unitPrice - item.discount) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Discount Input */}
                  {editingDiscount === idx && (
                    <div className="mt-2 flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="input pl-6 py-1.5 text-sm"
                          placeholder="Discount per unit"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => applyDiscount(item.product.productId, item.unitType)}
                        className="btn btn-success btn-sm"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => { setEditingDiscount(null); setDiscountValue('') }}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Payment Section */}
            <div className="border-t p-4 space-y-3 bg-gray-50">
              {/* Payment Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setPaymentType('cash'); setCashAmount('') }}
                  className={`flex items-center justify-center gap-1 py-2.5 rounded-lg border text-sm font-medium ${
                    paymentType === 'cash' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 bg-white'
                  }`}
                >
                  <DollarSign size={16} />
                  Cash
                </button>
                <button
                  onClick={() => { setPaymentType('credit'); setCashAmount('') }}
                  className={`flex items-center justify-center gap-1 py-2.5 rounded-lg border text-sm font-medium ${
                    paymentType === 'credit' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 bg-white'
                  }`}
                >
                  <CreditCard size={16} />
                  Credit
                </button>
                <button
                  onClick={() => setPaymentType('split')}
                  className={`flex items-center justify-center gap-1 py-2.5 rounded-lg border text-sm font-medium ${
                    paymentType === 'split' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 bg-white'
                  }`}
                >
                  Split
                </button>
              </div>

              {/* Split Payment Input */}
              {paymentType === 'split' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-500 text-xs">Cash Amount</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="input pl-6 py-2"
                        placeholder="0.00"
                        max={total}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">On Account</label>
                    <div className="input py-2 bg-gray-100 text-gray-600">
                      ${creditAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="input"
                placeholder="Order notes (optional)"
              />
              
              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Customer Warning */}
              {!selectedCustomer && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle size={16} className="text-amber-600" />
                  <p className="text-sm text-amber-700">Please select a customer first</p>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || !selectedCustomer || cart.length === 0}
                className="w-full btn btn-success py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <>
                    <Check size={24} />
                    Complete Sale - ${total.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
            <div className="bg-green-500 text-white p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={32} />
              </div>
              <h2 className="text-xl font-bold">Sale Complete!</h2>
              <p className="text-green-100">{lastOrder.orderNumber}</p>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Customer */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{lastOrder.customer.name}</span>
              </div>
              
              {/* Items */}
              <div className="border-t pt-3">
                {lastOrder.items.map((item: CartItem, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span>
                      {item.product.productName} × {item.quantity}
                      {item.unitType === 'box' && ` (${item.product.secondUnit})`}
                    </span>
                    <span>${((item.unitPrice - item.discount) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
                {lastOrder.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-${lastOrder.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Payment</span>
                  <span className="capitalize">{lastOrder.paymentType}</span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-3">
                <button 
                  onClick={printReceipt}
                  className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Print
                </button>
                <button 
                  onClick={closeReceipt}
                  className="flex-1 btn btn-primary"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
