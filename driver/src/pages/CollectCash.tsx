import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign, CreditCard, Check, RefreshCw, Search, User, AlertCircle } from 'lucide-react'
import { collectionsApi, customersApi } from '../lib/api'

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  currentBalance: number
  creditLimit: number
}

export default function CollectCash() {
  const { customerId: urlCustomerId } = useParams()
  const navigate = useNavigate()
  
  // Customer selection state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  
  // Collection form state
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash')
  const [checkNumber, setCheckNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [urlCustomerId])

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const res = await customersApi.getAll()
      // Filter customers who have outstanding debt (they owe us money)
      const customersWithDebt = res.data.filter((c: Customer) => c.currentBalance > 0)
      setCustomers(customersWithDebt)
      
      // If URL has customerId, pre-select that customer
      if (urlCustomerId) {
        const customer = res.data.find((c: Customer) => c.id === parseInt(urlCustomerId))
        if (customer) setSelectedCustomer(customer)
      }
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !amount) return
    
    const collectAmount = parseFloat(amount)
    if (collectAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    setSubmitting(true)
    try {
      await collectionsApi.create({
        customerId: selectedCustomer.id,
        amount: collectAmount,
        paymentType: paymentMethod,
        checkNumber: paymentMethod === 'check' ? checkNumber : undefined,
        notes
      })
      alert(`Successfully collected $${collectAmount.toFixed(2)} from ${selectedCustomer.name}`)
      navigate('/')
    } catch (error) {
      console.error('Failed to create collection:', error)
      alert('Failed to record collection')
    } finally {
      setSubmitting(false)
    }
  }

  const quickAmounts = selectedCustomer ? [
    Math.min(50, selectedCustomer.currentBalance),
    Math.min(100, selectedCustomer.currentBalance),
    Math.min(selectedCustomer.currentBalance / 2, selectedCustomer.currentBalance),
    selectedCustomer.currentBalance
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : []

  if (loadingCustomers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  // Step 1: Select customer (if not selected)
  if (!selectedCustomer) {
    return (
      <div>
        {/* Header */}
        <div className="page-header bg-green-600">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 hover:bg-green-500 rounded-lg">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Collect Payment</h1>
              <p className="text-green-200 text-sm">Select customer with balance</p>
            </div>
          </div>
        </div>

        <div className="page-content">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Info */}
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No customers have outstanding balances</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Showing {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} with outstanding balance
                </p>
              </div>

              {/* Customer List */}
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="w-full card flex items-center gap-3 text-left active:bg-gray-50"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={24} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                      {customer.phone && (
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">${customer.currentBalance.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">owes</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Step 2: Collect from selected customer
  return (
    <div>
      {/* Header */}
      <div className="page-header bg-green-600">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedCustomer(null)} 
            className="p-2 -ml-2 hover:bg-green-500 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Collect Payment</h1>
            <p className="text-green-200 text-sm">{selectedCustomer.name}</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Customer Balance Card */}
        <div className="card mb-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="font-semibold">{selectedCustomer.name}</p>
              {selectedCustomer.phone && (
                <p className="text-red-200 text-sm">{selectedCustomer.phone}</p>
              )}
            </div>
          </div>
          <div className="border-t border-white/20 pt-3">
            <p className="text-red-200 text-sm">Outstanding Balance</p>
            <p className="text-3xl font-bold">${selectedCustomer.currentBalance.toFixed(2)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-10 text-2xl font-bold"
                placeholder="0.00"
                max={selectedCustomer.currentBalance}
                required
              />
            </div>
            {parseFloat(amount) > selectedCustomer.currentBalance && (
              <p className="text-red-500 text-sm mt-1">
                Amount exceeds outstanding balance
              </p>
            )}
          </div>

          {/* Quick Amounts */}
          {quickAmounts.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((qa, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAmount(qa.toFixed(2))}
                  className={`btn text-sm ${
                    qa === selectedCustomer.currentBalance 
                      ? 'btn-success' 
                      : 'btn-secondary'
                  }`}
                >
                  {qa === selectedCustomer.currentBalance ? 'Full' : `$${qa.toFixed(0)}`}
                </button>
              ))}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`card flex items-center justify-center gap-2 py-4 ${
                  paymentMethod === 'cash' ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
              >
                <DollarSign size={24} className={paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'} />
                <span className={paymentMethod === 'cash' ? 'font-semibold text-green-600' : 'text-gray-600'}>
                  Cash
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('check')}
                className={`card flex items-center justify-center gap-2 py-4 ${
                  paymentMethod === 'check' ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
              >
                <CreditCard size={24} className={paymentMethod === 'check' ? 'text-green-600' : 'text-gray-400'} />
                <span className={paymentMethod === 'check' ? 'font-semibold text-green-600' : 'text-gray-600'}>
                  Check
                </span>
              </button>
            </div>
          </div>

          {/* Check Number */}
          {paymentMethod === 'check' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Number
              </label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className="input"
                placeholder="Enter check number"
                required
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Add any notes..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > selectedCustomer.currentBalance}
            className="w-full btn btn-success flex items-center justify-center gap-2 disabled:opacity-50 py-4 text-lg"
          >
            {submitting ? (
              'Processing...'
            ) : (
              <>
                <Check size={24} />
                Collect ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
