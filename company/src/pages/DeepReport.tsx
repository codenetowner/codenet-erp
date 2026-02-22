import { useState, useEffect } from 'react'
import { 
  Search, Calendar, Eye, Trash2,
  ChevronLeft, ChevronRight, Receipt, User, Users,
  Package, DollarSign, CreditCard, Clock, Truck, ShoppingCart, Wallet,
  Printer, X, TrendingUp, Box, FileText, Check, RotateCcw
} from 'lucide-react'
import api, { employeesApi, expensesApi, employeePaymentsApi, settingsApi } from '../lib/api'

interface TransactionItem {
  id: number
  productId: number
  productName: string
  unitType: string
  quantity: number
  unitPrice: number
  discountAmount: number
  total: number
  costPrice: number
  currency: string
}

interface ProductSummary {
  productId: number
  productName: string
  totalQuantity: number
  totalSales: number
  totalCost: number
  profit: number
}

interface WarehouseStock {
  id: number
  name: string
  quantity: number
}

interface VanStock {
  id: number
  name: string
  quantity: number
}

interface ProductInventory {
  productId: number
  productName: string
  warehouses: WarehouseStock[]
  vans: VanStock[]
}

interface ReportOptions {
  showSummary: boolean
  showTransactions: boolean
  showProducts: boolean
  showInventory: boolean
  showProfit: boolean
  showCost: boolean
}

interface Transaction {
  id: number
  type: 'order' | 'task' | 'collection' | 'return_exchange'
  referenceNumber: string
  customerId: number | null
  customerName: string
  driverId: number | null
  driverName: string
  date: string
  totalAmount: number
  paidAmount: number
  debtAmount: number
  paymentType: string
  status: string
  notes: string | null
  items: TransactionItem[]
  returnTotal?: number
  exchangeTotal?: number
  paymentCurrencies?: { currency: string; amount: number }[] | null
  exchangeRateSnapshot?: Record<string, number> | null
}

interface Driver {
  id: number
  name: string
}

