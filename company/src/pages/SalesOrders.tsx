import { useState, useEffect } from 'react'
import { Eye, Search, Trash2, X, Loader2, Printer, DollarSign } from 'lucide-react'
import { directSalesApi, customersApi } from '../lib/api'
import api from '../lib/api'

interface DirectSale {
  id: number
  orderNumber: string
  customerName: string
  orderDate: string
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  itemCount: number
}

interface OrderDetail {
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
}

interface Customer {
  id: number
  name: string
}

export default function DirectSalesManagement() {
  const [sales, setSales] = useState<DirectSale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [customerFilter, setCustomerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<OrderDetail | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate, customerFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesData, customersRes] = await Promise.all([
        directSalesApi.getSales({ 
          startDate, 
          endDate,
          customerId: customerFilter || undefined
        }),
        customersApi.getAll()
      ])
      setSales(salesData)
      setCustomers(customersRes.data || customersRes)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = async (orderNumber: string) => {
    try {
      setLoadingOrder(true)
      const order = await directSalesApi.getOrderByNumber(orderNumber)
      setViewingOrder(order)
      setShowViewModal(true)
    } catch (error) {
      console.error('Failed to load order:', error)
      alert('Failed to load order details')
    } finally {
      setLoadingOrder(false)
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeletingId(id)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      setDeleting(true)
      await api.delete(`/orders/${deletingId}`)
      setSales(sales.filter(s => s.id !== deletingId))
      setShowDeleteConfirm(false)
      setDeletingId(null)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }

  const printReceipt = (order: OrderDetail) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin: 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .item { margin: 5px 0; }
          .item-name { font-weight: bold; }
          .item-details { padding-left: 10px; color: #666; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALES RECEIPT</h1>
          <p>${order.orderNumber}</p>
        </div>
        <div class="divider"></div>
        <div class="row"><span>Date:</span><span>${new Date(order.orderDate).toLocaleDateString()}</span></div>
        <div class="row"><span>Customer:</span><span>${order.customerName}</span></div>
        ${order.cashierName ? `<div class="row"><span>Cashier:</span><span>${order.cashierName}</span></div>` : ''}
        <div class="divider"></div>
        ${order.items.map(item => `
          <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
              ${item.quantity} x $${item.unitPrice.toFixed(3)} = $${item.lineTotal.toFixed(3)}
            </div>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="row"><span>Subtotal:</span><span>$${order.subtotal.toFixed(3)}</span></div>
        ${order.discountAmount > 0 ? `<div class="row"><span>Discount:</span><span>-$${order.discountAmount.toFixed(3)}</span></div>` : ''}
        ${order.taxAmount > 0 ? `<div class="row"><span>Tax:</span><span>$${order.taxAmount.toFixed(3)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row total"><span>TOTAL:</span><span>$${order.totalAmount.toFixed(3)}</span></div>
        <div class="row"><span>Paid:</span><span>$${order.paidAmount.toFixed(3)}</span></div>
        ${order.totalAmount - order.paidAmount > 0 ? `<div class="row"><span>Balance:</span><span>$${(order.totalAmount - order.paidAmount).toFixed(3)}</span></div>` : ''}
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const filteredSales = sales.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      if (!s.orderNumber.toLowerCase().includes(q) && !s.customerName.toLowerCase().includes(q)) return false
    }
    if (statusFilter && s.paymentStatus !== statusFilter) return false
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'partial': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'unpaid': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      default: return 'bg-slate-800 text-slate-300 border border-slate-700'
    }
  }

  const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">Sales Orders</h1>
          <p className="text-slate-400 text-sm mt-1">Manage direct sales and order history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 relative z-10">
        <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Total Sales</span>
            <span className="text-3xl font-bold text-white">{filteredSales.length}</span>
          </div>
        </div>
        
        <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Total Amount</span>
            <span className="text-3xl font-bold text-emerald-400">${totalSales.toFixed(3)}</span>
          </div>
        </div>
        
        <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Total Paid</span>
            <span className="text-3xl font-bold text-blue-400">${totalPaid.toFixed(3)}</span>
          </div>
        </div>
        
        <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-400 mb-1 uppercase tracking-wider">Outstanding</span>
            <span className="text-3xl font-bold text-rose-400">${(totalSales - totalPaid).toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 mb-6 relative z-10">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order # or customer..."
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all"
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-300 text-sm outline-none cursor-pointer"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-300 text-sm outline-none cursor-pointer"
          />
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-300 text-sm outline-none cursor-pointer min-w-[150px]"
          >
            <option value="" className="bg-slate-800">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-300 text-sm outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">All Statuses</option>
            <option value="paid" className="bg-slate-800">Paid</option>
            <option value="partial" className="bg-slate-800">Partial</option>
            <option value="unpaid" className="bg-slate-800">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold tracking-wider text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Items</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">No sales records found</td>
                  </tr>
                ) : filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-bold text-cyan-400">{sale.orderNumber}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(sale.orderDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-200">{sale.customerName}</td>
                    <td className="px-6 py-4 text-center">{sale.itemCount}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-200">${sale.totalAmount.toFixed(3)}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-400">${sale.paidAmount.toFixed(3)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold backdrop-blur-sm uppercase tracking-wider ${getStatusBadge(sale.paymentStatus)}`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewOrder(sale.orderNumber)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="View Details"
                          disabled={loadingOrder}
                        >
                          {loadingOrder && viewingOrder?.orderNumber === sale.orderNumber ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(sale.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <DollarSign size={20} />
                </div>
                Order Details <span className="text-slate-400 font-medium ml-2">#{viewingOrder.orderNumber}</span>
              </h2>
              <button onClick={() => { setShowViewModal(false); setViewingOrder(null) }} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Order #</div>
                  <div className="font-bold text-cyan-400">{viewingOrder.orderNumber}</div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Date</div>
                  <div className="font-bold text-slate-200">{new Date(viewingOrder.orderDate).toLocaleDateString()}</div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Customer</div>
                  <div className="font-bold text-slate-200">{viewingOrder.customerName}</div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Status</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getStatusBadge(viewingOrder.paymentStatus)}`}>
                    {viewingOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
                  <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Order Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Product</th>
                        <th className="px-4 py-3 text-center font-semibold">Unit</th>
                        <th className="px-4 py-3 text-center font-semibold">Qty</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                        <th className="px-4 py-3 text-right font-semibold">Discount</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 text-slate-300">
                      {viewingOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-200">{item.productName}</div>
                            <div className="text-xs text-slate-500 mt-0.5">SKU: {item.productSku}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-medium">{item.unitType}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-400">${item.unitPrice.toFixed(3)}</td>
                          <td className="px-4 py-3 text-right text-rose-400">
                            {item.discountAmount > 0 ? `-$${item.discountAmount.toFixed(3)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-200">${item.lineTotal.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Notes */}
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  {viewingOrder.notes && (
                    <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl h-full">
                      <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Order Notes</div>
                      <div className="text-sm text-slate-300">{viewingOrder.notes}</div>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-80 space-y-3 p-5 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Subtotal:</span>
                    <span className="text-slate-200">${viewingOrder.subtotal.toFixed(3)}</span>
                  </div>
                  {viewingOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-medium">Discount:</span>
                      <span className="text-rose-400">-${viewingOrder.discountAmount.toFixed(3)}</span>
                    </div>
                  )}
                  {viewingOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-medium">Tax:</span>
                      <span className="text-cyan-400">+${viewingOrder.taxAmount.toFixed(3)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t border-slate-800/80 pt-3">
                    <span className="text-white">Total:</span>
                    <span className="text-emerald-400">${viewingOrder.totalAmount.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-slate-400 font-medium">Paid:</span>
                    <span className="text-blue-400 font-bold">${viewingOrder.paidAmount.toFixed(3)}</span>
                  </div>
                  {viewingOrder.totalAmount - viewingOrder.paidAmount > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-400 font-medium">Balance:</span>
                      <span className="text-rose-400 font-bold">${(viewingOrder.totalAmount - viewingOrder.paidAmount).toFixed(3)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex gap-3 shrink-0">
              <button
                onClick={() => { setShowViewModal(false); setViewingOrder(null) }}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm flex-1 md:flex-none"
              >
                Close
              </button>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => printReceipt(viewingOrder)}
                  className="px-5 py-2.5 bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
            <p className="text-slate-400 mb-6 text-sm">
              Are you sure you want to delete this order? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingId(null) }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                {deleting ? <><Loader2 size={16} className="animate-spin" /> Deleting</> : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
