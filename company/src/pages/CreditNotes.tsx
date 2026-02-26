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
      case 'pending': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'approved': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
      case 'rejected': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      case 'processed': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      default: return 'bg-slate-800 text-slate-400 border border-slate-700'
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
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">Credit Notes</h1>
          <p className="text-slate-400 text-sm mt-1">Manage customer returns and refunds</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <RotateCcw className="text-amber-400" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Check className="text-cyan-400" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Package className="text-emerald-400" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.processed}</p>
              <p className="text-sm text-slate-500">Processed</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <DollarSign className="text-purple-400" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalValue)}</p>
              <p className="text-sm text-slate-500">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 font-medium">Status:</span>
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'processed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-cyan-400" size={32} />
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <RotateCcw size={48} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400">No returns found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Return #</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-cyan-400">{ret.returnNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-200">
                      <User size={16} className="text-slate-500" />
                      {ret.customerName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{ret.driverName || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={16} />
                      {formatDate(ret.returnDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-200">{formatCurrency(ret.totalAmount)}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{ret.itemCount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${getStatusColor(ret.status)}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => viewDetails(ret.id)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {ret.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(ret.id)}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(ret.id)}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                    <Eye size={20} />
                  </div>
                  Return {selectedReturn.returnNumber}
                </h2>
                <p className="text-sm text-slate-400 mt-1 ml-12">{formatDate(selectedReturn.returnDate)}</p>
              </div>
              <span className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider ${getStatusColor(selectedReturn.status)}`}>
                {selectedReturn.status}
              </span>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-bold text-slate-200">{selectedReturn.customerName}</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Driver</p>
                  <p className="font-bold text-slate-200">{selectedReturn.driverName || '-'}</p>
                </div>
              </div>

              {selectedReturn.reason && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-300">
                    <strong>Reason:</strong> {selectedReturn.reason}
                  </p>
                </div>
              )}

              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
                  <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-cyan-400" /> Items
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Qty</th>
                      <th className="text-right p-3 font-medium">Price</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-800/30">
                        <td className="p-3">
                          <p className="font-medium text-slate-200">{item.productName}</p>
                          <p className="text-xs text-slate-500">{item.productSku}</p>
                        </td>
                        <td className="p-3 text-right text-slate-300">{item.quantity}</td>
                        <td className="p-3 text-right text-slate-400">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 text-right font-bold text-slate-200">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/50">
                    <tr className="font-bold">
                      <td colSpan={3} className="p-3 text-right text-slate-400">Total:</td>
                      <td className="p-3 text-right text-cyan-400 text-lg">{formatCurrency(selectedReturn.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-slate-800/30 p-6 border-t border-slate-800 flex gap-3 shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => printReturnReport(selectedReturn)}
                className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Printer size={18} />
                Print
              </button>
              {selectedReturn.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedReturn.id)}
                    className="px-4 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-500/20 transition-colors font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedReturn.id)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-500 hover:to-green-500 transition-all font-bold shadow-lg shadow-emerald-900/30"
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedReturn.status === 'approved' && (
                <button
                  onClick={() => openProcessModal(selectedReturn)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all font-bold shadow-lg shadow-cyan-900/30"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Package size={20} />
                </div>
                Process Return
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Warehouse size={14} className="inline mr-1" />
                  Return to Warehouse
                </label>
                <select
                  value={processOptions.warehouseId}
                  onChange={(e) => setProcessOptions({ ...processOptions, warehouseId: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl">
                <input
                  type="checkbox"
                  id="issueCredit"
                  checked={processOptions.issueCredit}
                  onChange={(e) => setProcessOptions({ ...processOptions, issueCredit: e.target.checked })}
                  className="w-5 h-5 text-cyan-600 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500/50"
                />
                <label htmlFor="issueCredit" className="text-sm text-slate-300">
                  Credit customer's account <span className="text-cyan-400 font-bold">({formatCurrency(selectedReturn.totalAmount)})</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-800/30 p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setShowProcessModal(false)}
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all font-bold shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : 'Process'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
