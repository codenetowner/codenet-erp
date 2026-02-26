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
      case 'draft': return 'bg-slate-800 text-slate-300 border-slate-700'
      case 'sent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'accepted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'converted': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'expired': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-slate-800 text-slate-300 border-slate-700'
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
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">Quotations</h1>
          <p className="text-slate-400 text-sm mt-1">Manage sales quotes and proposals</p>
        </div>
        <button
          onClick={() => {
            setEditingQuote(null)
            setSelectedCustomerId(null)
            setQuoteItems([])
            setNotes('')
            setTerms('')
            setValidDays(30)
            setShowFormModal(true)
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white hover:bg-cyan-500 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] font-medium text-sm"
        >
          <FileText size={18} />
          Create Quote
        </button>
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 relative z-10">
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.totalQuotes}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Total Quotes</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-cyan-400 shadow-inner">
                <FileText size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.sentQuotes}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Sent</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-amber-400 shadow-inner">
                <Send size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.acceptedQuotes}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Accepted</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner">
                <Check size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-600 to-purple-600 rounded-2xl p-5 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(summary.convertedValue)}</p>
                <p className="text-sm text-cyan-100 font-medium mt-1">Converted Value</p>
              </div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                <DollarSign size={22} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 mb-6 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotes by number or customer..."
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-sm outline-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">All Statuses</option>
            <option value="draft" className="bg-slate-800">Draft</option>
            <option value="sent" className="bg-slate-800">Sent</option>
            <option value="accepted" className="bg-slate-800">Accepted</option>
            <option value="converted" className="bg-slate-800">Converted</option>
            <option value="rejected" className="bg-slate-800">Rejected</option>
            <option value="expired" className="bg-slate-800">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden relative z-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-800">
               <FileText size={32} className="text-slate-600" />
            </div>
            <p className="text-lg font-medium text-slate-300">No quotes found</p>
            <p className="text-sm text-slate-500 mt-2">Create a new quote to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Quote #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Valid Until</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-200">{quote.quoteNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-700/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                          {quote.customerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{quote.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(quote.quoteDate)}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(quote.validUntil)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-200">{formatCurrency(quote.totalAmount)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-sm ${getStatusColor(quote.status)}`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => loadQuoteDetail(quote.id)}
                          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {quote.status === 'draft' && (
                          <button
                            onClick={() => openEditModal(quote.id)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {(quote.status === 'draft' || quote.status === 'sent') && (
                          <button
                            onClick={() => handleDelete(quote.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Detail Modal --- */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedQuote.quoteNumber}</h2>
                  <p className="text-slate-400 text-sm mt-1">Generated on {formatDate(selectedQuote.quoteDate)}</p>
                </div>
              </div>
              <span className={`px-4 py-1.5 text-sm font-bold rounded-lg border backdrop-blur-sm shadow-sm ${getStatusColor(selectedQuote.status)}`}>
                {selectedQuote.status.toUpperCase()}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="p-5 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <User size={16} /> <span className="text-xs uppercase font-semibold tracking-wider">Customer Details</span>
                  </div>
                  <p className="font-bold text-lg text-slate-200">{selectedQuote.customerName}</p>
                  {selectedQuote.customerPhone && <p className="text-slate-400 text-sm mt-1">{selectedQuote.customerPhone}</p>}
                </div>
                
                <div className="p-5 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Check size={16} /> <span className="text-xs uppercase font-semibold tracking-wider">Validity</span>
                  </div>
                  <p className="font-bold text-lg text-slate-200">{formatDate(selectedQuote.validUntil)}</p>
                  <p className="text-slate-400 text-sm mt-1">Quote expiration date</p>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl border border-slate-800/50 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
                  <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                      <tr>
                        <th className="text-left p-4 font-semibold">Product</th>
                        <th className="text-center p-4 font-semibold w-24">Qty</th>
                        <th className="text-right p-4 font-semibold w-32">Unit Price</th>
                        <th className="text-center p-4 font-semibold w-24">Discount</th>
                        <th className="text-right p-4 font-semibold w-32">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 text-slate-300">
                      {selectedQuote.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-slate-200">{item.productName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">SKU: {item.productSku}</p>
                          </td>
                          <td className="p-4 text-center font-medium">{item.quantity}</td>
                          <td className="p-4 text-right text-slate-400">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-4 text-center">
                            {item.discountPercent > 0 ? (
                              <span className="inline-block px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-xs font-bold border border-rose-500/20">
                                {item.discountPercent}%
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-200">{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900/50 border-t border-slate-800/80">
                      <tr>
                        <td colSpan={4} className="p-4 text-right font-bold text-slate-400 uppercase tracking-wider text-xs">Total Amount</td>
                        <td className="p-4 text-right font-bold text-xl text-cyan-400">{formatCurrency(selectedQuote.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="mb-4 p-5 bg-slate-950/30 rounded-xl border border-slate-800/30">
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Notes & Remarks</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedQuote.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm flex-1 md:flex-none"
              >
                Close
              </button>
              
              <div className="flex-1 flex gap-3 justify-end">
                <button
                  onClick={() => printQuote(selectedQuote)}
                  className="px-5 py-2.5 bg-slate-800 text-cyan-400 hover:text-white border border-cyan-500/30 hover:bg-cyan-600 hover:border-cyan-500 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Export / Print
                </button>
                
                {selectedQuote.status === 'draft' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedQuote.id, 'sent')}
                    className="px-5 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Mark as Sent
                  </button>
                )}
                
                {selectedQuote.status === 'sent' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'accepted')}
                      className="px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Accept Quote
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'rejected')}
                      className="px-5 py-2.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Reject Quote
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Create/Edit Modal --- */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  {editingQuote ? <Edit size={20} /> : <FileText size={20} />}
                </div>
                {editingQuote ? 'Edit Quote' : 'Create New Quote'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Customer *</label>
                  {selectedCustomerId ? (
                    <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-600/20 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                          <User size={16} />
                        </div>
                        <span className="font-medium text-slate-200">
                          {customers.find(c => c.id === selectedCustomerId)?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCustomerId(null)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customers..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all"
                      />
                      {customerSearch && filteredCustomers.length > 0 && (
                        <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                          {filteredCustomers.map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch('') }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0 transition-colors"
                            >
                              <p className="font-bold text-slate-200">{c.name}</p>
                              {c.shopName && <p className="text-xs text-slate-400 mt-0.5">{c.shopName}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Valid Days */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Valid for (days)</label>
                  <input
                    type="number"
                    value={validDays}
                    onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                    min="1"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Product Search */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Add Products</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addProduct(p)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-200">{p.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{p.sku}</p>
                          </div>
                          <span className="text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded-md">{formatCurrency(p.retailPrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Items Table */}
              {quoteItems.length > 0 && (
                <div className="mb-6 bg-slate-950/50 rounded-xl border border-slate-800/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                        <tr>
                          <th className="text-left p-4 font-semibold">Product</th>
                          <th className="text-center p-4 font-semibold w-24">Qty</th>
                          <th className="text-right p-4 font-semibold w-32">Price</th>
                          <th className="text-center p-4 font-semibold w-24">Disc %</th>
                          <th className="text-right p-4 font-semibold w-32">Total</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30 text-slate-300">
                        {quoteItems.map(item => {
                          const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100)
                          return (
                            <tr key={item.productId} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="p-4">
                                <p className="font-bold text-slate-200">{item.productName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{item.sku}</p>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.productId, 'quantity', parseFloat(e.target.value) || 1)}
                                  className="w-full text-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full text-right bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discountPercent}
                                  onChange={(e) => updateItem(item.productId, 'discountPercent', parseFloat(e.target.value) || 0)}
                                  className="w-full text-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                />
                              </td>
                              <td className="p-4 text-right font-bold text-slate-200">{formatCurrency(lineTotal)}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => removeItem(item.productId)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-50 group-hover:opacity-100"
                                  title="Remove item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-slate-900/50 border-t border-slate-800/80">
                        <tr>
                          <td colSpan={4} className="p-4 text-right font-bold text-slate-400 uppercase tracking-wider text-xs">Total Amount</td>
                          <td className="p-4 text-right font-bold text-xl text-cyan-400">{formatCurrency(quoteTotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Internal Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional internal notes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Terms & Conditions</label>
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Terms and conditions for customer..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex gap-3 shrink-0">
              <button
                onClick={() => setShowFormModal(false)}
                className="flex-1 px-5 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedCustomerId || quoteItems.length === 0}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
              >
                {saving ? (
                  <><Loader2 size={18} className="animate-spin" /> Saving...</>
                ) : (
                  editingQuote ? 'Update Quote' : 'Create Quote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
