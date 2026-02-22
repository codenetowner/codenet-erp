import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Printer, Loader2, DollarSign, ShoppingCart, TrendingUp, Calendar, Banknote, Package } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { customersApi } from '../lib/api'
import api from '../lib/api'

interface Customer {
  id: number
  name: string
  shopName: string | null
  phone: string | null
  email: string | null
  address: string | null
  customerType: string
  creditLimit: number
  creditBalance: number
  debtBalance: number
  status: string
}

interface OrderTransaction {
  id: number
  type: 'order' | 'task'
  transactionNumber: string
  date: string
  itemCount: number
  totalAmount: number
  paidAmount: number
  paymentStatus: string
}

interface TransactionDetail {
  id: number
  type: 'order' | 'task'
  transactionNumber: string
  date: string
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  paymentType?: string
  notes?: string
  items: TransactionItem[]
}

interface TransactionItem {
  id: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface Collection {
  id: number
  collectionNumber: string
  collectionDate: string
  amount: number
  paymentType: string
  notes: string | null
}

export default function CustomerReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<OrderTransaction[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeTab, setActiveTab] = useState<'transactions' | 'collections'>('transactions')

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const customerId = parseInt(id!)
      
      // Load customer details
      const customerRes = await customersApi.getById(customerId)
      setCustomer(customerRes.data || customerRes)
      
      // Load orders
      const ordersRes = await api.get(`/orders?customerId=${customerId}`)
      const orders = (ordersRes.data || []).map((o: any) => ({
        id: o.id,
        type: 'order' as const,
        transactionNumber: o.orderNumber,
        date: o.orderDate,
        itemCount: o.items?.length || 0,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        paymentStatus: o.paymentStatus
      }))
      
      // Load tasks
      const tasksRes = await api.get(`/tasks?customerId=${customerId}`)
      const tasks = (tasksRes.data || [])
        .filter((t: any) => t.status === 'completed')
        .map((t: any) => ({
          id: t.id,
          type: 'task' as const,
          transactionNumber: t.taskNumber,
          date: t.scheduledDate,
          itemCount: t.items?.length || 0,
          totalAmount: t.total || 0,
          paidAmount: t.paidAmount || 0,
          paymentStatus: t.debtAmount > 0 ? (t.paidAmount > 0 ? 'partial' : 'unpaid') : 'paid'
        }))
      
      // Combine and sort by date
      const allTransactions = [...orders, ...tasks].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setTransactions(allTransactions)
      
