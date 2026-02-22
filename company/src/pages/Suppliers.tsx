import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Eye, X, Loader2, Truck, Trash2, Send, FileText, DollarSign, Printer, Check, Search, Barcode, Download, FileSpreadsheet, Factory } from 'lucide-react'
import { suppliersApi, productsApi, warehousesApi, categoriesApi, unitsApi, currenciesApi, rawMaterialPurchasesApi } from '../lib/api'

interface Supplier {
  id: number; name: string; companyName: string | null; phone: string | null
  email: string | null; city: string | null; country: string | null
  paymentTerms: string | null; creditLimit: number; balance: number
  creditBalance: number; notes: string | null; isActive: boolean; isManufacturer: boolean
}

interface Invoice {
  id: number; invoiceNumber: string; invoiceDate: string; dueDate: string | null
  supplierId: number; supplierName: string | null; total: number
  paidAmount: number; paymentStatus: string; reference: string | null
}

interface Payment {
  id: number; paymentNumber: string; paymentDate: string; supplierId: number
  supplierName: string | null; method: string; amount: number
  reference: string | null; notes: string | null
}

interface Product {
  id: number; name: string; sku: string; barcode: string | null; boxBarcode: string | null
  categoryId: number | null; baseUnit: string; secondUnit: string | null; unitsPerSecond: number
  currency: string; defaultWarehouseId: number | null
  retailPrice: number; wholesalePrice: number; superWholesalePrice: number; costPrice: number
  boxRetailPrice: number; boxWholesalePrice: number; boxSuperWholesalePrice: number; boxCostPrice: number
  lowStockAlert: number; lowStockAlertBox: number; isActive: boolean
}

interface Category {
  id: number; name: string
}

interface Warehouse {
  id: number; name: string
}

interface Unit {
  id: number; name: string; symbol: string | null; isActive: boolean; isBase: boolean
}

interface Currency {
  id: number; code: string; name: string; symbol: string; exchangeRate: number; isBase: boolean; isActive: boolean
}

interface InvoiceItem {
  productId: number; warehouseId: number | null; unitType: string
  quantity: number; unitPrice: number; discountPercent: number; taxPercent: number
}

interface InvoiceDetail {
  id: number; invoiceNumber: string; invoiceDate: string; dueDate: string | null
  supplierId: number; supplierName: string | null
  subtotal: number; discountAmount: number; taxAmount: number; shippingAmount: number
  totalAmount: number; paidAmount: number; paymentStatus: string
  reference: string | null; notes: string | null; createdAt: string
  items: InvoiceDetailItem[]
}

interface InvoiceDetailItem {
  id: number; productId: number; productName: string; productSku: string
  warehouseId: number | null; warehouseName: string | null
  quantity: number; unitPrice: number; discountAmount: number; taxAmount: number; lineTotal: number
}

interface PurchaseOrder {
  id: number; poNumber: string; poDate: string; expectedDate: string | null
  supplierId: number; supplierName: string | null; total: number
  status: string; sentAt: string | null
}

interface POItem {
  productId: number; productName: string; quantity: number
}

interface PODetail {
  id: number; poNumber: string; poDate: string; expectedDate: string | null
  supplierId: number; supplierName: string | null; supplierEmail: string | null
  subtotal: number; discountAmount: number; taxAmount: number; shippingAmount: number
  totalAmount: number; status: string
  reference: string | null; notes: string | null
  sentAt: string | null; confirmedAt: string | null; receivedAt: string | null
  createdAt: string; items: PODetailItem[]
}

interface PODetailItem {
  id: number; productId: number; productName: string; productSku: string
  quantity: number; unitPrice: number; discountAmount: number; taxAmount: number; lineTotal: number
}

interface SupplierReportOptions {
  showSummary: boolean
  showInvoices: boolean
  showPayments: boolean
  showProducts: boolean
  showPurchaseOrders: boolean
}

interface RawMaterialPurchase {
  id: number
  purchaseNumber: string
  purchaseDate: string
  supplierId: number
  supplierName: string | null
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  notes: string | null
}

