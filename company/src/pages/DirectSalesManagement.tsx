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
      case 'paid': return 'bg-green-100 text-green-700'
      case 'partial': return 'bg-yellow-100 text-yellow-700'
      case 'unpaid': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Direct Sales</h1>
          <p className="text-gray-500 text-sm">Manage direct sales transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Total Sales</div>
          <div className="text-2xl font-bold text-blue-600">{filteredSales.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">${totalSales.toFixed(3)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Total Paid</div>
          <div className="text-2xl font-bold text-emerald-600">${totalPaid.toFixed(3)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Outstanding</div>
          <div className="text-2xl font-bold text-red-600">${(totalSales - totalPaid).toFixed(3)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order # or customer..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Paid</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No sales found</td>
                </tr>
              ) : filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{sale.orderNumber}</td>
                  <td className="px-4 py-3">{new Date(sale.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{sale.customerName}</td>
                  <td className="px-4 py-3 text-right">{sale.itemCount}</td>
                  <td className="px-4 py-3 text-right font-medium">${sale.totalAmount.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right">${sale.paidAmount.toFixed(3)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(sale.paymentStatus)}`}>
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleViewOrder(sale.orderNumber)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                        disabled={loadingOrder}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(sale.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
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
        )}
      </div>

      {/* View Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign size={20} /> Order Details
              </h2>
              <button onClick={() => { setShowViewModal(false); setViewingOrder(null) }}>
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Order Info */}
              <div className="grid grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <div className="text-xs text-gray-500">Order #</div>
                  <div className="font-semibold">{viewingOrder.orderNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-semibold">{new Date(viewingOrder.orderDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="font-semibold">{viewingOrder.customerName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(viewingOrder.paymentStatus)}`}>
                    {viewingOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-center">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Discount</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.productSku}</div>
                          </td>
                          <td className="px-3 py-2 text-center">{item.unitType}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right text-orange-600">
                            {item.discountAmount > 0 ? `-$${item.discountAmount.toFixed(3)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">${item.lineTotal.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>${viewingOrder.subtotal.toFixed(3)}</span>
                  </div>
                  {viewingOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Discount:</span>
                      <span>-${viewingOrder.discountAmount.toFixed(3)}</span>
                    </div>
                  )}
                  {viewingOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Tax:</span>
                      <span>+${viewingOrder.taxAmount.toFixed(3)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">${viewingOrder.totalAmount.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid:</span>
                    <span>${viewingOrder.paidAmount.toFixed(3)}</span>
                  </div>
                  {viewingOrder.totalAmount - viewingOrder.paidAmount > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-500">Balance:</span>
                      <span className="text-red-600">${(viewingOrder.totalAmount - viewingOrder.paidAmount).toFixed(3)}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewingOrder.notes && (
                <div className="border-t pt-4">
                  <span className="text-gray-500 text-sm">Notes:</span> {viewingOrder.notes}
                </div>
              )}
            </div>
            <div className="flex justify-between p-4 border-t">
              <button
                onClick={() => printReceipt(viewingOrder)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => { setShowViewModal(false); setViewingOrder(null) }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this sale? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingId(null) }}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
