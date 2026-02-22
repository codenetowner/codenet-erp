import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, DollarSign, Check, RefreshCw } from 'lucide-react'
import { depositsApi, dashboardApi } from '../lib/api'

export default function Deposit() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [depositType, setDepositType] = useState<'bank' | 'warehouse'>('warehouse')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [cashInHand, setCashInHand] = useState(0)
  const [loadingCash, setLoadingCash] = useState(true)

  useEffect(() => {
    loadCashSummary()
  }, [])

  const loadCashSummary = async () => {
    try {
      const res = await dashboardApi.getCashSummary()
      setCashInHand(res.data.cashInHand)
    } catch (error) {
      console.error('Failed to load cash summary:', error)
    } finally {
      setLoadingCash(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await depositsApi.create({
        amount: parseFloat(amount),
        depositType,
        slipNumber: depositType === 'bank' ? reference : undefined,
        notes
      })
      alert('Deposit recorded successfully!')
      navigate('/')
    } catch (error) {
      console.error('Failed to create deposit:', error)
      alert('Failed to record deposit')
    } finally {
      setLoading(false)
    }
  }

  if (loadingCash) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-primary-500 rounded-lg">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Make Deposit</h1>
            <p className="text-primary-200 text-sm">Record cash deposit</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Cash in Hand */}
        <div className="card mb-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <p className="text-green-200 text-sm">Cash in Hand</p>
          <p className="text-3xl font-bold">${cashInHand.toFixed(2)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deposit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit To
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDepositType('bank')}
                className={`card flex items-center justify-center gap-2 py-4 ${
                  depositType === 'bank' ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                }`}
              >
                <Building2 size={24} className={depositType === 'bank' ? 'text-primary-600' : 'text-gray-400'} />
                <span className={depositType === 'bank' ? 'font-semibold text-primary-600' : 'text-gray-600'}>
                  Bank
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDepositType('warehouse')}
                className={`card flex items-center justify-center gap-2 py-4 ${
                  depositType === 'warehouse' ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                }`}
              >
                <Building2 size={24} className={depositType === 'warehouse' ? 'text-primary-600' : 'text-gray-400'} />
                <span className={depositType === 'warehouse' ? 'font-semibold text-primary-600' : 'text-gray-600'}>
                  Warehouse
                </span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-10 text-2xl font-bold"
                placeholder="0.00"
                min={0.01}
                step="0.01"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(cashInHand.toString())}
              className="text-sm text-primary-600 mt-2"
            >
              Deposit all (${cashInHand.toFixed(2)})
            </button>
          </div>

          {/* Reference */}
          {depositType === 'bank' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Reference / Receipt #
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="input"
                placeholder="Enter reference number"
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
              rows={3}
              placeholder="Add any notes..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Check size={20} />
                Record Deposit
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
