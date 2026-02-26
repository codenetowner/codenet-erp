import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Eye, X, Loader2, Trash2, RotateCcw, Edit, Package, Printer, FileText } from 'lucide-react'
import { tasksApi, customersApi, employeesApi, vansApi, warehousesApi, productsApi, suppliersApi } from '../lib/api'

interface TaskItem {
  id?: number
  productId: number
  productName?: string
  unitType: string
  quantity: number
  unitPrice: number
  defaultPrice: number // Original product price
  specialPrice?: number // Customer's current special price (if exists)
  discountPercent: number
  total: number
}

interface SpecialPrice {
  id: number
  productId: number
  productName: string
  retailPrice: number
  boxRetailPrice: number
}

interface Task {
  id: number
  taskNumber: string
  type: string
  customerId: number | null
  customerName: string | null
  driverId: number | null
  driverName: string | null
  supplierId: number | null
  supplierName: string | null
  vanId: number | null
  vanName: string | null
  warehouseId: number | null
  warehouseName: string | null
  scheduledDate: string
  status: string
  notes: string | null
  subtotal: number
  discount: number
  extraCharge: number
  tax: number
  total: number
  items: TaskItem[]
  proofOfDeliveryUrl: string | null
}

interface SelectOption { id: number; name: string }
interface DriverOption { id: number; name: string; vanId: number | null; warehouseId: number | null }

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [customers, setCustomers] = useState<SelectOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [vans, setVans] = useState<SelectOption[]>([])
  const [warehouses, setWarehouses] = useState<SelectOption[]>([])
  const [suppliers, setSuppliers] = useState<SelectOption[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerSpecialPrices, setCustomerSpecialPrices] = useState<SpecialPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null)

  const [searchParams] = useSearchParams()
  const getLocalDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  const [dateFilter, setDateFilter] = useState(getLocalDate())
  const [customerFilter, setCustomerFilter] = useState(searchParams.get('customer') || '')
  const [driverFilter, setDriverFilter] = useState('')
  const [vanFilter, setVanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryVanFilter, setSummaryVanFilter] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [formData, setFormData] = useState({
    type: 'Order', customerId: '', driverId: '', vanId: '', warehouseId: '', supplierId: '',
    scheduledDate: getLocalDate(), notes: '', discount: 0, extraCharge: 0, tax: 0,
    items: [] as TaskItem[]
  })
  const [productSearch, setProductSearch] = useState<{[key: number]: string}>({})
  const [productDropdownOpen, setProductDropdownOpen] = useState<number | null>(null)
  const productDropdownRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => { loadData() }, [])

  // Close product dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [taskRes, custRes, empRes, vanRes, whRes, prodRes, supRes] = await Promise.all([
        tasksApi.getAll(),
        customersApi.getAll(),
        employeesApi.getAll(),
        vansApi.getAll(),
        warehousesApi.getAll(),
        productsApi.getAll(),
        suppliersApi.getAll()
      ])
      setTasks(taskRes.data)
      setCustomers(custRes.data.map((c: any) => ({ id: c.id, name: c.name })))
      setDrivers(empRes.data.filter((e: any) => e.isDriver).map((e: any) => ({ id: e.id, name: e.name, vanId: e.vanId, warehouseId: e.warehouseId })))
      setVans(vanRes.data.map((v: any) => ({ id: v.id, name: v.name })))
      setWarehouses(whRes.data.map((w: any) => ({ id: w.id, name: w.name })))
      setSuppliers(supRes.data.map((s: any) => ({ id: s.id, name: s.name })))
      setProducts(prodRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (dateFilter && !t.scheduledDate.startsWith(dateFilter)) return false
    if (customerFilter && t.customerId?.toString() !== customerFilter) return false
    if (driverFilter && t.driverId?.toString() !== driverFilter) return false
    if (vanFilter && t.vanId?.toString() !== vanFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  const resetForm = () => {
    setFormData({
      type: 'Order', customerId: '', driverId: '', vanId: '', warehouseId: '', supplierId: '',
      scheduledDate: getLocalDate(), notes: '', discount: 0, extraCharge: 0, tax: 0,
      items: []
    })
    setCustomerSpecialPrices([])
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: 0, unitType: 'Piece', quantity: 1, unitPrice: 0, defaultPrice: 0, discountPercent: 0, total: 0 }]
    })
  }

  // Load customer special prices when customer is selected
  const loadCustomerSpecialPrices = async (customerId: string) => {
    if (!customerId) {
      setCustomerSpecialPrices([])
      return
    }
    try {
      const res = await customersApi.getSpecialPrices(parseInt(customerId))
      setCustomerSpecialPrices(res.data)
    } catch (error) {
      console.error('Failed to load special prices:', error)
      setCustomerSpecialPrices([])
    }
  }

  // Get the effective price for a product based on customer special prices
  const getEffectivePrice = (productId: number, unitType: string): { price: number; isSpecial: boolean; defaultPrice: number } => {
    const product = products.find(p => p.id === productId)
    if (!product) return { price: 0, isSpecial: false, defaultPrice: 0 }
    
    // Compare with product's actual baseUnit/secondUnit, not hardcoded 'Box'
    const isSecondUnit = unitType === product.secondUnit
    const defaultPrice = isSecondUnit ? product.boxRetailPrice : product.retailPrice
    const specialPrice = customerSpecialPrices.find(sp => sp.productId === productId)
    
    if (specialPrice) {
      const price = isSecondUnit ? specialPrice.boxRetailPrice : specialPrice.retailPrice
      return { price, isSpecial: true, defaultPrice }
    }
    
    return { price: defaultPrice, isSpecial: false, defaultPrice }
  }

  // Reset item price to default
  const resetToDefaultPrice = (index: number) => {
    const items = [...formData.items]
    const item = items[index]
    items[index] = { 
      ...item, 
      unitPrice: item.defaultPrice,
      total: item.quantity * item.defaultPrice * (1 - item.discountPercent / 100)
    }
    setFormData({ ...formData, items })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...formData.items]
    items[index] = { ...items[index], [field]: value }
    // Recalculate total
    const qty = items[index].quantity
    const price = items[index].unitPrice
    const disc = items[index].discountPercent
    items[index].total = qty * price * (1 - disc / 100)
    setFormData({ ...formData, items })
  }

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) })
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0)
    return { subtotal, total: subtotal - formData.discount + formData.tax + formData.extraCharge }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items - filter out invalid ones (not required for Visit or Cash Collection)
    const validItems = formData.items.filter(item => item.productId > 0 && item.quantity > 0)
    const requiresProducts = formData.type !== 'Customer Visit' && formData.type !== 'Cash Collection'
    if (requiresProducts && validItems.length === 0) {
      alert('Please add at least one product with a valid quantity')
      return
    }
    
    setSaving(true)
    try {
      const taskData = {
        ...formData,
        items: validItems,
        customerId: formData.customerId ? parseInt(formData.customerId) : null,
        driverId: formData.driverId ? parseInt(formData.driverId) : null,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        vanId: formData.vanId ? parseInt(formData.vanId) : null,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
      }

      if (editingTask) {
        await tasksApi.update(editingTask.id, taskData)
      } else {
        await tasksApi.create(taskData)
      }

      // Auto-save special prices for items where price was changed
      if (formData.customerId) {
        const customerId = parseInt(formData.customerId)
        const changedPrices = validItems.filter(item => 
          item.defaultPrice > 0 && item.unitPrice !== item.defaultPrice
        )
        
        for (const item of changedPrices) {
          try {
            // Check if special price already exists for this product
            const existingSpecial = customerSpecialPrices.find(sp => sp.productId === item.productId)
            const product = products.find(p => p.id === item.productId)
            const isSecondUnit = product && item.unitType === product.secondUnit
            
            if (existingSpecial) {
              // Update existing special price
              await customersApi.updateSpecialPrice(customerId, existingSpecial.id, {
                retailPrice: !isSecondUnit ? item.unitPrice : existingSpecial.retailPrice,
                boxRetailPrice: isSecondUnit ? item.unitPrice : existingSpecial.boxRetailPrice
              })
            } else {
              // Create new special price
              await customersApi.addSpecialPrice(customerId, {
                productId: item.productId,
                retailPrice: !isSecondUnit ? item.unitPrice : item.defaultPrice,
                boxRetailPrice: isSecondUnit ? item.unitPrice : 0
              })
            }
          } catch (err) {
            console.error('Failed to save special price for product', item.productId, err)
          }
        }
      }

      setShowModal(false)
      setEditingTask(null)
      resetForm()
      setCustomerSpecialPrices([])
      loadData()
    } catch (error: any) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || error.response?.data?.message || 'Failed to save task'
      alert(`Error: ${errMsg}`)
      console.error('Task error:', error.response?.data)
    } finally {
      setSaving(false)
    }
  }

  const handleView = (task: Task) => {
    setSelectedTask(task)
    setShowViewModal(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      type: task.type,
      customerId: task.customerId?.toString() || '',
      driverId: task.driverId?.toString() || '',
      vanId: task.vanId?.toString() || '',
      warehouseId: task.warehouseId?.toString() || '',
      supplierId: task.supplierId?.toString() || '',
      scheduledDate: task.scheduledDate.split('T')[0],
      notes: task.notes || '',
      discount: task.discount,
      extraCharge: task.extraCharge || 0,
      tax: task.tax,
      items: task.items.map(item => ({
        ...item,
        defaultPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0
      }))
    })
    if (task.customerId) {
      loadCustomerSpecialPrices(task.customerId.toString())
    }
    setShowModal(true)
  }

  const handleDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await tasksApi.delete(taskId)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete task')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">Orders & Activities</h1>
          <p className="text-slate-400 text-sm mt-1">Manage scheduled tasks, deliveries, and collections</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSummaryModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white hover:border-cyan-500 rounded-xl transition-all font-medium text-sm">
            <Package size={18} /> Load Summary
          </button>
          <button onClick={() => { resetForm(); setEditingTask(null); setShowModal(true) }} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-all font-medium text-sm shadow-lg shadow-cyan-900/30">
            <Plus size={18} /> New Activity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 mb-6 relative z-10">
        <div className="flex flex-wrap gap-4 items-center">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm outline-none cursor-pointer transition-all" />
          
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm outline-none cursor-pointer transition-all min-w-[160px]">
            <option value="" className="bg-slate-800">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>)}
          </select>
          
          <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm outline-none cursor-pointer transition-all min-w-[160px]">
            <option value="" className="bg-slate-800">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id} className="bg-slate-800">{d.name}</option>)}
          </select>
          
          <select value={vanFilter} onChange={(e) => setVanFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm outline-none cursor-pointer transition-all min-w-[140px]">
            <option value="" className="bg-slate-800">All Vans</option>
            {vans.map(v => <option key={v.id} value={v.id} className="bg-slate-800">{v.name}</option>)}
          </select>
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm outline-none cursor-pointer transition-all">
            <option value="" className="bg-slate-800">All Statuses</option>
            <option value="Pending" className="bg-slate-800">Pending</option>
            <option value="Started" className="bg-slate-800">Started</option>
            <option value="In Progress" className="bg-slate-800">In Progress</option>
            <option value="Completed" className="bg-slate-800">Completed</option>
            <option value="Delayed" className="bg-slate-800">Delayed</option>
            <option value="Cancelled" className="bg-slate-800">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold tracking-wider text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Activity #</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Client / Supplier</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4 text-right">Value</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-800">
                      <FileText size={32} className="text-slate-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-300">No activities found</p>
                    <p className="text-sm text-slate-500 mt-2">Adjust your filters or create a new activity.</p>
                  </td>
                </tr>
              ) : filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-4 font-bold text-cyan-400">#{task.taskNumber}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-800 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-700">
                      {task.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {task.type === 'Supplier Pickup' ? (
                      task.supplierName ? <span className="text-amber-400">{task.supplierName}</span> : <span className="text-slate-500">—</span>
                    ) : (
                      task.customerName || <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{task.driverName || <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-slate-400">{task.vanName || <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-slate-400">{task.warehouseName || <span className="text-slate-600">—</span>}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border backdrop-blur-sm ${
                      task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      task.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      task.status === 'Started' || task.status === 'In Progress' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      task.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{task.scheduledDate.split('T')[0]}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-200">
                    ${task.total.toFixed(3)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleView(task)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="View Details">
                        <Eye size={16} />
                      </button>
                      {task.proofOfDeliveryUrl && (
                        <button
                          onClick={() => setProofImageUrl(task.proofOfDeliveryUrl!)}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                          title="Proof of Delivery"
                        >
                          <FileText size={16} />
                        </button>
                      )}
                      <button onClick={() => handleEdit(task)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  {editingTask ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                {editingTask ? 'Edit Activity' : 'Create New Activity'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingTask(null) }} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type *</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value, supplierId: '', customerId: ''})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                  >
                    <option value="Order">Order</option>
                    <option value="Customer Visit">Customer Visit</option>
                    <option value="Cash Collection">Cash Collection</option>
                    <option value="Supplier Pickup">Supplier Pickup</option>
                  </select>
                </div>

                {formData.type === 'Supplier Pickup' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Supplier *</label>
                    <select 
                      value={formData.supplierId} 
                      onChange={(e) => setFormData({...formData, supplierId: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer *</label>
                    <select 
                      value={formData.customerId} 
                      onChange={(e) => {
                        const newCustomerId = e.target.value
                        setFormData({...formData, customerId: newCustomerId, items: []})
                        loadCustomerSpecialPrices(newCustomerId)
                      }} 
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                    >
                      <option value="">Select customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Driver / Assignee *</label>
                  <select 
                    value={formData.driverId} 
                    onChange={(e) => {
                      const driverId = e.target.value
                      const selectedDriver = drivers.find(d => d.id.toString() === driverId)
                      setFormData({
                        ...formData,
                        driverId,
                        vanId: selectedDriver?.vanId?.toString() || formData.vanId,
                        warehouseId: selectedDriver?.warehouseId?.toString() || formData.warehouseId
                      })
                    }} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                  >
                    <option value="">Select driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scheduled Date *</label>
                  <input 
                    type="date" 
                    value={formData.scheduledDate} 
                    onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vehicle (Van)</label>
                  <select 
                    value={formData.vanId} 
                    onChange={(e) => setFormData({...formData, vanId: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                  >
                    <option value="">Select van</option>
                    {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Warehouse Location</label>
                  <select 
                    value={formData.warehouseId} 
                    onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes / Instructions</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm transition-all resize-none" 
                  rows={2} 
                  placeholder="Enter any notes or special instructions" 
                />
              </div>

              {/* Products */}
              {(formData.type === 'Order' || formData.type === 'Supplier Pickup') && (
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Products</h3>
                    <button 
                      type="button" 
                      onClick={addItem} 
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-colors"
                    >
                      <Plus size={14} /> Add Product
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                          <th className="px-4 py-3 text-left font-semibold">Product</th>
                          <th className="px-4 py-3 text-left font-semibold w-32">Unit</th>
                          <th className="px-4 py-3 text-center font-semibold w-24">Qty</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Unit Price</th>
                          <th className="px-4 py-3 text-center font-semibold w-24">Disc %</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Line Total</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30 text-slate-300">
                        {formData.items.length === 0 ? (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">No items added to this activity</td></tr>
                        ) : formData.items.map((item, idx) => {
                          const priceChanged = item.productId > 0 && item.defaultPrice > 0 && item.unitPrice !== item.defaultPrice
                          return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-3 relative" ref={productDropdownOpen === idx ? productDropdownRef : null}>
                              <input
                                type="text"
                                value={productDropdownOpen === idx ? (productSearch[idx] ?? '') : (products.find(p => p.id === item.productId)?.name || '')}
                                onChange={(e) => {
                                  setProductSearch({ ...productSearch, [idx]: e.target.value })
                                  setProductDropdownOpen(idx)
                                }}
                                onFocus={() => setProductDropdownOpen(idx)}
                                placeholder="Search product..."
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 transition-all"
                              />
                              {productDropdownOpen === idx && (
                                <div className="absolute z-50 w-[150%] max-w-sm bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar mt-1">
                                  {products
                                    .filter(p => !formData.warehouseId || p.defaultWarehouseId?.toString() === formData.warehouseId)
                                    .filter(p => !productSearch[idx] || p.name.toLowerCase().includes((productSearch[idx] || '').toLowerCase()))
                                    .slice(0, 20)
                                    .map(p => (
                                      <div
                                        key={p.id}
                                        className="px-4 py-2.5 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0 cursor-pointer text-sm font-medium text-slate-200 transition-colors"
                                        onClick={() => {
                                          const productId = p.id
                                          const unitType = p.baseUnit || 'Piece'
                                          const { price, defaultPrice } = getEffectivePrice(productId, unitType)
                                          const items = [...formData.items]
                                          items[idx] = { 
                                            ...items[idx], 
                                            productId,
                                            unitType,
                                            unitPrice: price,
                                            defaultPrice: defaultPrice,
                                            total: (items[idx].quantity) * price * (1 - items[idx].discountPercent / 100)
                                          }
                                          setFormData({ ...formData, items })
                                          setProductSearch({ ...productSearch, [idx]: '' })
                                          setProductDropdownOpen(null)
                                        }}
                                      >
                                        {p.name}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <select 
                                value={item.unitType} 
                                onChange={(e) => {
                                  const newUnitType = e.target.value
                                  const { price, defaultPrice } = getEffectivePrice(item.productId, newUnitType)
                                  const items = [...formData.items]
                                  items[idx] = { 
                                    ...items[idx], 
                                    unitType: newUnitType,
                                    unitPrice: price,
                                    defaultPrice: defaultPrice,
                                    total: items[idx].quantity * price * (1 - items[idx].discountPercent / 100)
                                  }
                                  setFormData({ ...formData, items })
                                }} 
                                className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-slate-300"
                              >
                                {(() => {
                                  const product = products.find(p => p.id === item.productId)
                                  if (!product) return <><option value="Piece">Piece</option><option value="Box">Box</option></>
                                  return (
                                    <>
                                      <option value={product.baseUnit}>{product.baseUnit}</option>
                                      {product.secondUnit && <option value={product.secondUnit}>{product.secondUnit}</option>}
                                    </>
                                  )
                                })()}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} 
                                className="w-full text-center px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200 font-bold" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col flex-1">
                                  {priceChanged && (
                                    <span className="text-[10px] text-rose-400 line-through mb-0.5">${item.defaultPrice.toFixed(3)}</span>
                                  )}
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={item.unitPrice} 
                                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                    className={`w-full text-right px-2 py-2 bg-slate-900 border rounded-lg text-sm focus:ring-1 focus:ring-cyan-500 outline-none font-medium transition-colors ${priceChanged ? 'border-amber-500/50 text-amber-400 bg-amber-500/5' : 'border-slate-700 text-slate-200'}`} 
                                  />
                                </div>
                                {priceChanged && (
                                  <button 
                                    type="button" 
                                    onClick={() => resetToDefaultPrice(idx)} 
                                    className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-cyan-500/10 rounded-md transition-colors"
                                    title="Reset to default price"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                max="100" 
                                value={item.discountPercent} 
                                onChange={(e) => updateItem(idx, 'discountPercent', parseFloat(e.target.value) || 0)} 
                                className="w-full text-center px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-slate-200" 
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-cyan-400">
                              ${item.total.toFixed(3)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                type="button" 
                                onClick={() => removeItem(idx)} 
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex gap-4 shrink-0">
              {(formData.type === 'Order' || formData.type === 'Supplier Pickup') && (
                <div className="flex-1 flex gap-6 items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</span>
                    <span className="font-medium text-slate-300">${totals.subtotal.toFixed(3)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax & Extra</span>
                    <span className="font-medium text-amber-400">+${(formData.tax + formData.extraCharge).toFixed(3)}</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-800 pl-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value</span>
                    <span className="text-xl font-bold text-cyan-400">${totals.total.toFixed(3)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 ml-auto">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={saving} 
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all font-bold text-sm shadow-lg shadow-cyan-900/30 flex items-center gap-2"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Activity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTask && (() => {
        const regularItems = selectedTask.items.filter(item => item.discountPercent < 100);
        const giftItems = selectedTask.items.filter(item => item.discountPercent === 100);
        const regularTotal = regularItems.reduce((sum, item) => sum + item.total, 0);
        const giftValue = giftItems.reduce((sum, item) => sum + (item.quantity * (item.defaultPrice || 0)), 0);
        const extraCharge = selectedTask.total - selectedTask.subtotal;
        
        return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Eye size={20} />
                </div>
                Activity Details <span className="text-slate-500 font-medium text-lg ml-1">#{selectedTask.taskNumber}</span>
              </h2>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</span> 
                  <span className="font-bold text-slate-200">{selectedTask.type}</span>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Customer/Supplier</span> 
                  <span className="font-bold text-slate-200">{selectedTask.customerName || selectedTask.supplierName || '—'}</span>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Driver</span> 
                  <span className="font-bold text-slate-200">{selectedTask.driverName || '—'}</span>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Van / Warehouse</span> 
                  <span className="font-bold text-slate-200">{selectedTask.vanName || selectedTask.warehouseName || '—'}</span>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scheduled</span> 
                  <span className="font-bold text-slate-200">{selectedTask.scheduledDate.split('T')[0]}</span>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</span> 
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border backdrop-blur-sm ${
                    selectedTask.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    selectedTask.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    selectedTask.status === 'Started' || selectedTask.status === 'In Progress' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    selectedTask.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>
              </div>

              {selectedTask.notes && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</span> 
                  <span className="text-sm text-slate-300 whitespace-pre-wrap">{selectedTask.notes}</span>
                </div>
              )}
              
              {/* Regular Products Section */}
              {regularItems.length > 0 && (
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
                    <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Package size={16} className="text-cyan-400" /> Products ({regularItems.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Product</th>
                          <th className="px-4 py-3 text-left font-semibold w-24">Unit</th>
                          <th className="px-4 py-3 text-center font-semibold w-24">Qty</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Price</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30 text-slate-300">
                        {regularItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-200">{item.productName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.unitType?.toLowerCase() === 'box' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                {item.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-200">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-slate-400">${item.unitPrice.toFixed(3)}</td>
                            <td className="px-4 py-3 text-right font-bold text-cyan-400">${item.total.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Gift Products Section */}
              {giftItems.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden mt-6">
                  <div className="p-4 border-b border-amber-500/20 bg-amber-500/10">
                    <h3 className="font-bold text-amber-400 text-sm uppercase tracking-wider flex items-center gap-2">
                      🎁 Free Gifts ({giftItems.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/80 text-amber-400/70 border-b border-amber-500/20">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Product</th>
                          <th className="px-4 py-3 text-left font-semibold w-24">Unit</th>
                          <th className="px-4 py-3 text-center font-semibold w-24">Qty</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Value</th>
                          <th className="px-4 py-3 text-right font-semibold w-32">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10 text-slate-300">
                        {giftItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-500/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-200">{item.productName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.unitType?.toLowerCase() === 'box' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                {item.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-200">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-slate-500 line-through">${(item.quantity * item.defaultPrice).toFixed(3)}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-400">FREE</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Box */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 mt-6 shadow-lg">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm mb-4">Activity Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Products ({regularItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span className="font-bold text-slate-200">${regularTotal.toFixed(3)}</span>
                  </div>
                  {giftItems.length > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span className="font-medium">🎁 Gifts ({giftItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      <span className="font-bold">Free (Value ${giftValue.toFixed(3)})</span>
                    </div>
                  )}
                  {extraCharge > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span className="font-medium">Extra Charges / Tax</span>
                      <span className="font-bold">+${extraCharge.toFixed(3)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Value</span>
                  <span className="text-2xl font-bold text-cyan-400">${selectedTask.total.toFixed(3)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex justify-end shrink-0">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Products Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Package size={20} />
                </div>
                Products Load Summary
                <span className="text-slate-500 font-medium text-sm ml-2 px-3 py-1 bg-slate-800 rounded-md border border-slate-700">{dateFilter}</span>
              </h2>
              <button onClick={() => { setShowSummaryModal(false); setSummaryVanFilter('') }} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Van Filter */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter by Van</label>
                <select 
                  value={summaryVanFilter} 
                  onChange={(e) => setSummaryVanFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-slate-200 text-sm outline-none transition-all"
                >
                  <option value="">All Vans (Total Daily Load)</option>
                  {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              {(() => {
                const productSummary: { [key: string]: { productName: string; quantity: number; unitType: string } } = {}
                const selectedDate = dateFilter
                let todaysTasks = tasks.filter(t => t.scheduledDate.split('T')[0] === selectedDate)
                
                // Filter by van if selected
                if (summaryVanFilter) {
                  todaysTasks = todaysTasks.filter(t => t.vanId?.toString() === summaryVanFilter)
                }

                const selectedVan = summaryVanFilter ? vans.find(v => v.id.toString() === summaryVanFilter) : null
                
                todaysTasks.forEach(task => {
                  task.items.forEach(item => {
                    const key = `${item.productId}-${item.unitType}`
                    if (productSummary[key]) {
                      productSummary[key].quantity += item.quantity
                    } else {
                      productSummary[key] = {
                        productName: item.productName || `Product #${item.productId}`,
                        quantity: item.quantity,
                        unitType: item.unitType
                      }
                    }
                  })
                })

                const sortedProducts = Object.values(productSummary).sort((a, b) => a.productName.localeCompare(b.productName))
                const totalItems = sortedProducts.reduce((sum, p) => sum + p.quantity, 0)

                if (sortedProducts.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-500">
                      <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                        <Package size={32} className="text-slate-600" />
                      </div>
                      <p className="text-lg font-medium text-slate-300">No products to load</p>
                      <p className="text-sm mt-1">There are no activities scheduled {selectedVan ? `for ${selectedVan.name}` : `for ${dateFilter}`}</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {selectedVan && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="font-bold text-emerald-400 text-sm">Showing Load for Van: {selectedVan.name}</span>
                      </div>
                    )}
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex justify-between items-center">
                      <span className="font-medium text-blue-400 text-sm">Total Unique Products: <span className="font-bold text-white">{sortedProducts.length}</span></span>
                      <span className="font-medium text-blue-400 text-sm">Total Pieces/Boxes: <span className="font-bold text-white">{totalItems}</span></span>
                    </div>
                    
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold w-12">#</th>
                            <th className="text-left px-4 py-3 font-semibold">Product Name</th>
                            <th className="text-center px-4 py-3 font-semibold w-24">Unit</th>
                            <th className="text-right px-4 py-3 font-semibold w-32">Total Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30 text-slate-300">
                          {sortedProducts.map((product, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-200">{product.productName}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${product.unitType?.toLowerCase() === 'box' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                  {product.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-cyan-400 text-lg">{product.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="bg-slate-950 p-6 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => { setShowSummaryModal(false); setSummaryVanFilter('') }}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const selectedDate = dateFilter
                  let filteredTasks = tasks.filter(t => t.scheduledDate.split('T')[0] === selectedDate)
                  if (summaryVanFilter) {
                    filteredTasks = filteredTasks.filter(t => t.vanId?.toString() === summaryVanFilter)
                  }
                  const selectedVan = summaryVanFilter ? vans.find(v => v.id.toString() === summaryVanFilter) : null
                  
                  const productSummary: { [key: string]: { productName: string; quantity: number; unitType: string } } = {}
                  filteredTasks.forEach(task => {
                    task.items.forEach(item => {
                      const key = `${item.productId}-${item.unitType}`
                      if (productSummary[key]) {
                        productSummary[key].quantity += item.quantity
                      } else {
                        productSummary[key] = {
                          productName: item.productName || `Product #${item.productId}`,
                          quantity: item.quantity,
                          unitType: item.unitType
                        }
                      }
                    })
                  })
                  const sortedProducts = Object.values(productSummary).sort((a, b) => a.productName.localeCompare(b.productName))
                  const totalItems = sortedProducts.reduce((sum, p) => sum + p.quantity, 0)

                  const printWindow = window.open('', '_blank', 'width=600,height=800')
                  if (!printWindow) { alert('Please allow popups'); return }
                  printWindow.document.write(`
                    <!DOCTYPE html><html><head><title>Load Summary ${selectedDate}</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; padding: 20px; color: #1e293b; }
                      .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                      .header h1 { font-size: 20px; margin-bottom: 5px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
                      .header p { color: #64748b; font-size: 14px; font-weight: 500; }
                      .van-info { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 15px; margin-bottom: 15px; border-radius: 6px; font-size: 14px; font-weight: bold; }
                      .summary { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 15px; margin-bottom: 20px; border-radius: 6px; font-size: 13px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      th { background: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; }
                      td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
                      .unit-box { background: #fffbeb; color: #d97706; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #fde68a; }
                      .unit-piece { background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #e2e8f0; }
                      .qty { text-align: right; font-weight: bold; font-size: 14px; color: #0284c7; }
                      .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #94a3b8; }
                      @media print { body { padding: 0; } @page { margin: 15mm; } }
                    </style></head><body>
                      <div class="header">
                        <h1>Daily Load Summary</h1>
                        <p>Date: ${selectedDate}</p>
                      </div>
                      ${selectedVan ? `<div class="van-info">Van Assignment: ${selectedVan.name}</div>` : ''}
                      <div class="summary">
                        <span><strong>Total Unique Products:</strong> ${sortedProducts.length}</span>
                        <span><strong>Total Quantity Loaded:</strong> ${totalItems}</span>
                      </div>
                      <table>
                        <thead><tr><th width="40">#</th><th>Product Name</th><th width="80" style="text-align:center">Unit</th><th width="80" style="text-align:right">Qty</th></tr></thead>
                        <tbody>
                          ${sortedProducts.map((p, i) => `
                            <tr>
                              <td style="color:#64748b">${i + 1}</td>
                              <td style="font-weight:bold">${p.productName}</td>
                              <td style="text-align:center"><span class="${p.unitType.toLowerCase() === 'box' ? 'unit-box' : 'unit-piece'}">${p.unitType}</span></td>
                              <td class="qty">${p.quantity}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div class="footer">Generated by ERP System • ${new Date().toLocaleString()}</div>
                      <script>window.onload = function() { window.print(); }</script>
                    </body></html>
                  `)
                  printWindow.document.close()
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-900/30"
              >
                <Printer size={16} /> Print Load Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Delivery Image Viewer */}
      {proofImageUrl && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setProofImageUrl(null)}>
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/80">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <FileText size={18} className="text-cyan-400" />
                Proof of Delivery
              </h3>
              <button 
                onClick={() => setProofImageUrl(null)} 
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-950 min-h-[300px]">
              <img 
                src={proofImageUrl} 
                alt="Proof of Delivery" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800"
              />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
              <a 
                href={proofImageUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 text-cyan-400 hover:text-white border border-cyan-500/30 hover:bg-cyan-600 hover:border-cyan-500 rounded-xl transition-all font-medium text-sm flex items-center gap-2"
              >
                <Eye size={16} /> Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