      // Load collections
      const collectionsRes = await api.get(`/collections?customerId=${customerId}`)
      setCollections(collectionsRes.data || [])
      
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactionDetail = async (transaction: OrderTransaction) => {
    try {
      setLoadingDetail(true)
      
      if (transaction.type === 'order') {
        const res = await api.get(`/orders/${transaction.id}`)
        const order = res.data
        setSelectedTransaction({
          id: order.id,
          type: 'order',
          transactionNumber: order.orderNumber,
          date: order.orderDate,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          paymentStatus: order.paymentStatus,
          paymentType: order.paymentType,
          notes: order.notes,
          items: (order.items || []).map((i: any) => ({
            id: i.id,
            productName: i.productName || 'Unknown',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total
          }))
        })
      } else {
        const res = await api.get(`/tasks/${transaction.id}`)
        const task = res.data
        setSelectedTransaction({
          id: task.id,
          type: 'task',
          transactionNumber: task.taskNumber,
          date: task.scheduledDate,
          totalAmount: task.total || 0,
          paidAmount: task.paidAmount || 0,
          paymentStatus: task.debtAmount > 0 ? (task.paidAmount > 0 ? 'partial' : 'unpaid') : 'paid',
          paymentType: task.paymentType,
          notes: task.notes,
          items: (task.items || []).map((i: any) => ({
            id: i.id,
            productName: i.productName || 'Unknown',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total
          }))
        })
      }
    } catch (error) {
      console.error('Failed to load transaction detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  // Calculate totals
  const totalPurchases = transactions.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalPaid = transactions.reduce((sum, t) => sum + t.paidAmount, 0)
  const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0)
  const totalOutstanding = customer?.debtBalance || 0
  const transactionCount = transactions.length

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Report - ${customer?.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ec4899; padding-bottom: 10px; }
          .header h1 { font-size: 24px; color: #ec4899; margin-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; background: #fdf2f8; padding: 15px; border-radius: 8px; }
          .info-item .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-item .value { font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.pink { color: #ec4899; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ec4899; padding-bottom: 5px; color: #ec4899; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #fdf2f8; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-paid { color: #22c55e; font-weight: bold; }
          .status-unpaid { color: #ef4444; font-weight: bold; }
          .status-partial { color: #f59e0b; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
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
          <div class="info-item">
            <div class="label">Customer Name</div>
            <div class="value">${customer?.name}</div>
          </div>
          <div class="info-item">
            <div class="label">Shop Name</div>
            <div class="value">${customer?.shopName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Phone</div>
            <div class="value">${customer?.phone || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Email</div>
            <div class="value">${customer?.email || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Type</div>
            <div class="value">${customer?.customerType || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Credit Limit</div>
            <div class="value">${formatCurrency(customer?.creditLimit || 0)}</div>
          </div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Purchases</div>
            <div class="value pink">${formatCurrency(totalPurchases)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Paid</div>
            <div class="value green">${formatCurrency(totalPaid + totalCollected)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Outstanding</div>
            <div class="value red">${formatCurrency(totalOutstanding)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Transactions</div>
            <div class="value">${transactionCount}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Sales Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Transaction #</th>
                <th>Type</th>
                <th>Date</th>
                <th>Items</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.transactionNumber}</td>
                  <td>${t.type === 'order' ? 'POS Order' : 'Delivery'}</td>
                  <td>${formatDate(t.date)}</td>
                  <td class="text-center">${t.itemCount}</td>
                  <td class="text-right">${formatCurrency(t.totalAmount)}</td>
                  <td class="text-right">${formatCurrency(t.paidAmount)}</td>
                  <td class="text-right">${formatCurrency(t.totalAmount - t.paidAmount)}</td>
                  <td class="text-center status-${t.paymentStatus}">${t.paymentStatus.toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="4">Total</th>
                <th class="text-right">${formatCurrency(totalPurchases)}</th>
                <th class="text-right">${formatCurrency(totalPaid)}</th>
                <th class="text-right">${formatCurrency(totalPurchases - totalPaid)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        
        ${collections.length > 0 ? `
        <div class="section">
          <h2>Debt Collections</h2>
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
              ${collections.map(c => `
                <tr>
                  <td>${c.collectionNumber}</td>
                  <td>${formatDate(c.collectionDate)}</td>
                  <td class="text-right">${formatCurrency(c.amount)}</td>
                  <td class="text-center">${c.paymentType}</td>
                  <td>${c.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total Collected</th>
                <th class="text-right">${formatCurrency(totalCollected)}</th>
                <th colspan="2"></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Customer Report - Customer Statement</p>
        </div>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-pink-600" size={32} />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-red-500">Customer not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-pink-600 hover:underline">Go Back</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Report</h1>
            <p className="text-gray-500">Customer Statement</p>
          </div>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {/* Customer Info */}
      <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-pink-900">{customer.name}</h2>
            {customer.shopName && <p className="text-pink-700">{customer.shopName}</p>}
          </div>
          <span className="px-3 py-1 bg-pink-600 text-white text-sm rounded-full">{customer.customerType}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-pink-600 uppercase">Phone</p>
            <p className="font-medium">{customer.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-pink-600 uppercase">Email</p>
            <p className="font-medium">{customer.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-pink-600 uppercase">Credit Limit</p>
            <p className="font-medium">{formatCurrency(customer.creditLimit)}</p>
          </div>
          <div>
            <p className="text-xs text-pink-600 uppercase">Status</p>
            <p className="font-medium">{customer.status}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <ShoppingCart className="text-pink-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Purchases</p>
              <p className="text-xl font-bold text-pink-600">{formatCurrency(totalPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid + totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Outstanding</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Transactions</p>
              <p className="text-xl font-bold text-blue-600">{transactionCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'transactions' 
              ? 'border-pink-600 text-pink-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            Sales ({transactions.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'collections' 
              ? 'border-pink-600 text-pink-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Banknote size={18} />
            Collections ({collections.length})
          </div>
        </button>
      </div>

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-pink-50">
            <h3 className="font-semibold text-pink-900 flex items-center gap-2">
              <FileText size={18} />
              Sales Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No transactions found for this customer
                    </td>
                  </tr>
                ) : (
                  transactions.map(transaction => (
                    <tr key={`${transaction.type}-${transaction.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-pink-600">{transaction.transactionNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.type === 'order' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {transaction.type === 'order' ? 'POS Order' : 'Delivery'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3 text-center">{transaction.itemCount}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(transaction.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(transaction.paidAmount)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(transaction.totalAmount - transaction.paidAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                          transaction.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {transaction.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => loadTransactionDetail(transaction)}
                          className="text-pink-600 hover:text-pink-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalPurchases)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totalPurchases - totalPaid)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Collections Table */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-green-50">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <Banknote size={18} />
              Debt Collections
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No collections found for this customer
                    </td>
                  </tr>
                ) : (
                  collections.map(collection => (
                    <tr key={collection.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-green-600">{collection.collectionNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(collection.collectionDate)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(collection.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {collection.paymentType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{collection.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {collections.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-4 py-3">Total Collected</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalCollected)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-pink-600 text-white">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedTransaction.type === 'order' ? 'Order Details' : 'Delivery Details'}
                </h2>
                <p className="text-pink-200 text-sm">{selectedTransaction.transactionNumber}</p>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="p-1 hover:bg-pink-700 rounded">
                <ArrowLeft size={20} />
              </button>
            </div>
            {loadingDetail ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin text-pink-600" size={32} />
              </div>
            ) : (
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date</p>
                    <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="font-medium">{formatCurrency(selectedTransaction.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedTransaction.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                      selectedTransaction.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedTransaction.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold mb-3">Items</h3>
                <table className="w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTransaction.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 border-t pt-4 space-y-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(selectedTransaction.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatCurrency(selectedTransaction.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Balance Due</span>
                    <span>{formatCurrency(selectedTransaction.totalAmount - selectedTransaction.paidAmount)}</span>
                  </div>
                </div>

                {selectedTransaction.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-gray-700">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
