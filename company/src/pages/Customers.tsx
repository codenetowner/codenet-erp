import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Tags, X, Loader2, UserCheck, FileText, Printer, Check, DollarSign, Trash2, Eye, MapPin, Upload, Download, FileSpreadsheet, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { customersApi, warehousesApi, productsApi, suppliersApi } from '../lib/api'
import api from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface Customer {
  id: number
  name: string
  shopName: string | null
  phone: string | null
  email: string | null
  address: string | null
  locationLat: number | null
  locationLng: number | null
  locationUrl: string | null
  customerType: string
  warehouseId: number | null
  warehouseName: string | null
  creditLimit: number
  creditBalance: number
  debtBalance: number
  notes: string | null
  status: string
  supplierId: number | null
  supplierName: string | null
}

interface Warehouse { id: number; name: string }
interface SupplierOption { id: number; name: string }

interface Product { 
  id: number; name: string; sku: string; barcode: string | null; boxBarcode: string | null;
  baseUnit: string; secondUnit: string | null; unitsPerSecond: number;
  retailPrice: number; costPrice: number; 
  boxRetailPrice: number; boxCostPrice: number 
}

interface SpecialPrice {
  id: number
  productId: number
  productName: string
  productSku: string
  unitType: string
  regularPrice: number
  costPrice: number
  specialPrice: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
}

interface CustomerOrder {
  id: number
  orderNumber: string
  orderDate: string
  totalAmount: number
  paidAmount: number
  orderStatus: string
  paymentStatus: string
  items: { productName: string; quantity: number; unitPrice: number; total: number }[]
}

interface CustomerTask {
  id: number
  taskNumber: string
  scheduledDate: string
  total: number
  paidAmount: number
  debtAmount: number
  status: string
  paymentType: string
  items: { productName: string; quantity: number; unitPrice: number; total: number }[]
}

interface CustomerCollection {
  id: number
  collectionNumber: string
  collectionDate: string
  amount: number
  paymentType: string
  notes: string | null
}

