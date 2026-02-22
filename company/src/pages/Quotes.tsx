import { useState, useEffect } from 'react'
import { FileText, Search, Eye, Edit, Trash2, Printer, Send, Check, X, Loader2, User, DollarSign } from 'lucide-react'
import { quotesApi, customersApi } from '../lib/api'
import api from '../lib/api'

interface Quote {
  id: number
  quoteNumber: string
  customerId: number
  customerName: string
  employeeName?: string
  quoteDate: string
  validUntil: string
  totalAmount: number
  status: string
  itemCount: number
  convertedOrderId?: number
}

interface QuoteDetail {
  id: number
  quoteNumber: string
  customerId: number
  customerName: string
  customerPhone?: string
  customerAddress?: string
  employeeId?: number
  employeeName?: string
  quoteDate: string
  validUntil: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  status: string
  notes?: string
  terms?: string
  convertedOrderId?: number
  convertedAt?: string
  createdAt: string
  items: QuoteItem[]
}

interface QuoteItem {
  id: number
  productId: number
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  lineTotal: number
  notes?: string
}

interface Customer {
  id: number
  name: string
  shopName?: string
}

interface Product {
  id: number
  name: string
  sku: string
  barcode?: string
  retailPrice: number
}

interface QuoteCartItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  discountPercent: number
}