export default function DeepReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [typeFilter, setTypeFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    showSummary: true,
    showTransactions: true,
    showProducts: true,
    showInventory: true,
    showProfit: true,
    showCost: true
  })
  const [productInventory, setProductInventory] = useState<ProductInventory[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [salaryBreakdown, setSalaryBreakdown] = useState<{ salary: number; advance: number; bonus: number; deduction: number; total: number }>({ salary: 0, advance: 0, bonus: 0, deduction: 0, total: 0 })
  const [companySettings, setCompanySettings] = useState<{ name: string; phone: string; address: string }>({ name: '', phone: '', address: '' })

  useEffect(() => {
    loadDrivers()
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      const res = await settingsApi.get()
      setCompanySettings({
        name: res.data.companyName || '',
        phone: res.data.phone || '',
        address: res.data.address || ''
      })
    } catch (error) {
      console.error('Failed to load company settings:', error)
    }
  }

  useEffect(() => {
    loadTransactions()
    loadExpenses()
    loadSalaries()
  }, [startDate, endDate, typeFilter, driverFilter])

  const loadExpenses = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await expensesApi.getAll(params)
      const total = res.data.reduce((sum: number, e: any) => sum + e.amount, 0)
      setTotalExpenses(total)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  const loadSalaries = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const payments = await employeePaymentsApi.getAll(params)
      const breakdown = { salary: 0, advance: 0, bonus: 0, deduction: 0, total: 0 }
      payments.forEach((p: any) => {
        const amount = p.amount || 0
        // Deductions are NOT money paid out - they only reduce what's owed to employee
        // So we track them separately but don't add to total
        if (p.paymentType === 'salary') {
          breakdown.salary += amount
          breakdown.total += amount
        } else if (p.paymentType === 'advance') {
          breakdown.advance += amount
          breakdown.total += amount
        } else if (p.paymentType === 'bonus') {
          breakdown.bonus += amount
          breakdown.total += amount
        } else if (p.paymentType === 'deduction') {
          breakdown.deduction += amount
          // NOT added to total - deductions don't represent money going out
        } else {
          breakdown.salary += amount
          breakdown.total += amount
        }
      })
      setSalaryBreakdown(breakdown)
    } catch (error) {
      console.error('Failed to load salaries:', error)
    }
  }

  const loadDrivers = async () => {
    try {
      const res = await employeesApi.getAll()
      setDrivers(res.data.filter((e: any) => e.isDriver).map((e: any) => ({ id: e.id, name: e.name })))
    } catch (error) {
      console.error('Failed to load drivers:', error)
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const allTransactions: Transaction[] = []

      // Load Orders (POS)
      if (!typeFilter || typeFilter === 'order') {
        const orderParams = new URLSearchParams()
        if (startDate) orderParams.append('startDate', startDate)
        if (endDate) orderParams.append('endDate', endDate)
        if (driverFilter) orderParams.append('driverId', driverFilter)
        
        const ordersRes = await api.get(`/orders?${orderParams.toString()}`)
        ordersRes.data.forEach((order: any) => {
          const items = (order.items || order.orderItems)?.map((i: any) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName || i.product?.name || 'Unknown',
            unitType: i.unitType || 'piece',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountAmount: i.discountAmount || 0,
            total: i.total,
            costPrice: i.costPrice || i.product?.costPrice || 0,
            currency: i.currency || 'USD'
          })) || []

          // Convert totalAmount to base currency if exchange rate snapshot exists
          let exchangeRates: Record<string, number> | null = null
          if (order.exchangeRateSnapshot) {
            try { exchangeRates = JSON.parse(order.exchangeRateSnapshot) } catch {}
          }

          let totalInBase = order.totalAmount
          if (exchangeRates && items.length > 0) {
            totalInBase = items.reduce((sum: number, item: any) => {
              const rate = exchangeRates![item.currency] || 1
              return sum + (item.total / rate)
            }, 0)
          }

          allTransactions.push({
            id: order.id,
            type: 'order',
            referenceNumber: order.orderNumber,
            customerId: order.customerId,
            customerName: order.customer?.name || order.customerName || 'Walk-in',
            driverId: order.driverId,
            driverName: order.driver?.name || order.driverName || '-',
            date: order.orderDate,
            totalAmount: totalInBase,
            paidAmount: order.paidAmount,
            debtAmount: Math.max(0, totalInBase - order.paidAmount),
            paymentType: order.paymentStatus === 'paid' ? 'cash' : order.paymentStatus,
            status: order.orderStatus,
            notes: order.notes,
            items,
            paymentCurrencies: order.paymentCurrencies ? JSON.parse(order.paymentCurrencies) : null,
            exchangeRateSnapshot: exchangeRates
          })
        })
      }

      // Load Completed Tasks
      if (!typeFilter || typeFilter === 'task') {
        const taskParams = new URLSearchParams()
        if (startDate) taskParams.append('startDate', startDate)
        if (endDate) taskParams.append('endDate', endDate)
        if (driverFilter) taskParams.append('driverId', driverFilter)
        taskParams.append('status', 'Completed')
        
        const tasksRes = await api.get(`/tasks?${taskParams.toString()}`)
        tasksRes.data.forEach((task: any) => {
          if (task.total > 0) { // Only tasks with sales
            allTransactions.push({
              id: task.id,
              type: 'task',
              referenceNumber: task.taskNumber,
              customerId: task.customerId,
              customerName: task.customerName || task.customer?.name || '-',
              driverId: task.driverId,
              driverName: task.driverName || task.driver?.name || '-',
              date: task.scheduledDate,
              totalAmount: task.total,
              paidAmount: task.paidAmount || task.total,
              debtAmount: task.debtAmount || 0,
              paymentType: task.paymentType || 'cash',
              status: task.status,
              notes: task.notes,
              items: task.items?.map((i: any) => ({
                id: i.id,
                productId: i.productId,
                productName: i.product?.name || i.productName || 'Unknown',
                unitType: i.unitType || 'piece',
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountAmount: i.discountPercent || 0,
                total: i.total,
                costPrice: i.costPrice || i.product?.costPrice || 0,
                currency: i.currency || 'USD'
              })) || []
            })
          }
        })
      }

      // Load Collections
      if (!typeFilter || typeFilter === 'collection') {
        const collParams = new URLSearchParams()
        if (startDate) collParams.append('startDate', startDate)
        if (endDate) collParams.append('endDate', endDate)
        if (driverFilter) collParams.append('driverId', driverFilter)
        
        const collectionsRes = await api.get(`/collections?${collParams.toString()}`)
        collectionsRes.data.forEach((coll: any) => {
          allTransactions.push({
            id: coll.id,
            type: 'collection',
            referenceNumber: coll.collectionNumber,
            customerId: coll.customerId,
            customerName: coll.customer?.name || coll.customerName || '-',
            driverId: coll.driverId,
            driverName: coll.driver?.name || coll.driverName || '-',
            date: coll.collectionDate,
            totalAmount: coll.amount,
            paidAmount: coll.amount,
            debtAmount: 0,
            paymentType: coll.paymentType || 'cash',
            status: 'collected',
            notes: coll.notes,
            items: []
          })
        })
      }

      // Load Return/Exchanges
      if (!typeFilter || typeFilter === 'return_exchange') {
        const rxParams = new URLSearchParams()
        if (startDate) rxParams.append('startDate', startDate)
        if (endDate) rxParams.append('endDate', endDate)
        
        try {
          const rxRes = await api.get(`/direct-sales/return-exchanges?${rxParams.toString()}`)
          rxRes.data.forEach((rx: any) => {
            allTransactions.push({
              id: rx.id,
              type: 'return_exchange',
              referenceNumber: rx.transactionNumber,
              customerId: rx.customerId,
              customerName: rx.customerName || '-',
              driverId: null,
              driverName: '-',
              date: rx.transactionDate,
              totalAmount: rx.netAmount,
              paidAmount: rx.netAmount >= 0 ? rx.paymentAmount : 0,
              debtAmount: rx.netAmount < 0 ? Math.abs(rx.netAmount) : 0,
              paymentType: rx.netAmount < 0 ? 'refund' : (rx.netAmount > 0 ? 'payment' : 'even'),
              status: rx.status,
              notes: `Return: ${rx.returnTotal?.toFixed(3) || '0.000'} | Exchange: ${rx.exchangeTotal?.toFixed(3) || '0.000'}`,
              items: [],
              returnTotal: rx.returnTotal || 0,
              exchangeTotal: rx.exchangeTotal || 0
            })
          })
        } catch (e) {
          console.log('Return exchanges not available')
        }
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(allTransactions)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewTransaction = async (transaction: Transaction) => {
    // For POS orders, fetch the full details including items
    if (transaction.type === 'order' && transaction.items.length === 0) {
      setLoadingDetails(true)
      try {
        const res = await api.get(`/orders/${transaction.id}`)
        const order = res.data
        const items = order.orderItems?.map((i: any) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName || i.product?.name || 'Unknown',
          unitType: i.unitType || 'piece',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount || 0,
          total: i.total,
          costPrice: i.costPrice || i.product?.costPrice || 0,
          currency: i.currency || 'USD'
        })) || []
        setSelectedTransaction({ ...transaction, items })
      } catch (error) {
        console.error('Failed to load order details:', error)
        setSelectedTransaction(transaction)
      } finally {
        setLoadingDetails(false)
      }
    } else {
      setSelectedTransaction(transaction)
    }
  }

  // Delete transaction
  const deleteTransaction = async (transaction: Transaction) => {
    const typeLabels: Record<string, string> = {
      order: 'order',
      task: 'task',
      collection: 'collection',
      return_exchange: 'return/exchange'
    }
    
    if (!confirm(`Are you sure you want to delete this ${typeLabels[transaction.type] || 'transaction'}?\n\nReference: ${transaction.referenceNumber}\nAmount: ${transaction.totalAmount.toFixed(3)}\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      let endpoint = ''
      switch (transaction.type) {
        case 'order':
          endpoint = `/orders/${transaction.id}`
          break
        case 'task':
          endpoint = `/tasks/${transaction.id}`
          break
        case 'collection':
          endpoint = `/collections/${transaction.id}`
          break
        case 'return_exchange':
          endpoint = `/direct-sales/return-exchanges/${transaction.id}`
          break
        default:
          alert('Cannot delete this transaction type')
          return
      }
      
      await api.delete(endpoint)
      alert('Transaction deleted successfully')
      loadTransactions()
    } catch (error: any) {
      console.error('Failed to delete transaction:', error)
      alert(error.response?.data?.message || 'Failed to delete transaction')
    }
  }

  // Print individual invoice
  const printInvoice = (transaction: Transaction) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) {
      alert('Please allow popups to print invoice')
      return
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${transaction.referenceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin-bottom: 5px; }
          .header p { font-size: 10px; color: #666; }
          .info { margin-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .info-row .label { color: #666; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .items { margin-bottom: 10px; }
          .item { margin-bottom: 5px; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
          @media print { 
            body { padding: 0; } 
            @page { margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${companySettings.name ? `<h1>${companySettings.name}</h1>` : '<h1>INVOICE</h1>'}
          ${companySettings.phone ? `<p>📞 ${companySettings.phone}</p>` : ''}
          ${companySettings.address ? `<p>${companySettings.address}</p>` : ''}
          <p style="margin-top: 5px; font-weight: bold;">${transaction.referenceNumber}</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span class="label">Date:</span>
            <span>${new Date(transaction.date).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="label">Customer:</span>
            <span>${transaction.customerName || 'Walk-in'}</span>
          </div>
          ${transaction.driverName && transaction.driverName !== '-' ? `
          <div class="info-row">
            <span class="label">Driver:</span>
            <span>${transaction.driverName}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Payment:</span>
            <span>${transaction.paymentType}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${transaction.items.length > 0 ? transaction.items.map(item => `
            <div class="item">
              <div class="item-name">${item.productName}</div>
              <div class="item-details">
                <span>${item.quantity} x ${item.currency || ''} ${item.unitPrice.toFixed(3)}</span>
                <span>${item.currency || ''} ${item.total.toFixed(3)}</span>
              </div>
            </div>
          `).join('') : `
            <div class="item">
              <div class="item-name">${transaction.type === 'collection' ? 'Debt Collection' : 'Sale'}</div>
              <div class="item-details">
                <span></span>
                <span>${transaction.totalAmount.toFixed(3)}</span>
              </div>
            </div>
          `}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${transaction.totalAmount.toFixed(3)}</span>
          </div>
          <div class="total-row">
            <span>Paid:</span>
            <span>${transaction.paidAmount.toFixed(3)}</span>
          </div>
          ${transaction.debtAmount > 0 ? `
          <div class="total-row">
            <span>Balance Due:</span>
            <span>${transaction.debtAmount.toFixed(3)}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>${transaction.totalAmount.toFixed(3)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Printed: ${new Date().toLocaleString()}</p>
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

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart size={16} className="text-blue-600" />
      case 'task': return <Truck size={16} className="text-green-600" />
      case 'collection': return <Wallet size={16} className="text-purple-600" />
      case 'return_exchange': return <RotateCcw size={16} className="text-orange-600" />
      default: return <Receipt size={16} className="text-gray-600" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order': return 'POS Sale'
      case 'task': return 'Task Delivery'
      case 'collection': return 'Collection'
      case 'return_exchange': return 'Return/Exchange'
      default: return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-blue-100 text-blue-800'
      case 'task': return 'bg-green-100 text-green-800'
      case 'collection': return 'bg-purple-100 text-purple-800'
      case 'return_exchange': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const _getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
      case 'collected':
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'unpaid':
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  void _getStatusColor

  const getPaymentBadge = (paymentType: string) => {
    switch (paymentType) {
      case 'cash': return 'bg-green-100 text-green-800'
      case 'credit': return 'bg-orange-100 text-orange-800'
      case 'split': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return (amount || 0).toFixed(3)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate totals
  const salesTransactions = filteredTransactions.filter(t => t.type !== 'collection' && t.type !== 'return_exchange')
  const totalSales = salesTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalCollected = salesTransactions.reduce((sum, t) => sum + t.paidAmount, 0)
  const totalDebtCollections = filteredTransactions.filter(t => t.type === 'collection').reduce((sum, t) => sum + t.paidAmount, 0)
  const totalOutstanding = salesTransactions.reduce((sum, t) => sum + t.debtAmount, 0)
  const totalOrders = salesTransactions.length  // Only count sales transactions, not collections/returns
  
  // Calculate sales by currency (from items)
  const salesByCurrency: Record<string, number> = {}
  salesTransactions.forEach(t => {
    t.items.forEach(item => {
      const cur = item.currency || 'USD'
      salesByCurrency[cur] = (salesByCurrency[cur] || 0) + item.total
    })
  })

  // Calculate returns and exchanges
  const returnExchangeTransactions = filteredTransactions.filter(t => t.type === 'return_exchange')
  const totalReturns = returnExchangeTransactions.reduce((sum, t) => sum + (t.returnTotal || 0), 0)
  const totalExchanges = returnExchangeTransactions.reduce((sum, t) => sum + (t.exchangeTotal || 0), 0)
  
  // Helper: convert item amount to base currency using transaction exchange rates
  const itemToBase = (item: TransactionItem, transaction: Transaction) => {
    const rates = transaction.exchangeRateSnapshot
    if (!rates || !item.currency) return item.total
    const rate = rates[item.currency] || 1
    return item.total / rate
  }
  const costToBase = (item: TransactionItem, transaction: Transaction) => {
    const rates = transaction.exchangeRateSnapshot
    const cost = item.costPrice * item.quantity
    if (!rates || !item.currency) return cost
    const rate = rates[item.currency] || 1
    return cost / rate
  }

  // Calculate cost and profit from items (Gross Profit = Sales - Cost)
  const totalGoodsCost = salesTransactions.reduce((sum, t) => 
    sum + t.items.reduce((s, item) => s + costToBase(item, t), 0), 0)
  const totalProfit = totalSales - totalGoodsCost  // Gross profit without subtracting returns

  // Aggregate products for report (only from sales transactions)
  const getProductSummary = (): ProductSummary[] => {
    const productMap = new Map<number, ProductSummary>()
    
    salesTransactions.forEach(t => {
      t.items.forEach(item => {
        const existing = productMap.get(item.productId)
        const salesInBase = itemToBase(item, t)
        const costInBase = costToBase(item, t)
        const profitInBase = salesInBase - costInBase
        
        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalSales += salesInBase
          existing.totalCost += costInBase
          existing.profit += profitInBase
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            totalQuantity: item.quantity,
            totalSales: salesInBase,
            totalCost: costInBase,
            profit: profitInBase
          })
        }
      })
    })
    
    return Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales)
  }

  // Load inventory data for report
  const loadInventoryData = async () => {
    setLoadingInventory(true)
    try {
      const [warehousesRes, vansRes, productsRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/vans'),
        api.get('/products')
      ])
      
      const inventory: ProductInventory[] = productsRes.data.map((p: any) => ({
        productId: p.id,
        productName: p.name,
        warehouses: warehousesRes.data.map((w: any) => {
          const stock = p.warehouseStock?.find((s: any) => s.warehouseId === w.id)
          return { id: w.id, name: w.name, quantity: stock?.quantity || 0 }
        }),
        vans: vansRes.data.map((v: any) => {
          const stock = p.vanStock?.find((s: any) => s.vanId === v.id)
          return { id: v.id, name: v.name, quantity: stock?.quantity || 0 }
        })
      }))
      
      setProductInventory(inventory)
    } catch (error) {
      console.error('Failed to load inventory:', error)
    } finally {
      setLoadingInventory(false)
    }
  }

  // Open report modal
  const openReportModal = () => {
    loadInventoryData()
    setShowReportModal(true)
  }

  // Generate and print PDF report
  const generateReport = () => {
    const productSummary = getProductSummary()
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
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
          .profit-positive { color: #22c55e; }
          .profit-negative { color: #ef4444; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sales Report</h1>
          <p>Period: ${startDate || 'All time'} ${startDate && endDate ? ' to ' : ''} ${endDate || ''}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        ${reportOptions.showSummary ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Orders</div>
            <div class="value">${totalOrders}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Sales</div>
            <div class="value blue">${formatCurrency(totalSales)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Collected</div>
            <div class="value green">${formatCurrency(totalCollected)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Debt Collections</div>
            <div class="value">${formatCurrency(totalDebtCollections)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Outstanding</div>
            <div class="value red">${formatCurrency(totalOutstanding)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Returns</div>
            <div class="value red">${formatCurrency(totalReturns)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Exchanges</div>
            <div class="value blue">${formatCurrency(totalExchanges)}</div>
          </div>
          ${reportOptions.showCost ? `
          <div class="summary-card">
            <div class="label">Goods Cost</div>
            <div class="value">${formatCurrency(totalGoodsCost)}</div>
          </div>
          ` : ''}
          ${reportOptions.showProfit ? `
          <div class="summary-card">
            <div class="label">Profit</div>
            <div class="value ${totalProfit >= 0 ? 'green' : 'red'}">${formatCurrency(totalProfit)}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        ${reportOptions.showProducts ? `
        <div class="section">
          <h2>Product Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-center">Qty Sold</th>
                ${reportOptions.showCost ? '<th class="text-right">Cost</th>' : ''}
                <th class="text-right">Total Sales</th>
                ${reportOptions.showProfit ? '<th class="text-right">Profit</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${productSummary.map(p => `
                <tr>
                  <td>${p.productName}</td>
                  <td class="text-center">${p.totalQuantity}</td>
                  ${reportOptions.showCost ? `<td class="text-right">${formatCurrency(p.totalCost)}</td>` : ''}
                  <td class="text-right">${formatCurrency(p.totalSales)}</td>
                  ${reportOptions.showProfit ? `<td class="text-right ${p.profit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(p.profit)}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showInventory && productInventory.length > 0 ? `
        <div class="section">
          <h2>Current Inventory</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                ${productInventory[0]?.warehouses.map(w => `<th class="text-center">${w.name}</th>`).join('') || ''}
                ${productInventory[0]?.vans.map(v => `<th class="text-center">${v.name}</th>`).join('') || ''}
              </tr>
            </thead>
            <tbody>
              ${productInventory.filter(p => productSummary.some(ps => ps.productId === p.productId)).map(p => `
                <tr>
                  <td>${p.productName}</td>
                  ${p.warehouses.map(w => `<td class="text-center">${w.quantity}</td>`).join('')}
                  ${p.vans.map(v => `<td class="text-center">${v.quantity}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showTransactions ? `
        <div class="section">
          <h2>Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Reference</th>
                <th>Customer</th>
                <th>Driver</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Debt</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.slice(0, 100).map(t => `
                <tr>
                  <td>${getTypeLabel(t.type)}</td>
                  <td>${t.referenceNumber}</td>
                  <td>${t.customerName || '-'}</td>
                  <td>${t.driverName || '-'}</td>
                  <td>${formatDate(t.date)}</td>
                  <td class="text-right">${formatCurrency(t.totalAmount)}</td>
                  <td class="text-right">${formatCurrency(t.paidAmount)}</td>
                  <td class="text-right">${t.debtAmount > 0 ? formatCurrency(t.debtAmount) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${filteredTransactions.length > 100 ? `<p style="text-align: center; color: #666;">Showing first 100 of ${filteredTransactions.length} transactions</p>` : ''}
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Sales Report - Confidential</p>
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deep Report</h1>
          <p className="text-sm text-gray-500">All transactions with returns & exchanges</p>
        </div>
        <button 
          onClick={openReportModal}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Summary Cards - Compact Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <Receipt size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Orders</p>
              <p className="text-lg font-bold">{totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border col-span-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <DollarSign size={16} className="text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 truncate">Sales</p>
              {Object.keys(salesByCurrency).length > 1 ? (
                <div>
                  {Object.entries(salesByCurrency).map(([cur, amount]) => (
                    <p key={cur} className="text-sm font-bold text-green-600">{cur} {formatCurrency(amount)}</p>
                  ))}
                  <p className="text-xs text-gray-400 mt-0.5">Base: {formatCurrency(totalSales)}</p>
                </div>
              ) : (
                <p className="text-lg font-bold text-green-600">
                  {Object.keys(salesByCurrency)[0] || ''} {formatCurrency(totalSales)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded">
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Collected</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <Wallet size={16} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Debt Coll.</p>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(totalDebtCollections)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded">
              <Clock size={16} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Outstanding</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded">
              <RotateCcw size={16} className="text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Returns</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(totalReturns)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-100 rounded">
              <Package size={16} className="text-cyan-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Exchanges</p>
              <p className="text-lg font-bold text-cyan-600">{formatCurrency(totalExchanges)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 rounded">
              <Box size={16} className="text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Cost</p>
              <p className="text-lg font-bold text-gray-600">{formatCurrency(totalGoodsCost)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 rounded">
              <TrendingUp size={16} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Profit</p>
              <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 rounded">
              <Receipt size={16} className="text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Expenses</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded">
              <Users size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Salaries Paid</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(salaryBreakdown.total)}</p>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                {salaryBreakdown.salary > 0 && <div>Salary: {formatCurrency(salaryBreakdown.salary)}</div>}
                {salaryBreakdown.advance > 0 && <div>Advance: {formatCurrency(salaryBreakdown.advance)}</div>}
                {salaryBreakdown.bonus > 0 && <div>Bonus: {formatCurrency(salaryBreakdown.bonus)}</div>}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border col-span-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Final Profit</p>
              <p className={`text-xl font-bold ${(totalProfit - salaryBreakdown.total - totalExpenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit - salaryBreakdown.total - totalExpenses)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Profit - Salaries - Expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="bg-white p-3 rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search ref #, customer, driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="order">POS Sales</option>
            <option value="task">Deliveries</option>
            <option value="collection">Collections</option>
            <option value="return_exchange">Returns/Exch</option>
          </select>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-2 py-1.5 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt size={48} className="mx-auto mb-4 opacity-50" />
            <p>No sales found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Reference #</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Driver</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Paid</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Debt</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Payment</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedTransactions.map((t) => (
                <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(t.type)}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(t.type)}`}>
                        {getTypeLabel(t.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">{t.referenceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span>{t.customerName || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-gray-400" />
                      <span>{t.driverName || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(t.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(t.paidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {t.debtAmount > 0 ? formatCurrency(t.debtAmount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentBadge(t.paymentType)}`}>
                      {t.paymentType}
                    </span>
                    {t.paymentCurrencies && t.paymentCurrencies.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {t.paymentCurrencies.map(pc => `${pc.currency} ${pc.amount.toFixed(0)}`).join(' + ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => viewTransaction(t)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => deleteTransaction(t)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-1 bg-white border rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(selectedTransaction.type)}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(selectedTransaction.type)}`}>
                      {getTypeLabel(selectedTransaction.type)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{selectedTransaction.referenceNumber}</h2>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedTransaction.customerName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium">{selectedTransaction.driverName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Type</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentBadge(selectedTransaction.paymentType)}`}>
                    {selectedTransaction.paymentType}
                  </span>
                </div>
              </div>

              {/* Items */}
              {(selectedTransaction.items.length > 0 || loadingDetails) && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Items
                  </h3>
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2">Product</th>
                          <th className="text-center px-3 py-2">Qty</th>
                          <th className="text-right px-3 py-2">Price</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedTransaction.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2 text-center">
                              {item.quantity} {item.unitType}
                            </td>
                            <td className="px-3 py-2 text-right">{item.currency || ''} {formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium">{item.currency || ''} {formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedTransaction.totalAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Paid (Cash)</span>
                  <span className="text-green-600 font-medium">{formatCurrency(selectedTransaction.paidAmount)}</span>
                </div>
                {selectedTransaction.debtAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">On Credit</span>
                    <span className="text-orange-600 font-medium">
                      {formatCurrency(selectedTransaction.debtAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Currencies Breakdown */}
              {selectedTransaction.paymentCurrencies && selectedTransaction.paymentCurrencies.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Paid With</p>
                  <div className="space-y-1">
                    {selectedTransaction.paymentCurrencies.map((pc, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{pc.currency}</span>
                        <span className="font-medium">{pc.currency} {pc.amount.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  {selectedTransaction.exchangeRateSnapshot && (
                    <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-600">
                      {Object.entries(selectedTransaction.exchangeRateSnapshot).map(([cur, rate]) => (
                        <span key={cur} className="mr-3">1 base = {rate} {cur}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedTransaction.notes}</p>
                </div>
              )}

              {/* Print Invoice Button */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => printInvoice(selectedTransaction)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Printer size={18} />
                  Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-bold">Print Sales Report</h2>
                    <p className="text-sm text-gray-500">Select what to include in the report</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Report Period Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Period:</strong> {startDate || 'All time'} {startDate && endDate ? ' to ' : ''} {endDate || ''}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Transactions:</strong> {filteredTransactions.length}
                </p>
              </div>

              {/* Checkboxes */}
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
                    <p className="font-medium">Summary Cards</p>
                    <p className="text-sm text-gray-500">Total transactions, sales, collected, outstanding</p>
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
                    <p className="font-medium">Product Summary</p>
                    <p className="text-sm text-gray-500">Items sold with quantities and totals</p>
                  </div>
                  {reportOptions.showProducts && <Check size={18} className="text-emerald-600" />}
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportOptions.showCost}
                    onChange={(e) => setReportOptions({...reportOptions, showCost: e.target.checked})}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Goods Cost</p>
                    <p className="text-sm text-gray-500">Cost price for each product</p>
                  </div>
                  {reportOptions.showCost && <Check size={18} className="text-emerald-600" />}
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportOptions.showProfit}
                    onChange={(e) => setReportOptions({...reportOptions, showProfit: e.target.checked})}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Profit</p>
                    <p className="text-sm text-gray-500">Profit margins for each product</p>
                  </div>
                  {reportOptions.showProfit && <Check size={18} className="text-emerald-600" />}
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportOptions.showInventory}
                    onChange={(e) => setReportOptions({...reportOptions, showInventory: e.target.checked})}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <div>
                      <p className="font-medium">Current Inventory</p>
                      <p className="text-sm text-gray-500">Stock levels in warehouses and vans</p>
                    </div>
                    {loadingInventory && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    )}
                  </div>
                  {reportOptions.showInventory && <Check size={18} className="text-emerald-600" />}
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportOptions.showTransactions}
                    onChange={(e) => setReportOptions({...reportOptions, showTransactions: e.target.checked})}
                    className="w-5 h-5 text-emerald-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Transaction List</p>
                    <p className="text-sm text-gray-500">All individual transactions (max 100)</p>
                  </div>
                  {reportOptions.showTransactions && <Check size={18} className="text-emerald-600" />}
                </label>
              </div>
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
                  generateReport()
                  setShowReportModal(false)
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
