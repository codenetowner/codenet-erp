import { useState, useEffect, useRef } from 'react'
import { 
  Search, Plus, Minus, Package,
  DollarSign, CreditCard, User, X, Barcode,
  Trash2, AlertCircle, Check, Printer, Warehouse, FileText,
  RotateCcw, ArrowLeftRight, ShoppingCart, Undo2,
  Receipt, GripVertical, AlertTriangle
} from 'lucide-react'
import { customersApi, warehousesApi, quotesApi, directSalesApi, settingsApi, currenciesApi } from '../lib/api'
import api from '../lib/api'

interface VariantInfo {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  retailPrice: number | null
  wholesalePrice: number | null
  costPrice: number | null
  boxRetailPrice: number | null
  boxWholesalePrice: number | null
  boxCostPrice: number | null
  imageUrl: string | null
  color: string | null
  size: string | null
  weight: number | null
  length: number | null
  height: number | null
  quantity: number
}

interface Product {
  productId: number
  productName: string
  sku: string
  barcode: string | null
  boxBarcode: string | null
  warehouseId: number
  warehouseName: string
  quantity: number
  variantId: number | null
  variantName: string | null
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
  retailPrice: number
  wholesalePrice: number
  boxRetailPrice: number
  boxWholesalePrice: number
  costPrice: number
  boxCostPrice: number
  imageUrl: string | null
  lowStockAlert: number
  currency: string
  color?: string | null
  size?: string | null
  weight?: number | null
  length?: number | null
  height?: number | null
  variants?: VariantInfo[]
}

interface CartItem {
  product: Product
  variantId: number | null
  variantName: string | null
  quantity: number
  unitType: 'piece' | 'box'
  unitPrice: number
  discount: number
}

interface Customer {
  id: number
  name: string
  shopName?: string
  phone: string | null
  customerType: string
  debtBalance: number
  creditLimit: number
}

interface CustomerPrice {
  productId: number
  specialPrice: number | null
  boxSpecialPrice: number | null
  hasSpecialPrice: boolean
  hasBoxSpecialPrice: boolean
}

interface Warehouse {
  id: number
  name: string
}

type PaymentType = 'cash' | 'credit' | 'split'
type SalesMode = 'sale' | 'return'
type ProductTabType = 'invoice' | 'catalog'

interface LoadedOrder {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  customerPhone: string | null
  orderDate: string
  orderTime: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  cashierName: string
  notes: string | null
  items: OrderItemDetail[]
}

interface OrderItemDetail {
  id: number
  productId: number
  productName: string
  productSku: string
  unitType: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  alreadyReturnedQty: number
  returnableQty: number
}

interface ReturnItem {
  originalOrderItemId: number
  productId: number
  productName: string
  productSku: string
  unitType: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  reason: string
  condition: string
  inventoryAction: string
  maxReturnableQty: number
}

interface ExchangeItem {
  product: Product
  quantity: number
  unitType: 'piece' | 'box'
  unitPrice: number
  discount: number
}

const RETURN_REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'expired', label: 'Expired' },
  { value: 'customer_changed_mind', label: 'Customer Changed Mind' },
  { value: 'defective', label: 'Defective' },
  { value: 'other', label: 'Other' }
]

const ITEM_CONDITIONS = [
  { value: 'resellable', label: 'Resellable' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'opened', label: 'Opened' }
]

const INVENTORY_ACTIONS = [
  { value: 'back_to_stock', label: 'Back to Stock' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'return_to_vendor', label: 'Return to Vendor' }
]

