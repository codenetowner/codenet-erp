import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Phone, 
  Package, 
  CheckCircle, 
  PlayCircle,
  ChevronRight,
  RefreshCw,
  DollarSign,
  CreditCard,
  User,
  Check,
  Printer,
  Camera,
  X
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
  customerLat: number | null
  customerLng: number | null
  supplierId: number | null
  supplierName: string | null
  items: TaskItem[]
  totalAmount: number
}

export default function Tasks() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'started' | 'completed'>('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'split'>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [completing, setCompleting] = useState(false)
  
  // Cash Collection state
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [customerBalance, setCustomerBalance] = useState(0)
  const [collectionAmount, setCollectionAmount] = useState('')
  const [collectionPaymentMethod, setCollectionPaymentMethod] = useState<'cash' | 'check'>('cash')
  const [collectionNotes, setCollectionNotes] = useState('')
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [completedTaskData, setCompletedTaskData] = useState<{task: Task, paymentType: string, paidAmount: number, debtAmount: number} | null>(null)
  const [showCollectionSuccess, setShowCollectionSuccess] = useState(false)
  const [completedCollectionData, setCompletedCollectionData] = useState<{task: Task, amount: number, customerName: string} | null>(null)

  // Print before payment state
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Proof of delivery state
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadTasks = async () => {
    setLoading(true)
    try {
      const params: { status?: string } = {}
      if (filter === 'pending') params.status = 'Pending'
      if (filter === 'started') params.status = 'Started'
      if (filter === 'completed') params.status = 'Completed'
      
      const res = await tasksApi.getAll(params)
      setTasks(res.data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [filter])

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.updateStatus(taskId, newStatus)
      loadTasks()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const openPaymentModal = async (task: Task) => {
    setSelectedTask(task)
    
    // For Customer Visit tasks, complete directly without payment modal
    if (task.taskType === 'Customer Visit') {
      try {
        await tasksApi.updateStatus(task.id, 'Completed', 'cash', 0)
        alert('Visit completed!')
        loadTasks()
      } catch (error) {
        console.error('Failed to complete visit:', error)
        alert('Failed to complete visit')
      }
      return
    }

    // For Supplier Pickup tasks, complete directly (no payment needed)
    if (task.taskType === 'Supplier Pickup') {
      try {
        await tasksApi.updateStatus(task.id, 'Completed', 'cash', 0)
        alert('Supplier pickup completed!')
        loadTasks()
      } catch (error) {
        console.error('Failed to complete pickup:', error)
        alert('Failed to complete supplier pickup')
      }
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
      // Regular task - show print modal first, then payment modal
      setPaidAmount(task.totalAmount)
      setPaymentType('cash')
      setShowPrintModal(true)
    }
  }

  const handleCompleteCollection = async () => {
    if (!selectedTask || !selectedTask.customerId) return
    
    const amount = parseFloat(collectionAmount)
    if (amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    setCompleting(true)
    try {
      // Create collection to reduce customer debt
      await collectionsApi.create({
        customerId: selectedTask.customerId,
        amount: amount,
        paymentType: collectionPaymentMethod,
        notes: collectionNotes || `Collected via Task: ${selectedTask.taskNumber}`
      })
      
      // Mark task as completed
      await tasksApi.updateStatus(selectedTask.id, 'Completed', 'cash', amount)
      
      setShowCollectionModal(false)
      setCompletedCollectionData({ task: selectedTask, amount, customerName: selectedTask.customerName || 'Customer' })
      setShowCollectionSuccess(true)
      setSelectedTask(null)
      loadTasks()
    } catch (error) {
      console.error('Failed to complete collection:', error)
      alert('Failed to record collection')
    } finally {
      setCompleting(false)
    }
  }

  const quickAmounts = customerBalance > 0 ? [
    Math.min(50, customerBalance),
    Math.min(100, customerBalance),
    Math.round(customerBalance / 2),
    customerBalance
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : []

  const handleCompleteTask = async () => {
    if (!selectedTask) return
    setCompleting(true)
    try {
      const paid = paymentType === 'cash' ? selectedTask.totalAmount : (paymentType === 'split' ? paidAmount : 0)
      const debt = selectedTask.totalAmount - paid
      await tasksApi.updateStatus(selectedTask.id, 'Completed', paymentType, paymentType === 'split' ? paidAmount : undefined)
      setShowPaymentModal(false)
      setCompletedTaskData({ task: selectedTask, paymentType, paidAmount: paid, debtAmount: debt })
      setShowSuccessModal(true)
      setSelectedTask(null)
      loadTasks()
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setCompleting(false)
    }
  }

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
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }


  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">My Tasks</h1>
          <button onClick={loadTasks} className="p-2 rounded-full bg-primary-700 hover:bg-primary-600">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['all', 'pending', 'started', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-primary-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="card">
                {/* Task Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{task.taskNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{task.taskType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatCurrency(task.totalAmount)}</p>
                    <p className="text-xs text-gray-500">{task.items.length} items</p>
                  </div>
                </div>

                {/* Supplier Info for Supplier Pickup */}
                {task.taskType === 'Supplier Pickup' && task.supplierName && (
                  <div className="bg-orange-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-orange-500" />
                      <p className="font-medium text-orange-800">Pickup from: {task.supplierName}</p>
                    </div>
                    {task.notes && (
                      <p className="text-sm text-orange-600 mt-1">{task.notes}</p>
                    )}
                  </div>
                )}

                {/* Customer Info */}
                {task.taskType !== 'Supplier Pickup' && task.customerName && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{task.customerName}</p>
                      {task.customerLat && task.customerLng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${task.customerLat},${task.customerLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin size={12} />
                          Navigate
                        </a>
                      )}
                    </div>
                    {task.customerAddress && (
                      <div className="flex items-start gap-2 mt-1">
                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{task.customerAddress}</p>
                      </div>
                    )}
                    {task.customerPhone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone size={14} className="text-gray-400" />
                        <a href={`tel:${task.customerPhone}`} className="text-sm text-primary-600">
                          {task.customerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Items Preview */}
                {(() => {
                  const regularItems = task.items.filter(i => i.discount < 100)
                  const giftItems = task.items.filter(i => i.discount === 100)
                  const subtotal = regularItems.reduce((sum, i) => sum + i.total, 0)
                  const extraCharge = task.totalAmount - subtotal
                  
                  return (
                    <div className="text-sm mb-3 space-y-2">
                      {/* Regular items */}
                      <div className="text-gray-600">
                        {regularItems.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.productName}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                        {regularItems.length > 2 && (
                          <p className="text-gray-400 text-xs">+{regularItems.length - 2} more</p>
                        )}
                      </div>
                      
                      {/* Gifts */}
                      {giftItems.length > 0 && (
                        <div className="text-orange-600 border-t pt-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>🎁 {giftItems.reduce((s, i) => s + i.quantity, 0)} gifts</span>
                            <span>FREE</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Summary */}
                      {extraCharge > 0 && (
                        <div className="border-t pt-1 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-orange-600 font-medium">
                            <span>Extra (gift overage)</span>
                            <span>+{formatCurrency(extraCharge)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Actions */}
                <div className="flex gap-2">
                  {task.status === 'Pending' && (
                    <button
                      onClick={() => handleUpdateStatus(task.id, 'Started')}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                      <PlayCircle size={16} />
                      Start
                    </button>
                  )}
                  {(task.status === 'Started' || task.status === 'In Progress') && (
                    <button
                      onClick={() => openPaymentModal(task)}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    Details
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Before Payment Modal */}
      {showPrintModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Print Invoice</h3>
              <p className="text-sm text-gray-500">Task: {selectedTask.taskNumber}</p>
            </div>
            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium">{selectedTask.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{selectedTask.items.length} items</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2 mt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary-600">{formatCurrency(selectedTask.totalAmount)}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 text-center mb-4">
                Print the invoice for customer signature before proceeding to payment
              </p>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => { setShowPrintModal(false); setSelectedTask(null) }}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const task = selectedTask
                  const printWindow = window.open('', '_blank', 'width=400,height=600')
                  if (!printWindow) { alert('Please allow popups'); return }
                  printWindow.document.write(`
                    <!DOCTYPE html><html><head><title>Invoice - ${task.taskNumber}</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
                      .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                      .header h1 { font-size: 16px; margin-bottom: 5px; }
                      .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                      .divider { border-top: 1px dashed #000; margin: 10px 0; }
                      .item { margin-bottom: 5px; }
                      .item-name { font-weight: bold; }
                      .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
                      .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                      .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                      .signature { margin-top: 30px; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
                      .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
                      @media print { body { padding: 0; } @page { margin: 5mm; } }
                    </style></head><body>
                      <div class="header"><h1>DELIVERY INVOICE</h1><p>${task.taskNumber}</p></div>
                      <div class="info-row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div>
                      <div class="info-row"><span>Customer:</span><span>${task.customerName || 'Walk-in'}</span></div>
                      <div class="divider"></div>
                      <div class="items">${task.items.map(item => `
                        <div class="item"><div class="item-name">${item.productName}</div>
                        <div class="item-details"><span>${item.quantity} x $${item.unitPrice.toFixed(3)}</span><span>$${item.total.toFixed(3)}</span></div></div>
                      `).join('')}</div>
                      <div class="divider"></div>
                      <div class="total-row grand"><span>TOTAL:</span><span>$${task.totalAmount.toFixed(3)}</span></div>
                      <div class="signature"><p>Customer Signature</p><div style="height: 40px;"></div><p>_______________________</p></div>
                      <div class="footer"><p>Thank you!</p><p>${new Date().toLocaleString()}</p></div>
                      <script>window.onload = function() { window.print(); }</script>
                    </body></html>
                  `)
                  printWindow.document.close()
                  
                  // After print, show payment modal
                  setShowPrintModal(false)
                  setShowPaymentModal(true)
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              <p className="text-sm text-gray-500">Total: {formatCurrency(selectedTask.totalAmount)}</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentType"
                    checked={paymentType === 'cash'}
                    onChange={() => { setPaymentType('cash'); setPaidAmount(selectedTask.totalAmount) }}
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

              {paymentType === 'split' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Cash Amount</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.min(selectedTask.totalAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                    max={selectedTask.totalAmount}
                    min={0}
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">On Credit:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(selectedTask.totalAmount - paidAmount)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedTask(null) }}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={completing}
                className="flex-1 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
              >
                {completing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal for Cash Collection Tasks */}
      {showCollectionModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-4 bg-green-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Collect Payment</h3>
              <p className="text-green-200 text-sm">{selectedTask.customerName}</p>
            </div>
            
            {/* Customer Balance Card */}
            <div className="m-4 p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-semibold">{selectedTask.customerName}</p>
                  {selectedTask.customerPhone && <p className="text-red-200 text-sm">{selectedTask.customerPhone}</p>}
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
                  onClick={() => { setShowCollectionModal(false); setSelectedTask(null) }}
                  className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteCollection}
                  disabled={completing || !collectionAmount || parseFloat(collectionAmount) <= 0}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {completing ? 'Processing...' : (
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

      {/* Task Completion Success Modal */}
      {showSuccessModal && completedTaskData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Task Completed!</h3>
              <p className="text-gray-500 mb-4">{completedTaskData.task.taskNumber}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium">{completedTaskData.task.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">{formatCurrency(completedTaskData.task.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(completedTaskData.paidAmount)}</span>
                </div>
                {completedTaskData.debtAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">On Credit</span>
                    <span className="font-medium text-orange-600">{formatCurrency(completedTaskData.debtAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Payment</span>
                  <span className="font-medium capitalize">{completedTaskData.paymentType}</span>
                </div>
              </div>
              
              {/* Take Photo of signed invoice */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setProofPhoto(file)
                    setProofPreview(URL.createObjectURL(file))
                  }
                }}
                className="hidden"
              />
              {proofPreview ? (
                <div className="space-y-2 mb-4">
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
                    onClick={async () => {
                      if (!proofPhoto || !completedTaskData) return
                      setUploadingProof(true)
                      try {
                        await tasksApi.uploadProof(completedTaskData.task.id, proofPhoto)
                        setProofPhoto(null)
                        setProofPreview(null)
                        setShowSuccessModal(false)
                        setCompletedTaskData(null)
                        loadTasks()
                      } catch (error) {
                        console.error('Failed to upload proof:', error)
                        alert('Failed to upload proof photo')
                      } finally {
                        setUploadingProof(false)
                      }
                    }}
                    disabled={uploadingProof}
                    className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploadingProof ? 'Uploading...' : (
                      <>
                        <CheckCircle size={18} />
                        Save Proof Photo
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-green-400 hover:text-green-600 mb-4"
                >
                  <Camera size={20} />
                  Take Photo of Signed Invoice
                </button>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowSuccessModal(false); setCompletedTaskData(null); setProofPhoto(null); setProofPreview(null) }}
                  className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    const data = completedTaskData
                    const printWindow = window.open('', '_blank', 'width=400,height=600')
                    if (!printWindow) { alert('Please allow popups'); return }
                    printWindow.document.write(`
                      <!DOCTYPE html><html><head><title>Invoice - ${data.task.taskNumber}</title>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .header h1 { font-size: 16px; margin-bottom: 5px; }
                        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .item { margin-bottom: 5px; }
                        .item-name { font-weight: bold; }
                        .item-details { display: flex; justify-content: space-between; padding-left: 10px; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                        .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                        .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
                        @media print { body { padding: 0; } @page { margin: 5mm; } }
                      </style></head><body>
                        <div class="header"><h1>DELIVERY INVOICE</h1><p>${data.task.taskNumber}</p></div>
                        <div class="info-row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div>
                        <div class="info-row"><span>Customer:</span><span>${data.task.customerName || 'Walk-in'}</span></div>
                        <div class="info-row"><span>Payment:</span><span>${data.paymentType}</span></div>
                        <div class="divider"></div>
                        <div class="items">${data.task.items.map(item => `
                          <div class="item"><div class="item-name">${item.productName}</div>
                          <div class="item-details"><span>${item.quantity} x $${item.unitPrice.toFixed(3)}</span><span>$${item.total.toFixed(3)}</span></div></div>
                        `).join('')}</div>
                        <div class="divider"></div>
                        <div class="total-row"><span>Subtotal:</span><span>$${data.task.totalAmount.toFixed(3)}</span></div>
                        <div class="total-row"><span>Paid:</span><span>$${data.paidAmount.toFixed(3)}</span></div>
                        ${data.debtAmount > 0 ? `<div class="total-row"><span>Balance Due:</span><span>$${data.debtAmount.toFixed(3)}</span></div>` : ''}
                        <div class="total-row grand"><span>TOTAL:</span><span>$${data.task.totalAmount.toFixed(3)}</span></div>
                        <div class="footer"><p>Thank you!</p><p>${new Date().toLocaleString()}</p></div>
                        <script>window.onload = function() { window.print(); }</script>
                      </body></html>
                    `)
                    printWindow.document.close()
                  }}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Success Modal */}
      {showCollectionSuccess && completedCollectionData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Collected!</h3>
              <p className="text-gray-500 mb-4">{completedCollectionData.task.taskNumber}</p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium">{completedCollectionData.customerName}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Amount Collected</span>
                  <span className="font-bold text-green-600">{formatCurrency(completedCollectionData.amount)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowCollectionSuccess(false); setCompletedCollectionData(null) }}
                  className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    const data = completedCollectionData
                    const printWindow = window.open('', '_blank', 'width=400,height=500')
                    if (!printWindow) { alert('Please allow popups'); return }
                    printWindow.document.write(`
                      <!DOCTYPE html><html><head><title>Payment Receipt</title>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .header h1 { font-size: 16px; margin-bottom: 5px; }
                        .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                        .amount { text-align: center; font-size: 24px; font-weight: bold; padding: 15px 0; }
                        .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; color: #666; }
                        @media print { body { padding: 0; } @page { margin: 5mm; } }
                      </style></head><body>
                        <div class="header"><h1>PAYMENT RECEIPT</h1><p>Cash Collection</p></div>
                        <div class="info-row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div>
                        <div class="info-row"><span>Time:</span><span>${new Date().toLocaleTimeString()}</span></div>
                        <div class="info-row"><span>Customer:</span><span>${data.customerName}</span></div>
                        <div class="info-row"><span>Reference:</span><span>${data.task.taskNumber}</span></div>
                        <div class="divider"></div>
                        <div class="amount">$${data.amount.toFixed(3)}</div>
                        <p style="text-align: center; color: #666;">Amount Received</p>
                        <div class="footer"><p>Thank you for your payment!</p><p>${new Date().toLocaleString()}</p></div>
                        <script>window.onload = function() { window.print(); }</script>
                      </body></html>
                    `)
                    printWindow.document.close()
                  }}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
