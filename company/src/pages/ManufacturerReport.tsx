import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Printer, Loader2, DollarSign, Package, TrendingUp, Calendar, Search, Filter, X } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { suppliersApi, rawMaterialPurchasesApi } from '../lib/api'

interface Supplier {
  id: number
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  city: string | null
  country: string | null
  paymentTerms: string | null
  creditLimit: number
  balance: number
  isManufacturer: boolean
}

interface Purchase {
  id: number
  purchaseNumber: string
  supplierId: number | null
  supplierName: string | null
  purchaseDate: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  itemCount: number
  notes: string | null
}

interface PurchaseDetail {
  id: number
  purchaseNumber: string
  supplierName: string | null
  purchaseDate: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  notes: string | null
  reference: string | null
  items: PurchaseItem[]
}

interface PurchaseItem {
  id: number
  rawMaterialId: number
  rawMaterialName: string
  rawMaterialCode: string
  unit: string
  warehouseName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export default function ManufacturerReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [manufacturer, setManufacturer] = useState<Supplier | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (id) loadData()
  }, [id])
  
  // Apply filters whenever purchases or filter values change
  useEffect(() => {
    let result = [...purchases]
    
    // Search by purchase number
    if (searchTerm) {
      result = result.filter(p => 
        p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Date range filter
    if (startDate) {
      result = result.filter(p => new Date(p.purchaseDate) >= new Date(startDate))
    }
    if (endDate) {
      result = result.filter(p => new Date(p.purchaseDate) <= new Date(endDate + 'T23:59:59'))
    }
    
    // Status filter
    if (statusFilter) {
      result = result.filter(p => p.paymentStatus === statusFilter)
    }
    
    setFilteredPurchases(result)
  }, [purchases, searchTerm, startDate, endDate, statusFilter])
  
  const clearFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setStatusFilter('')
  }
  
  const hasActiveFilters = searchTerm || startDate || endDate || statusFilter

  const loadData = async () => {
    try {
      setLoading(true)
      const [supplierRes, purchasesRes] = await Promise.all([
        suppliersApi.getById(parseInt(id!)),
        rawMaterialPurchasesApi.getAll()
      ])
      setManufacturer(supplierRes.data || supplierRes)
      // Filter purchases for this supplier
      const filtered = purchasesRes.filter((p: Purchase) => p.supplierId === parseInt(id!))
      setPurchases(filtered)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPurchaseDetail = async (purchaseId: number) => {
    try {
      setLoadingDetail(true)
      const detail = await rawMaterialPurchasesApi.getById(purchaseId)
      setSelectedPurchase(detail)
    } catch (error) {
      console.error('Failed to load purchase detail:', error)
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

  // Calculate totals from filtered purchases
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPaid = filteredPurchases.reduce((sum, p) => sum + p.paidAmount, 0)
  const totalOutstanding = totalPurchases - totalPaid
  const purchaseCount = filteredPurchases.length

  
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manufacturer Report - ${manufacturer?.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
          .header h1 { font-size: 24px; color: #7c3aed; margin-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; background: #f5f3ff; padding: 15px; border-radius: 8px; }
          .info-item .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-item .value { font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.purple { color: #7c3aed; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #7c3aed; padding-bottom: 5px; color: #7c3aed; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f3ff; font-weight: bold; }
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
          <h1>Manufacturer Report</h1>
          <p>Raw Material Supplier Statement</p>
          <p style="margin-top: 5px; color: #666;">Generated: ${new Date().toLocaleString()}</p>
          ${hasActiveFilters ? `<p style="margin-top: 5px; color: #7c3aed; font-size: 11px;">
            Filters Applied: ${[
              startDate ? `From: ${startDate}` : '',
              endDate ? `To: ${endDate}` : '',
              statusFilter ? `Status: ${statusFilter}` : '',
              searchTerm ? `Search: "${searchTerm}"` : ''
            ].filter(Boolean).join(' | ')}
          </p>` : ''}
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="label">Manufacturer Name</div>
            <div class="value">${manufacturer?.name}</div>
          </div>
          <div class="info-item">
            <div class="label">Company</div>
            <div class="value">${manufacturer?.companyName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Phone</div>
            <div class="value">${manufacturer?.phone || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Email</div>
            <div class="value">${manufacturer?.email || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">City</div>
            <div class="value">${manufacturer?.city || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Payment Terms</div>
            <div class="value">${manufacturer?.paymentTerms || '-'}</div>
          </div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Purchases</div>
            <div class="value purple">${formatCurrency(totalPurchases)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Paid</div>
            <div class="value green">${formatCurrency(totalPaid)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Outstanding</div>
            <div class="value red">${formatCurrency(totalOutstanding)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Purchase Count</div>
            <div class="value">${purchaseCount}</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Raw Material Purchases</h2>
          <table>
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th class="text-center">Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPurchases.map(p => `
                <tr>
                  <td>${p.purchaseNumber}</td>
                  <td>${formatDate(p.purchaseDate)}</td>
                  <td class="text-right">${formatCurrency(p.totalAmount)}</td>
                  <td class="text-right">${formatCurrency(p.paidAmount)}</td>
                  <td class="text-right">${formatCurrency(p.totalAmount - p.paidAmount)}</td>
                  <td class="text-center status-${p.paymentStatus}">${p.paymentStatus.toUpperCase()}</td>
                  <td>${p.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalPurchases)}</th>
                <th class="text-right">${formatCurrency(totalPaid)}</th>
                <th class="text-right">${formatCurrency(totalOutstanding)}</th>
                <th colspan="2"></th>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="footer">
          <p>Catalyst Manufacturer Report - Raw Material Purchases Statement</p>
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
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    )
  }

  if (!manufacturer) {
    return (
      <div className="p-6">
        <p className="text-red-500">Manufacturer not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-600 hover:underline">Go Back</button>
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
            <h1 className="text-2xl font-bold text-gray-800">Manufacturer Report</h1>
            <p className="text-gray-500">Raw Material Supplier Statement</p>
          </div>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {/* Manufacturer Info */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-purple-900">{manufacturer.name}</h2>
            {manufacturer.companyName && <p className="text-purple-700">{manufacturer.companyName}</p>}
          </div>
          <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">Manufacturer</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-purple-600 uppercase">Phone</p>
            <p className="font-medium">{manufacturer.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-purple-600 uppercase">Email</p>
            <p className="font-medium">{manufacturer.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-purple-600 uppercase">City</p>
            <p className="font-medium">{manufacturer.city || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-purple-600 uppercase">Payment Terms</p>
            <p className="font-medium">{manufacturer.paymentTerms || '-'}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Purchases</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(totalPurchases)}</p>
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
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
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
              <p className="text-xs text-gray-500 uppercase">Purchase Count</p>
              <p className="text-xl font-bold text-blue-600">{purchaseCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search purchase #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            title="Start Date"
          />
          
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            title="End Date"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={16} />
              Clear
            </button>
          )}
          
          <div className="ml-auto text-sm text-gray-500">
            Showing {filteredPurchases.length} of {purchases.length} purchases
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-purple-50">
          <h3 className="font-semibold text-purple-900 flex items-center gap-2">
            <FileText size={18} />
            Raw Material Purchases
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {purchases.length === 0 ? 'No purchases found for this manufacturer' : 'No purchases match the filters'}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-purple-600">{purchase.purchaseNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(purchase.purchaseDate)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(purchase.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(purchase.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(purchase.totalAmount - purchase.paidAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                        purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {purchase.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{purchase.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => loadPurchaseDetail(purchase.id)}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {purchases.length > 0 && (
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalPurchases)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totalOutstanding)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
              <div>
                <h2 className="text-lg font-semibold">Purchase Details</h2>
                <p className="text-purple-200 text-sm">{selectedPurchase.purchaseNumber}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="p-1 hover:bg-purple-700 rounded">
                <ArrowLeft size={20} />
              </button>
            </div>
            {loadingDetail ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin text-purple-600" size={32} />
              </div>
            ) : (
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date</p>
                    <p className="font-medium">{formatDate(selectedPurchase.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="font-medium">{formatCurrency(selectedPurchase.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPurchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                      selectedPurchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedPurchase.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold mb-3">Items</h3>
                <table className="w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Material</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Warehouse</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedPurchase.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.rawMaterialName}</p>
                          <p className="text-xs text-gray-500">{item.rawMaterialCode}</p>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{item.warehouseName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(selectedPurchase.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(selectedPurchase.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>{formatCurrency(selectedPurchase.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span>-{formatCurrency(selectedPurchase.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedPurchase.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatCurrency(selectedPurchase.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Balance Due</span>
                    <span>{formatCurrency(selectedPurchase.totalAmount - selectedPurchase.paidAmount)}</span>
                  </div>
                </div>

                {selectedPurchase.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-gray-700">{selectedPurchase.notes}</p>
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