export default function Suppliers() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'suppliers' | 'po' | 'invoices' | 'payments'>('suppliers')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [rawMaterialPurchases, setRawMaterialPurchases] = useState<RawMaterialPurchase[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [methodFilter, _setMethodFilter] = useState('')
  void _setMethodFilter
  const [poStatusFilter, setPoStatusFilter] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showViewInvoiceModal, setShowViewInvoiceModal] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceDetail | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [_showAdvanced, setShowAdvanced] = useState(false)
  void _showAdvanced
  const [showSecondUnit, setShowSecondUnit] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [showPOModal, setShowPOModal] = useState(false)
  const [showViewPOModal, setShowViewPOModal] = useState(false)
  const [viewingPO, setViewingPO] = useState<PODetail | null>(null)
  const [loadingPO, setLoadingPO] = useState(false)
  const [showSettlePaymentModal, setShowSettlePaymentModal] = useState(false)
  const [settlingInvoice, setSettlingInvoice] = useState<Invoice | null>(null)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // Invoice Payment Method Modal
  const [showInvoicePaymentModal, setShowInvoicePaymentModal] = useState(false)
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<'cash' | 'on_account' | 'split'>('on_account')
  const [invoiceCashAmount, setInvoiceCashAmount] = useState(0)

  // Product Search State
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchMode, setProductSearchMode] = useState<'new' | 'existing'>('new')

  // Report State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportSupplier, setReportSupplier] = useState<Supplier | null>(null)
  const [reportInvoices, setReportInvoices] = useState<Invoice[]>([])
  const [reportPayments, setReportPayments] = useState<Payment[]>([])
  const [reportPOs, setReportPOs] = useState<PurchaseOrder[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportOptions, setReportOptions] = useState<SupplierReportOptions>({
    showSummary: true,
    showInvoices: true,
    showPayments: true,
    showProducts: true,
    showPurchaseOrders: true
  })

  // Forms
  const [supplierForm, setSupplierForm] = useState({
    name: '', companyName: '', phone: '', email: '', city: '', country: '',
    paymentTerms: '', creditLimit: 0, balance: 0, creditBalance: 0, notes: '', isActive: true, isManufacturer: false
  })
  const [paymentForm, setPaymentForm] = useState({
    supplierId: '', paymentDate: new Date().toISOString().split('T')[0],
    method: 'Cash', amount: 0, reference: '', notes: ''
  })
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: '', invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '', shippingCost: 0, otherCharges: 0, reference: '', notes: ''
  })
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { productId: 0, warehouseId: null, unitType: 'Piece', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 0 }
  ])
  const [productForm, setProductForm] = useState({
    sku: '', barcode: '', boxBarcode: '', name: '', description: '', categoryId: '',
    baseUnit: 'Piece', secondUnit: 'Box', unitsPerSecond: 12, currency: 'USD', defaultWarehouseId: '',
    retailPrice: 0, wholesalePrice: 0, superWholesalePrice: 0, costPrice: 0,
    boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0,
    quantity: 0, quantityBox: 0, lowStockAlert: 10, lowStockAlertBox: 2, isActive: true
  })
  const [poForm, setPoForm] = useState({
    supplierId: '', poDate: new Date().toISOString().split('T')[0],
    expectedDate: '', reference: '', notes: ''
  })
  const [poItems, setPoItems] = useState<POItem[]>([
    { productId: 0, productName: '', quantity: 1 }
  ])
  const [poProductSearch, setPoProductSearch] = useState('')
  const [poSearchIndex, setPoSearchIndex] = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  // Auto-calculate second unit values when first unit values change
  useEffect(() => {
    if (showSecondUnit && productForm.unitsPerSecond > 0) {
      setProductForm(prev => ({
        ...prev,
        quantityBox: prev.quantity * prev.unitsPerSecond,
        boxCostPrice: parseFloat((prev.costPrice / prev.unitsPerSecond).toFixed(3)),
        boxRetailPrice: parseFloat((prev.retailPrice / prev.unitsPerSecond).toFixed(3)),
        boxWholesalePrice: parseFloat((prev.wholesalePrice / prev.unitsPerSecond).toFixed(3)),
        boxSuperWholesalePrice: parseFloat((prev.superWholesalePrice / prev.unitsPerSecond).toFixed(3))
      }))
    }
  }, [showSecondUnit, productForm.quantity, productForm.costPrice, productForm.retailPrice, productForm.wholesalePrice, productForm.superWholesalePrice, productForm.unitsPerSecond])

  const loadData = async () => {
    try {
      setLoading(true)
      const [supRes, invRes, payRes, prodRes, whRes, catRes, poRes, unitsRes, curRes] = await Promise.all([
        suppliersApi.getAll(),
        suppliersApi.getInvoices(),
        suppliersApi.getPayments(),
        productsApi.getAll(),
        warehousesApi.getAll(),
        categoriesApi.getAll(),
        suppliersApi.getPurchaseOrders(),
        unitsApi.getAll({ activeOnly: true }),
        currenciesApi.getAll()
      ])
      setSuppliers(supRes.data)
      setInvoices(invRes.data)
      setPayments(payRes.data)
      setProducts(prodRes.data)
      setWarehouses(whRes.data)
      setCategories(catRes.data || [])
      setPurchaseOrders(poRes.data || [])
      setCurrencies(curRes.data || [])
      setUnits(unitsRes.data || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.isActive = statusFilter === 'active'
      const res = await suppliersApi.getAll(params)
      setSuppliers(res.data)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (supplierFilter) params.supplierId = supplierFilter
      if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter
      const res = await suppliersApi.getInvoices(params)
      setInvoices(res.data)
      
      // Load raw material purchases for manufacturer suppliers
      const rmParams: any = {}
      if (startDate) rmParams.startDate = startDate
      if (endDate) rmParams.endDate = endDate
      if (paymentStatusFilter) rmParams.paymentStatus = paymentStatusFilter
      
      if (supplierFilter) {
        // Check if selected supplier is a manufacturer
        const selectedSupplier = suppliers.find(s => s.id === parseInt(supplierFilter))
        if (selectedSupplier?.isManufacturer) {
          rmParams.supplierId = supplierFilter
          const rmRes = await rawMaterialPurchasesApi.getAll(rmParams)
          setRawMaterialPurchases(rmRes || [])
        } else {
          setRawMaterialPurchases([])
        }
      } else {
        // No supplier selected - show all raw material purchases from all manufacturers
        const rmRes = await rawMaterialPurchasesApi.getAll(rmParams)
        setRawMaterialPurchases(rmRes || [])
      }
    } catch (error) {
      console.error('Failed to load invoices:', error)
    }
  }

  const handleViewInvoice = async (invoiceId: number) => {
    setLoadingInvoice(true)
    setShowViewInvoiceModal(true)
    try {
      const res = await suppliersApi.getInvoice(invoiceId)
      setViewingInvoice(res.data)
    } catch (error) {
      console.error('Failed to load invoice:', error)
      alert('Failed to load invoice details')
    } finally {
      setLoadingInvoice(false)
    }
  }

  const loadPayments = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (supplierFilter) params.supplierId = supplierFilter
      if (methodFilter) params.method = methodFilter
      const res = await suppliersApi.getPayments(params)
      setPayments(res.data)
    } catch (error) {
      console.error('Failed to load payments:', error)
    }
  }

  useEffect(() => { if (!loading && activeTab === 'suppliers') loadSuppliers() }, [search, statusFilter])
  useEffect(() => { if (!loading && activeTab === 'invoices') loadInvoices() }, [startDate, endDate, supplierFilter, paymentStatusFilter])
  useEffect(() => { if (!loading && activeTab === 'payments') loadPayments() }, [startDate, endDate, supplierFilter, methodFilter])
  useEffect(() => { if (!loading && activeTab === 'po') loadPurchaseOrders() }, [startDate, endDate, supplierFilter, poStatusFilter])

  const loadPurchaseOrders = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (supplierFilter) params.supplierId = supplierFilter
      if (poStatusFilter) params.status = poStatusFilter
      const res = await suppliersApi.getPurchaseOrders(params)
      setPurchaseOrders(res.data)
    } catch (error) {
      console.error('Failed to load purchase orders:', error)
    }
  }

  const handleViewPO = async (poId: number) => {
    setLoadingPO(true)
    setShowViewPOModal(true)
    try {
      const res = await suppliersApi.getPurchaseOrder(poId)
      setViewingPO(res.data)
    } catch (error) {
      console.error('Failed to load PO:', error)
      alert('Failed to load purchase order details')
    } finally {
      setLoadingPO(false)
    }
  }

  const resetPOForm = () => {
    setPoForm({ supplierId: '', poDate: new Date().toISOString().split('T')[0], expectedDate: '', reference: '', notes: '' })
    setPoItems([{ productId: 0, productName: '', quantity: 1 }])
  }

  const addPOItem = () => {
    setPoItems([...poItems, { productId: 0, productName: '', quantity: 1 }])
  }

  const removePOItem = (index: number) => {
    if (poItems.length > 1) setPoItems(poItems.filter((_, i) => i !== index))
  }

  const updatePOItem = (index: number, field: keyof POItem, value: any) => {
    const updated = [...poItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product) updated[index].productName = product.name
    }
    setPoItems(updated)
  }

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poForm.supplierId || poItems.some(item => !item.productId && !item.productName)) {
      alert('Please select supplier and add products')
      return
    }
    setSaving(true)
    try {
      await suppliersApi.createPurchaseOrder({
        supplierId: parseInt(poForm.supplierId),
        poDate: poForm.poDate,
        expectedDate: poForm.expectedDate || null,
        reference: poForm.reference,
        notes: poForm.notes,
        items: poItems.filter(item => item.productId > 0 || item.productName)
      })
      setShowPOModal(false)
      resetPOForm()
      loadPurchaseOrders()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save purchase order')
    } finally {
      setSaving(false)
    }
  }

  const handleSendPO = async (poId: number) => {
    if (!confirm('Send this purchase order to supplier?')) return
    try {
      await suppliersApi.updatePurchaseOrderStatus(poId, 'sent')
      loadPurchaseOrders()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send PO')
    }
  }

  const handleDeletePO = async (poId: number) => {
    if (!confirm('Delete this purchase order?')) return
    try {
      await suppliersApi.deletePurchaseOrder(poId)
      loadPurchaseOrders()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete PO')
    }
  }

  const exportPOToPDF = (po: PODetail) => {
    const supplier = suppliers.find(s => s.id === po.supplierId)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${po.poNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #003366; margin-bottom: 5px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .notes { margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Purchase Order</h1>
            <p><strong>${po.poNumber}</strong></p>
          </div>
          <div style="text-align: right;">
            <p><strong>Date:</strong> ${new Date(po.poDate).toLocaleDateString()}</p>
            ${po.expectedDate ? `<p><strong>Expected:</strong> ${new Date(po.expectedDate).toLocaleDateString()}</p>` : ''}
          </div>
        </div>
        
        <div class="info">
          <h3>Supplier</h3>
          <p><strong>${supplier?.name || po.supplierName}</strong></p>
          ${supplier?.companyName ? `<p>${supplier.companyName}</p>` : ''}
          ${supplier?.phone ? `<p>Phone: ${supplier.phone}</p>` : ''}
          ${supplier?.email ? `<p>Email: ${supplier.email}</p>` : ''}
        </div>
        
        <h3>Items Requested</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${po.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.productName || 'Custom Product'}</td>
                <td>${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${po.notes ? `<div class="notes"><strong>Notes:</strong> ${po.notes}</div>` : ''}
        
        <p style="margin-top: 40px; color: #666; font-size: 12px;">
          Generated on ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const exportPOToExcel = (po: PODetail) => {
    const supplier = suppliers.find(s => s.id === po.supplierId)
    let csv = 'Purchase Order Export\n\n'
    csv += `PO Number,${po.poNumber}\n`
    csv += `Date,${new Date(po.poDate).toLocaleDateString()}\n`
    csv += `Supplier,${supplier?.name || po.supplierName}\n`
    csv += `Status,${po.status}\n\n`
    csv += 'Items\n'
    csv += '#,Product,Quantity\n'
    po.items.forEach((item, idx) => {
      csv += `${idx + 1},"${item.productName || 'Custom Product'}",${item.quantity}\n`
    })
    if (po.notes) csv += `\nNotes,"${po.notes}"\n`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PO-${po.poNumber}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    let aVal: any = a[sortBy as keyof Supplier]
    let bVal: any = b[sortBy as keyof Supplier]
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const resetSupplierForm = () => setSupplierForm({
    name: '', companyName: '', phone: '', email: '', city: '', country: '',
    paymentTerms: '', creditLimit: 0, balance: 0, creditBalance: 0, notes: '', isActive: true, isManufacturer: false
  })

  const handleEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup)
    setSupplierForm({
      name: sup.name, companyName: sup.companyName || '', phone: sup.phone || '',
      email: sup.email || '', city: sup.city || '', country: sup.country || '',
      paymentTerms: sup.paymentTerms || '', creditLimit: sup.creditLimit, 
      balance: sup.balance, creditBalance: sup.creditBalance || 0,
      notes: sup.notes || '', isActive: sup.isActive, isManufacturer: sup.isManufacturer
    })
    setShowSupplierModal(true)
  }

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierForm.name.trim()) return
    setSaving(true)
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, supplierForm)
      } else {
        await suppliersApi.create(supplierForm)
      }
      setShowSupplierModal(false)
      resetSupplierForm()
      setEditingSupplier(null)
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.supplierId || paymentForm.amount <= 0) return
    setSaving(true)
    try {
      await suppliersApi.createPayment({
        ...paymentForm,
        supplierId: parseInt(paymentForm.supplierId)
      })
      setShowPaymentModal(false)
      setPaymentForm({ supplierId: '', paymentDate: new Date().toISOString().split('T')[0], method: 'Cash', amount: 0, reference: '', notes: '' })
      loadPayments()
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  const [settlePaymentForm, setSettlePaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'Cash', amount: 0, reference: '', notes: ''
  })

  const openSettlePayment = (invoice: Invoice) => {
    setSettlingInvoice(invoice)
    const remainingAmount = invoice.total - (invoice.paidAmount || 0)
    setSettlePaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'Cash',
      amount: remainingAmount > 0 ? remainingAmount : 0,
      reference: invoice.invoiceNumber,
      notes: ''
    })
    setShowSettlePaymentModal(true)
  }

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settlingInvoice || settlePaymentForm.amount <= 0) return
    setSaving(true)
    try {
      await suppliersApi.createPayment({
        supplierId: settlingInvoice.supplierId,
        invoiceId: settlingInvoice.id,
        ...settlePaymentForm
      })
      setShowSettlePaymentModal(false)
      setSettlingInvoice(null)
      loadPayments()
      loadInvoices()
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to settle payment')
    } finally {
      setSaving(false)
    }
  }

  const [editPaymentForm, setEditPaymentForm] = useState({
    paymentDate: '', method: 'Cash', amount: 0, reference: '', notes: ''
  })

  const openEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setEditPaymentForm({
      paymentDate: payment.paymentDate.split('T')[0],
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference || '',
      notes: payment.notes || ''
    })
    setShowEditPaymentModal(true)
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPayment || editPaymentForm.amount <= 0) return
    setSaving(true)
    try {
      await suppliersApi.updatePayment(editingPayment.id, editPaymentForm)
      setShowEditPaymentModal(false)
      setEditingPayment(null)
      loadPayments()
      loadInvoices()
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return
    try {
      await suppliersApi.deletePayment(paymentId)
      loadPayments()
      loadInvoices()
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete payment')
    }
  }

  // Invoice handlers
  const resetInvoiceForm = () => {
    setInvoiceForm({ supplierId: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', shippingCost: 0, otherCharges: 0, reference: '', notes: '' })
    setInvoiceItems([{ productId: 0, warehouseId: null, unitType: 'Piece', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 0 }])
  }

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { productId: 0, warehouseId: null, unitType: 'Piece', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 0 }])
  }

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
    }
  }

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems]
    updated[index] = { ...updated[index], [field]: value }
    // Auto-fill from product when selecting a product
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product) {
        updated[index].unitPrice = product.costPrice
        updated[index].warehouseId = product.defaultWarehouseId || null
        updated[index].unitType = product.baseUnit || 'Piece'
      }
    }
    // Auto-update price and quantity when unit type changes
    if (field === 'unitType' && value) {
      const product = products.find(p => p.id === updated[index].productId)
      if (product) {
        const currentQty = updated[index].quantity
        if (value === product.baseUnit) {
          // Switched to base unit (e.g., Box)
          updated[index].unitPrice = product.costPrice
          // Convert quantity if coming from second unit
          if (product.unitsPerSecond > 0) {
            updated[index].quantity = Math.floor(currentQty / product.unitsPerSecond) || 1
          }
        } else if (value === product.secondUnit) {
          // Switched to second unit (e.g., Piece)
          updated[index].unitPrice = product.unitsPerSecond > 0 
            ? parseFloat((product.costPrice / product.unitsPerSecond).toFixed(4)) 
            : product.boxCostPrice || 0
          // Convert quantity to second unit
          if (product.unitsPerSecond > 0) {
            updated[index].quantity = currentQty * product.unitsPerSecond
          }
        }
      }
    }
    setInvoiceItems(updated)
  }

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unitPrice
    const discount = subtotal * (item.discountPercent / 100)
    const afterDiscount = subtotal - discount
    const tax = afterDiscount * (item.taxPercent / 100)
    return afterDiscount + tax
  }

  const calculateInvoiceSubtotal = () => invoiceItems.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  const calculateInvoiceTotal = () => calculateInvoiceSubtotal() + invoiceForm.shippingCost + invoiceForm.otherCharges

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceForm.supplierId || invoiceItems.some(item => !item.productId)) {
      alert('Please select supplier and products')
      return
    }
    // Show payment method selection modal
    setInvoicePaymentMethod('on_account')
    setInvoiceCashAmount(calculateInvoiceTotal())
    setShowInvoicePaymentModal(true)
  }

  const confirmInvoiceWithPayment = async () => {
    setSaving(true)
    try {
      // Create the invoice
      const invoiceRes = await suppliersApi.createInvoice({
        supplierId: parseInt(invoiceForm.supplierId),
        invoiceDate: invoiceForm.invoiceDate,
        dueDate: invoiceForm.dueDate || null,
        shippingCost: invoiceForm.shippingCost,
        otherCharges: invoiceForm.otherCharges,
        reference: invoiceForm.reference,
        notes: invoiceForm.notes,
        useCredit: invoicePaymentMethod === 'on_account',
        items: invoiceItems.filter(item => item.productId > 0)
      })

      // If cash or split, create a payment
      const paymentAmount = invoicePaymentMethod === 'cash' 
        ? calculateInvoiceTotal() 
        : invoicePaymentMethod === 'split' 
          ? invoiceCashAmount 
          : 0

      if (paymentAmount > 0) {
        await suppliersApi.createPayment({
          supplierId: parseInt(invoiceForm.supplierId),
          invoiceId: invoiceRes.data.id,
          paymentDate: invoiceForm.invoiceDate,
          method: 'Cash',
          amount: paymentAmount,
          reference: invoiceForm.reference,
          notes: `Payment for invoice - ${invoicePaymentMethod === 'cash' ? 'Full Cash' : 'Split Payment'}`
        })
      }

      setShowInvoicePaymentModal(false)
      setShowInvoiceModal(false)
      resetInvoiceForm()
      loadInvoices()
      loadPayments()
      loadSuppliers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  // Product handlers
  const resetProductForm = () => {
    setProductForm({
      sku: '', barcode: '', boxBarcode: '', name: '', description: '', categoryId: '',
      baseUnit: 'Piece', secondUnit: 'Box', unitsPerSecond: 12, currency: 'USD', defaultWarehouseId: '',
      retailPrice: 0, wholesalePrice: 0, superWholesalePrice: 0, costPrice: 0,
      boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0,
      quantity: 0, quantityBox: 0, lowStockAlert: 10, lowStockAlertBox: 2, isActive: true
    })
    setShowAdvanced(false)
  }

  const openNewProductModal = (itemIndex: number) => {
    setCurrentItemIndex(itemIndex)
    setEditingProductId(null)
    resetProductForm()
    setProductSearchQuery('')
    setShowProductSearch(true)
    setProductSearchMode('new')
    setShowProductModal(true)
  }

  const handleProductSearch = (query: string) => {
    setProductSearchQuery(query)
    if (!query.trim()) return
    
    // Exact match on barcode or SKU - auto-fill invoice item and close
    const found = products.find(p => 
      p.barcode === query || 
      p.boxBarcode === query || 
      p.sku.toLowerCase() === query.toLowerCase()
    )
    
    if (found && currentItemIndex !== null) {
      // Auto-fill product form with found product, keep modal open for review
      fillProductForm(found)
      setEditingProductId(found.id)
      setProductSearchMode('existing')
      setShowProductSearch(false)
      return
    }
    
    // Fallback for non-invoice usage (editing product)
    if (found) {
      fillProductForm(found)
      setEditingProductId(found.id)
      setProductSearchMode('existing')
    }
  }

  const fillProductForm = (product: Product) => {
    setProductForm({
      sku: product.sku || '',
      barcode: product.barcode || '',
      boxBarcode: product.boxBarcode || '',
      name: product.name,
      description: '',
      categoryId: product.categoryId?.toString() || '',
      baseUnit: product.baseUnit || 'Piece',
      secondUnit: product.secondUnit || 'Box',
      unitsPerSecond: product.unitsPerSecond || 12,
      currency: product.currency || 'USD',
      defaultWarehouseId: product.defaultWarehouseId?.toString() || '',
      retailPrice: product.retailPrice || 0,
      wholesalePrice: product.wholesalePrice || 0,
      superWholesalePrice: product.superWholesalePrice || 0,
      costPrice: product.costPrice || 0,
      boxRetailPrice: product.boxRetailPrice || 0,
      boxWholesalePrice: product.boxWholesalePrice || 0,
      boxSuperWholesalePrice: product.boxSuperWholesalePrice || 0,
      boxCostPrice: product.boxCostPrice || 0,
      quantity: 0,
      quantityBox: 0,
      lowStockAlert: product.lowStockAlert || 10,
      lowStockAlertBox: product.lowStockAlertBox || 2,
      isActive: product.isActive
    })
    setShowAdvanced(true)
    setShowSecondUnit(!!product.secondUnit)
  }

  const selectExistingProduct = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    // If we're adding to invoice, just update the invoice item and close modal
    if (currentItemIndex !== null) {
      const updated = [...invoiceItems]
      updated[currentItemIndex] = {
        ...updated[currentItemIndex],
        productId: product.id,
        unitPrice: product.costPrice,
        warehouseId: product.defaultWarehouseId || null,
        unitType: product.baseUnit || 'Piece'
      }
      setInvoiceItems(updated)
      setShowProductModal(false)
      setCurrentItemIndex(null)
      setShowProductSearch(false)
      setProductSearchQuery('')
      return
    }
    
    fillProductForm(product)
    setEditingProductId(productId)
    setProductSearchMode('existing')
    setShowProductSearch(false)
  }

  const startNewProduct = () => {
    resetProductForm()
    setEditingProductId(null)
    setProductSearchMode('new')
    setShowProductSearch(false)
  }

  const filteredSearchProducts = products.filter(p => {
    if (!productSearchQuery.trim()) return true
    const q = productSearchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || 
           p.sku.toLowerCase().includes(q) || 
           p.barcode?.toLowerCase().includes(q) ||
           p.boxBarcode?.toLowerCase().includes(q)
  })

  const openEditProductModal = (itemIndex: number, productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    // Get quantity from invoice item if available
    const invoiceItem = invoiceItems[itemIndex]
    const itemQuantity = invoiceItem?.quantity || 1
    
    setCurrentItemIndex(itemIndex)
    setEditingProductId(productId)
    setProductForm({
      sku: product.sku || '',
      barcode: product.barcode || '',
      boxBarcode: product.boxBarcode || '',
      name: product.name,
      description: '',
      categoryId: product.categoryId?.toString() || '',
      baseUnit: product.baseUnit || 'Piece',
      secondUnit: product.secondUnit || 'Box',
      unitsPerSecond: product.unitsPerSecond || 12,
      currency: product.currency || 'USD',
      defaultWarehouseId: product.defaultWarehouseId?.toString() || '',
      retailPrice: product.retailPrice || 0,
      wholesalePrice: product.wholesalePrice || 0,
      superWholesalePrice: product.superWholesalePrice || 0,
      costPrice: product.costPrice || 0,
      boxRetailPrice: product.boxRetailPrice || 0,
      boxWholesalePrice: product.boxWholesalePrice || 0,
      boxSuperWholesalePrice: product.boxSuperWholesalePrice || 0,
      boxCostPrice: product.boxCostPrice || 0,
      quantity: itemQuantity,
      quantityBox: 0,
      lowStockAlert: product.lowStockAlert || 10,
      lowStockAlertBox: product.lowStockAlertBox || 2,
      isActive: product.isActive
    })
    setShowAdvanced(true) // Show advanced fields when editing
    setShowSecondUnit(!!product.secondUnit)
    setShowProductModal(true)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.name.trim()) return
    setSaving(true)
    try {
      if (editingProductId) {
        // Update existing product
        await productsApi.update(editingProductId, {
          ...productForm,
          categoryId: productForm.categoryId ? parseInt(productForm.categoryId) : null,
          defaultWarehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
        })
        
        // Update in products list
        setProducts(prev => prev.map(p => p.id === editingProductId 
          ? { 
              ...p, 
              name: productForm.name, 
              sku: productForm.sku,
              barcode: productForm.barcode || null,
              boxBarcode: productForm.boxBarcode || null,
              categoryId: productForm.categoryId ? parseInt(productForm.categoryId) : null,
              baseUnit: productForm.baseUnit, 
              secondUnit: productForm.secondUnit,
              unitsPerSecond: productForm.unitsPerSecond,
              currency: productForm.currency,
              defaultWarehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
              retailPrice: productForm.retailPrice,
              wholesalePrice: productForm.wholesalePrice,
              superWholesalePrice: productForm.superWholesalePrice,
              costPrice: productForm.costPrice,
              boxRetailPrice: productForm.boxRetailPrice,
              boxWholesalePrice: productForm.boxWholesalePrice,
              boxSuperWholesalePrice: productForm.boxSuperWholesalePrice,
              boxCostPrice: productForm.boxCostPrice,
              lowStockAlert: productForm.lowStockAlert,
              lowStockAlertBox: productForm.lowStockAlertBox,
              isActive: productForm.isActive
            }
          : p
        ))
        
        // Update the invoice item row with product data
        if (currentItemIndex !== null) {
          const updated = [...invoiceItems]
          updated[currentItemIndex] = {
            ...updated[currentItemIndex],
            productId: editingProductId,
            unitPrice: productForm.costPrice,
            unitType: productForm.baseUnit,
            warehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
            quantity: productForm.quantity || 1
          }
          setInvoiceItems(updated)
        }
      } else {
        // Create new product
        const res = await productsApi.create({
          ...productForm,
          categoryId: productForm.categoryId ? parseInt(productForm.categoryId) : null,
          defaultWarehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
        })
        const newProduct = res.data
        
        // Add to products list
        setProducts(prev => [...prev, { 
          id: newProduct.id, 
          name: productForm.name, 
          sku: productForm.sku,
          barcode: productForm.barcode || null,
          boxBarcode: productForm.boxBarcode || null,
          categoryId: productForm.categoryId ? parseInt(productForm.categoryId) : null,
          baseUnit: productForm.baseUnit, 
          secondUnit: productForm.secondUnit,
          unitsPerSecond: productForm.unitsPerSecond,
          currency: productForm.currency,
          defaultWarehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
          retailPrice: productForm.retailPrice,
          wholesalePrice: productForm.wholesalePrice,
          superWholesalePrice: productForm.superWholesalePrice,
          costPrice: productForm.costPrice,
          boxRetailPrice: productForm.boxRetailPrice,
          boxWholesalePrice: productForm.boxWholesalePrice,
          boxSuperWholesalePrice: productForm.boxSuperWholesalePrice,
          boxCostPrice: productForm.boxCostPrice,
          lowStockAlert: productForm.lowStockAlert,
          lowStockAlertBox: productForm.lowStockAlertBox,
          isActive: productForm.isActive
        }])
        
        // Auto-fill the invoice item row
        if (currentItemIndex !== null) {
          const updated = [...invoiceItems]
          updated[currentItemIndex] = {
            ...updated[currentItemIndex],
            productId: newProduct.id,
            unitPrice: productForm.costPrice,
            unitType: productForm.baseUnit,
            warehouseId: productForm.defaultWarehouseId ? parseInt(productForm.defaultWarehouseId) : null,
            quantity: productForm.quantity || 1
          }
          setInvoiceItems(updated)
        }
      }
      
      setShowProductModal(false)
      resetProductForm()
      setCurrentItemIndex(null)
      setEditingProductId(null)
    } catch (error: any) {
      alert(error.response?.data?.message || (editingProductId ? 'Failed to update product' : 'Failed to create product'))
    } finally {
      setSaving(false)
    }
  }

  // Report Functions
  const handleOpenReport = async (supplier: Supplier) => {
    setReportSupplier(supplier)
    setShowReportModal(true)
    setLoadingReport(true)
    
    try {
      const [invRes, payRes, poRes] = await Promise.all([
        suppliersApi.getInvoices({ supplierId: supplier.id }),
        suppliersApi.getPayments({ supplierId: supplier.id }),
        suppliersApi.getPurchaseOrders({ supplierId: supplier.id })
      ])
      setReportInvoices(invRes.data)
      setReportPayments(payRes.data)
      setReportPOs(poRes.data || [])
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoadingReport(false)
    }
  }

  const formatCurrency = (amount: number) => amount.toFixed(3)
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

  const generateSupplierReport = () => {
    if (!reportSupplier) return
    
    // Aggregate products purchased from invoices
    const _productMap = new Map<string, { quantity: number; total: number }>()
    void _productMap
    
    reportInvoices.forEach(_inv => {
      // We need to load invoice details to get items - for now show invoice totals
      void _inv
    })
    
    // Calculate totals
    const totalInvoices = reportInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalPaid = reportInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
    const totalPayments = reportPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalPOs = reportPOs.reduce((sum, po) => sum + po.total, 0)
    const unpaidInvoices = reportInvoices.filter(inv => inv.paymentStatus !== 'paid')
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Report - ${reportSupplier.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .supplier-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .supplier-info h2 { font-size: 18px; margin-bottom: 10px; }
          .supplier-info .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .supplier-info .item { }
          .supplier-info .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .supplier-info .value { font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .summary-card .value.blue { color: #3b82f6; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-paid { color: #22c55e; }
          .status-unpaid { color: #ef4444; }
          .status-partial { color: #f59e0b; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Supplier Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="supplier-info">
          <h2>${reportSupplier.name}${reportSupplier.companyName ? ` - ${reportSupplier.companyName}` : ''}</h2>
          <div class="grid">
            <div class="item">
              <div class="label">Phone</div>
              <div class="value">${reportSupplier.phone || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Email</div>
              <div class="value">${reportSupplier.email || '-'}</div>
            </div>
            <div class="item">
              <div class="label">City</div>
              <div class="value">${reportSupplier.city || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Country</div>
              <div class="value">${reportSupplier.country || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Payment Terms</div>
              <div class="value">${reportSupplier.paymentTerms || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Credit Limit</div>
              <div class="value">${formatCurrency(reportSupplier.creditLimit)}</div>
            </div>
          </div>
        </div>
        
        ${reportOptions.showSummary ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Invoices</div>
            <div class="value blue">${formatCurrency(totalInvoices)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Payments</div>
            <div class="value green">${formatCurrency(totalPayments)}</div>
          </div>
          <div class="summary-card">
            <div class="label">We Owe Supplier</div>
            <div class="value red">${formatCurrency(reportSupplier.balance)}</div>
          </div>
          ${reportSupplier.creditBalance > 0 ? `
          <div class="summary-card">
            <div class="label">Supplier Owes Us</div>
            <div class="value blue">${formatCurrency(reportSupplier.creditBalance)}</div>
          </div>
          ` : ''}
          <div class="summary-card">
            <div class="label">Purchase Orders</div>
            <div class="value">${formatCurrency(totalPOs)}</div>
          </div>
        </div>
        ` : ''}
        
        ${reportOptions.showPurchaseOrders && reportPOs.length > 0 ? `
        <div class="section">
          <h2>Purchase Orders (${reportPOs.length})</h2>
          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Date</th>
                <th>Expected</th>
                <th class="text-right">Total</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportPOs.map(po => `
                <tr>
                  <td>${po.poNumber}</td>
                  <td>${formatDate(po.poDate)}</td>
                  <td>${po.expectedDate ? formatDate(po.expectedDate) : '-'}</td>
                  <td class="text-right">${formatCurrency(po.total)}</td>
                  <td class="text-center">${po.status}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">Total</th>
                <th class="text-right">${formatCurrency(totalPOs)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showInvoices && reportInvoices.length > 0 ? `
        <div class="section">
          <h2>Purchase Invoices (${reportInvoices.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Due Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportInvoices.map(inv => `
                <tr>
                  <td>${inv.invoiceNumber}</td>
                  <td>${formatDate(inv.invoiceDate)}</td>
                  <td>${inv.reference || '-'}</td>
                  <td>${inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                  <td class="text-right">${formatCurrency(inv.total)}</td>
                  <td class="text-right">${formatCurrency(inv.paidAmount)}</td>
                  <td class="text-right ${inv.total - inv.paidAmount > 0 ? 'status-unpaid' : ''}">${formatCurrency(inv.total - inv.paidAmount)}</td>
                  <td class="text-center">
                    <span class="${inv.paymentStatus === 'paid' ? 'status-paid' : inv.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">${inv.paymentStatus}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">Total</th>
                <th class="text-right">${formatCurrency(totalInvoices)}</th>
                <th class="text-right">${formatCurrency(totalPaid)}</th>
                <th class="text-right">${formatCurrency(unpaidTotal)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showPayments && reportPayments.length > 0 ? `
        <div class="section">
          <h2>Payment History (${reportPayments.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Method</th>
                <th class="text-right">Amount</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportPayments.map(p => `
                <tr>
                  <td>${p.paymentNumber}</td>
                  <td>${formatDate(p.paymentDate)}</td>
                  <td>${p.method}</td>
                  <td class="text-right">${formatCurrency(p.amount)}</td>
                  <td>${p.reference || '-'}</td>
                  <td>${p.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">Total Payments</th>
                <th class="text-right">${formatCurrency(totalPayments)}</th>
                <th colspan="2"></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Supplier Report - Confidential</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(reportHTML)
    printWindow.document.close()
    
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
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
            <Truck className="text-blue-600" /> Suppliers & Purchases
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button onClick={() => setActiveTab('suppliers')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'suppliers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Suppliers</button>
            <button onClick={() => setActiveTab('po')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'po' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Purchase Orders</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'invoices' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Purchase Invoices</button>
            <button onClick={() => setActiveTab('payments')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Payments History</button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'suppliers' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button onClick={() => { resetSupplierForm(); setEditingSupplier(null); setShowSupplierModal(true) }} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Add Supplier
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('phone')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        Phone {sortBy === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('city')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        City {sortBy === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('country')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        Country {sortBy === 'country' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('balance')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        We Owe {sortBy === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('creditBalance')} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100">
                        They Owe {sortBy === 'creditBalance' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedSuppliers.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No suppliers found</td></tr>
                    ) : sortedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setSupplierFilter(s.id.toString()); setActiveTab('invoices') }} 
                              className="p-1 text-blue-500 hover:bg-blue-50 rounded" 
                              title="View Invoices"
                            >
                              <Eye size={14} />
                            </button>
                            {s.name}
                            {s.isManufacturer && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">MFR</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{s.phone || '-'}</td>
                        <td className="px-4 py-3">{s.city || '-'}</td>
                        <td className="px-4 py-3">{s.country || '-'}</td>
                        <td className={`px-4 py-3 font-medium ${s.balance > 0 ? 'text-red-600' : ''}`}>{Math.max(0, s.balance).toFixed(3)}</td>
                        <td className={`px-4 py-3 font-medium ${((s.creditBalance || 0) + Math.abs(Math.min(0, s.balance))) > 0 ? 'text-blue-600' : ''}`}>{((s.creditBalance || 0) + Math.abs(Math.min(0, s.balance))).toFixed(3)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleEditSupplier(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                            <button onClick={() => handleOpenReport(s)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Print Report"><FileText size={16} /></button>
                            {s.isManufacturer && (
                              <button onClick={() => navigate(`/manufacturer-report/${s.id}`)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Manufacturer Report"><Factory size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'po' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={poStatusFilter} onChange={(e) => setPoStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={() => { resetPOForm(); setShowPOModal(true) }} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Create PO
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expected</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchaseOrders.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No purchase orders found</td></tr>
                    ) : purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{po.poNumber}</td>
                        <td className="px-4 py-3">{po.poDate.split('T')[0]}</td>
                        <td className="px-4 py-3">{po.expectedDate ? po.expectedDate.split('T')[0] : '-'}</td>
                        <td className="px-4 py-3">{po.supplierName}</td>
                        <td className="px-4 py-3 font-medium">{po.total.toFixed(3)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            po.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            po.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            po.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700' :
                            po.status === 'received' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>{po.status}</span>
                        </td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={() => handleViewPO(po.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye size={16} /></button>
                          {po.status === 'draft' && (
                            <>
                              <button onClick={() => handleSendPO(po.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Send to Supplier"><Send size={16} /></button>
                              <button onClick={() => handleDeletePO(po.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'invoices' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Status</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
                <button onClick={() => { resetInvoiceForm(); setShowInvoiceModal(true) }} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Add Invoice
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remaining</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No invoices found</td></tr>
                    ) : invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">{inv.invoiceDate.split('T')[0]}</td>
                        <td className="px-4 py-3">{inv.supplierName}</td>
                        <td className="px-4 py-3 font-medium">{inv.total.toFixed(3)}</td>
                        <td className="px-4 py-3 text-green-600">{(inv.paidAmount || 0).toFixed(3)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{Math.max(0, inv.total - (inv.paidAmount || 0)).toFixed(3)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{inv.paymentStatus}</span>
                        </td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={() => handleViewInvoice(inv.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Eye size={16} /></button>
                          {inv.paymentStatus !== 'paid' && (
                            <button onClick={() => openSettlePayment(inv)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Settle Payment"><DollarSign size={16} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Raw Material Purchases - Only show for manufacturers */}
              {rawMaterialPurchases.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                    <Factory size={20} />
                    Raw Material Purchases
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Purchase #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Paid</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Balance</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rawMaterialPurchases.map((rmp) => (
                          <tr key={rmp.id} className="hover:bg-purple-50/50">
                            <td className="px-4 py-3 font-medium text-purple-600">{rmp.purchaseNumber}</td>
                            <td className="px-4 py-3">{rmp.purchaseDate.split('T')[0]}</td>
                            <td className="px-4 py-3 font-medium">{rmp.totalAmount.toFixed(3)}</td>
                            <td className="px-4 py-3 text-green-600">{(rmp.paidAmount || 0).toFixed(3)}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{Math.max(0, rmp.totalAmount - (rmp.paidAmount || 0)).toFixed(3)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                rmp.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                rmp.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>{rmp.paymentStatus.toUpperCase()}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-sm">{rmp.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="text" placeholder="Search Payment #..." value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.filter(p => !paymentSearch || p.paymentNumber.toLowerCase().includes(paymentSearch.toLowerCase())).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments found</td></tr>
                    ) : payments.filter(p => !paymentSearch || p.paymentNumber.toLowerCase().includes(paymentSearch.toLowerCase())).map((pay) => (
                      <tr key={pay.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{pay.paymentNumber}</td>
                        <td className="px-4 py-3">{pay.paymentDate.split('T')[0]}</td>
                        <td className="px-4 py-3">{pay.supplierName}</td>
                        <td className="px-4 py-3">{pay.method}</td>
                        <td className="px-4 py-3 font-medium text-green-600">{pay.amount.toFixed(3)}</td>
                        <td className="px-4 py-3">{pay.reference || '-'}</td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={() => openEditPayment(pay)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                          <button onClick={() => handleDeletePayment(pay.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowSupplierModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitSupplier} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                  <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" value={supplierForm.companyName} onChange={(e) => setSupplierForm({...supplierForm, companyName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={supplierForm.city} onChange={(e) => setSupplierForm({...supplierForm, city: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={supplierForm.country} onChange={(e) => setSupplierForm({...supplierForm, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <input type="text" value={supplierForm.paymentTerms} onChange={(e) => setSupplierForm({...supplierForm, paymentTerms: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Net 30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <input type="number" value={supplierForm.creditLimit} onChange={(e) => setSupplierForm({...supplierForm, creditLimit: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">We Owe Supplier</label>
                  <input type="number" step="0.001" value={supplierForm.balance} onChange={(e) => setSupplierForm({...supplierForm, balance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Owes Us</label>
                  <input type="number" step="0.001" value={supplierForm.creditBalance} onChange={(e) => setSupplierForm({...supplierForm, creditBalance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={supplierForm.notes} onChange={(e) => setSupplierForm({...supplierForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={supplierForm.isActive} onChange={(e) => setSupplierForm({...supplierForm, isActive: e.target.checked})} className="rounded" />
                  <label htmlFor="isActive" className="text-sm">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isManufacturer" checked={supplierForm.isManufacturer} onChange={(e) => setSupplierForm({...supplierForm, isManufacturer: e.target.checked})} className="rounded" />
                  <label htmlFor="isManufacturer" className="text-sm text-purple-700 font-medium">Raw Material Manufacturer</label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Add Supplier Payment</h2>
              <button onClick={() => setShowPaymentModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select value={paymentForm.supplierId} onChange={(e) => setPaymentForm({...paymentForm, supplierId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" value={paymentForm.reference} onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Check # / Transfer ID" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">New Purchase Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Invoice Header */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select value={invoiceForm.supplierId} onChange={(e) => setInvoiceForm({...invoiceForm, supplierId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input type="text" value={invoiceForm.reference} onChange={(e) => setInvoiceForm({...invoiceForm, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Invoice ref" />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h6 className="font-medium">Invoice Items</h6>
                  <button type="button" onClick={addInvoiceItem} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">#</th>
                        <th className="px-2 py-2 text-left font-medium">Product</th>
                        <th className="px-2 py-2 text-left font-medium">Warehouse</th>
                        <th className="px-2 py-2 text-left font-medium">Unit</th>
                        <th className="px-2 py-2 text-left font-medium w-20">Qty</th>
                        <th className="px-2 py-2 text-left font-medium w-24">Unit Price</th>
                        <th className="px-2 py-2 text-left font-medium w-16">Disc %</th>
                        <th className="px-2 py-2 text-left font-medium w-16">Tax %</th>
                        <th className="px-2 py-2 text-left font-medium w-24">Total</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 items-center">
                              <span className="flex-1 px-2 py-1 text-sm min-w-[120px]">
                                {item.productId > 0 ? products.find(p => p.id === item.productId)?.name || 'Unknown' : <span className="text-gray-400">No product</span>}
                              </span>
                              {item.productId > 0 ? (
                                <button type="button" onClick={() => openEditProductModal(idx, item.productId)} className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600" title="Edit Product">
                                  <Edit size={12} />
                                </button>
                              ) : (
                                <button type="button" onClick={() => openNewProductModal(idx)} className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600" title="Scan/Add Product">
                                  <Plus size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select value={item.warehouseId || ''} onChange={(e) => updateInvoiceItem(idx, 'warehouseId', e.target.value ? parseInt(e.target.value) : null)} className="w-full px-2 py-1 border rounded text-sm">
                              <option value="">Select</option>
                              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select value={item.unitType} onChange={(e) => updateInvoiceItem(idx, 'unitType', e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                              {(() => {
                                const product = products.find(p => p.id === item.productId)
                                if (product) {
                                  return (
                                    <>
                                      <option value={product.baseUnit}>{product.baseUnit}</option>
                                      {product.secondUnit && product.unitsPerSecond > 0 && (
                                        <option value={product.secondUnit}>{product.secondUnit}</option>
                                      )}
                                    </>
                                  )
                                }
                                return <option value="Piece">Piece</option>
                              })()}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={item.quantity} onChange={(e) => updateInvoiceItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 border rounded text-sm" min={1} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateInvoiceItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={item.discountPercent} onChange={(e) => updateInvoiceItem(idx, 'discountPercent', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={item.taxPercent} onChange={(e) => updateInvoiceItem(idx, 'taxPercent', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-sm" />
                          </td>
                          <td className="px-2 py-2 font-medium">{(() => { const p = products.find(pr => pr.id === item.productId); return p?.currency || ''; })()} {calculateItemTotal(item).toFixed(3)}</td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeInvoiceItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charges & Notes */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Cost</label>
                  <input type="number" step="0.01" value={invoiceForm.shippingCost} onChange={(e) => setInvoiceForm({...invoiceForm, shippingCost: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Charges</label>
                  <input type="number" step="0.01" value={invoiceForm.otherCharges} onChange={(e) => setInvoiceForm({...invoiceForm, otherCharges: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              {/* Summary */}
              <div className="flex flex-col items-end gap-2 border-t pt-4">
                {(() => {
                  const baseCur = currencies.find(c => c.isBase)
                  const baseCurCode = baseCur?.code || 'USD'
                  const byCurrency: Record<string, number> = {}
                  invoiceItems.forEach(item => {
                    const p = products.find(pr => pr.id === item.productId)
                    const cur = p?.currency || baseCurCode
                    byCurrency[cur] = (byCurrency[cur] || 0) + calculateItemTotal(item)
                  })
                  const keys = Object.keys(byCurrency)
                  const isMulti = keys.length > 1

                  let totalInBase = 0
                  keys.forEach(cur => {
                    const curData = currencies.find(c => c.code === cur)
                    const rate = curData?.exchangeRate || 1
                    totalInBase += byCurrency[cur] / rate
                  })
                  totalInBase += invoiceForm.shippingCost + invoiceForm.otherCharges

                  return (
                    <>
                      {keys.map(cur => (
                        <div key={cur} className="text-sm font-medium">
                          {isMulti ? `Subtotal (${cur}):` : 'Subtotal:'} <span className="text-gray-900">{cur} {byCurrency[cur].toFixed(3)}</span>
                        </div>
                      ))}
                      <div className="flex justify-end gap-6 text-sm font-medium">
                        <div>Shipping: <span className="text-gray-900">{invoiceForm.shippingCost.toFixed(3)}</span></div>
                        <div>Other: <span className="text-gray-900">{invoiceForm.otherCharges.toFixed(3)}</span></div>
                      </div>
                      {isMulti && keys.map(cur => (
                        <div key={`t-${cur}`} className="text-sm font-semibold">
                          Total ({cur}): <span className="text-blue-600">{cur} {byCurrency[cur].toFixed(3)}</span>
                        </div>
                      ))}
                      <div className="text-lg font-bold">
                        Total ({baseCurCode}): <span className="text-blue-600">{baseCurCode} {totalInBase.toFixed(3)}</span>
                      </div>
                      {isMulti && (
                        <div className="text-xs text-gray-400">
                          {keys.filter(c => c !== baseCurCode).map(cur => {
                            const curData = currencies.find(c => c.code === cur)
                            return `1 ${baseCurCode} = ${curData?.exchangeRate || 1} ${cur}`
                          }).join(' | ')}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">
                {showProductSearch ? 'Find or Add Product' : (editingProductId ? 'Edit Product' : 'Add New Product')}
              </h2>
              <button onClick={() => { setShowProductModal(false); setCurrentItemIndex(null); setEditingProductId(null); setShowSecondUnit(false); setShowProductSearch(false) }}><X size={24} /></button>
            </div>
            
            {/* Product Search Section */}
            {showProductSearch && (
              <div className="p-4 border-b bg-blue-50">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scan Barcode or Enter Item Code</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => handleProductSearch(e.target.value)}
                      placeholder="Scan barcode or enter SKU..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                      autoFocus
                    />
                  </div>
                </div>
                
                {productSearchQuery && filteredSearchProducts.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Or Select Existing Product</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {filteredSearchProducts.slice(0, 10).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectExistingProduct(p.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-500">SKU: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-green-600">${p.costPrice.toFixed(3)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNewProduct}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Product
                  </button>
                </div>
                
                {productSearchMode === 'existing' && editingProductId && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check size={18} />
                      <span className="font-medium">Product found! You can edit details below.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductSearch(false)}
                      className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Continue to Edit Product
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Back to Search button */}
              {!showProductSearch && (
                <button
                  type="button"
                  onClick={() => { setShowProductSearch(true); setProductSearchQuery('') }}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                >
                  <Search size={14} />
                  Search for existing product
                </button>
              )}
              
              {/* Public Info */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="text-sm font-semibold text-gray-700">Public Info</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                    <input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter product name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <select value={productForm.categoryId} onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Warehouse</label>
                    <select value={productForm.defaultWarehouseId} onChange={(e) => setProductForm({...productForm, defaultWarehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                    <select value={productForm.currency} onChange={(e) => setProductForm({...productForm, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      {currencies.filter(c => c.isActive).length > 0 ? currencies.filter(c => c.isActive).map(c => <option key={c.id} value={c.code}>{c.code}</option>) : (
                        <><option value="USD">USD</option><option value="LBP">LBP</option><option value="EUR">EUR</option></>
                      )}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <input type="checkbox" id="productActive" checked={productForm.isActive} onChange={(e) => setProductForm({...productForm, isActive: e.target.checked})} className="rounded" />
                      <label htmlFor="productActive" className="text-sm font-semibold text-gray-700">Active</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* First Unit Configuration */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">First Unit Configuration</div>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (showSecondUnit) {
                        setProductForm({...productForm, secondUnit: '', unitsPerSecond: 0, boxBarcode: '', boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0, lowStockAlertBox: 0})
                      } else {
                        setProductForm({...productForm, secondUnit: 'Box', unitsPerSecond: 0})
                      }
                      setShowSecondUnit(!showSecondUnit)
                    }} 
                    className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-2 transition-colors ${
                      showSecondUnit 
                        ? 'border-red-300 text-red-600 hover:bg-red-50' 
                        : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {showSecondUnit ? (
                      <><X size={14} /> Remove Second Unit</>
                    ) : (
                      <><Plus size={14} /> Add Second Unit</>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">SKU *</label>
                    <input type="text" value={productForm.sku} onChange={(e) => setProductForm({...productForm, sku: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter SKU" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Barcode</label>
                    <input type="text" value={productForm.barcode} onChange={(e) => setProductForm({...productForm, barcode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter barcode" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                    <select value={productForm.baseUnit} onChange={(e) => setProductForm({...productForm, baseUnit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      {units.length > 0 ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>) : (
                        <>
                          <option value="Piece">Piece</option>
                          <option value="Box">Box</option>
                          <option value="Kg">Kg</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                    <input type="number" min="0" value={productForm.quantity} onChange={(e) => setProductForm({...productForm, quantity: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                    <input type="number" step="0.01" value={productForm.costPrice} onChange={(e) => setProductForm({...productForm, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price</label>
                    <input type="number" step="0.01" value={productForm.retailPrice} onChange={(e) => setProductForm({...productForm, retailPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale</label>
                    <input type="number" step="0.01" value={productForm.wholesalePrice} onChange={(e) => setProductForm({...productForm, wholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Super Wholesale</label>
                    <input type="number" step="0.01" value={productForm.superWholesalePrice} onChange={(e) => setProductForm({...productForm, superWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Min Stock</label>
                    <input type="number" min="0" value={productForm.lowStockAlert} onChange={(e) => setProductForm({...productForm, lowStockAlert: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Second Unit Configuration - Only shown when enabled */}
              {showSecondUnit && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-4">
                  <div className="text-sm font-semibold text-blue-700">Second Unit Configuration</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">1 {productForm.baseUnit} = X {productForm.secondUnit || 'Piece'}s</label>
                      <input type="number" min="1" value={productForm.unitsPerSecond} onChange={(e) => setProductForm({...productForm, unitsPerSecond: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="e.g. 12" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Barcode</label>
                      <input type="text" value={productForm.boxBarcode} onChange={(e) => setProductForm({...productForm, boxBarcode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                      <select value={productForm.secondUnit} onChange={(e) => setProductForm({...productForm, secondUnit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                        {units.length > 0 ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>) : (
                          <>
                            <option value="Box">Box</option>
                            <option value="Carton">Carton</option>
                            <option value="Pack">Pack</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                      <input type="number" min="0" value={productForm.quantityBox} onChange={(e) => setProductForm({...productForm, quantityBox: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                      <input type="number" step="0.01" min="0" value={productForm.boxCostPrice} onChange={(e) => setProductForm({...productForm, boxCostPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price</label>
                      <input type="number" step="0.01" min="0" value={productForm.boxRetailPrice} onChange={(e) => setProductForm({...productForm, boxRetailPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale</label>
                      <input type="number" step="0.01" min="0" value={productForm.boxWholesalePrice} onChange={(e) => setProductForm({...productForm, boxWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Super Wholesale</label>
                      <input type="number" step="0.01" min="0" value={productForm.boxSuperWholesalePrice} onChange={(e) => setProductForm({...productForm, boxSuperWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Min Stock</label>
                      <input type="number" min="0" value={productForm.lowStockAlertBox} onChange={(e) => setProductForm({...productForm, lowStockAlertBox: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowProductModal(false); setCurrentItemIndex(null); setEditingProductId(null); setShowSecondUnit(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingProductId ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye size={20} /> Invoice Details
              </h2>
              <button onClick={() => { setShowViewInvoiceModal(false); setViewingInvoice(null) }}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingInvoice ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : viewingInvoice ? (
                <div className="space-y-6">
                  {/* Invoice Header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Invoice #</div>
                      <div className="font-semibold">{viewingInvoice.invoiceNumber}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Supplier</div>
                      <div className="font-semibold">{viewingInvoice.supplierName}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="font-semibold">{viewingInvoice.invoiceDate.split('T')[0]}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Status</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingInvoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                        viewingInvoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{viewingInvoice.paymentStatus}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="font-semibold mb-2">Items</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Warehouse</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Discount</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {viewingInvoice.items.map((item, idx) => {
                            const prod = products.find(p => p.id === item.productId)
                            const cur = prod?.currency || ''
                            return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-xs text-gray-500">{item.productSku}</div>
                              </td>
                              <td className="px-4 py-2 text-gray-500">{item.warehouseName || '-'}</td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">{cur} {item.unitPrice.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right text-orange-600">{item.discountAmount.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right text-blue-600">{item.taxAmount.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right font-medium">{cur} {item.lineTotal.toFixed(3)}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      {(() => {
                        const baseCur = currencies.find(c => c.isBase)
                        const baseCurCode = baseCur?.code || 'USD'
                        const byCurrency: Record<string, number> = {}
                        viewingInvoice.items.forEach(item => {
                          const prod = products.find(p => p.id === item.productId)
                          const cur = prod?.currency || baseCurCode
                          byCurrency[cur] = (byCurrency[cur] || 0) + item.lineTotal
                        })
                        const keys = Object.keys(byCurrency)
                        const isMulti = keys.length > 1

                        // Convert all to base currency
                        let totalInBase = 0
                        keys.forEach(cur => {
                          const curData = currencies.find(c => c.code === cur)
                          const rate = curData?.exchangeRate || 1
                          totalInBase += byCurrency[cur] / rate
                        })

                        return (
                          <>
                            {keys.map(cur => (
                              <div key={cur} className="flex justify-between text-sm">
                                <span className="text-gray-500">{isMulti ? `Subtotal (${cur}):` : 'Subtotal:'}</span>
                                <span>{cur} {byCurrency[cur].toFixed(3)}</span>
                              </div>
                            ))}
                            {viewingInvoice.discountAmount > 0 && (
                              <div className="flex justify-between text-sm text-orange-600">
                                <span>Discount:</span>
                                <span>-{viewingInvoice.discountAmount.toFixed(3)}</span>
                              </div>
                            )}
                            {viewingInvoice.taxAmount > 0 && (
                              <div className="flex justify-between text-sm text-blue-600">
                                <span>Tax:</span>
                                <span>+{viewingInvoice.taxAmount.toFixed(3)}</span>
                              </div>
                            )}
                            {viewingInvoice.shippingAmount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Shipping:</span>
                                <span>+{viewingInvoice.shippingAmount.toFixed(3)}</span>
                              </div>
                            )}
                            {isMulti && keys.map(cur => (
                              <div key={`total-${cur}`} className="flex justify-between font-semibold border-t pt-1">
                                <span>Total ({cur}):</span>
                                <span className="text-green-600">{cur} {byCurrency[cur].toFixed(3)}</span>
                              </div>
                            ))}
                            <div className={`flex justify-between font-bold text-lg ${isMulti ? 'border-t pt-2 mt-1' : 'border-t pt-2'}`}>
                              <span>Total ({baseCurCode}):</span>
                              <span className="text-green-600">{baseCurCode} {totalInBase.toFixed(3)}</span>
                            </div>
                            {isMulti && (
                              <div className="text-xs text-gray-400 text-right">
                                {keys.filter(c => c !== baseCurCode).map(cur => {
                                  const curData = currencies.find(c => c.code === cur)
                                  return `1 ${baseCurCode} = ${curData?.exchangeRate || 1} ${cur}`
                                }).join(' | ')}
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Paid:</span>
                              <span>{baseCurCode} {viewingInvoice.paidAmount.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-500">Balance Due:</span>
                              <span className={viewingInvoice.totalAmount - viewingInvoice.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                                {baseCurCode} {Math.max(0, viewingInvoice.totalAmount - viewingInvoice.paidAmount).toFixed(3)}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Notes */}
                  {(viewingInvoice.reference || viewingInvoice.notes) && (
                    <div className="border-t pt-4">
                      {viewingInvoice.reference && (
                        <div className="text-sm"><span className="text-gray-500">Reference:</span> {viewingInvoice.reference}</div>
                      )}
                      {viewingInvoice.notes && (
                        <div className="text-sm"><span className="text-gray-500">Notes:</span> {viewingInvoice.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">No invoice data</div>
              )}
              <div className="flex justify-end pt-4 mt-4 border-t">
                <button onClick={() => { setShowViewInvoiceModal(false); setViewingInvoice(null) }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText size={20} /> New Purchase Order</h2>
              <button onClick={() => setShowPOModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitPO} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select value={poForm.supplierId} onChange={(e) => setPoForm({...poForm, supplierId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Date *</label>
                  <input type="date" value={poForm.poDate} onChange={(e) => setPoForm({...poForm, poDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input type="text" value={poForm.reference} onChange={(e) => setPoForm({...poForm, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h6 className="font-medium">Order Items</h6>
                  <button type="button" onClick={addPOItem} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">#</th>
                        <th className="px-2 py-2 text-left font-medium">Product (search by name/barcode)</th>
                        <th className="px-2 py-2 text-left font-medium w-24">Qty</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <div className="relative">
                              <div className="flex items-center gap-1">
                                <Search size={14} className="text-gray-400" />
                                <input 
                                  type="text" 
                                  value={poSearchIndex === idx ? poProductSearch : (item.productName || '')}
                                  onChange={(e) => { 
                                    setPoProductSearch(e.target.value)
                                    setPoSearchIndex(idx)
                                    if (!e.target.value) {
                                      updatePOItem(idx, 'productId', 0)
                                      updatePOItem(idx, 'productName', '')
                                    }
                                  }}
                                  onFocus={() => { setPoSearchIndex(idx); setPoProductSearch(item.productName || '') }}
                                  onBlur={() => setTimeout(() => setPoSearchIndex(null), 200)}
                                  placeholder="Search by name or barcode..." 
                                  className="flex-1 px-2 py-1 border rounded text-sm w-full"
                                />
                              </div>
                              {poSearchIndex === idx && poProductSearch && (
                                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                  {products.filter(p => 
                                    p.name.toLowerCase().includes(poProductSearch.toLowerCase()) ||
                                    (p.barcode && p.barcode.includes(poProductSearch)) ||
                                    (p.boxBarcode && p.boxBarcode.includes(poProductSearch)) ||
                                    (p.sku && p.sku.toLowerCase().includes(poProductSearch.toLowerCase()))
                                  ).slice(0, 10).map(p => (
                                    <div 
                                      key={p.id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                                      onMouseDown={() => {
                                        updatePOItem(idx, 'productId', p.id)
                                        updatePOItem(idx, 'productName', p.name)
                                        setPoProductSearch('')
                                        setPoSearchIndex(null)
                                      }}
                                    >
                                      <div className="font-medium">{p.name}</div>
                                      <div className="text-xs text-gray-500">
                                        SKU: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`}
                                      </div>
                                    </div>
                                  ))}
                                  {products.filter(p => 
                                    p.name.toLowerCase().includes(poProductSearch.toLowerCase()) ||
                                    (p.barcode && p.barcode.includes(poProductSearch)) ||
                                    (p.boxBarcode && p.boxBarcode.includes(poProductSearch)) ||
                                    (p.sku && p.sku.toLowerCase().includes(poProductSearch.toLowerCase()))
                                  ).length === 0 && (
                                    <div 
                                      className="px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50"
                                      onMouseDown={() => {
                                        updatePOItem(idx, 'productId', 0)
                                        updatePOItem(idx, 'productName', poProductSearch)
                                        setPoProductSearch('')
                                        setPoSearchIndex(null)
                                      }}
                                    >
                                      <span className="text-blue-600">+ Add as custom: </span>"{poProductSearch}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={item.quantity} onChange={(e) => updatePOItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 border rounded text-sm" min={1} />
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removePOItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={poForm.notes} onChange={(e) => setPoForm({...poForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Additional notes for the supplier..." />
              </div>

              <div className="flex justify-end text-sm text-gray-500 border-t pt-4">
                <span>Total Items: {poItems.filter(i => i.productId > 0 || i.productName).length}</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPOModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Modal */}
      {showViewPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={20} /> Purchase Order Details
              </h2>
              <button onClick={() => { setShowViewPOModal(false); setViewingPO(null) }}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingPO ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : viewingPO ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">PO #</div>
                      <div className="font-semibold">{viewingPO.poNumber}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Supplier</div>
                      <div className="font-semibold">{viewingPO.supplierName}</div>
                      {viewingPO.supplierEmail && <div className="text-xs text-gray-500">{viewingPO.supplierEmail}</div>}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="font-semibold">{viewingPO.poDate.split('T')[0]}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Status</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingPO.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        viewingPO.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        viewingPO.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700' :
                        viewingPO.status === 'received' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{viewingPO.status}</span>
                    </div>
                  </div>

                  {viewingPO.expectedDate && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Expected Delivery:</span> {viewingPO.expectedDate.split('T')[0]}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Items Requested</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {viewingPO.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2">
                                <div className="font-medium">{item.productName}</div>
                                {item.productSku && <div className="text-xs text-gray-500">{item.productSku}</div>}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end text-sm text-gray-500">
                    <span>Total Items: {viewingPO.items.length}</span>
                  </div>

                  {(viewingPO.reference || viewingPO.notes) && (
                    <div className="border-t pt-4">
                      {viewingPO.reference && (
                        <div className="text-sm"><span className="text-gray-500">Reference:</span> {viewingPO.reference}</div>
                      )}
                      {viewingPO.notes && (
                        <div className="text-sm"><span className="text-gray-500">Notes:</span> {viewingPO.notes}</div>
                      )}
                    </div>
                  )}

                  {(viewingPO.sentAt || viewingPO.confirmedAt || viewingPO.receivedAt) && (
                    <div className="border-t pt-4 text-sm text-gray-500">
                      {viewingPO.sentAt && <div>Sent: {new Date(viewingPO.sentAt).toLocaleString()}</div>}
                      {viewingPO.confirmedAt && <div>Confirmed: {new Date(viewingPO.confirmedAt).toLocaleString()}</div>}
                      {viewingPO.receivedAt && <div>Received: {new Date(viewingPO.receivedAt).toLocaleString()}</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">No PO data</div>
              )}
              <div className="flex justify-between pt-4 mt-4 border-t">
                <div className="flex gap-2">
                  {viewingPO && (
                    <>
                      <button onClick={() => exportPOToPDF(viewingPO)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        <Download size={16} /> PDF
                      </button>
                      <button onClick={() => exportPOToExcel(viewingPO)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <FileSpreadsheet size={16} /> Excel
                      </button>
                    </>
                  )}
                </div>
                <button onClick={() => { setShowViewPOModal(false); setViewingPO(null) }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {showSettlePaymentModal && settlingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">Settle Payment</h2>
              <button onClick={() => { setShowSettlePaymentModal(false); setSettlingInvoice(null) }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSettlePayment} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice:</span>
                  <span className="font-medium">{settlingInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Supplier:</span>
                  <span>{settlingInvoice.supplierName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-medium">{settlingInvoice.total.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid Amount:</span>
                  <span className="text-green-600">{(settlingInvoice.paidAmount || 0).toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Remaining:</span>
                  <span className="text-red-600">{Math.max(0, settlingInvoice.total - (settlingInvoice.paidAmount || 0)).toFixed(3)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                <input type="date" value={settlePaymentForm.paymentDate} onChange={(e) => setSettlePaymentForm({...settlePaymentForm, paymentDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select value={settlePaymentForm.method} onChange={(e) => setSettlePaymentForm({...settlePaymentForm, method: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" step="0.01" value={settlePaymentForm.amount} onChange={(e) => setSettlePaymentForm({...settlePaymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" value={settlePaymentForm.reference} onChange={(e) => setSettlePaymentForm({...settlePaymentForm, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={settlePaymentForm.notes} onChange={(e) => setSettlePaymentForm({...settlePaymentForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowSettlePaymentModal(false); setSettlingInvoice(null) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPaymentModal && editingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">Edit Payment</h2>
              <button onClick={() => { setShowEditPaymentModal(false); setEditingPayment(null) }}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdatePayment} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment #:</span>
                  <span className="font-medium">{editingPayment.paymentNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Supplier:</span>
                  <span>{editingPayment.supplierName}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                <input type="date" value={editPaymentForm.paymentDate} onChange={(e) => setEditPaymentForm({...editPaymentForm, paymentDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select value={editPaymentForm.method} onChange={(e) => setEditPaymentForm({...editPaymentForm, method: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" step="0.01" value={editPaymentForm.amount} onChange={(e) => setEditPaymentForm({...editPaymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" value={editPaymentForm.reference} onChange={(e) => setEditPaymentForm({...editPaymentForm, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editPaymentForm.notes} onChange={(e) => setEditPaymentForm({...editPaymentForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditPaymentModal(false); setEditingPayment(null) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Report Modal */}
      {showReportModal && reportSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-bold">Supplier Report</h2>
                    <p className="text-sm text-gray-500">{reportSupplier.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {loadingReport ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="ml-2">Loading report data...</span>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Invoices:</span>
                        <span className="ml-2 font-medium">{reportInvoices.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Payments:</span>
                        <span className="ml-2 font-medium">{reportPayments.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Purchase Orders:</span>
                        <span className="ml-2 font-medium">{reportPOs.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">We Owe:</span>
                        <span className={`ml-2 font-medium ${reportSupplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {reportSupplier.balance.toFixed(3)}
                        </span>
                      </div>
                      {reportSupplier.creditBalance > 0 && (
                        <div>
                          <span className="text-gray-500">They Owe Us:</span>
                          <span className="ml-2 font-medium text-blue-600">
                            {reportSupplier.creditBalance.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Options */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Include in Report:</h3>
                    
                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showSummary}
                        onChange={(e) => setReportOptions({...reportOptions, showSummary: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Summary</p>
                        <p className="text-sm text-gray-500">Total invoices, payments, balance</p>
                      </div>
                      {reportOptions.showSummary && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showPurchaseOrders}
                        onChange={(e) => setReportOptions({...reportOptions, showPurchaseOrders: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Purchase Orders ({reportPOs.length})</p>
                        <p className="text-sm text-gray-500">All purchase orders</p>
                      </div>
                      {reportOptions.showPurchaseOrders && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showInvoices}
                        onChange={(e) => setReportOptions({...reportOptions, showInvoices: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Purchase Invoices ({reportInvoices.length})</p>
                        <p className="text-sm text-gray-500">All purchase invoices with status</p>
                      </div>
                      {reportOptions.showInvoices && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showPayments}
                        onChange={(e) => setReportOptions({...reportOptions, showPayments: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Payment History ({reportPayments.length})</p>
                        <p className="text-sm text-gray-500">All payments made to supplier</p>
                      </div>
                      {reportOptions.showPayments && <Check size={18} className="text-emerald-600" />}
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateSupplierReport()
                  setShowReportModal(false)
                }}
                disabled={loadingReport}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Payment Method Modal */}
      {showInvoicePaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">Select Payment Method</h2>
              <button onClick={() => setShowInvoicePaymentModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-600">Invoice Total</p>
                <p className="text-3xl font-bold text-[#003366]">{calculateInvoiceTotal().toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${invoicePaymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={invoicePaymentMethod === 'cash'}
                    onChange={() => setInvoicePaymentMethod('cash')}
                    className="w-5 h-5 text-green-600"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Cash</p>
                    <p className="text-sm text-gray-500">Pay full amount now</p>
                  </div>
                  <DollarSign size={24} className={invoicePaymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'} />
                </label>

                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${invoicePaymentMethod === 'on_account' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={invoicePaymentMethod === 'on_account'}
                    onChange={() => setInvoicePaymentMethod('on_account')}
                    className="w-5 h-5 text-orange-600"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">On Account</p>
                    <p className="text-sm text-gray-500">
                      {(() => {
                        const supplier = suppliers.find(s => s.id === parseInt(invoiceForm.supplierId))
                        const credit = supplier?.creditBalance || 0
                        const total = calculateInvoiceTotal()
                        if (credit > 0) {
                          const willUse = Math.min(credit, total)
                          const remaining = total - willUse
                          return `Use ${willUse.toFixed(3)} credit${remaining > 0 ? `, ${remaining.toFixed(3)} to balance` : ' (fully paid)'}`
                        }
                        return 'Add to supplier balance'
                      })()}
                    </p>
                  </div>
                  <FileText size={24} className={invoicePaymentMethod === 'on_account' ? 'text-orange-600' : 'text-gray-400'} />
                </label>

                <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${invoicePaymentMethod === 'split' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={invoicePaymentMethod === 'split'}
                    onChange={() => setInvoicePaymentMethod('split')}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Split</p>
                    <p className="text-sm text-gray-500">Pay partial cash, rest on account</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${invoicePaymentMethod === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>50/50</div>
                </label>
              </div>

              {invoicePaymentMethod === 'split' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceCashAmount}
                      onChange={(e) => setInvoiceCashAmount(Math.min(parseFloat(e.target.value) || 0, calculateInvoiceTotal()))}
                      max={calculateInvoiceTotal()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">On Account:</span>
                    <span className="font-semibold text-orange-600">${(calculateInvoiceTotal() - invoiceCashAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvoicePaymentModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmInvoiceWithPayment}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#003366] text-white rounded-lg hover:bg-[#002244] disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {saving ? 'Saving...' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