interface CustomerReportOptions {
  showSummary: boolean
  showOrders: boolean
  showTasks: boolean
  showCollections: boolean
  showProducts: boolean
  showDebtHistory: boolean
}

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [debtFilter, setDebtFilter] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  // Special Pricing State
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [pricingCustomer, setPricingCustomer] = useState<Customer | null>(null)
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceFormData, setPriceFormData] = useState({ productId: '', unitType: 'piece', specialPrice: 0 })
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [mapsLinkStatus, setMapsLinkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Report State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCustomer, setReportCustomer] = useState<Customer | null>(null)
  const [reportOrders, setReportOrders] = useState<CustomerOrder[]>([])
  const [reportTasks, setReportTasks] = useState<CustomerTask[]>([])
  const [reportCollections, setReportCollections] = useState<CustomerCollection[]>([])
  const [supplierReport, setSupplierReport] = useState<any>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportOptions, setReportOptions] = useState<CustomerReportOptions>({
    showSummary: true,
    showOrders: true,
    showTasks: true,
    showCollections: true,
    showProducts: true,
    showDebtHistory: true
  })

  // Settle Debt State
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settlePaymentType, setSettlePaymentType] = useState('cash')
  const [settleNotes, setSettleNotes] = useState('')
  const [savingSettle, setSavingSettle] = useState(false)
  const [settleHistory, setSettleHistory] = useState<CustomerCollection[]>([])
  const [loadingSettleHistory, setLoadingSettleHistory] = useState(false)

  const [formData, setFormData] = useState({
    name: '', shopName: '', phone: '', email: '', address: '',
    customerType: 'Retail', warehouseId: '', creditLimit: 0,
    creditBalance: 0, debtBalance: 0, notes: '', status: 'active',
    supplierId: '', locationUrl: ''
  })

  // Bulk Upload State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ totalProcessed: number; successful: number; failed: number; errors: string[] } | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [custRes, whRes, suppRes] = await Promise.all([
        customersApi.getAll(),
        warehousesApi.getAll(),
        suppliersApi.getAll()
      ])
      setCustomers(custRes.data)
      setWarehouses(whRes.data.map((w: any) => ({ id: w.id, name: w.name })))
      setSuppliers(suppRes.data.map((s: any) => ({ id: s.id, name: s.name })))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.customerType = typeFilter
      if (warehouseFilter) params.warehouseId = warehouseFilter
      const res = await customersApi.getAll(params)
      setCustomers(res.data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    }
  }

  useEffect(() => { if (!loading) loadCustomers() }, [statusFilter, typeFilter, warehouseFilter])

  const filteredCustomers = customers.filter(c => {
    // Debt filter
    if (debtFilter && c.debtBalance <= 0) return false
    // Search filter
    if (search) {
      const s = search.toLowerCase()
      if (!(c.name.toLowerCase().includes(s) || c.shopName?.toLowerCase().includes(s) || c.phone?.includes(s))) return false
    }
    return true
  })

  // Print customers report
  const printCustomersReport = () => {
    const totalDebt = filteredCustomers.reduce((sum, c) => sum + c.debtBalance, 0)
    const totalCredit = filteredCustomers.reduce((sum, c) => sum + c.creditBalance, 0)
    const customersWithDebt = filteredCustomers.filter(c => c.debtBalance > 0).length
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customers Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; direction: ltr; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .filters-applied { background: #f0f9ff; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 11px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.red { color: #ef4444; }
          .summary-card .value.blue { color: #3b82f6; }
          .summary-card .value.green { color: #22c55e; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; font-size: 11px; }
          td { font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .debt { color: #ef4444; font-weight: bold; }
          .credit { color: #3b82f6; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Customers Report${debtFilter ? ' - Customers with Debt' : ''}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="filters-applied">
          <strong>Filters:</strong>
          ${debtFilter ? ' With Debt Only |' : ''}
          ${typeFilter ? ' Type: ' + typeFilter + ' |' : ''}
          ${statusFilter ? ' Status: ' + statusFilter + ' |' : ''}
          ${warehouseFilter ? ' Warehouse: ' + (warehouses.find(w => w.id.toString() === warehouseFilter)?.name || warehouseFilter) + ' |' : ''}
          ${search ? ' Search: "' + search + '" |' : ''}
          ${!debtFilter && !typeFilter && !statusFilter && !warehouseFilter && !search ? ' None (All Customers)' : ''}
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Customers</div>
            <div class="value">${filteredCustomers.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Customers with Debt</div>
            <div class="value red">${customersWithDebt}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Debt</div>
            <div class="value red">$${totalDebt.toFixed(3)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Credit</div>
            <div class="value blue">$${totalCredit.toFixed(3)}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Shop</th>
              <th>Phone</th>
              <th>Type</th>
              <th class="text-right">Credit (we owe)</th>
              <th class="text-right">Debt (they owe)</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers.map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${c.name}</td>
                <td>${c.shopName || '-'}</td>
                <td>${c.phone || '-'}</td>
                <td>${c.customerType}</td>
                <td class="text-right credit">$${c.creditBalance.toFixed(3)}</td>
                <td class="text-right ${c.debtBalance > 0 ? 'debt' : ''}">$${c.debtBalance.toFixed(3)}</td>
                <td class="text-center">${c.status}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="5">Total (${filteredCustomers.length} customers)</th>
              <th class="text-right credit">$${totalCredit.toFixed(3)}</th>
              <th class="text-right debt">$${totalDebt.toFixed(3)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          <p>Catalyst Customers Report - Confidential</p>
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

  const resetForm = () => setFormData({
    name: '', shopName: '', phone: '', email: '', address: '',
    customerType: 'Retail', warehouseId: '', creditLimit: 0,
    creditBalance: 0, debtBalance: 0, notes: '', status: 'active',
    supplierId: '', locationUrl: ''
  })

  const handleGoogleMapsLink = (url: string) => {
    if (!url.trim()) {
      setMapsLinkStatus('idle')
      return
    }
    // Just store the URL directly
    setFormData({ ...formData, locationUrl: url.trim() })
    setMapsLinkStatus('success')
  }

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust)
    setFormData({
      name: cust.name,
      shopName: cust.shopName || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      customerType: cust.customerType,
      warehouseId: cust.warehouseId?.toString() || '',
      creditLimit: cust.creditLimit,
      creditBalance: cust.creditBalance,
      debtBalance: cust.debtBalance,
      notes: cust.notes || '',
      status: cust.status,
      supplierId: cust.supplierId?.toString() || '',
      locationUrl: cust.locationUrl || ''
    })
    setMapsLinkStatus('idle')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      const data = {
        ...formData,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        locationUrl: formData.locationUrl || null
      }
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, data)
      } else {
        await customersApi.create(data)
      }
      setShowModal(false)
      resetForm()
      setEditingCustomer(null)
      loadCustomers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"? This action cannot be undone.`)) return
    try {
      await customersApi.delete(customer.id)
      loadCustomers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete customer. It may have related orders or transactions.')
    }
  }

  // Settle Debt Functions
  const handleOpenSettle = async (customer: Customer) => {
    setSettleCustomer(customer)
    setSettleAmount(customer.debtBalance > 0 ? customer.debtBalance.toString() : '')
    setSettlePaymentType('cash')
    setSettleNotes('')
    setSettleHistory([])
    setShowSettleModal(true)
    
    // Load collection history
    setLoadingSettleHistory(true)
    try {
      const res = await api.get(`/collections?customerId=${customer.id}`)
      setSettleHistory(res.data.map((c: any) => ({
        id: c.id,
        collectionNumber: c.collectionNumber,
        collectionDate: c.collectionDate,
        amount: c.amount,
        paymentType: c.paymentType,
        notes: c.notes
      })))
    } catch (error) {
      console.error('Failed to load collection history:', error)
    } finally {
      setLoadingSettleHistory(false)
    }
  }

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settleCustomer || !settleAmount) return
    
    const amount = parseFloat(settleAmount)
    if (amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    setSavingSettle(true)
    try {
      await api.post('/cash/collections', {
        customerId: settleCustomer.id,
        amount: amount,
        paymentType: settlePaymentType,
        collectionDate: new Date().toISOString(),
        collectionTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
        notes: settleNotes || `Debt settlement from company portal`
      })
      
      setShowSettleModal(false)
      setSettleCustomer(null)
      setSettleAmount('')
      loadCustomers()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to settle debt')
    } finally {
      setSavingSettle(false)
    }
  }

  // Special Pricing Functions
  const handleOpenPricing = async (customer: Customer) => {
    setPricingCustomer(customer)
    setShowPricingModal(true)
    setLoadingPrices(true)
    setPriceFormData({ productId: '', unitType: 'piece', specialPrice: 0 })
    setProductSearch('')
    setShowProductDropdown(false)
    try {
      const [pricesRes, productsRes] = await Promise.all([
        customersApi.getSpecialPrices(customer.id),
        productsApi.getAll()
      ])
      setSpecialPrices(pricesRes.data)
      setProducts(productsRes.data.map((p: any) => ({ 
        id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, boxBarcode: p.boxBarcode,
        baseUnit: p.baseUnit || 'Piece', secondUnit: p.secondUnit, unitsPerSecond: p.unitsPerSecond || 0,
        retailPrice: p.retailPrice, costPrice: p.costPrice || 0,
        boxRetailPrice: p.boxRetailPrice || 0, boxCostPrice: p.boxCostPrice || 0
      })))
    } catch (error) {
      console.error('Failed to load special prices:', error)
    } finally {
      setLoadingPrices(false)
    }
  }

  const handleAddSpecialPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingCustomer || !priceFormData.productId) return
    setSavingPrice(true)
    try {
      await customersApi.addSpecialPrice(pricingCustomer.id, {
        productId: parseInt(priceFormData.productId),
        unitType: priceFormData.unitType,
        specialPrice: priceFormData.specialPrice
      })
      // Reload prices
      const res = await customersApi.getSpecialPrices(pricingCustomer.id)
      setSpecialPrices(res.data)
      setPriceFormData({ productId: '', unitType: 'piece', specialPrice: 0 })
      setProductSearch('')
      setShowProductDropdown(false)
    } catch (error: any) {
      alert(error.response?.data?.message || error.response?.data || 'Failed to add special price')
    } finally {
      setSavingPrice(false)
    }
  }

  const handleDeleteSpecialPrice = async (priceId: number) => {
    if (!pricingCustomer || !confirm('Delete this special price?')) return
    try {
      await customersApi.deleteSpecialPrice(pricingCustomer.id, priceId)
      setSpecialPrices(specialPrices.filter(p => p.id !== priceId))
    } catch (error) {
      alert('Failed to delete special price')
    }
  }

  // Report Functions
  const handleOpenReport = async (customer: Customer) => {
    setReportCustomer(customer)
    setShowReportModal(true)
    setLoadingReport(true)
    setSupplierReport(null)
    
    try {
      const [ordersRes, tasksRes, collectionsRes, supplierRes] = await Promise.all([
        api.get(`/orders?customerId=${customer.id}`),
        api.get(`/tasks?customerId=${customer.id}&status=Completed`),
        api.get(`/collections?customerId=${customer.id}`),
        api.get(`/customers/${customer.id}/supplier-report`)
      ])
      
      setSupplierReport(supplierRes.data)
      
      setReportOrders(ordersRes.data.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        items: o.orderItems?.map((i: any) => ({
          productName: i.product?.name || 'Unknown',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total
        })) || []
      })))
      
      setReportTasks(tasksRes.data.map((t: any) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        scheduledDate: t.scheduledDate,
        total: t.total,
        paidAmount: t.paidAmount || 0,
        debtAmount: t.debtAmount || 0,
        status: t.status,
        paymentType: t.paymentType || 'cash',
        items: t.items?.map((i: any) => ({
          productName: i.productName || 'Unknown',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total
        })) || []
      })))
      
      setReportCollections(collectionsRes.data.map((c: any) => ({
        id: c.id,
        collectionNumber: c.collectionNumber,
        collectionDate: c.collectionDate,
        amount: c.amount,
        paymentType: c.paymentType,
        notes: c.notes
      })))
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoadingReport(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

  const generateCustomerReport = () => {
    if (!reportCustomer) return
    
    // Aggregate products purchased
    const productMap = new Map<string, { quantity: number; total: number }>()
    
    reportOrders.forEach(o => {
      o.items.forEach(item => {
        const existing = productMap.get(item.productName)
        if (existing) {
          existing.quantity += item.quantity
          existing.total += item.total
        } else {
          productMap.set(item.productName, { quantity: item.quantity, total: item.total })
        }
      })
    })
    
    reportTasks.forEach(t => {
      t.items.forEach(item => {
        const existing = productMap.get(item.productName)
        if (existing) {
          existing.quantity += item.quantity
          existing.total += item.total
        } else {
          productMap.set(item.productName, { quantity: item.quantity, total: item.total })
        }
      })
    })
    
    const productSummary = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
    
    // Calculate totals
    const totalOrders = reportOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalTasks = reportTasks.reduce((sum, t) => sum + t.total, 0)
    const totalPurchases = totalOrders + totalTasks
    const totalPaid = reportOrders.reduce((sum, o) => sum + o.paidAmount, 0) + 
                      reportTasks.reduce((sum, t) => sum + t.paidAmount, 0)
    const totalCollected = reportCollections.reduce((sum, c) => sum + c.amount, 0)
    const totalPayments = totalPaid + totalCollected
    
    // Calculate net balance (positive = they owe us, negative = we owe them)
    const customerOwesUs = reportCustomer.debtBalance // They owe us
    const weOweThem = reportCustomer.creditBalance // We owe them (advance/refund)
    const supplierBalance = supplierReport?.hasSupplier ? (supplierReport.supplier?.balance || 0) : 0 // We owe supplier
    const netBalance = customerOwesUs - weOweThem - supplierBalance
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Report - ${reportCustomer.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ec4899; padding-bottom: 10px; }
          .header h1 { font-size: 24px; color: #ec4899; margin-bottom: 5px; }
          .header p { color: #666; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); padding: 15px; border-radius: 8px; }
          .info-item .label { font-size: 10px; color: #be185d; text-transform: uppercase; }
          .info-item .value { font-weight: bold; }
          .info-item .customer-name { font-size: 18px; color: #be185d; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.pink { color: #ec4899; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .summary-card .value.blue { color: #3b82f6; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ec4899; padding-bottom: 5px; color: #ec4899; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #fdf2f8; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-paid { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
          .status-unpaid { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
          .status-partial { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          .net-balance-box { padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
          .net-balance-box.owes-us { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444; }
          .net-balance-box.we-owe { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; }
          .net-balance-box.balanced { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #94a3b8; }
          .net-balance-box h3 { font-size: 14px; margin-bottom: 5px; color: #666; }
          .net-balance-box .status-text { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .net-balance-box .amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
          .net-balance-box .amount.red { color: #dc2626; }
          .net-balance-box .amount.green { color: #16a34a; }
          .net-balance-box .breakdown { font-size: 11px; color: #666; margin-top: 15px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
          .net-balance-box .breakdown span { padding: 5px 10px; background: rgba(255,255,255,0.5); border-radius: 5px; }
          .row-highlight:hover { background: #fdf2f8; }
          .balance-cell { font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Customer Report</h1>
          <p>Customer Statement</p>
          <p style="margin-top: 5px; color: #666;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-item" style="grid-column: span 3;">
            <div class="customer-name">${reportCustomer.name}${reportCustomer.shopName ? ` - ${reportCustomer.shopName}` : ''}</div>
          </div>
          <div class="info-item">
            <div class="label">Phone</div>
            <div class="value">${reportCustomer.phone || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Email</div>
            <div class="value">${reportCustomer.email || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Address</div>
            <div class="value">${reportCustomer.address || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Type</div>
            <div class="value">${reportCustomer.customerType}</div>
          </div>
          <div class="info-item">
            <div class="label">Credit Limit</div>
            <div class="value">${formatCurrency(reportCustomer.creditLimit)}</div>
          </div>
          <div class="info-item">
            <div class="label">Status</div>
            <div class="value">${reportCustomer.status}</div>
          </div>
        </div>
        
        <div class="net-balance-box ${netBalance > 0 ? 'owes-us' : netBalance < 0 ? 'we-owe' : 'balanced'}">
          <h3>💰 NET BALANCE</h3>
          <div class="status-text">${netBalance > 0 ? '⚠️ This person OWES US' : netBalance < 0 ? '✅ We OWE this person' : '⚖️ Balanced'}</div>
          <div class="amount ${netBalance > 0 ? 'red' : 'green'}">${formatCurrency(Math.abs(netBalance))}</div>
          <div class="breakdown">
            <span>👤 Customer Debt: ${formatCurrency(customerOwesUs)}</span>
            <span>💳 Credit Balance: ${formatCurrency(weOweThem)}</span>
            ${supplierReport?.hasSupplier ? `<span>📦 Supplier Balance: ${formatCurrency(supplierBalance)}</span>` : ''}
          </div>
        </div>
        
        ${reportOptions.showSummary ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">📦 Total Purchases</div>
            <div class="value pink">${formatCurrency(totalPurchases)}</div>
          </div>
          <div class="summary-card">
            <div class="label">💵 Total Payments</div>
            <div class="value green">${formatCurrency(totalPayments)}</div>
          </div>
          <div class="summary-card">
            <div class="label">📋 Current Debt</div>
            <div class="value red">${formatCurrency(reportCustomer.debtBalance)}</div>
          </div>
          <div class="summary-card">
            <div class="label">💳 Credit Balance</div>
            <div class="value blue">${formatCurrency(reportCustomer.creditBalance)}</div>
          </div>
        </div>
        ` : ''}
        
        ${reportOptions.showProducts && productSummary.length > 0 ? `
        <div class="section">
          <h2>🛒 Products Purchased</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-center">Total Qty</th>
                <th class="text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${productSummary.map(p => `
                <tr class="row-highlight">
                  <td style="font-weight: 500;">${p.name}</td>
                  <td class="text-center">${p.quantity}</td>
                  <td class="text-right" style="font-weight: 500;">${formatCurrency(p.total)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <th colspan="2">Total</th>
                <th class="text-right" style="color: #ec4899;">${formatCurrency(productSummary.reduce((s, p) => s + p.total, 0))}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showOrders && reportOrders.length > 0 ? `
        <div class="section">
          <h2>📋 POS Orders (${reportOrders.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportOrders.map(o => `
                <tr class="row-highlight">
                  <td style="color: #ec4899; font-weight: 500;">${o.orderNumber}</td>
                  <td>${formatDate(o.orderDate)}</td>
                  <td class="text-right" style="font-weight: 500;">${formatCurrency(o.totalAmount)}</td>
                  <td class="text-right" style="color: #22c55e;">${formatCurrency(o.paidAmount)}</td>
                  <td class="text-right" style="color: #ef4444;">${formatCurrency(o.totalAmount - o.paidAmount)}</td>
                  <td class="text-center">
                    <span class="${o.paymentStatus === 'paid' ? 'status-paid' : o.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">${o.paymentStatus.toUpperCase()}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalOrders)}</th>
                <th class="text-right" style="color: #22c55e;">${formatCurrency(reportOrders.reduce((s, o) => s + o.paidAmount, 0))}</th>
                <th class="text-right" style="color: #ef4444;">${formatCurrency(totalOrders - reportOrders.reduce((s, o) => s + o.paidAmount, 0))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showTasks && reportTasks.length > 0 ? `
        <div class="section">
          <h2>🚚 Delivery Tasks (${reportTasks.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Task #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportTasks.map(t => `
                <tr class="row-highlight">
                  <td style="color: #ec4899; font-weight: 500;">${t.taskNumber}</td>
                  <td>${formatDate(t.scheduledDate)}</td>
                  <td class="text-right" style="font-weight: 500;">${formatCurrency(t.total)}</td>
                  <td class="text-right" style="color: #22c55e;">${formatCurrency(t.paidAmount)}</td>
                  <td class="text-right" style="color: #ef4444;">${formatCurrency(t.debtAmount)}</td>
                  <td class="text-center">
                    <span class="${t.debtAmount === 0 ? 'status-paid' : t.paidAmount > 0 ? 'status-partial' : 'status-unpaid'}">${t.debtAmount === 0 ? 'PAID' : t.paidAmount > 0 ? 'PARTIAL' : 'UNPAID'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalTasks)}</th>
                <th class="text-right" style="color: #22c55e;">${formatCurrency(reportTasks.reduce((s, t) => s + t.paidAmount, 0))}</th>
                <th class="text-right" style="color: #ef4444;">${formatCurrency(reportTasks.reduce((s, t) => s + t.debtAmount, 0))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showCollections && reportCollections.length > 0 ? `
        <div class="section">
          <h2>💰 Debt Collections (${reportCollections.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Collection #</th>
                <th>Date</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Payment Type</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportCollections.map(c => `
                <tr class="row-highlight">
                  <td style="color: #ec4899; font-weight: 500;">${c.collectionNumber}</td>
                  <td>${formatDate(c.collectionDate)}</td>
                  <td class="text-right" style="color: #22c55e; font-weight: 500;">${formatCurrency(c.amount)}</td>
                  <td class="text-center"><span class="status-paid">${c.paymentType.toUpperCase()}</span></td>
                  <td>${c.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold;">
                <th colspan="2">Total Collected</th>
                <th class="text-right" style="color: #22c55e;">${formatCurrency(totalCollected)}</th>
                <th colspan="2"></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${supplierReport?.hasSupplier ? `
        <div class="section" style="border-top: 3px solid #f59e0b; padding-top: 20px; margin-top: 20px;">
          <h2 style="color: #f59e0b;">📦 Linked Supplier: ${supplierReport.supplier.name}</h2>
          <p style="color: #666; margin-bottom: 15px;">This customer is also registered as a supplier. Below is their supplier activity.</p>
          
          <div class="summary-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="summary-card">
              <div class="label">Total Invoices</div>
              <div class="value red">${formatCurrency(supplierReport.totalInvoices)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Paid</div>
              <div class="value green">${formatCurrency(supplierReport.totalPaid)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Supplier Balance</div>
              <div class="value ${supplierReport.supplier.balance > 0 ? 'red' : 'green'}">${formatCurrency(supplierReport.supplier.balance)}</div>
            </div>
          </div>
          
          ${supplierReport.invoices?.length > 0 ? `
          <h3 style="margin-top: 15px; margin-bottom: 10px;">Purchase Invoices (${supplierReport.invoices.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${supplierReport.invoices.map((inv: any) => `
                <tr class="row-highlight">
                  <td style="color: #f59e0b; font-weight: 500;">${inv.invoiceNumber}</td>
                  <td>${formatDate(inv.invoiceDate)}</td>
                  <td class="text-right" style="font-weight: 500;">${formatCurrency(inv.totalAmount)}</td>
                  <td class="text-right" style="color: #22c55e;">${formatCurrency(inv.paidAmount)}</td>
                  <td class="text-right" style="color: #ef4444;">${formatCurrency(inv.totalAmount - inv.paidAmount)}</td>
                  <td class="text-center">
                    <span class="${inv.paymentStatus === 'paid' ? 'status-paid' : inv.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">${inv.paymentStatus.toUpperCase()}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          
          ${supplierReport.payments?.length > 0 ? `
          <h3 style="margin-top: 15px; margin-bottom: 10px;">Supplier Payments (${supplierReport.payments.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${supplierReport.payments.map((pay: any) => `
                <tr class="row-highlight">
                  <td style="color: #f59e0b; font-weight: 500;">${pay.paymentNumber}</td>
                  <td>${formatDate(pay.paymentDate)}</td>
                  <td class="text-right" style="color: #22c55e; font-weight: 500;">${formatCurrency(pay.amount)}</td>
                  <td class="text-center"><span class="status-paid">${pay.method.toUpperCase()}</span></td>
                  <td>${pay.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Customer Report - Confidential</p>
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

  // Get available products - show all products, we'll check unit availability when adding
  // A product can have both piece and box special prices
  const availableProducts = products

  // Bulk Upload Functions
  const handleDownloadTemplate = () => {
    window.open(`${api.defaults.baseURL}/customers/template`, '_blank')
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      
      const res = await api.post('/customers/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setUploadResult(res.data)
      if (res.data.successful > 0) {
        loadCustomers() // Reload customers list
      }
    } catch (error: any) {
      setUploadResult({
        totalProcessed: 0,
        successful: 0,
        failed: 1,
        errors: [error.response?.data?.message || 'Upload failed']
      })
    } finally {
      setUploading(false)
    }
  }

  const closeBulkUploadModal = () => {
    setShowBulkUploadModal(false)
    setUploadFile(null)
    setUploadResult(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="text-blue-600" /> Customers
        </h1>
        <PermissionGate permission={PERMISSIONS.CREATE_CUSTOMERS}>
          <div className="flex gap-2">
            <button onClick={() => setShowBulkUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Upload size={20} /> Bulk Upload
            </button>
            <button onClick={() => { resetForm(); setEditingCustomer(null); setMapsLinkStatus('idle'); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
              <Plus size={20} /> Add Customer
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Types</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Special">Special</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={debtFilter} onChange={(e) => setDebtFilter(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
            <DollarSign size={16} className="text-red-500" />
            <span className="text-sm font-medium text-gray-700">With Debt</span>
          </label>
          <button onClick={printCustomersReport} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <Printer size={18} /> Print Report
          </button>
        </div>
        {/* Filter summary */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
          <span>Showing <strong>{filteredCustomers.length}</strong> of {customers.length} customers</span>
          {debtFilter && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Debt Only</span>}
          <span className="text-red-600 font-medium">Total Debt: ${filteredCustomers.reduce((s, c) => s + c.debtBalance, 0).toFixed(3)}</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Credit (we owe)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Debts (they owe)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No customers found</td></tr>
              ) : filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/tasks?customer=${c.id}`)} 
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded" 
                        title="View Orders"
                      >
                        <Eye size={14} />
                      </button>
                      {c.locationUrl && (
                        <a 
                          href={c.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="View on Map"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin size={14} />
                        </a>
                      )}
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">{c.shopName || '-'}</td>
                  <td className="px-4 py-3">{c.phone || '-'}</td>
                  <td className="px-4 py-3">{c.customerType}</td>
                  <td className="px-4 py-3">{c.warehouseName || '-'}</td>
                  <td className="px-4 py-3 text-blue-600">${c.creditBalance.toFixed(3)}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">${c.debtBalance.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <PermissionGate permission={PERMISSIONS.EDIT_CUSTOMERS}>
                        <button onClick={() => handleEditCustomer(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.MANAGE_SPECIAL_PRICES}>
                        <button onClick={() => handleOpenPricing(c)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Special Pricing"><Tags size={16} /></button>
                      </PermissionGate>
                      {c.debtBalance > 0 && (
                        <button onClick={() => handleOpenSettle(c)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Settle Debt"><DollarSign size={16} /></button>
                      )}
                      <button onClick={() => navigate(`/customer-report/${c.id}`)} className="p-1 text-pink-600 hover:bg-pink-50 rounded" title="View Report"><BarChart3 size={16} /></button>
                      <button onClick={() => handleOpenReport(c)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Print Report"><FileText size={16} /></button>
                      <PermissionGate permission={PERMISSIONS.EDIT_CUSTOMERS}>
                        <button onClick={() => handleDeleteCustomer(c)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                  <input type="text" value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter shop name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter phone" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter email" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📍 Google Maps Link</label>
                <input 
                  type="text" 
                  onChange={(e) => handleGoogleMapsLink(e.target.value)} 
                  className={`w-full px-3 py-2 border rounded-lg ${
                    mapsLinkStatus === 'success' ? 'border-green-500 bg-green-50' : 
                    mapsLinkStatus === 'error' ? 'border-red-500 bg-red-50' : 
                    mapsLinkStatus === 'loading' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  placeholder="Paste Google Maps link here to auto-fill coordinates" 
                />
                {mapsLinkStatus === 'success' && (
                  <span className="text-xs text-green-600">✓ Location URL saved!</span>
                )}
                {mapsLinkStatus === 'idle' && (
                  <span className="text-xs text-gray-500">Paste any Google Maps link (short or full URL)</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                  <select value={formData.customerType} onChange={(e) => setFormData({...formData, customerType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Warehouse</label>
                  <select value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Supplier (Same Person)</label>
                <select value={formData.supplierId} onChange={(e) => setFormData({...formData, supplierId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">No Supplier Link</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span className="text-xs text-gray-500">If this customer is also a supplier, link them for combined reports</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <input type="number" step="0.01" value={formData.creditLimit} onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit (we owe them)</label>
                  <input type="number" step="0.01" value={formData.creditBalance} onChange={(e) => setFormData({...formData, creditBalance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <span className="text-xs text-gray-500">Advance or refund amount</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Debts (they owe us)</label>
                  <input type="number" step="0.01" value={formData.debtBalance} onChange={(e) => setFormData({...formData, debtBalance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <span className="text-xs text-gray-500">Unpaid invoices</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Enter notes" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.status === 'active'} onChange={(e) => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})} className="rounded" />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Special Pricing Modal */}
      {showPricingModal && pricingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
              <h2 className="text-lg font-semibold">Special Pricing — {pricingCustomer.name}</h2>
              <button onClick={() => setShowPricingModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Add New Special Price */}
              <form onSubmit={handleAddSpecialPrice} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Add Special Price</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <label className="block text-sm text-gray-600 mb-1">Search Product (name, code, or barcode)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setShowProductDropdown(true)
                          // Clear selection if user is typing
                          if (priceFormData.productId) {
                            setPriceFormData({ productId: '', unitType: 'piece', specialPrice: 0 })
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Type to search..."
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg ${priceFormData.productId ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                      />
                    </div>
                    {/* Dropdown */}
                    {showProductDropdown && productSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availableProducts
                          .filter(p => {
                            const search = productSearch.toLowerCase()
                            return p.name.toLowerCase().includes(search) ||
                                   p.sku.toLowerCase().includes(search) ||
                                   (p.barcode && p.barcode.toLowerCase().includes(search)) ||
                                   (p.boxBarcode && p.boxBarcode.toLowerCase().includes(search))
                          })
                          .slice(0, 10)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                // Check if search matches box barcode - auto-select box unit
                                const searchLower = productSearch.toLowerCase()
                                const isBoxSearch = p.boxBarcode && p.boxBarcode.toLowerCase().includes(searchLower)
                                const unitType = isBoxSearch && p.secondUnit ? 'box' : 'piece'
                                const price = unitType === 'box' ? p.boxRetailPrice : p.retailPrice
                                setPriceFormData({
                                  productId: p.id.toString(),
                                  unitType,
                                  specialPrice: price
                                })
                                setProductSearch(`${p.name} (${p.sku})${unitType === 'box' ? ` - ${p.secondUnit}` : ''}`)
                                setShowProductDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{p.name}</span>
                                {/* Show which units already have special prices */}
                                <div className="flex gap-1">
                                  {specialPrices.some(sp => sp.productId === p.id && sp.unitType === 'piece') && (
                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">Piece ✓</span>
                                  )}
                                  {specialPrices.some(sp => sp.productId === p.id && sp.unitType === 'box') && (
                                    <span className="px-1.5 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">Box ✓</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                Code: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`} {p.boxBarcode && `| Box: ${p.boxBarcode}`}
                              </div>
                              <div className="text-xs">
                                <span className="text-blue-600">Retail: ${p.retailPrice.toFixed(3)}</span>
                                <span className="text-red-600 ml-2">Cost: ${p.costPrice.toFixed(3)}</span>
                                {p.secondUnit && <span className="text-purple-600 ml-2">Box: ${p.boxRetailPrice.toFixed(3)}</span>}
                              </div>
                            </div>
                          ))
                        }
                        {availableProducts.filter(p => {
                          const search = productSearch.toLowerCase()
                          return p.name.toLowerCase().includes(search) ||
                                 p.sku.toLowerCase().includes(search) ||
                                 (p.barcode && p.barcode.toLowerCase().includes(search)) ||
                                 (p.boxBarcode && p.boxBarcode.toLowerCase().includes(search))
                        }).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500">No products found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Unit Type Selector - only show if product has second unit */}
                  {priceFormData.productId && (() => {
                    const product = products.find(p => p.id === parseInt(priceFormData.productId))
                    if (!product?.secondUnit || product.unitsPerSecond <= 0) return null
                    return (
                      <div className="w-28">
                        <label className="block text-sm text-gray-600 mb-1">Unit</label>
                        <select
                          value={priceFormData.unitType}
                          onChange={(e) => {
                            const newUnitType = e.target.value
                            const retailPrice = newUnitType === 'box' ? product.boxRetailPrice : product.retailPrice
                            setPriceFormData({...priceFormData, unitType: newUnitType, specialPrice: retailPrice})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="piece">{product.baseUnit}</option>
                          <option value="box">{product.secondUnit}</option>
                        </select>
                      </div>
                    )
                  })()}
                  <div className="w-28">
                    <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                    <select
                      value={priceFormData.productId ? (() => {
                        const product = products.find(p => p.id === parseInt(priceFormData.productId))
                        const retailPrice = priceFormData.unitType === 'box' ? product?.boxRetailPrice : product?.retailPrice
                        return Math.round((1 - priceFormData.specialPrice / (retailPrice || 1)) * 100)
                      })() : ''}
                      onChange={(e) => {
                        const discount = parseInt(e.target.value) || 0
                        const product = products.find(p => p.id === parseInt(priceFormData.productId))
                        if (product) {
                          const retailPrice = priceFormData.unitType === 'box' ? product.boxRetailPrice : product.retailPrice
                          const newPrice = retailPrice * (1 - discount / 100)
                          setPriceFormData({...priceFormData, specialPrice: Math.round(newPrice * 100) / 100})
                        }
                      }}
                      disabled={!priceFormData.productId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                    >
                      <option value="">--</option>
                      {[...Array(50)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}%</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-sm text-gray-600 mb-1">Special Price</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min={priceFormData.productId ? (() => {
                        const product = products.find(p => p.id === parseInt(priceFormData.productId))
                        return priceFormData.unitType === 'box' ? product?.boxCostPrice : product?.costPrice
                      })() || 0 : 0}
                      value={priceFormData.specialPrice || ''} 
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                        const product = products.find(p => p.id === parseInt(priceFormData.productId))
                        const minPrice = priceFormData.unitType === 'box' ? (product?.boxCostPrice || 0) : (product?.costPrice || 0)
                        // Prevent going below cost
                        if (value < minPrice && value !== 0) {
                          setPriceFormData({...priceFormData, specialPrice: minPrice})
                        } else {
                          setPriceFormData({...priceFormData, specialPrice: value})
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        priceFormData.productId && priceFormData.specialPrice > 0 && (() => {
                          const product = products.find(p => p.id === parseInt(priceFormData.productId))
                          const costPrice = priceFormData.unitType === 'box' ? product?.boxCostPrice : product?.costPrice
                          return priceFormData.specialPrice <= (costPrice || 0)
                        })()
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={savingPrice || !priceFormData.productId || (priceFormData.specialPrice > 0 && (() => {
                      const product = products.find(p => p.id === parseInt(priceFormData.productId))
                      const costPrice = priceFormData.unitType === 'box' ? product?.boxCostPrice : product?.costPrice
                      return priceFormData.specialPrice < (costPrice || 0)
                    })())}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {savingPrice ? 'Adding...' : 'Add'}
                  </button>
                </div>
                {/* Cost Info when product selected */}
                {priceFormData.productId && (() => {
                  const product = products.find(p => p.id === parseInt(priceFormData.productId))
                  if (!product) return null
                  const costPrice = priceFormData.unitType === 'box' ? product.boxCostPrice : product.costPrice
                  const retailPrice = priceFormData.unitType === 'box' ? product.boxRetailPrice : product.retailPrice
                  const profit = priceFormData.specialPrice - costPrice
                  const profitPercent = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : '0'
                  const unitLabel = priceFormData.unitType === 'box' ? (product.secondUnit || 'Box') : product.baseUnit
                  return (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm flex items-center justify-between">
                      <div>
                        <span className="text-gray-500 text-xs mr-2">({unitLabel})</span>
                        <span className="text-gray-600">Cost: </span>
                        <span className="font-semibold text-red-600">${costPrice.toFixed(3)}</span>
                        <span className="text-gray-400 mx-2">|</span>
                        <span className="text-gray-600">Retail: </span>
                        <span className="font-semibold text-blue-600">${retailPrice.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Your Profit: </span>
                        <span className={`font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${profit.toFixed(3)} ({profitPercent}%)
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </form>

              {/* Special Prices List */}
              {loadingPrices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : specialPrices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Tags size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No special prices set for this customer.</p>
                  <p className="text-sm">Add products above to give this customer special pricing.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Regular</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Special</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Discount</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {specialPrices.map((sp) => {
                        const discount = sp.regularPrice > 0 ? ((sp.regularPrice - sp.specialPrice) / sp.regularPrice * 100).toFixed(1) : '0'
                        return (
                          <tr key={sp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{sp.productName}</div>
                              <div className="text-xs text-gray-500">{sp.productSku}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${sp.unitType === 'box' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {sp.unitType === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">${sp.regularPrice.toFixed(3)}</td>
                            <td className="px-4 py-3 text-right font-medium text-purple-600">${sp.specialPrice.toFixed(3)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                -{discount}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => handleDeleteSpecialPrice(sp.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-4 border-t">
                <button onClick={() => setShowPricingModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Report Modal */}
      {showReportModal && reportCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-bold">Customer Report</h2>
                    <p className="text-sm text-gray-500">{reportCustomer.name}</p>
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
                        <span className="text-gray-500">Orders:</span>
                        <span className="ml-2 font-medium">{reportOrders.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tasks:</span>
                        <span className="ml-2 font-medium">{reportTasks.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Collections:</span>
                        <span className="ml-2 font-medium">{reportCollections.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Debt:</span>
                        <span className="ml-2 font-medium text-red-600">${reportCustomer.debtBalance.toFixed(3)}</span>
                      </div>
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
                        <p className="text-sm text-gray-500">Total purchases, payments, debt</p>
                      </div>
                      {reportOptions.showSummary && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showProducts}
                        onChange={(e) => setReportOptions({...reportOptions, showProducts: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Products Purchased</p>
                        <p className="text-sm text-gray-500">All items bought by this customer</p>
                      </div>
                      {reportOptions.showProducts && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showOrders}
                        onChange={(e) => setReportOptions({...reportOptions, showOrders: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">POS Orders ({reportOrders.length})</p>
                        <p className="text-sm text-gray-500">All POS sale orders</p>
                      </div>
                      {reportOptions.showOrders && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showTasks}
                        onChange={(e) => setReportOptions({...reportOptions, showTasks: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Delivery Tasks ({reportTasks.length})</p>
                        <p className="text-sm text-gray-500">All delivery task sales</p>
                      </div>
                      {reportOptions.showTasks && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showCollections}
                        onChange={(e) => setReportOptions({...reportOptions, showCollections: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Debt Collections ({reportCollections.length})</p>
                        <p className="text-sm text-gray-500">Payment collection history</p>
                      </div>
                      {reportOptions.showCollections && <Check size={18} className="text-emerald-600" />}
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
                  generateCustomerReport()
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

      {/* Settle Debt Modal */}
      {showSettleModal && settleCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-orange-600 text-white">
              <h2 className="text-lg font-semibold">Settle Debt — {settleCustomer.name}</h2>
              <button onClick={() => setShowSettleModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Collection Form */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">New Collection</h3>
                  <form onSubmit={handleSettleDebt} className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Debt:</span>
                        <span className="text-xl font-bold text-red-600">${settleCustomer.debtBalance.toFixed(3)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Collect *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={settleCustomer.debtBalance}
                        required
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        value={settlePaymentType}
                        onChange={(e) => setSettlePaymentType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="credit_card">Credit Card</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={settleNotes}
                        onChange={(e) => setSettleNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                        placeholder="Optional notes..."
                      />
                    </div>
                    
                    {parseFloat(settleAmount) > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Remaining Debt:</span>
                          <span className="text-xl font-bold text-green-600">
                            ${Math.max(0, settleCustomer.debtBalance - parseFloat(settleAmount || '0')).toFixed(3)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSettleModal(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSettle || !settleAmount || parseFloat(settleAmount) <= 0}
                        className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {savingSettle ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />}
                        {savingSettle ? 'Processing...' : 'Collect'}
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Collection History */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Collection History</h3>
                  {loadingSettleHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                    </div>
                  ) : settleHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      No collection history
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {settleHistory.map(c => (
                        <div key={c.id} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{c.collectionNumber}</p>
                              <p className="text-sm text-gray-500">{new Date(c.collectionDate).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400 capitalize">{c.paymentType.replace('_', ' ')}</p>
                            </div>
                            <span className="font-bold text-green-600">${c.amount.toFixed(3)}</span>
                          </div>
                          {c.notes && <p className="text-xs text-gray-500 mt-1 truncate">{c.notes}</p>}
                        </div>
                      ))}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Total Collected</span>
                          <span className="font-bold text-green-700">${settleHistory.reduce((sum, c) => sum + c.amount, 0).toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet size={24} /> Bulk Upload Customers
              </h2>
              <button onClick={closeBulkUploadModal}><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Step 1: Download Template</h3>
                <p className="text-sm text-blue-600 mb-3">Download the Excel template, fill in your customer data, then upload it.</p>
                <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Download size={18} /> Download Template
                </button>
              </div>

              {/* Upload File */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Step 2: Upload Filled Template</h3>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {uploadFile.name}</p>
                )}
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`rounded-lg p-4 ${uploadResult.successful > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h3 className={`font-medium mb-2 ${uploadResult.successful > 0 ? 'text-green-800' : 'text-red-800'}`}>
                    Upload Results
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Total Processed:</span> {uploadResult.totalProcessed}</p>
                    <p className="text-green-600"><span className="font-medium">Successful:</span> {uploadResult.successful}</p>
                    <p className="text-red-600"><span className="font-medium">Failed:</span> {uploadResult.failed}</p>
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-red-700 mb-1">Errors:</p>
                      <ul className="text-xs text-red-600 max-h-32 overflow-y-auto space-y-1">
                        {uploadResult.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={closeBulkUploadModal} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Close
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
