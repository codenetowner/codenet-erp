import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertTriangle, RefreshCw } from 'lucide-react'
import { shiftApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

interface ShiftSummary {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalSales: number
  cashSales: number
  creditSales: number
  totalCollections: number
  cashCollections: number
  checkCollections: number
  totalDeposits: number
  cashInHand: number
}

export default function EndShift() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  useEffect(() => {
    loadShiftSummary()
  }, [])

  const loadShiftSummary = async () => {
    try {
      const res = await shiftApi.getSummary()
      setShiftSummary(res.data)
    } catch (error) {
      console.error('Failed to load shift summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleEndShift = async () => {
    if (!confirmed) {
      alert('Please confirm the shift summary')
      return
    }
    
    setLoading(true)
    try {
      await shiftApi.end({ notes: 'Shift ended by driver' })
      alert('Shift ended successfully! Attendance recorded.')
      logout()
      navigate('/login')
    } catch (error: any) {
      console.error('Failed to end shift:', error)
      // Even if API fails, allow logout
      alert(error.response?.data?.error || 'Shift ended')
      logout()
      navigate('/login')
    }
  }

  if (loadingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!shiftSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load shift summary</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header bg-orange-600">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 hover:bg-orange-500 rounded-lg">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">End Shift</h1>
            <p className="text-orange-200 text-sm">Today's Summary</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{shiftSummary.completedTasks}/{shiftSummary.totalTasks}</p>
            <p className="text-xs text-gray-500">Tasks Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">${shiftSummary.totalSales.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total Sales</p>
          </div>
        </div>

        {/* Cash Summary */}
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Cash Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Cash Sales</span>
              <span className="font-medium text-green-600">+${shiftSummary.cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cash Collections</span>
              <span className="font-medium text-green-600">+${shiftSummary.cashCollections.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check Collections</span>
              <span className="font-medium text-blue-600">${shiftSummary.checkCollections.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deposits</span>
              <span className="font-medium text-red-600">-${shiftSummary.totalDeposits.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Cash in Hand</span>
              <span className="font-bold text-xl">${shiftSummary.cashInHand.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Sales Summary */}
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Sales Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Cash Sales</span>
              <span className="font-medium">${shiftSummary.cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Credit Sales</span>
              <span className="font-medium">${shiftSummary.creditSales.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold">Total Sales</span>
              <span className="font-bold text-lg text-green-600">
                ${shiftSummary.totalSales.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <div className="flex gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
            <div>
              <p className="font-medium text-yellow-800">Before ending shift</p>
              <p className="text-sm text-yellow-700 mt-1">
                Make sure all cash has been deposited and the remaining amount matches your physical count.
              </p>
            </div>
          </div>
        </div>

        {/* Confirm Checkbox */}
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-gray-700">
            I confirm that the cash in hand matches ${shiftSummary.cashInHand.toFixed(2)}
          </span>
        </label>

        {/* End Shift Button */}
        <button
          onClick={handleEndShift}
          disabled={loading || !confirmed}
          className="w-full btn bg-orange-600 text-white hover:bg-orange-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            'Ending Shift...'
          ) : (
            <>
              <Check size={20} />
              End Shift
            </>
          )}
        </button>
      </div>
    </div>
  )
}