export default function DirectSales() {
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  
  const [products, setProducts] = useState<Product[]>([])
  const [displayProducts, setDisplayProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([])
  const [currencies, setCurrencies] = useState<{id: number; code: string; exchangeRate: number; isBase: boolean; isActive: boolean}[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null)
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  
  const [editingDiscount, setEditingDiscount] = useState<number | null>(null)
  const [discountValue, setDiscountValue] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [loadedQuoteId, setLoadedQuoteId] = useState<number | null>(null)

  // Return/Exchange Mode State
  const [salesMode, setSalesMode] = useState<SalesMode>('sale')
  const [productTab, setProductTab] = useState<ProductTabType>('catalog')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [loadedOrder, setLoadedOrder] = useState<LoadedOrder | null>(null)
  const [returnBasket, setReturnBasket] = useState<ReturnItem[]>([])
  const [exchangeBasket, setExchangeBasket] = useState<ExchangeItem[]>([])
  const [refundMethod, setRefundMethod] = useState<string>('cash')
  const [returnNotes, setReturnNotes] = useState('')
  const [processingReturn, setProcessingReturn] = useState(false)
  const [showReturnResult, setShowReturnResult] = useState(false)
  const [lastReturnResult, setLastReturnResult] = useState<any>(null)
  const [dragOverZone, setDragOverZone] = useState<'return' | 'exchange' | null>(null)
  const [paymentCurrencies, setPaymentCurrencies] = useState<Record<string, { selected: boolean; amount: string }>>({})

  const [companySettings, setCompanySettings] = useState<{ name: string; phone: string; address: string; exchangeRate: number; showSecondaryPrice: boolean; currencySymbol: string }>({ name: '', phone: '', address: '', exchangeRate: 1, showSecondaryPrice: false, currencySymbol: '$' })

  useEffect(() => {
    loadData()
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const res = await settingsApi.get()
      setCompanySettings({
        name: res.data.companyName || res.data.name || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        exchangeRate: res.data.exchangeRate ?? 1,
        showSecondaryPrice: res.data.showSecondaryPrice ?? false,
        currencySymbol: res.data.currencySymbol || '$'
      })
    } catch (error) {
      console.error('Failed to load company settings:', error)
    }
  }

  useEffect(() => {
    if (selectedWarehouse) {
      loadInventory()
    }
  }, [selectedWarehouse])

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerPrices(selectedCustomer.id)
    } else {
      setCustomerPrices([])
    }
  }, [selectedCustomer])

  // Update cart prices when customer type changes (retail vs wholesale)
  useEffect(() => {
    if (cart.length > 0 && products.length > 0) {
      const isWholesale = selectedCustomer?.customerType?.toLowerCase() === 'wholesale'
      setCart(prev => prev.map(item => {
        const customerPrice = customerPrices.find(cp => cp.productId === item.product.productId)
        let newPrice = item.unitPrice
        
        if (item.unitType === 'box') {
          if (customerPrice?.hasBoxSpecialPrice && customerPrice.boxSpecialPrice != null) {
            newPrice = customerPrice.boxSpecialPrice
          } else {
            newPrice = isWholesale ? item.product.boxWholesalePrice : item.product.boxRetailPrice
          }
        } else {
          if (customerPrice?.hasSpecialPrice && customerPrice.specialPrice != null) {
            newPrice = customerPrice.specialPrice
          } else {
            newPrice = isWholesale ? item.product.wholesalePrice : item.product.retailPrice
          }
        }
        
        return { ...item, unitPrice: newPrice }
      }))
    }
  }, [selectedCustomer?.customerType, customerPrices])

  useEffect(() => {
    if (!showCustomerPicker && !editingDiscount) {
      barcodeInputRef.current?.focus()
    }
  }, [showCustomerPicker, editingDiscount])

  const loadData = async () => {
    setLoading(true)
    try {
      const [custRes, whRes, curRes] = await Promise.all([
        customersApi.getAll(),
        warehousesApi.getAll(),
        currenciesApi.getAll()
      ])
      setCustomers(custRes.data)
      setWarehouses(whRes.data)
      setCurrencies(curRes.data || [])
      if (whRes.data.length > 0) {
        setSelectedWarehouse(whRes.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInventory = async () => {
    try {
      const res = await api.get('/direct-sales/inventory', { 
        params: { warehouseId: selectedWarehouse } 
      })
      setProducts(res.data)

      // Flatten: main product + each variant = separate cards, then deduplicate
      const raw: Product[] = res.data
      const allCards: Product[] = []
      const variantsExpandedFor = new Set<number>()
      
      for (const p of raw) {
        const attrs = [p.color, p.size].filter(Boolean)
        const suffix = attrs.length > 0 ? attrs.join(' ') : ''
        
        allCards.push({
          ...p,
          productName: suffix ? `${p.productName} - ${suffix}` : p.productName,
          variantName: suffix || null,
          variants: undefined,
        })
        
        if (p.variants && p.variants.length > 0 && !p.variantId && !variantsExpandedFor.has(p.productId)) {
          variantsExpandedFor.add(p.productId)
          for (const v of p.variants) {
            const vAttrs = [v.color, v.size].filter(Boolean)
            const variantSuffix = vAttrs.length > 0 ? vAttrs.join(' ') : `Variant ${v.id}`
            allCards.push({
              ...p,
              productName: `${p.productName} - ${variantSuffix}`,
              variantId: v.id,
              variantName: variantSuffix,
              sku: v.sku || p.sku,
              barcode: v.barcode || p.barcode,
              retailPrice: v.retailPrice ?? p.retailPrice,
              wholesalePrice: v.wholesalePrice ?? p.wholesalePrice,
              costPrice: v.costPrice ?? p.costPrice,
              boxRetailPrice: v.boxRetailPrice ?? p.boxRetailPrice,
              boxWholesalePrice: v.boxWholesalePrice ?? p.boxWholesalePrice,
              boxCostPrice: v.boxCostPrice ?? p.boxCostPrice,
              imageUrl: v.imageUrl || p.imageUrl,
              color: v.color,
              size: v.size,
              weight: v.weight,
              length: v.length,
              height: v.height,
              quantity: v.quantity ?? 0,
              variants: undefined,
            })
          }
        }
      }
      
      const seen = new Set<string>()
      setDisplayProducts(allCards.filter(card => {
        const key = `${card.productId}-${card.variantId ?? 'main'}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }))
    } catch (error) {
      console.error('Failed to load inventory:', error)
    }
  }

  const loadCustomerPrices = async (customerId: number) => {
    try {
      const res = await api.get(`/direct-sales/customer-prices/${customerId}`)
      setCustomerPrices(res.data)
    } catch (error) {
      console.error('Failed to load customer prices:', error)
      setCustomerPrices([])
    }
  }

  // Load invoice for Return/Exchange mode
  const loadInvoice = async () => {
    if (!invoiceNumber.trim()) return
    
    setLoadingInvoice(true)
    try {
      const order = await directSalesApi.getOrderByNumber(invoiceNumber.trim())
      setLoadedOrder(order)
      
      // Auto-select customer and switch to invoice items tab
      const customer = customers.find(c => c.id === order.customerId)
      if (customer) {
        setSelectedCustomer(customer)
      }
      setProductTab('invoice')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Invoice not found')
    } finally {
      setLoadingInvoice(false)
    }
  }

  // Add item to return basket
  const addToReturnBasket = (item: OrderItemDetail, qty?: number) => {
    const quantity = qty ?? 1
    if (quantity <= 0 || quantity > item.returnableQty) return

    setReturnBasket(prev => {
      const existing = prev.find(ri => ri.originalOrderItemId === item.id)
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, item.returnableQty)
        return prev.map(ri => ri.originalOrderItemId === item.id 
          ? { ...ri, quantity: newQty, lineTotal: newQty * ri.unitPrice - ri.discountAmount }
          : ri
        )
      }
      const effectivePrice = item.unitPrice - (item.discountAmount / item.quantity)
      return [...prev, {
        originalOrderItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        unitType: item.unitType,
        quantity: quantity,
        unitPrice: effectivePrice,
        discountAmount: 0,
        lineTotal: quantity * effectivePrice,
        reason: 'customer_changed_mind',
        condition: 'resellable',
        inventoryAction: 'back_to_stock',
        maxReturnableQty: item.returnableQty
      }]
    })
  }

  // Update return item quantity
  const updateReturnQuantity = (orderItemId: number, newQty: number) => {
    setReturnBasket(prev => prev.map(ri => {
      if (ri.originalOrderItemId === orderItemId) {
        const qty = Math.max(0, Math.min(newQty, ri.maxReturnableQty))
        if (qty === 0) return ri
        return { ...ri, quantity: qty, lineTotal: qty * ri.unitPrice }
      }
      return ri
    }).filter(ri => ri.quantity > 0))
  }

  // Remove from return basket
  const removeFromReturnBasket = (orderItemId: number) => {
    setReturnBasket(prev => prev.filter(ri => ri.originalOrderItemId !== orderItemId))
  }

  // Update return item properties
  const updateReturnItemProps = (orderItemId: number, props: Partial<ReturnItem>) => {
    setReturnBasket(prev => prev.map(ri => 
      ri.originalOrderItemId === orderItemId ? { ...ri, ...props } : ri
    ))
  }

  // Add to exchange basket
  const addToExchangeBasket = (product: Product, unitType: 'piece' | 'box' = 'piece') => {
    const { price } = getEffectivePrice(product, unitType)
    setExchangeBasket(prev => {
      const existing = prev.find(item => item.product.productId === product.productId && item.unitType === unitType)
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId && item.unitType === unitType
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, unitType, unitPrice: price, discount: 0 }]
    })
  }

  // Update exchange quantity
  const updateExchangeQuantity = (productId: number, unitType: string, delta: number) => {
    setExchangeBasket(prev =>
      prev.map(item => {
        if (item.product.productId === productId && item.unitType === unitType) {
          const newQty = Math.max(0, item.quantity + delta)
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  // Remove from exchange basket
  const removeFromExchangeBasket = (productId: number, unitType: string) => {
    setExchangeBasket(prev => prev.filter(item => !(item.product.productId === productId && item.unitType === unitType)))
  }

  // Calculate return/exchange totals
  const returnTotal = returnBasket.reduce((sum, item) => sum + item.lineTotal, 0)
  const exchangeTotal = exchangeBasket.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discount), 0)
  const netAmount = exchangeTotal - returnTotal

  // Process return/exchange
  const handleProcessReturnExchange = async () => {
    if (!loadedOrder || !selectedWarehouse) return
    if (returnBasket.length === 0 && exchangeBasket.length === 0) {
      alert('Please add items to return or exchange')
      return
    }

    setProcessingReturn(true)
    try {
      const result = await directSalesApi.processReturnExchange({
        originalOrderId: loadedOrder.id,
        warehouseId: selectedWarehouse,
        refundMethod: netAmount < 0 ? refundMethod : null,
        paymentMethod: netAmount > 0 ? paymentType : null,
        notes: returnNotes,
        returnItems: returnBasket.map(item => ({
          productId: item.productId,
          originalOrderItemId: item.originalOrderItemId,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          lineTotal: item.lineTotal,
          reason: item.reason,
          condition: item.condition,
          inventoryAction: item.inventoryAction
        })),
        exchangeItems: exchangeBasket.map(item => ({
          productId: item.product.productId,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discount,
          lineTotal: item.quantity * item.unitPrice - item.discount
        }))
      })

      // Store result with items for printing before clearing baskets
      setLastReturnResult({
        ...result,
        returnItems: [...returnBasket],
        exchangeItems: [...exchangeBasket]
      })
      setShowReturnResult(true)
      
      // Reset state
      setReturnBasket([])
      setExchangeBasket([])
      setLoadedOrder(null)
      setInvoiceNumber('')
      setReturnNotes('')
      loadInventory()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to process return/exchange')
    } finally {
      setProcessingReturn(false)
    }
  }

  // Reset return/exchange mode
  const resetReturnMode = () => {
    setLoadedOrder(null)
    setReturnBasket([])
    setExchangeBasket([])
    setInvoiceNumber('')
    setReturnNotes('')
    setProductTab('catalog')
  }

  // Print Return/Exchange Invoice
  const printReturnExchangeInvoice = (result: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700')
    if (!printWindow) {
      alert('Please allow popups to print invoice')
      return
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return/Exchange Invoice - ${result.transactionNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 14px; margin-bottom: 5px; }
          .header h2 { font-size: 16px; margin-bottom: 5px; }
          .header p { font-size: 10px; color: #666; }
          .info { margin-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .info-row .label { color: #666; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .section-title { font-weight: bold; margin-bottom: 5px; padding: 3px 0; background: #f0f0f0; text-align: center; }
          .items { margin-bottom: 10px; }
          .item { margin-bottom: 5px; padding-left: 5px; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; }
          .return-item { color: #c00; }
          .exchange-item { color: #080; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .refund { background: #fff3e0; padding: 5px; margin-top: 5px; text-align: center; }
          .payment { background: #e8f5e9; padding: 5px; margin-top: 5px; text-align: center; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
          @media print { body { padding: 0; } @page { margin: 5mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RETURN / EXCHANGE</h1>
          <h2>${result.transactionNumber}</h2>
          <p>Date: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span class="label">Customer:</span>
            <span>${result.customerName}</span>
          </div>
          <div class="info-row">
            <span class="label">Status:</span>
            <span>${result.status}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        ${result.returnItems?.length > 0 ? `
        <div class="section-title">RETURNED ITEMS</div>
        <div class="items">
          ${result.returnItems.map((item: any) => `
            <div class="item return-item">
              <div class="item-name">${item.productName}</div>
              <div class="item-details">
                <span>${item.quantity} x ${item.unitPrice.toFixed(3)}</span>
                <span>-${item.lineTotal.toFixed(3)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${result.exchangeItems?.length > 0 ? `
        <div class="section-title">EXCHANGE ITEMS</div>
        <div class="items">
          ${result.exchangeItems.map((item: any) => `
            <div class="item exchange-item">
              <div class="item-name">${item.product.productName}</div>
              <div class="item-details">
                <span>${item.quantity} x ${item.unitPrice.toFixed(3)}</span>
                <span>+${(item.quantity * item.unitPrice - item.discount).toFixed(3)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <div class="totals">
          <div class="total-row" style="color: #c00;">
            <span>Return Total:</span>
            <span>-${result.returnTotal.toFixed(3)}</span>
          </div>
          <div class="total-row" style="color: #080;">
            <span>Exchange Total:</span>
            <span>+${result.exchangeTotal.toFixed(3)}</span>
          </div>
          <div class="total-row grand">
            <span>NET AMOUNT:</span>
            <span>${result.netAmount === 0 ? '0.000' : 
                    result.netAmount < 0 ? '-' + Math.abs(result.netAmount).toFixed(3) : 
                    '+' + result.netAmount.toFixed(3)}</span>
          </div>
        </div>
        
        ${result.refundDue > 0 ? `
        <div class="refund">
          <strong>REFUND DUE: ${result.refundDue.toFixed(3)}</strong>
        </div>
        ` : ''}
        
        ${result.paymentDue > 0 ? `
        <div class="payment">
          <strong>PAYMENT COLLECTED: ${result.paymentDue.toFixed(3)}</strong>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>${result.message}</p>
          <p>Thank you!</p>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
  }

  const loadQuote = async () => {
    if (!quoteNumber.trim()) return
    
    setLoadingQuote(true)
    try {
      const quote = await quotesApi.getByNumber(quoteNumber.trim())
      
      // Find and set customer
      const customer = customers.find(c => c.id === quote.customerId)
      if (customer) {
        setSelectedCustomer(customer)
      }
      
      // Load items into cart - create product objects from quote data
      const cartItems: CartItem[] = []
      for (const item of quote.items) {
        // First try to find in loaded products
        let product = products.find(p => p.productId === item.productId)
        
        // If not found, create a minimal product object from quote data
        if (!product) {
          product = {
            productId: item.productId,
            productName: item.productName,
            sku: item.productSku,
            barcode: null,
            boxBarcode: null,
            warehouseId: selectedWarehouse || 0,
            warehouseName: '',
            quantity: 999, // Allow any quantity from quote
            variantId: null,
            variantName: null,
            baseUnit: 'piece',
            secondUnit: null,
            unitsPerSecond: 1,
            retailPrice: item.unitPrice,
            wholesalePrice: item.unitPrice,
            boxRetailPrice: item.unitPrice,
            boxWholesalePrice: item.unitPrice,
            costPrice: 0,
            boxCostPrice: 0,
            imageUrl: null,
            lowStockAlert: 10,
            currency: 'USD'
          }
        }
        
        cartItems.push({
          product: product!,
          variantId: null,
          variantName: null,
          quantity: item.quantity,
          unitType: 'piece',
          unitPrice: item.unitPrice,
          discount: item.discountAmount || 0
        })
      }
      setCart(cartItems)
      setLoadedQuoteId(quote.id)
      setOrderNotes(`Quote: ${quote.quoteNumber}${quote.notes ? ` - ${quote.notes}` : ''}`)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load quote')
    } finally {
      setLoadingQuote(false)
    }
  }

  const getEffectivePrice = (product: Product, unitType: 'piece' | 'box'): { price: number; isSpecial: boolean } => {
    const customerPrice = customerPrices.find(cp => cp.productId === product.productId)
    const isWholesale = selectedCustomer?.customerType?.toLowerCase() === 'wholesale'
    
    if (unitType === 'box') {
      if (customerPrice?.hasBoxSpecialPrice && customerPrice.boxSpecialPrice != null) {
        return { price: customerPrice.boxSpecialPrice, isSpecial: true }
      }
      // Use wholesale or retail price based on customer type
      return { price: isWholesale ? product.boxWholesalePrice : product.boxRetailPrice, isSpecial: false }
    } else {
      if (customerPrice?.hasSpecialPrice && customerPrice.specialPrice != null) {
        return { price: customerPrice.specialPrice, isSpecial: true }
      }
      // Use wholesale or retail price based on customer type
      return { price: isWholesale ? product.wholesalePrice : product.retailPrice, isSpecial: false }
    }
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const barcode = barcodeInput.trim()
    if (!barcode) return
    
    // Find product by barcode (case-insensitive, trimmed)
    const product = products.find(p => 
      p.barcode?.trim().toLowerCase() === barcode.toLowerCase() || 
      p.boxBarcode?.trim().toLowerCase() === barcode.toLowerCase()
    )
    
    if (product) {
      const isBox = product.boxBarcode?.trim().toLowerCase() === barcode.toLowerCase()
      addToCart(product, isBox ? 'box' : 'piece')
    } else {
      // If not found by barcode, try searching by SKU
      const productBySku = products.find(p => p.sku.trim().toLowerCase() === barcode.toLowerCase())
      if (productBySku) {
        addToCart(productBySku, 'piece')
      }
    }
    setBarcodeInput('')
  }

  const addToCart = (product: Product, unitType: 'piece' | 'box' = 'piece', variantId: number | null = null, variantName: string | null = null) => {
    const { price } = getEffectivePrice(product, unitType)
    setCart(prev => {
      const existing = prev.find(item => item.product.productId === product.productId && item.unitType === unitType && item.variantId === variantId)
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId && item.unitType === unitType && item.variantId === variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, variantId, variantName, quantity: 1, unitType, unitPrice: price, discount: 0 }]
    })
  }

  const updateQuantity = (productId: number, unitType: string, variantId: number | null, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.productId === productId && item.unitType === unitType && item.variantId === variantId) {
          const newQty = Math.max(0, item.quantity + delta)
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  const setQuantity = (productId: number, unitType: string, variantId: number | null, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, unitType, variantId)
      return
    }
    setCart(prev =>
      prev.map(item => {
        if (item.product.productId === productId && item.unitType === unitType && item.variantId === variantId) {
          return { ...item, quantity }
        }
        return item
      })
    )
  }

  const removeFromCart = (productId: number, unitType: string, variantId: number | null) => {
    setCart(prev => prev.filter(item => !(item.product.productId === productId && item.unitType === unitType && item.variantId === variantId)))
  }

  const applyDiscount = () => {
    if (editingDiscount === null) return
    const discount = parseFloat(discountValue) || 0
    setCart(prev => prev.map((item, idx) => idx === editingDiscount ? { ...item, discount } : item))
    setEditingDiscount(null)
    setDiscountValue('')
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const cartDiscount = cart.reduce((sum, item) => sum + item.discount, 0)
  const cartTotal = cartSubtotal - cartDiscount

  // Multi-currency: group cart totals by currency
  const cartByCurrency = cart.reduce((acc, item) => {
    const cur = item.product.currency || 'USD'
    if (!acc[cur]) acc[cur] = { subtotal: 0, discount: 0, total: 0, items: 0 }
    const lineTotal = item.quantity * item.unitPrice - item.discount
    acc[cur].subtotal += item.quantity * item.unitPrice
    acc[cur].discount += item.discount
    acc[cur].total += lineTotal
    acc[cur].items += 1
    return acc
  }, {} as Record<string, { subtotal: number; discount: number; total: number; items: number }>)
  const hasMultiCurrency = Object.keys(cartByCurrency).length > 1
  const baseCurrency = currencies.find(c => c.isBase)
  const baseCurrencyCode = baseCurrency?.code || 'USD'
  const cartTotalInBase = Object.entries(cartByCurrency).reduce((sum, [cur, data]) => {
    const curData = currencies.find(c => c.code === cur)
    const rate = curData?.exchangeRate || 1
    return sum + (data.total / rate)
  }, 0)

  const [savingQuote, setSavingQuote] = useState(false)

  const handleSaveAsQuote = async () => {
    if (!selectedCustomer || cart.length === 0) return
    setSavingQuote(true)
    try {
      const payload = {
        customerId: selectedCustomer.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discountAmount: cartDiscount,
        taxAmount: 0,
        notes: orderNotes || 'Quote from Direct Sales',
        terms: '',
        items: cart.map(item => ({
          productId: item.product.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: 0
        }))
      }
      
      const res = await quotesApi.create(payload)
      alert(`Quote created successfully! Quote #: ${res.quoteNumber}`)
      
      // Reset cart
      setCart([])
      setSelectedCustomer(null)
      setOrderNotes('')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create quote')
    } finally {
      setSavingQuote(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !selectedWarehouse) return
    setSubmitting(true)
    try {
      const effectiveTotal = hasMultiCurrency ? cartTotalInBase : cartTotal

      // Calculate paid amount from multi-currency payment inputs if any selected
      const hasPaymentCurrencies = Object.values(paymentCurrencies).some(pc => pc.selected && parseFloat(pc.amount) > 0)
      let paidAmount: number
      let paymentCurrenciesData: any[] = []

      if (paymentType === 'credit') {
        paidAmount = 0
      } else if (hasPaymentCurrencies) {
        // Convert all payment currency amounts to base currency
        paidAmount = Object.entries(paymentCurrencies)
          .filter(([, pc]) => pc.selected && parseFloat(pc.amount) > 0)
          .reduce((sum, [cur, pc]) => {
            const curData = currencies.find(c => c.code === cur)
            const rate = curData?.exchangeRate || 1
            return sum + (parseFloat(pc.amount) / rate)
          }, 0)
        paymentCurrenciesData = Object.entries(paymentCurrencies)
          .filter(([, pc]) => pc.selected && parseFloat(pc.amount) > 0)
          .map(([cur, pc]) => ({ currency: cur, amount: parseFloat(pc.amount) }))
      } else if (paymentType === 'cash') {
        paidAmount = effectiveTotal
      } else {
        paidAmount = parseFloat(cashAmount) || 0
      }

      const res = await api.post('/direct-sales', {
        customerId: selectedCustomer?.id || null,
        warehouseId: selectedWarehouse,
        notes: orderNotes || 'Direct Sale',
        paymentType,
        paidAmount,
        discountAmount: cartDiscount,
        taxAmount: 0,
        paymentCurrenciesJson: paymentCurrenciesData.length > 0
          ? JSON.stringify(paymentCurrenciesData)
          : JSON.stringify(
              Object.entries(cartByCurrency).map(([cur, data]: [string, any]) => ({ currency: cur, amount: data.total }))
            ),
        exchangeRateSnapshotJson: JSON.stringify(
          currencies.reduce((acc: any, c) => { acc[c.code] = c.exchangeRate; return acc }, {})
        ),
        items: cart.map(item => ({
          productId: item.product.productId,
          variantId: item.variantId || null,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discount,
          currency: item.product.currency || 'USD'
        }))
      })
      
      // Mark quote as converted if loaded from quote
      if (loadedQuoteId && res.data?.orderId) {
        try {
          await quotesApi.convert(loadedQuoteId, res.data.orderId)
        } catch (e) {
          console.error('Failed to mark quote as converted:', e)
        }
      }
      
      // Build payment currencies for the receipt from what was actually sent
      const receiptPaymentCurrencies = paymentCurrenciesData.length > 0
        ? paymentCurrenciesData
        : Object.entries(cartByCurrency).map(([cur, data]: [string, any]) => ({ currency: cur, amount: data.total }))
      setLastOrder({
        ...res.data,
        totalAmount: effectiveTotal,
        paymentCurrencies: JSON.stringify(receiptPaymentCurrencies),
        items: cart.map(item => ({
          productName: item.product.productName + (item.variantName ? ` (${item.variantName})` : ''),
          quantity: item.quantity,
          unitType: item.unitType === 'box' ? item.product.secondUnit : item.product.baseUnit,
          unitPrice: item.unitPrice,
          currency: item.product.currency || 'USD',
          lineTotal: item.quantity * item.unitPrice - item.discount,
          discount: item.discount,
        }))
      })
      setShowReceipt(true)
      setCart([])
      setSelectedCustomer(null)
      setOrderNotes('')
      setCashAmount('')
      setPaymentType('cash')
      setPaymentCurrencies({})
      setQuoteNumber('')
      setLoadedQuoteId(null)
      loadInventory()
    } catch (error: any) {
      alert(error.response?.data || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  // Print invoice function matching Deep Report style
  const printSaleInvoice = () => {
    if (!lastOrder) return

    const pcs = lastOrder.paymentCurrencies
      ? (typeof lastOrder.paymentCurrencies === 'string' ? JSON.parse(lastOrder.paymentCurrencies) : lastOrder.paymentCurrencies)
      : null
    const multiCurrency = pcs && pcs.length > 1

    // Build items HTML - compact format for thermal
    let itemsHTML = ''
    ;(lastOrder.items || []).forEach((item: any) => {
      const disc = item.discount > 0 ? `<tr><td colspan="3" style="padding-left:10px;font-size:11pt">Disc: -${item.currency} ${item.discount.toFixed(3)}</td></tr>` : ''
      itemsHTML += `
        <tr>
          <td style="padding:4px 0;font-weight:600">${item.productName}</td>
          <td style="padding:4px 0;text-align:center;width:40px">${item.quantity}</td>
          <td style="padding:4px 0;text-align:right;width:70px">${item.lineTotal?.toFixed(3) || '0.000'}</td>
        </tr>
        ${item.unitType ? `<tr><td colspan="3" style="padding-left:10px;font-size:11pt">${item.unitType} @ ${item.unitPrice?.toFixed(3)}</td></tr>` : ''}
        ${disc}`
    })

    // Payment rows
    let paymentHTML = ''
    if (multiCurrency) {
      pcs.forEach((pc: any) => {
        paymentHTML += `<tr><td>Paid (${pc.currency}):</td><td colspan="2" style="text-align:right">${pc.currency} ${Number(pc.amount).toFixed(3)}</td></tr>`
      })
    } else {
      paymentHTML = `<tr><td>Paid:</td><td colspan="2" style="text-align:right">${lastOrder.paidAmount?.toFixed(3) || '0.000'}</td></tr>`
    }

    const changeHTML = lastOrder.changeAmount > 0
      ? `<tr><td>Change:</td><td colspan="2" style="text-align:right">${lastOrder.changeAmount.toFixed(3)}</td></tr>`
      : ''

    const secondaryHTML = companySettings.showSecondaryPrice
      ? `<tr style="color:#333"><td>Total (2nd):</td><td colspan="2" style="text-align:right">${(lastOrder.totalAmount * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td></tr>`
      : ''

    const dateStr = new Date().toLocaleDateString()
    const timeStr = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})

    const invoiceHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @page { size: 80mm auto; margin: 2mm; }
  @media print {
    html, body { width: 80mm; }
    body { -webkit-print-color-adjust: exact; }
  }
  html, body { width:80mm; margin:0; padding:0; }
  body { 
    font-family: 'Arial Black', 'Arial Bold', 'Helvetica Bold', sans-serif; 
    font-size: 11pt; 
    line-height: 1.4; 
    color: #000; 
    background: #fff; 
    padding: 3mm;
    font-weight: 900;
    -webkit-font-smoothing: none;
    text-rendering: geometricPrecision;
  }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; font-weight: 700; }
  .divider { border: none; border-top: 2px dashed #000; margin: 6px 0; }
  .double { border-top: 3px solid #000; margin: 8px 0; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 20pt; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
  .header p { font-size: 11pt; margin: 3px 0; font-weight: 700; }
  .info-row td { font-size: 11pt; padding: 3px 0; font-weight: 700; }
  .items-table td { padding: 5px 0; font-size: 11pt; border-bottom: 1px solid #000; font-weight: 700; }
  .items-table th { padding: 5px 0; font-size: 11pt; font-weight: 900; border-bottom: 2px solid #000; text-align: left; }
  .totals td { padding: 4px 0; font-size: 12pt; font-weight: 700; }
  .grand-total td { padding: 8px 0; font-size: 18pt; font-weight: 900; }
  .footer { text-align: center; padding: 10px 0; font-size: 12pt; font-weight: 700; }
</style>
</head><body>

<div class="header">
  <h1>${companySettings.name || 'RECEIPT'}</h1>
  ${companySettings.phone ? `<p>Tel: ${companySettings.phone}</p>` : ''}
  ${companySettings.address ? `<p>${companySettings.address}</p>` : ''}
</div>

<hr class="divider"/>

<table>
  <tr class="info-row"><td style="width:40%">Order #:</td><td style="font-weight:700">${lastOrder.orderNumber}</td></tr>
  <tr class="info-row"><td>Date:</td><td>${dateStr} ${timeStr}</td></tr>
  <tr class="info-row"><td>Payment:</td><td>${lastOrder.paymentType ? lastOrder.paymentType.charAt(0).toUpperCase() + lastOrder.paymentType.slice(1) : 'Cash'}</td></tr>
  ${lastOrder.customerName ? `<tr class="info-row"><td>Customer:</td><td>${lastOrder.customerName}</td></tr>` : ''}
</table>

<hr class="divider"/>

<table class="items-table">
  <tr><th style="width:auto">Item</th><th style="width:40px;text-align:center">Qty</th><th style="width:70px;text-align:right">Total</th></tr>
  ${itemsHTML || '<tr><td colspan="3" style="text-align:center;padding:10px">No items</td></tr>'}
</table>

<hr class="divider"/>

<table class="totals">
  <tr><td>Subtotal:</td><td colspan="2" style="text-align:right">${lastOrder.totalAmount?.toFixed(3) || '0.000'}</td></tr>
  ${paymentHTML}
  ${changeHTML}
</table>

<hr class="double"/>

<table class="grand-total">
  <tr><td>TOTAL:</td><td style="text-align:right">${lastOrder.totalAmount?.toFixed(3) || '0.000'}</td></tr>
  ${secondaryHTML}
</table>

<hr class="double"/>

<div class="footer">
  <div style="font-weight:700">Thank you!</div>
  <div style="font-size:10pt;margin-top:4px">${new Date().toLocaleString()}</div>
</div>

</body></html>`

    // Print using hidden iframe (more reliable for thermal printers)
    const existingFrame = document.getElementById('receipt-print-frame') as HTMLIFrameElement
    if (existingFrame) existingFrame.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'receipt-print-frame'
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      alert('Could not create print frame')
      return
    }

    doc.open()
    doc.write(invoiceHTML)
    doc.close()

    let printed = false
    const doPrint = () => {
      if (printed) return
      printed = true
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1000)
    }

    iframe.onload = () => setTimeout(doPrint, 100)
    setTimeout(doPrint, 500)
  }

  const filteredProducts = displayProducts.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.variantName?.toLowerCase().includes(search.toLowerCase())
    
    if (showLowStockOnly) {
      const isLowStock = p.quantity <= (p.lowStockAlert || 10)
      return matchesSearch && isLowStock
    }
    
    return matchesSearch
  })

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col border-r">
        {/* Header with Mode Toggle */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Direct Sales</h1>
          
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setSalesMode('sale'); resetReturnMode() }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                salesMode === 'sale' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart size={16} className="inline mr-1.5" />
              Sale
            </button>
            <button
              onClick={() => setSalesMode('return')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                salesMode === 'return' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RotateCcw size={16} className="inline mr-1.5" />
              Return / Exchange
            </button>
          </div>

          <select
            value={selectedWarehouse || ''}
            onChange={(e) => setSelectedWarehouse(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        {/* Invoice Loading for Return Mode */}
        {salesMode === 'return' && (
          <div className="bg-orange-50 border-b px-4 py-2 flex items-center gap-3">
            <Receipt size={18} className="text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Load Invoice:</span>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoice()}
              placeholder="Enter invoice number (e.g., DS-20241220-0001)"
              className="flex-1 max-w-xs px-3 py-1.5 border rounded-lg text-sm"
            />
            <button
              onClick={loadInvoice}
              disabled={loadingInvoice || !invoiceNumber.trim()}
              className="px-4 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loadingInvoice ? 'Loading...' : 'Load'}
            </button>
            {loadedOrder && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  Invoice loaded: {loadedOrder.orderNumber}
                </span>
                <button
                  onClick={resetReturnMode}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Original Invoice Summary (Return Mode) */}
        {salesMode === 'return' && loadedOrder && (
          <div className="bg-gray-50 border-b px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{loadedOrder.orderNumber}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(loadedOrder.orderDate).toLocaleDateString()}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {loadedOrder.paymentStatus}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Customer: <span className="font-medium">{loadedOrder.customerName}</span>
                  {loadedOrder.cashierName && <span className="ml-3">Cashier: {loadedOrder.cashierName}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{loadedOrder.totalAmount.toFixed(3)}</div>
                <div className="text-xs text-gray-500">
                  Paid: {loadedOrder.paidAmount.toFixed(3)}
                  {loadedOrder.discountAmount > 0 && ` | Discount: ${loadedOrder.discountAmount.toFixed(3)}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quote Reference (Sale Mode) */}
        {salesMode === 'sale' && (
          <div className="bg-blue-50 border-b px-4 py-2 flex items-center gap-3">
            <FileText size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Load Quote:</span>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadQuote()}
              placeholder="Enter quote number (e.g., QT-20241219-0001)"
              className="flex-1 max-w-xs px-3 py-1.5 border rounded-lg text-sm"
            />
            <button
              onClick={loadQuote}
              disabled={loadingQuote || !quoteNumber.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingQuote ? 'Loading...' : 'Load'}
            </button>
            {loadedQuoteId && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                Quote loaded
              </span>
            )}
          </div>
        )}

        {/* Tab Navigation for Return Mode */}
        {salesMode === 'return' && loadedOrder && (
          <div className="bg-white border-b px-4 py-2 flex gap-2">
            <button
              onClick={() => setProductTab('invoice')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                productTab === 'invoice'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Undo2 size={16} className="inline mr-1.5" />
              Invoice Items ({loadedOrder.items.length})
            </button>
            <button
              onClick={() => setProductTab('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                productTab === 'catalog'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Package size={16} className="inline mr-1.5" />
              All Products
            </button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white border-b px-4 py-3 flex gap-4">
          <form onSubmit={handleBarcodeSubmit} className="w-48">
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
          </form>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              showLowStockOnly
                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle size={16} />
            Low Stock
          </button>
        </div>

        {/* Products Grid - POS Style */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {/* Invoice Items Tab (Return Mode) */}
          {salesMode === 'return' && loadedOrder && productTab === 'invoice' && (
            <div className="space-y-2">
              {loadedOrder.items.map(item => {
                const inReturnBasket = returnBasket.find(ri => ri.originalOrderItemId === item.id)
                const effectivePrice = item.unitPrice - (item.discountAmount / item.quantity)
                return (
                  <div 
                    key={item.id}
                    className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-colors ${
                      inReturnBasket ? 'border-orange-300 bg-orange-50' : 'border-transparent hover:border-gray-200'
                    }`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('invoiceItem', JSON.stringify(item))
                      setDragOverZone(null)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-gray-400 cursor-grab" />
                        <div>
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">{item.productSku} · {item.unitType}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{effectivePrice.toFixed(3)} × {item.quantity}</div>
                        <div className="text-sm text-gray-500">Total: {item.lineTotal.toFixed(3)}</div>
                      </div>
                    </div>
                    
                    {/* Return Status */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Sold: <span className="font-medium">{item.quantity}</span></span>
                        {item.alreadyReturnedQty > 0 && (
                          <span className="text-orange-600">Returned: <span className="font-medium">{item.alreadyReturnedQty}</span></span>
                        )}
                        <span className={`${item.returnableQty > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Returnable: <span className="font-medium">{item.returnableQty}</span>
                        </span>
                      </div>
                      
                      {/* Quick Actions */}
                      {item.returnableQty > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addToReturnBasket(item, 1)}
                            className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                          >
                            + Return 1
                          </button>
                          {item.returnableQty > 1 && (
                            <button
                              onClick={() => addToReturnBasket(item, item.returnableQty)}
                              className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                            >
                              Return All ({item.returnableQty})
                            </button>
                          )}
                        </div>
                      )}
                      {item.returnableQty === 0 && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Fully Returned</span>
                      )}
                    </div>
                    
                    {inReturnBasket && (
                      <div className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                        <Check size={14} />
                        {inReturnBasket.quantity} in return basket
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Product Catalog (Sale Mode or Exchange Tab in Return Mode) */}
          {(salesMode === 'sale' || (salesMode === 'return' && productTab === 'catalog')) && (
            <>
              {!selectedWarehouse ? (
                <div className="text-center py-12 text-gray-500">
                  <Warehouse size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Please select a warehouse</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map(product => {
                    // Show base unit price (first unit) on the card
                    const baseUnitPrice = getEffectivePrice(product, 'piece')
                    const secondUnitPrice = product.secondUnit ? getEffectivePrice(product, 'box') : null
                    return (
                      <div 
                        key={`${product.productId}-${product.variantId ?? 'main'}-${product.warehouseId}`} 
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                        draggable={salesMode === 'return'}
                        onDragStart={(e) => {
                          if (salesMode === 'return') {
                            e.dataTransfer.setData('catalogProduct', JSON.stringify(product))
                          }
                        }}
                      >
                        {/* Product Image */}
                        <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={40} className="text-gray-300" />
                          )}
                          {/* Stock Badge */}
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.quantity < 10 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          }`}>
                            {product.quantity}
                          </span>
                          {baseUnitPrice.isSpecial && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                              Special
                            </span>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="p-3 flex-1 flex flex-col">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                            {product.productName}
                          </h3>
                          {product.sku && <p className="text-xs text-gray-500 mb-1">{product.sku}</p>}
                          {/* Product Attributes */}
                          <div className="flex flex-wrap gap-1 mb-1">
                            {product.color && (
                              <span className="px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded text-[10px]">{product.color}</span>
                            )}
                            {product.size && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{product.size}</span>
                            )}
                            {product.weight && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{product.weight}kg</span>
                            )}
                            {(product.length || product.height) && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                                {product.length && `${product.length}cm`}{product.length && product.height && ' × '}{product.height && `${product.height}cm`}
                              </span>
                            )}
                          </div>
                          
                          {/* Price */}
                          <div className="mt-auto">
                            <p className={`text-lg font-bold ${baseUnitPrice.isSpecial ? 'text-green-600' : 'text-blue-600'}`}>
                              {product.currency} {baseUnitPrice.price.toFixed(3)}
                            </p>
                            {companySettings.showSecondaryPrice && (
                              <p className="text-xs text-orange-500 font-medium">
                                {(baseUnitPrice.price * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">per {product.baseUnit}</p>
                            {secondUnitPrice && (
                              <p className={`text-xs mt-1 ${secondUnitPrice.isSpecial ? 'text-green-600' : 'text-purple-600'}`}>
                                {product.currency} {secondUnitPrice.price.toFixed(3)} / {product.secondUnit}
                                {companySettings.showSecondaryPrice && (
                                  <span className="text-orange-500 ml-1">
                                    ({(secondUnitPrice.price * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        
                        {/* Add Buttons */}
                        <div className="p-2 bg-gray-50 border-t flex gap-1">
                          {salesMode === 'sale' ? (
                            <>
                              <button
                                onClick={() => addToCart(product, 'piece', product.variantId, product.variantName)}
                                disabled={product.quantity === 0}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                + {product.baseUnit}
                              </button>
                              {product.secondUnit && (
                                <button
                                  onClick={() => addToCart(product, 'box', product.variantId, product.variantName)}
                                  disabled={product.quantity === 0}
                                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title={`1 ${product.baseUnit} = ${product.unitsPerSecond} ${product.secondUnit}s`}
                                >
                                  + {product.secondUnit}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => addToExchangeBasket(product, 'piece')}
                                disabled={product.quantity === 0}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                + Add {product.baseUnit}
                              </button>
                              {product.secondUnit && (
                                <button
                                  onClick={() => addToExchangeBasket(product, 'box')}
                                  disabled={product.quantity === 0}
                                  className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  + Add {product.secondUnit}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Empty State for Return Mode without Invoice */}
          {salesMode === 'return' && !loadedOrder && (
            <div className="text-center py-12 text-gray-500">
              <Receipt size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Load an Invoice to Begin</p>
              <p className="text-sm mt-2">Enter an invoice number above to start the return/exchange process</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="w-96 flex flex-col bg-white">
        {/* Customer Selection */}
        <div className="p-4 border-b">
          <button
            onClick={() => setShowCustomerPicker(true)}
            disabled={salesMode === 'return' && loadedOrder !== null}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg border ${
              selectedCustomer ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 hover:bg-gray-100'
            } ${salesMode === 'return' && loadedOrder ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            <User size={18} />
            <span className="flex-1 text-left">
              {selectedCustomer ? (
                <div>
                  <div className="font-medium">{selectedCustomer.name}</div>
                  {selectedCustomer.debtBalance > 0 && (
                    <div className="text-xs text-red-600">Owes: ${selectedCustomer.debtBalance.toFixed(3)}</div>
                  )}
                </div>
              ) : (
                'Select Customer'
              )}
            </span>
          </button>
        </div>

        {/* SALE MODE - Regular Cart */}
        {salesMode === 'sale' && (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Cart is empty</p>
                  <p className="text-sm mt-1">Add products from the left</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={`${item.product.productId}-${item.unitType}-${item.variantId || 0}`} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.product.productName}
                            {item.variantName && (
                              <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">{item.variantName}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.unitType === 'box' ? item.product.secondUnit : item.product.baseUnit} × {item.product.currency} {item.unitPrice.toFixed(3)}
                            {companySettings.showSecondaryPrice && (
                              <span className="text-orange-500 ml-1">({(item.unitPrice * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')})</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.productId, item.unitType, item.variantId)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.productId, item.unitType, item.variantId, -1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.product.productId, item.unitType, item.variantId, parseInt(e.target.value) || 0)}
                            className="w-12 text-center font-medium border rounded px-1 py-0.5"
                          />
                          <button
                            onClick={() => updateQuantity(item.product.productId, item.unitType, item.variantId, 1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">{item.product.currency} {(item.quantity * item.unitPrice - item.discount).toFixed(3)}</div>
                          {companySettings.showSecondaryPrice && (
                            <div className="text-xs text-orange-500">{((item.quantity * item.unitPrice - item.discount) * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                          )}
                          {item.discount > 0 && (
                            <div className="text-xs text-green-600">-{item.product.currency} {item.discount.toFixed(3)}</div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => { setEditingDiscount(idx); setDiscountValue(item.discount.toString()) }}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        {item.discount > 0 ? 'Edit discount' : 'Add discount'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* RETURN/EXCHANGE MODE - Split Baskets */}
        {salesMode === 'return' && (
          <div className="flex-1 overflow-auto">
            {/* Return Basket */}
            <div 
              className={`border-b ${dragOverZone === 'return' ? 'bg-orange-50' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverZone('return') }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverZone(null)
                const invoiceItemData = e.dataTransfer.getData('invoiceItem')
                if (invoiceItemData) {
                  const item = JSON.parse(invoiceItemData) as OrderItemDetail
                  if (item.returnableQty > 0) addToReturnBasket(item, 1)
                }
              }}
            >
              <div className="px-4 py-2 bg-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Undo2 size={16} className="text-orange-600" />
                  <span className="font-medium text-orange-800">Return Basket</span>
                </div>
                <span className="text-sm text-orange-600">{returnTotal.toFixed(3)}</span>
              </div>
              
              <div className="p-3 space-y-2 min-h-[100px]">
                {returnBasket.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    <p>Drop items here to return</p>
                  </div>
                ) : (
                  returnBasket.map(item => (
                    <div key={item.originalOrderItemId} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.productSku}</div>
                        </div>
                        <button
                          onClick={() => removeFromReturnBasket(item.originalOrderItemId)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateReturnQuantity(item.originalOrderItemId, item.quantity - 1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateReturnQuantity(item.originalOrderItemId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxReturnableQty}
                            className="p-1 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="text-xs text-gray-500">/ {item.maxReturnableQty}</span>
                        </div>
                        <div className="font-medium text-orange-700">{item.lineTotal.toFixed(3)}</div>
                      </div>

                      {/* Return Reason & Condition */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <select
                          value={item.reason}
                          onChange={(e) => updateReturnItemProps(item.originalOrderItemId, { reason: e.target.value })}
                          className="px-2 py-1 border rounded bg-white"
                        >
                          {RETURN_REASONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <select
                          value={item.condition}
                          onChange={(e) => updateReturnItemProps(item.originalOrderItemId, { condition: e.target.value })}
                          className="px-2 py-1 border rounded bg-white"
                        >
                          {ITEM_CONDITIONS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={item.inventoryAction}
                        onChange={(e) => updateReturnItemProps(item.originalOrderItemId, { inventoryAction: e.target.value })}
                        className="w-full mt-2 px-2 py-1 border rounded bg-white text-xs"
                      >
                        {INVENTORY_ACTIONS.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exchange/Add Basket */}
            <div 
              className={`${dragOverZone === 'exchange' ? 'bg-green-50' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverZone('exchange') }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverZone(null)
                const productData = e.dataTransfer.getData('catalogProduct')
                if (productData) {
                  const product = JSON.parse(productData) as Product
                  addToExchangeBasket(product, 'piece')
                }
              }}
            >
              <div className="px-4 py-2 bg-green-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-green-600" />
                  <span className="font-medium text-green-800">Exchange / Add Basket</span>
                </div>
                <span className="text-sm text-green-600">${exchangeTotal.toFixed(3)}</span>
              </div>
              
              <div className="p-3 space-y-2 min-h-[100px]">
                {exchangeBasket.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    <p>Drop products here to add/exchange</p>
                  </div>
                ) : (
                  exchangeBasket.map(item => (
                    <div key={`${item.product.productId}-${item.unitType}`} className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product.productName}</div>
                          <div className="text-xs text-gray-500">
                            {item.unitType === 'box' ? item.product.secondUnit : item.product.baseUnit} × {item.product.currency} {item.unitPrice.toFixed(3)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromExchangeBasket(item.product.productId, item.unitType)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateExchangeQuantity(item.product.productId, item.unitType, -1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateExchangeQuantity(item.product.productId, item.unitType, 1)}
                            className="p-1 rounded bg-white border hover:bg-gray-100"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="font-medium text-green-700">{item.product.currency} {(item.quantity * item.unitPrice - item.discount).toFixed(3)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Totals & Payment - SALE MODE */}
        {salesMode === 'sale' && (
          <div className="border-t p-4 space-y-3">
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Order notes..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            <div className="space-y-1">
              {hasMultiCurrency ? (
                <>
                  {Object.entries(cartByCurrency).map(([cur, data]: [string, any]) => (
                    <div key={cur} className="flex justify-between text-sm">
                      <span>{cur} Total ({data.items} items)</span>
                      <span className="font-medium">{cur} {data.total.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total ({baseCurrencyCode})</span>
                      <span>{baseCurrencyCode} {cartTotalInBase.toFixed(3)}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      {Object.keys(cartByCurrency).filter(c => c !== baseCurrencyCode).map(cur => {
                        const curData = currencies.find(c => c.code === cur)
                        return `1 ${baseCurrencyCode} = ${curData?.exchangeRate || 1} ${cur}`
                      }).join(' | ')}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{Object.keys(cartByCurrency)[0] || ''} {cartSubtotal.toFixed(3)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{Object.keys(cartByCurrency)[0] || ''} {cartDiscount.toFixed(3)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{Object.keys(cartByCurrency)[0] || ''} {cartTotal.toFixed(3)}</span>
                  </div>
                </>
              )}
              {companySettings.showSecondaryPrice && (
                <div className="flex justify-between text-sm text-orange-500 font-medium">
                  <span>2nd Price</span>
                  <span>{(cartTotal * companySettings.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPaymentType('cash')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                  paymentType === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100'
                }`}
              >
                <DollarSign size={16} />
                Cash
              </button>
              <button
                onClick={() => setPaymentType('credit')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                  paymentType === 'credit' ? 'bg-orange-600 text-white' : 'bg-gray-100'
                }`}
              >
                <CreditCard size={16} />
                Credit
              </button>
              <button
                onClick={() => setPaymentType('split')}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  paymentType === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Split
              </button>
            </div>

            {paymentType === 'split' && !hasMultiCurrency && (
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Cash amount..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            )}

            {/* Multi-currency payment inputs */}
            {paymentType !== 'credit' && cart.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">Pay using</p>
                {(() => {
                  const cartCurs = Object.keys(cartByCurrency)
                  const allCurs = [...new Set([...cartCurs, ...currencies.filter(c => c.isActive).map(c => c.code)])]
                  const requiredInBase = hasMultiCurrency ? cartTotalInBase : cartTotal

                  const toggleCurrency = (cur: string, checked: boolean) => {
                    setPaymentCurrencies(prev => {
                      const next = { ...prev, [cur]: { selected: checked, amount: '' } }
                      if (!checked) return next

                      // Recalculate suggested amounts for all selected currencies
                      const selectedCurs = Object.entries(next).filter(([, v]) => v.selected).map(([k]) => k)

                      if (selectedCurs.length === 1) {
                        // Only one currency selected: suggest full total converted to that currency
                        const onlyCur = selectedCurs[0]
                        const curData = currencies.find(c => c.code === onlyCur)
                        const rate = curData?.exchangeRate || 1
                        next[onlyCur] = { selected: true, amount: (requiredInBase * rate).toFixed(3) }
                      } else {
                        // Multiple selected: suggest each currency's cart portion, remainder on the newly toggled one
                        let coveredInBase = 0
                        selectedCurs.forEach(c => {
                          if (c !== cur && cartByCurrency[c]) {
                            const curData = currencies.find(cc => cc.code === c)
                            const rate = curData?.exchangeRate || 1
                            next[c] = { selected: true, amount: cartByCurrency[c].total.toFixed(3) }
                            coveredInBase += cartByCurrency[c].total / rate
                          }
                        })
                        // The newly toggled currency gets the remainder
                        const remainderInBase = Math.max(0, requiredInBase - coveredInBase)
                        const curData = currencies.find(c => c.code === cur)
                        const rate = curData?.exchangeRate || 1
                        next[cur] = { selected: true, amount: (remainderInBase * rate).toFixed(3) }
                      }
                      return next
                    })
                  }

                  return allCurs.map(cur => {
                    const pc = paymentCurrencies[cur]
                    const isSelected = pc?.selected || false
                    const cartHas = cartCurs.includes(cur)
                    return (
                      <div key={cur}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleCurrency(cur, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className={`text-sm font-medium ${cartHas ? 'text-gray-900' : 'text-gray-500'}`}>
                            {cur}
                            {cartHas && <span className="text-xs text-gray-400 ml-1">(in cart: {cur} {cartByCurrency[cur].total.toFixed(3)})</span>}
                          </span>
                        </label>
                        {isSelected && (
                          <div className="ml-6 mt-1">
                            <input
                              type="number"
                              step="0.001"
                              value={pc?.amount || ''}
                              onChange={(e) => setPaymentCurrencies(prev => ({
                                ...prev,
                                [cur]: { ...prev[cur], amount: e.target.value }
                              }))}
                              placeholder={`Amount in ${cur}...`}
                              className="w-full px-3 py-1.5 border rounded-lg text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
                {/* Show payment summary */}
                {Object.values(paymentCurrencies).some(pc => pc.selected) && (() => {
                  const selectedEntries = Object.entries(paymentCurrencies).filter(([, pc]) => pc.selected && parseFloat(pc.amount) > 0)
                  const payingInBase = selectedEntries.reduce((sum, [cur, pc]) => {
                    const curData = currencies.find(c => c.code === cur)
                    const rate = curData?.exchangeRate || 1
                    return sum + (parseFloat(pc.amount) / rate)
                  }, 0)
                  const requiredInBase = hasMultiCurrency ? cartTotalInBase : cartTotal
                  const diff = payingInBase - requiredInBase
                  return (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-500">Payment Summary</p>
                      {selectedEntries.map(([cur, pc]) => (
                        <div key={cur} className="flex justify-between text-sm">
                          <span className="text-gray-700">{cur}</span>
                          <span className="font-medium">{cur} {parseFloat(pc.amount).toFixed(3)}</span>
                        </div>
                      ))}
                      {selectedEntries.length > 1 && (
                        <div className="flex justify-between text-xs text-gray-500 border-t pt-1">
                          <span>= {baseCurrencyCode} equivalent</span>
                          <span className="font-semibold">{baseCurrencyCode} {payingInBase.toFixed(3)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Required ({baseCurrencyCode})</span>
                        <span className="font-semibold">{baseCurrencyCode} {requiredInBase.toFixed(3)}</span>
                      </div>
                      {Math.abs(diff) > 0.01 && (
                        <div className={`flex justify-between text-xs font-semibold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{diff > 0 ? 'Change:' : 'Short:'}</span>
                          <span>{baseCurrencyCode} {Math.abs(diff).toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {!selectedCustomer && cart.length > 0 && (
              <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg text-sm">
                <AlertCircle size={16} />
                <span>No customer selected — will use walk-in (----)</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveAsQuote}
                disabled={!selectedCustomer || cart.length === 0 || savingQuote}
                className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingQuote ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Save as Quote
                  </>
                )}
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || !selectedWarehouse || submitting}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Totals & Settlement - RETURN/EXCHANGE MODE */}
        {salesMode === 'return' && (
          <div className="border-t p-4 space-y-3">
            <input
              type="text"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Return notes / reason..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            {/* Net Result Display */}
            <div className={`p-4 rounded-lg ${
              netAmount === 0 ? 'bg-blue-50 border border-blue-200' :
              netAmount < 0 ? 'bg-orange-50 border border-orange-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Net Result</div>
                <div className={`text-2xl font-bold ${
                  netAmount === 0 ? 'text-blue-600' :
                  netAmount < 0 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {netAmount === 0 ? 'Even Exchange' :
                   netAmount < 0 ? `Refund Due: $${Math.abs(netAmount).toFixed(3)}` :
                   `Customer Pays: $${netAmount.toFixed(3)}`}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-gray-500">Return Total</div>
                  <div className="font-medium text-orange-600">-${returnTotal.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Exchange Total</div>
                  <div className="font-medium text-green-600">+${exchangeTotal.toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* Refund Method (when refund is due) */}
            {netAmount < 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Refund Method</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefundMethod('cash')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                      refundMethod === 'cash' ? 'bg-orange-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    <DollarSign size={16} />
                    Cash
                  </button>
                  <button
                    onClick={() => setRefundMethod('store_credit')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                      refundMethod === 'store_credit' ? 'bg-purple-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    <CreditCard size={16} />
                    Store Credit
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method (when customer pays extra) */}
            {netAmount > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Payment Method</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentType('cash')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                      paymentType === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    <DollarSign size={16} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentType('credit')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-sm ${
                      paymentType === 'credit' ? 'bg-orange-600 text-white' : 'bg-gray-100'
                    }`}
                  >
                    <CreditCard size={16} />
                    Credit
                  </button>
                </div>
              </div>
            )}

            {/* Warnings */}
            {!loadedOrder && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg text-sm">
                <AlertCircle size={16} />
                <span>Load an invoice first</span>
              </div>
            )}

            {loadedOrder && returnBasket.length === 0 && exchangeBasket.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg text-sm">
                <AlertCircle size={16} />
                <span>Add items to return or exchange</span>
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={handleProcessReturnExchange}
              disabled={!loadedOrder || !selectedWarehouse || (returnBasket.length === 0 && exchangeBasket.length === 0) || processingReturn}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingReturn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Complete Return / Exchange
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Select Customer</h2>
              <button onClick={() => setShowCustomerPicker(false)}><X size={24} /></button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full px-4 py-2 border rounded-lg"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-auto">
              {filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => { setSelectedCustomer(customer); setShowCustomerPicker(false); setCustomerSearch('') }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    {customer.shopName && <div className="text-sm text-gray-500">{customer.shopName}</div>}
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{customer.customerType}</div>
                    {customer.debtBalance > 0 && (
                      <div className="text-sm text-red-600">Owes: ${customer.debtBalance.toFixed(3)}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {editingDiscount !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Set Discount</h3>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Discount amount..."
              className="w-full px-4 py-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setEditingDiscount(null); setDiscountValue('') }} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={applyDiscount} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Sale Complete!</h3>
            <p className="text-gray-600 mb-4">Order #{lastOrder.orderNumber}</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left space-y-2">
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium">{lastOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total ({baseCurrencyCode})</span>
                <span className="font-medium">{baseCurrencyCode} {lastOrder.totalAmount.toFixed(3)}</span>
              </div>
              {lastOrder.paymentCurrencies && (() => {
                const pcs = typeof lastOrder.paymentCurrencies === 'string' ? JSON.parse(lastOrder.paymentCurrencies) : lastOrder.paymentCurrencies
                return pcs && pcs.length > 0 ? (
                  <div className="bg-blue-50 rounded p-2 space-y-1">
                    <p className="text-xs font-semibold text-blue-700">Paid With</p>
                    {pcs.map((pc: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{pc.currency}</span>
                        <span className="font-medium">{pc.currency} {Number(pc.amount).toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}
              {!(lastOrder.paymentCurrencies) && (
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span className="font-medium">{lastOrder.paidAmount.toFixed(3)}</span>
                </div>
              )}
              {lastOrder.changeAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Change</span>
                  <span className="font-medium">{lastOrder.changeAmount.toFixed(3)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReceipt(false)} className="flex-1 py-2 border rounded-lg">Close</button>
              <button onClick={printSaleInvoice} className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">
                <Printer size={18} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return/Exchange Result Modal */}
      {showReturnResult && lastReturnResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              lastReturnResult.netAmount === 0 ? 'bg-blue-100' :
              lastReturnResult.netAmount < 0 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Check size={32} className={
                lastReturnResult.netAmount === 0 ? 'text-blue-600' :
                lastReturnResult.netAmount < 0 ? 'text-orange-600' : 'text-green-600'
              } />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {lastReturnResult.netAmount === 0 ? 'Even Exchange Complete!' :
               lastReturnResult.netAmount < 0 ? 'Return Processed!' : 'Exchange Complete!'}
            </h3>
            <p className="text-gray-600 mb-4">Transaction #{lastReturnResult.transactionNumber}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left space-y-2">
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium">{lastReturnResult.customerName}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Return Total</span>
                <span className="font-medium">-${lastReturnResult.returnTotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Exchange Total</span>
                <span className="font-medium">+${lastReturnResult.exchangeTotal.toFixed(3)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Net Amount</span>
                <span className={
                  lastReturnResult.netAmount === 0 ? 'text-blue-600' :
                  lastReturnResult.netAmount < 0 ? 'text-orange-600' : 'text-green-600'
                }>
                  {lastReturnResult.netAmount === 0 ? '$0.00' :
                   lastReturnResult.netAmount < 0 ? `-$${Math.abs(lastReturnResult.netAmount).toFixed(3)}` :
                   `+$${lastReturnResult.netAmount.toFixed(3)}`}
                </span>
              </div>
              {lastReturnResult.refundDue > 0 && (
                <div className="bg-orange-50 p-2 rounded text-orange-700 text-sm">
                  Refund Due: ${lastReturnResult.refundDue.toFixed(3)}
                </div>
              )}
              {lastReturnResult.paymentDue > 0 && (
                <div className="bg-green-50 p-2 rounded text-green-700 text-sm">
                  Payment Collected: ${lastReturnResult.paymentDue.toFixed(3)}
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">{lastReturnResult.message}</p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowReturnResult(false)} 
                className="flex-1 py-2 border rounded-lg"
              >
                Close
              </button>
              <button 
                onClick={() => printReturnExchangeInvoice(lastReturnResult)} 
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