interface Summary {
  totalQuotes: number
  draftQuotes: number
  sentQuotes: number
  acceptedQuotes: number
  convertedQuotes: number
  rejectedQuotes: number
  totalValue: number
  convertedValue: number
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)

  // Detail modal
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Create/Edit modal
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingQuote, setEditingQuote] = useState<QuoteDetail | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [quoteItems, setQuoteItems] = useState<QuoteCartItem[]>([])
  const [validDays, setValidDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [statusFilter])

  useEffect(() => {
    if (showFormModal) {
      loadFormData()
    }
  }, [showFormModal])

  const loadData = async () => {
    try {
      setLoading(true)
      const [quotesData, summaryData] = await Promise.all([
        quotesApi.getAll({ status: statusFilter || undefined }),
        quotesApi.getSummary()
      ])
      setQuotes(quotesData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load quotes:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersApi.getAll(),
        api.get('/products')
      ])
      setCustomers(custRes.data || custRes)
      setProducts(prodRes.data || [])
    } catch (err) {
      console.error('Failed to load form data:', err)
    }
  }

  const loadQuoteDetail = async (id: number) => {
    try {
      const data = await quotesApi.getById(id)
      setSelectedQuote(data)
      setShowDetailModal(true)
    } catch (err) {
      console.error('Failed to load quote:', err)
    }
  }

  const openEditModal = async (id: number) => {
    try {
      const data = await quotesApi.getById(id)
      setEditingQuote(data)
      setSelectedCustomerId(data.customerId)
      setQuoteItems(data.items.map((i: QuoteItem) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.productSku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent
      })))
      setNotes(data.notes || '')
      setTerms(data.terms || '')
      setShowFormModal(true)
    } catch (err) {
      console.error('Failed to load quote for edit:', err)
    }
  }

  const addProduct = (product: Product) => {
    const existing = quoteItems.find(i => i.productId === product.id)
    if (existing) {
      setQuoteItems(quoteItems.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setQuoteItems([...quoteItems, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.retailPrice,
        discountPercent: 0
      }])
    }
    setProductSearch('')
  }

  const updateItem = (productId: number, field: keyof QuoteCartItem, value: any) => {
    setQuoteItems(quoteItems.map(i =>
      i.productId === productId ? { ...i, [field]: value } : i
    ))
  }

  const removeItem = (productId: number) => {
    setQuoteItems(quoteItems.filter(i => i.productId !== productId))
  }

  const handleSave = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer')
      return
    }
    if (quoteItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      const payload = {
        customerId: selectedCustomerId,
        validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
        discountAmount: 0,
        taxAmount: 0,
        notes,
        terms,
        items: quoteItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent
        }))
      }

      if (editingQuote) {
        await quotesApi.update(editingQuote.id, payload)
      } else {
        await quotesApi.create(payload)
      }

      setShowFormModal(false)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await quotesApi.updateStatus(id, status)
      loadData()
      if (selectedQuote?.id === id) {
        loadQuoteDetail(id)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this quote?')) return
    try {
      await quotesApi.delete(id)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete')
    }
  }

  const printQuote = (quote: QuoteDetail) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
          .header .quote-number { font-size: 18px; color: #666; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-box { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; }
          .info-box h3 { margin: 0 0 10px; color: #374151; font-size: 14px; text-transform: uppercase; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          .info-box .value { font-weight: bold; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #2563eb; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
          td { border-bottom: 1px solid #e5e7eb; padding: 12px; font-size: 14px; }
          .text-right { text-align: right; }
          .total-row { background: #f0f9ff; font-weight: bold; }
          .total-row td { border-top: 2px solid #2563eb; }
          .validity { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .validity strong { color: #92400e; }
          .notes { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .notes h4 { margin: 0 0 10px; color: #374151; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-draft { background: #f3f4f6; color: #6b7280; }
          .status-sent { background: #dbeafe; color: #1d4ed8; }
          .status-accepted { background: #dcfce7; color: #166534; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTATION</h1>
          <div class="quote-number">${quote.quoteNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Customer</h3>
            <p class="value">${quote.customerName}</p>
            ${quote.customerPhone ? `<p>Phone: ${quote.customerPhone}</p>` : ''}
            ${quote.customerAddress ? `<p>Address: ${quote.customerAddress}</p>` : ''}
          </div>
          <div class="info-box">
            <h3>Quote Details</h3>
            <p>Date: <span class="value">${formatDate(quote.quoteDate)}</span></p>
            <p>Valid Until: <span class="value">${formatDate(quote.validUntil)}</span></p>
            <p>Status: <span class="status status-${quote.status}">${quote.status.toUpperCase()}</span></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Discount</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.productSku}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${item.discountPercent > 0 ? item.discountPercent + '%' : '-'}</td>
                <td class="text-right">${formatCurrency(item.lineTotal)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" class="text-right">Subtotal:</td>
              <td class="text-right">${formatCurrency(quote.subtotal)}</td>
            </tr>
            ${quote.discountAmount > 0 ? `
              <tr>
                <td colspan="5" class="text-right">Discount:</td>
                <td class="text-right">-${formatCurrency(quote.discountAmount)}</td>
              </tr>
            ` : ''}
            ${quote.taxAmount > 0 ? `
              <tr>
                <td colspan="5" class="text-right">Tax:</td>
                <td class="text-right">${formatCurrency(quote.taxAmount)}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="5" class="text-right"><strong>TOTAL:</strong></td>
              <td class="text-right"><strong>${formatCurrency(quote.totalAmount)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="validity">
          <strong>This quote is valid until ${formatDate(quote.validUntil)}</strong>
        </div>

        ${quote.notes ? `
          <div class="notes">
            <h4>Notes</h4>
            <p>${quote.notes}</p>
          </div>
        ` : ''}

        ${quote.terms ? `
          <div class="notes">
            <h4>Terms & Conditions</h4>
            <p>${quote.terms}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Catalyst Quote Management System</p>
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
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'converted': return 'bg-emerald-100 text-emerald-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'expired': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString()

  const quoteTotal = quoteItems.reduce((sum, i) => {
    const lineTotal = i.quantity * i.unitPrice * (1 - i.discountPercent / 100)
    return sum + lineTotal
  }, 0)

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 10)

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode === productSearch
  ).slice(0, 10)

  const filteredQuotes = quotes.filter(q =>
    q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.totalQuotes}</p>
                <p className="text-sm text-gray-500">Total Quotes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Send className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{summary.sentQuotes}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.acceptedQuotes}</p>
                <p className="text-sm text-gray-500">Accepted</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.convertedValue)}</p>
                <p className="text-sm text-gray-500">Converted Value</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No quotes found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Quote #</th>
                <th className="text-left p-4 font-medium text-gray-600">Customer</th>
                <th className="text-left p-4 font-medium text-gray-600">Date</th>
                <th className="text-left p-4 font-medium text-gray-600">Valid Until</th>
                <th className="text-right p-4 font-medium text-gray-600">Amount</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-right p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{quote.quoteNumber}</td>
                  <td className="p-4">{quote.customerName}</td>
                  <td className="p-4 text-gray-500">{formatDate(quote.quoteDate)}</td>
                  <td className="p-4 text-gray-500">{formatDate(quote.validUntil)}</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(quote.totalAmount)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => loadQuoteDetail(quote.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => openEditModal(quote.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {(quote.status === 'draft' || quote.status === 'sent') && (
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
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
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold">{selectedQuote.quoteNumber}</h2>
                <p className="text-sm text-gray-500">{formatDate(selectedQuote.quoteDate)}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedQuote.status)}`}>
                {selectedQuote.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedQuote.customerName}</p>
                {selectedQuote.customerPhone && <p className="text-sm text-gray-500">{selectedQuote.customerPhone}</p>}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Valid Until</p>
                <p className="font-medium">{formatDate(selectedQuote.validUntil)}</p>
              </div>
            </div>

            <h3 className="font-medium mb-3">Items</h3>
            <table className="w-full text-sm mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Discount</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.productSku}</p>
                    </td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-2 text-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-blue-50">
                  <td colSpan={4} className="p-2 text-right">Total:</td>
                  <td className="p-2 text-right">{formatCurrency(selectedQuote.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>

            {selectedQuote.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Notes</p>
                <p>{selectedQuote.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => printQuote(selectedQuote)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
              {selectedQuote.status === 'draft' && (
                <button
                  onClick={() => handleUpdateStatus(selectedQuote.id, 'sent')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <Send size={18} />
                  Mark as Sent
                </button>
              )}
              {selectedQuote.status === 'sent' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedQuote.id, 'accepted')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                  >
                    <Check size={18} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedQuote.id, 'rejected')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                  >
                    <X size={18} />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingQuote ? 'Edit Quote' : 'Create New Quote'}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Customer Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                {selectedCustomerId ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-blue-600" />
                      <span className="font-medium">
                        {customers.find(c => c.id === selectedCustomerId)?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCustomerId(null)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customers..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                    {customerSearch && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch('') }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50"
                          >
                            <p className="font-medium">{c.name}</p>
                            {c.shopName && <p className="text-sm text-gray-500">{c.shopName}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Valid Days */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid for (days)</label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                  min="1"
                  className="w-32 px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Product Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Products</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setProductSearch(value)
                      if (value.length >= 3) {
                        const match = products.find(p => p.barcode === value || p.sku.toLowerCase() === value.toLowerCase())
                        if (match) addProduct(match)
                      }
                    }}
                    placeholder="Scan barcode or search products..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addProduct(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between"
                        >
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-gray-500">{p.sku}</p>
                          </div>
                          <span className="text-blue-600 font-medium">{formatCurrency(p.retailPrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Items */}
              {quoteItems.length > 0 && (
                <div className="mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-center p-2 w-20">Qty</th>
                        <th className="text-right p-2 w-24">Price</th>
                        <th className="text-center p-2 w-20">Disc %</th>
                        <th className="text-right p-2 w-24">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map(item => {
                        const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
                        return (
                          <tr key={item.productId} className="border-b">
                            <td className="p-2">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.sku}</p>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.productId, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-full text-center border rounded px-2 py-1"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full text-right border rounded px-2 py-1"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discountPercent}
                                onChange={(e) => updateItem(item.productId, 'discountPercent', parseFloat(e.target.value) || 0)}
                                className="w-full text-center border rounded px-2 py-1"
                              />
                            </td>
                            <td className="p-2 text-right font-medium">{formatCurrency(lineTotal)}</td>
                            <td className="p-2">
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td colSpan={4} className="p-2 text-right">Total:</td>
                        <td className="p-2 text-right">{formatCurrency(quoteTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Notes & Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Terms and conditions..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowFormModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedCustomerId || quoteItems.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingQuote ? 'Update Quote' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
