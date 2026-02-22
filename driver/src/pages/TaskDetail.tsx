import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  MapPin, 
  Phone, 
  Package, 
  CheckCircle, 
  PlayCircle,
  RefreshCw,
  DollarSign,
  CreditCard,
  User,
  Check,
  Camera,
  Image,
  X,
  Printer
} from 'lucide-react'
import { tasksApi, collectionsApi, customersApi } from '../lib/api'

interface TaskItem {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

interface Task {
  id: number
  taskNumber: string
  taskType: string
  status: string
  priority: number
  taskDate: string
  notes: string | null
  customerId: number | null
  customerName: string | null
  customerPhone: string | null
  customerAddress: string | null
  items: TaskItem[]
  totalAmount: number
  proofOfDeliveryUrl: string | null
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'split'>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  
  // Cash Collection state
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [customerBalance, setCustomerBalance] = useState(0)
  const [collectionAmount, setCollectionAmount] = useState('')
  const [collectionPaymentMethod, setCollectionPaymentMethod] = useState<'cash' | 'check'>('cash')
  const [collectionNotes, setCollectionNotes] = useState('')
  
  // Proof of delivery state
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [showProofImage, setShowProofImage] = useState(false)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showPostComplete, setShowPostComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadTask = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await tasksApi.getById(parseInt(id))
      setTask(res.data)
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTask()
  }, [id])

  const handleUpdateStatus = async (newStatus: string) => {
    if (!task) return
    setUpdating(true)
    try {
      await tasksApi.updateStatus(task.id, newStatus)
      await loadTask()
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProofPhoto(file)
      setProofPreview(URL.createObjectURL(file))
    }
  }

  const handleCompleteTask = async () => {
    if (!task) return
    setUpdating(true)
    try {
      await tasksApi.updateStatus(task.id, 'Completed', paymentType, paymentType === 'split' ? paidAmount : undefined)
      setShowPaymentModal(false)
      setProofPhoto(null)
      setProofPreview(null)
      await loadTask()
      setShowPostComplete(true)
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCompleteVisit = async () => {
    if (!task) return
    setUpdating(true)
    try {
      await tasksApi.updateStatus(task.id, 'Completed', 'cash', 0)
      setShowVisitModal(false)
      setProofPhoto(null)
      setProofPreview(null)
      await loadTask()
      setShowPostComplete(true)
    } catch (error) {
      console.error('Failed to complete visit:', error)
      alert('Failed to complete visit')
    } finally {
      setUpdating(false)
    }
  }

  const handleUploadProof = async () => {
    if (!task || !proofPhoto) return
    setUpdating(true)
    try {
      await tasksApi.uploadProof(task.id, proofPhoto)
      setProofPhoto(null)
      setProofPreview(null)
      await loadTask()
      setShowPostComplete(false)
    } catch (error) {
      console.error('Failed to upload proof:', error)
      alert('Failed to upload proof photo')
    } finally {
      setUpdating(false)
    }
  }

  const openPaymentModal = async () => {
    if (!task) return
    
    // For Customer Visit tasks, show visit completion modal with photo capture
    if (task.taskType === 'Customer Visit') {
      setProofPhoto(null)
      setProofPreview(null)
      setShowVisitModal(true)
      return
    }
    
    // For Cash Collection tasks, show collection modal instead
    if (task.taskType === 'Cash Collection' && task.customerId) {
      try {
        const res = await customersApi.getById(task.customerId)
        setCustomerBalance(res.data.currentBalance || 0)
        setCollectionAmount('')
        setCollectionPaymentMethod('cash')
        setCollectionNotes('')
        setShowCollectionModal(true)
      } catch (error) {
        console.error('Failed to load customer:', error)
        alert('Failed to load customer balance')
      }
    } else {
      // Regular task - show payment modal
      setPaidAmount(task.totalAmount)
      setPaymentType('cash')
      setShowPaymentModal(true)
    }
  }

  const handleCompleteCollection = async () => {
    if (!task || !task.customerId) return
    
    const amount = parseFloat(collectionAmount)
    if (amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    setUpdating(true)
    try {
      // Create collection to reduce customer debt
      await collectionsApi.create({
        customerId: task.customerId,
        amount: amount,
        paymentType: collectionPaymentMethod,
        notes: collectionNotes || `Collected via Task: ${task.taskNumber}`
      })
      
      // Mark task as completed
      await tasksApi.updateStatus(task.id, 'Completed', 'cash', amount)
      
      setShowCollectionModal(false)
      alert(`Successfully collected $${amount.toFixed(2)}`)
      await loadTask()
    } catch (error) {
      console.error('Failed to complete collection:', error)
      alert('Failed to record collection')
    } finally {
      setUpdating(false)
    }
  }

  const quickAmounts = customerBalance > 0 ? [
    Math.min(50, customerBalance),
    Math.min(100, customerBalance),
    Math.round(customerBalance / 2),
    customerBalance
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
        return 'bg-green-100 text-green-800'
      case 'In Progress':
      case 'Started':
        return 'bg-blue-100 text-blue-800'
      case 'Pending':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Package size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500">Task not found</p>
        <button onClick={() => navigate('/tasks')} className="mt-4 text-primary-600">
          Back to Tasks
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tasks')} className="p-2 -ml-2 rounded-full hover:bg-primary-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">{task.taskNumber}</h1>
            <p className="text-primary-200 text-sm">{task.taskType}</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
          <span className="text-2xl font-bold text-primary-600">{formatCurrency(task.totalAmount)}</span>
        </div>

        {/* Customer Info */}
        {task.customerName && (
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <p className="font-medium text-gray-900">{task.customerName}</p>
            {task.customerAddress && (
              <div className="flex items-start gap-2 mt-2">
                <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">{task.customerAddress}</p>
              </div>
            )}
            {task.customerPhone && (
              <div className="flex items-center gap-2 mt-2">
                <Phone size={16} className="text-gray-400" />
                <a href={`tel:${task.customerPhone}`} className="text-sm text-primary-600 font-medium">
                  {task.customerPhone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Items ({task.items.length})</h3>
          <div className="space-y-3">
            {task.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                    {item.discount > 0 && ` (-${item.discount}%)`}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">{formatCurrency(task.totalAmount)}</span>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="card mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-600">{task.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {task.status === 'Pending' && (
            <button
              onClick={() => handleUpdateStatus('Started')}
              disabled={updating}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <PlayCircle size={20} />
              {updating ? 'Starting...' : 'Start Task'}
            </button>
          )}
          {(task.status === 'Started' || task.status === 'In Progress') && (
            <button
              onClick={openPaymentModal}
              disabled={updating}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Complete Task
            </button>
          )}
          {(task.status === 'Completed' || task.status === 'Delivered') && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
              <p className="font-medium text-green-800">Task Completed</p>
              {task.proofOfDeliveryUrl && (
                <button
                  onClick={() => setShowProofImage(true)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Image size={16} />
                  View Proof of Delivery
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              <p className="text-sm text-gray-500">Total: {formatCurrency(task.totalAmount)}</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Payment Type Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === 'cash'}
                    onChange={() => { setPaymentType('cash'); setPaidAmount(task.totalAmount) }}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <p className="font-medium">Cash</p>
                    <p className="text-sm text-gray-500">Full payment in cash</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === 'credit'}
                    onChange={() => { setPaymentType('credit'); setPaidAmount(0) }}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div>
                    <p className="font-medium">On Credit</p>
                    <p className="text-sm text-gray-500">Add to customer debt</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === 'split'}
                    onChange={() => setPaymentType('split')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium">Split Payment</p>
                    <p className="text-sm text-gray-500">Part cash, part credit</p>
                  </div>
                </label>
              </div>

              {/* Split Payment Amount */}
              {paymentType === 'split' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Cash Amount</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.min(task.totalAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                    max={task.totalAmount}
                    min={0}
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">On Credit:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(task.totalAmount - paidAmount)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={updating}
                className="flex-1 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal for Cash Collection Tasks */}
      {showCollectionModal && task && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-4 bg-green-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Collect Payment</h3>
              <p className="text-green-200 text-sm">{task.customerName}</p>
            </div>
            
            {/* Customer Balance Card */}
            <div className="m-4 p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-semibold">{task.customerName}</p>
                  {task.customerPhone && <p className="text-red-200 text-sm">{task.customerPhone}</p>}
                </div>
              </div>
              <div className="border-t border-white/20 pt-3">
                <p className="text-red-200 text-sm">Outstanding Balance</p>
                <p className="text-2xl font-bold">${customerBalance.toFixed(2)}</p>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collection Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-xl font-bold"
                    placeholder="0.00"
                    max={customerBalance}
                  />
                </div>
              </div>

              {/* Quick Amounts */}
              {quickAmounts.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((qa, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCollectionAmount(qa.toFixed(2))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium ${
                        qa === customerBalance 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {qa === customerBalance ? 'Full' : `$${qa}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollectionPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 py-3 border rounded-xl ${
                      collectionPaymentMethod === 'cash' ? 'ring-2 ring-green-500 bg-green-50' : ''
                    }`}
                  >
                    <DollarSign size={20} className={collectionPaymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'} />
                    <span className={collectionPaymentMethod === 'cash' ? 'font-semibold text-green-600' : 'text-gray-600'}>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionPaymentMethod('check')}
                    className={`flex items-center justify-center gap-2 py-3 border rounded-xl ${
                      collectionPaymentMethod === 'check' ? 'ring-2 ring-green-500 bg-green-50' : ''
                    }`}
                  >
                    <CreditCard size={20} className={collectionPaymentMethod === 'check' ? 'text-green-600' : 'text-gray-400'} />
                    <span className={collectionPaymentMethod === 'check' ? 'font-semibold text-green-600' : 'text-gray-600'}>Check</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  rows={2}
                  placeholder="Add any notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCollectionModal(false)}
                  className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteCollection}
                  disabled={updating || !collectionAmount || parseFloat(collectionAmount) <= 0}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? 'Processing...' : (
                    <>
                      <Check size={20} />
                      Collect ${collectionAmount ? parseFloat(collectionAmount).toFixed(2) : '0.00'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Completion Confirmation */}
      {showVisitModal && task && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Complete Visit</h3>
              <p className="text-sm text-gray-500">{task.customerName}</p>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-center">Are you sure you want to mark this visit as completed?</p>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowVisitModal(false)}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteVisit}
                disabled={updating}
                className="flex-1 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
              >
                {updating ? 'Processing...' : 'Complete Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Completion Modal: Print + Take Photo */}
      {showPostComplete && task && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b text-center">
              <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
              <h3 className="text-lg font-semibold text-green-800">Task Completed!</h3>
              <p className="text-sm text-gray-500">{task.taskNumber}</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Print Invoice - only for Order tasks */}
              {(task.taskType === 'Order' || task.taskType === 'Delivery') && (
                <button
                  onClick={() => {
                    const printContent = `
                      <html><head><title>Invoice ${task.taskNumber}</title>
                      <style>body{font-family:Arial;padding:20px;direction:rtl}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#f5f5f5}.total{font-weight:bold;font-size:1.1em}</style></head>
                      <body>
                        <h2>Invoice: ${task.taskNumber}</h2>
                        <p>Customer: ${task.customerName || '-'}</p>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                        <table>
                          <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                          ${task.items.map(i => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.unitPrice.toFixed(2)}</td><td>$${i.total.toFixed(2)}</td></tr>`).join('')}
                        </table>
                        <p class="total">Total: $${task.totalAmount.toFixed(2)}</p>
                        <br/><br/>
                        <p>Customer Signature: ___________________</p>
                        <script>window.onload=function(){window.print()}<\/script>
                      </body></html>
                    `
                    const w = window.open('', '_blank')
                    if (w) { w.document.write(printContent); w.document.close() }
                  }}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Print Invoice
                </button>
              )}

              {/* Take Photo of signed invoice */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              {proofPreview ? (
                <div className="space-y-2">
                  <div className="relative">
                    <img src={proofPreview} alt="Proof" className="w-full h-40 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => { setProofPhoto(null); setProofPreview(null) }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <button
                    onClick={handleUploadProof}
                    disabled={updating}
                    className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? 'Uploading...' : (
                      <>
                        <CheckCircle size={20} />
                        Save Proof Photo
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-green-400 hover:text-green-600"
                >
                  <Camera size={20} />
                  Take Photo of Signed Invoice
                </button>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => { setShowPostComplete(false); setProofPhoto(null); setProofPreview(null) }}
                className="w-full py-2 border rounded-xl hover:bg-gray-50 text-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Delivery Image Viewer */}
      {showProofImage && task?.proofOfDeliveryUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowProofImage(false)}>
          <div className="relative max-w-lg w-full">
            <button
              onClick={() => setShowProofImage(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={28} />
            </button>
            <img
              src={task.proofOfDeliveryUrl}
              alt="Proof of Delivery"
              className="w-full rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
