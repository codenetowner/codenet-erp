import { useState, useEffect } from 'react'
import { RotateCcw, Check, X, Package, User, Calendar, DollarSign, Loader2, Eye, Warehouse, Printer } from 'lucide-react'
import { returnsApi, warehousesApi } from '../lib/api'

interface Return {
  id: number
  returnNumber: string
  orderId?: number
  orderNumber?: string
  customerId: number
  customerName: string
  driverId?: number
  driverName?: string
  returnDate: string
  totalAmount: number
  reason?: string
  status: string
  notes?: string
  itemCount: number
  createdAt: string
}

interface ReturnDetail extends Return {
  approvedBy?: string
  items: ReturnItem[]
}

interface ReturnItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  reason?: string
}

interface Warehouse {
  id: number
  name: string
}

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<ReturnDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processOptions, setProcessOptions] = useState({
    warehouseId: 0,
    issueCredit: true
  })

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [returnsData, warehousesData] = await Promise.all([
        returnsApi.getAll({ status: statusFilter || undefined }),
        warehousesApi.getAll()
      ])
      setReturns(returnsData)
      setWarehouses(warehousesData.data || warehousesData)
    } catch (err) {
      console.error('Failed to load returns:', err)
    } finally {
      setLoading(false)
    }
  }

  const viewDetails = async (id: number) => {
    try {
      const detail = await returnsApi.getById(id)
      setSelectedReturn(detail)
      setShowDetailModal(true)
    } catch (err) {
      console.error('Failed to load return details:', err)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await returnsApi.approve(id)
      loadData()
      setShowDetailModal(false)
    } catch (err) {
      console.error('Failed to approve return:', err)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Are you sure you want to reject this return?')) return
    try {
      await returnsApi.reject(id, 'Rejected by manager')
      loadData()
      setShowDetailModal(false)
    } catch (err) {
      console.error('Failed to reject return:', err)
    }
  }

  const openProcessModal = (ret: ReturnDetail) => {
    setSelectedReturn(ret)
    setProcessOptions({
      warehouseId: warehouses[0]?.id || 0,
      issueCredit: true
    })
    setShowProcessModal(true)
  }

  const handleProcess = async () => {
    if (!selectedReturn) return
    setProcessing(true)
    try {
      await returnsApi.process(selectedReturn.id, {
        returnToVan: false,
        warehouseId: processOptions.warehouseId,
        issueCredit: processOptions.issueCredit
      })
      setShowProcessModal(false)
      setShowDetailModal(false)
      loadData()
    } catch (err) {
      console.error('Failed to process return:', err)
    } finally {
      setProcessing(false)
    }
  }

  const printReturnReport = (ret: ReturnDetail) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return ${ret.returnNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #10b981; margin: 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; }
          .info-box label { font-size: 12px; color: #6b7280; }
          .info-box p { margin: 5px 0 0; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background: #f3f4f6; }
          .total-row { font-weight: bold; background: #f0fdf4; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #dbeafe; color: #1e40af; }
          .status-processed { background: #dcfce7; color: #166534; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Return Receipt</h1>
          <p>${ret.returnNumber}</p>
        </div>
        <div class="info-grid">
          <div class="info-box">
            <label>Customer</label>
            <p>${ret.customerName}</p>
          </div>
          <div class="info-box">
            <label>Date</label>
            <p>${formatDate(ret.returnDate)}</p>
          </div>
          <div class="info-box">
            <label>Status</label>
            <p><span class="status status-${ret.status}">${ret.status.toUpperCase()}</span></p>
          </div>
          <div class="info-box">
            <label>Driver</label>
            <p>${ret.driverName || 'N/A'}</p>
          </div>
        </div>
        ${ret.reason ? `<p><strong>Reason:</strong> ${ret.reason}</p>` : ''}
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ret.items.map(i => `
              <tr>
                <td>${i.productName}</td>
                <td>${i.productSku}</td>
                <td style="text-align:right">${i.quantity}</td>
                <td style="text-align:right">${formatCurrency(i.unitPrice)}</td>
                <td style="text-align:right">${formatCurrency(i.lineTotal)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align:right">Total:</td>
              <td style="text-align:right">${formatCurrency(ret.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Catalyst Return Management System</p>
        </div>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'processed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  // Stats
  const stats = {
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    processed: returns.filter(r => r.status === 'processed').length,
    totalValue: returns.filter(r => r.status !== 'rejected').reduce((sum, r) => sum + r.totalAmount, 0)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RotateCcw className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Check className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.processed}</p>
              <p className="text-sm text-gray-500">Processed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              <p className="text-sm text-gray-500">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Status:</span>
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'processed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-full ${
                  statusFilter === status
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
          </div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RotateCcw size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No returns found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Return #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{ret.returnNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {ret.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{ret.driverName || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={16} />
                      {formatDate(ret.returnDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(ret.totalAmount)}</td>
                  <td className="px-6 py-4 text-center">{ret.itemCount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ret.status)}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => viewDetails(ret.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {ret.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(ret.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(ret.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Reject"
                          >
                            <X size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-semibold">Return {selectedReturn.returnNumber}</h2>
                <p className="text-sm text-gray-500">{formatDate(selectedReturn.returnDate)}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedReturn.status)}`}>
                {selectedReturn.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedReturn.customerName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Driver</p>
                <p className="font-medium">{selectedReturn.driverName || '-'}</p>
              </div>
            </div>

            {selectedReturn.reason && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Reason:</strong> {selectedReturn.reason}
                </p>
              </div>
            )}

            <h3 className="font-medium mb-3">Items</h3>
            <table className="w-full text-sm mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedReturn.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.productSku}</p>
                    </td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="p-2 text-right">Total:</td>
                  <td className="p-2 text-right">{formatCurrency(selectedReturn.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => printReturnReport(selectedReturn)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
              {selectedReturn.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedReturn.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReturn.id)}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedReturn.status === 'approved' && (
                <button
                  onClick={() => openProcessModal(selectedReturn)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Process Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Process Return</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Warehouse size={16} className="inline mr-1" />
                  Return to Warehouse
                </label>
                <select
                  value={processOptions.warehouseId}
                  onChange={(e) => setProcessOptions({ ...processOptions, warehouseId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="issueCredit"
                  checked={processOptions.issueCredit}
                  onChange={(e) => setProcessOptions({ ...processOptions, issueCredit: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="issueCredit" className="text-sm text-gray-700">
                  Credit customer's account ({formatCurrency(selectedReturn.totalAmount)})
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProcessModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Process'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
