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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Started': 'bg-blue-100 text-blue-700',
      'In Progress': 'bg-indigo-100 text-indigo-700',
      'Completed': 'bg-green-100 text-green-700',
      'Delayed': 'bg-orange-100 text-orange-700',
      'Cancelled': 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  const totals = calculateTotals()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders & Tasks</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowSummaryModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Package size={20} /> Products Summary
          </button>
          <button onClick={() => { resetForm(); setEditingTask(null); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
            <Plus size={20} /> Create Order / Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={vanFilter} onChange={(e) => setVanFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Vans</option>
            {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Started">Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order / Task</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Van</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No tasks found</td></tr>
            ) : filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{task.taskNumber}</td>
                <td className="px-4 py-3">{task.type}</td>
                <td className="px-4 py-3">{task.type === 'Supplier Pickup' ? (task.supplierName ? <span className="text-orange-600">{task.supplierName}</span> : '-') : (task.customerName || '-')}</td>
                <td className="px-4 py-3">{task.driverName || '-'}</td>
                <td className="px-4 py-3">{task.vanName || '-'}</td>
                <td className="px-4 py-3">{task.warehouseName || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-3">{task.scheduledDate.split('T')[0]}</td>
                <td className="px-4 py-3 font-medium">${task.total.toFixed(3)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleView(task)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                      <Eye size={16} />
                    </button>
                    {task.proofOfDeliveryUrl && (
                      <button
                        onClick={() => setProofImageUrl(task.proofOfDeliveryUrl!)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="Proof of Delivery"
                      >
                        <FileText size={16} />
                      </button>
                    )}
                    <button onClick={() => handleEdit(task)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{editingTask ? 'Edit Order / Task' : 'Create Order / Task'}</h2>
              <button onClick={() => { setShowModal(false); setEditingTask(null) }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value, supplierId: '', customerId: ''})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="Order">Order</option>
                    <option value="Customer Visit">Customer Visit</option>
                    <option value="Cash Collection">Cash Collection</option>
                    <option value="Supplier Pickup">Supplier Pickup</option>
                  </select>
                </div>
                {formData.type === 'Supplier Pickup' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                    <select value={formData.supplierId} onChange={(e) => setFormData({...formData, supplierId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
                    <select value={formData.customerId} onChange={(e) => {
                      const newCustomerId = e.target.value
                      setFormData({...formData, customerId: newCustomerId, items: []}) // Reset items when customer changes
                      loadCustomerSpecialPrices(newCustomerId)
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Driver</label>
                  <select value={formData.driverId} onChange={(e) => {
                    const driverId = e.target.value
                    const selectedDriver = drivers.find(d => d.id.toString() === driverId)
                    setFormData({
                      ...formData,
                      driverId,
                      vanId: selectedDriver?.vanId?.toString() || formData.vanId,
                      warehouseId: selectedDriver?.warehouseId?.toString() || formData.warehouseId
                    })
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Van</label>
                  <select value={formData.vanId} onChange={(e) => setFormData({...formData, vanId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select van</option>
                    {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Warehouse</label>
                  <select value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Scheduled Date</label>
                  <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Enter any notes" />
              </div>

              {/* Products */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">Products</label>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Product</th>
                        <th className="px-2 py-2 text-left">Type</th>
                        <th className="px-2 py-2 text-left">Qty</th>
                        <th className="px-2 py-2 text-left">Price</th>
                        <th className="px-2 py-2 text-left">Disc %</th>
                        <th className="px-2 py-2 text-left">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.length === 0 ? (
                        <tr><td colSpan={8} className="px-2 py-4 text-center text-gray-400">No items added</td></tr>
                      ) : formData.items.map((item, idx) => {
                        const priceChanged = item.productId > 0 && item.defaultPrice > 0 && item.unitPrice !== item.defaultPrice
                        return (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2 relative" ref={productDropdownOpen === idx ? productDropdownRef : null}>
                            <input
                              type="text"
                              value={productDropdownOpen === idx ? (productSearch[idx] ?? '') : (products.find(p => p.id === item.productId)?.name || '')}
                              onChange={(e) => {
                                setProductSearch({ ...productSearch, [idx]: e.target.value })
                                setProductDropdownOpen(idx)
                              }}
                              onFocus={() => setProductDropdownOpen(idx)}
                              placeholder="Search product..."
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                            {productDropdownOpen === idx && (
                              <div className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                                {products
                                  .filter(p => !formData.warehouseId || p.defaultWarehouseId?.toString() === formData.warehouseId)
                                  .filter(p => !productSearch[idx] || p.name.toLowerCase().includes((productSearch[idx] || '').toLowerCase()))
                                  .slice(0, 20)
                                  .map(p => (
                                    <div
                                      key={p.id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
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
                                {products
                                  .filter(p => !formData.warehouseId || p.defaultWarehouseId?.toString() === formData.warehouseId)
                                  .filter(p => !productSearch[idx] || p.name.toLowerCase().includes((productSearch[idx] || '').toLowerCase()))
                                  .length === 0 && (
                                  <div className="px-3 py-2 text-gray-400 text-sm">No products found</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <select value={item.unitType} onChange={(e) => {
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
                            }} className="w-full px-2 py-1 border rounded text-sm">
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
                          <td className="px-2 py-2">
                            <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 border rounded text-sm" />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <div className="flex flex-col">
                                {priceChanged && (
                                  <span className="text-xs text-red-500 line-through">${item.defaultPrice.toFixed(3)}</span>
                                )}
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={item.unitPrice} 
                                  onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                  className={`w-20 px-2 py-1 border rounded text-sm ${priceChanged ? 'border-green-500 bg-green-50' : ''}`} 
                                />
                              </div>
                              {priceChanged && (
                                <button 
                                  type="button" 
                                  onClick={() => resetToDefaultPrice(idx)} 
                                  className="text-gray-400 hover:text-gray-600" 
                                  title="Reset to default price"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={item.discountPercent} onChange={(e) => updateItem(idx, 'discountPercent', parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1 border rounded text-sm" />
                          </td>
                          <td className="px-2 py-2 font-medium">${item.total.toFixed(3)}</td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-6 mt-3 text-sm">
                  <span><strong>Subtotal:</strong> ${totals.subtotal.toFixed(3)}</span>
                  <span><strong>Discount:</strong> ${formData.discount.toFixed(3)}</span>
                  {formData.extraCharge > 0 && <span className="text-orange-600"><strong>Extra Charge:</strong> +${formData.extraCharge.toFixed(3)}</span>}
                  <span><strong>Tax:</strong> ${formData.tax.toFixed(3)}</span>
                  <span><strong>Total:</strong> ${totals.total.toFixed(3)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingTask(null) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingTask ? 'Update Order / Task' : 'Save Order / Task')}
                </button>
              </div>
            </form>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">Order #{selectedTask.taskNumber}</h2>
              <button onClick={() => setShowViewModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Type:</span> <span className="font-medium">{selectedTask.type}</span></div>
                <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedTask.customerName || '-'}</span></div>
                <div><span className="text-gray-500">Driver:</span> <span className="font-medium">{selectedTask.driverName || '-'}</span></div>
                <div><span className="text-gray-500">Van:</span> <span className="font-medium">{selectedTask.vanName || '-'}</span></div>
                <div><span className="text-gray-500">Warehouse:</span> <span className="font-medium">{selectedTask.warehouseName || '-'}</span></div>
                <div><span className="text-gray-500">Scheduled:</span> <span className="font-medium">{selectedTask.scheduledDate.split('T')[0]}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedTask.status)}`}>{selectedTask.status}</span></div>
              </div>
              {selectedTask.notes && <div className="text-sm"><span className="text-gray-500">Notes:</span> {selectedTask.notes}</div>}
              
              {/* Regular Products Section */}
              {regularItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    🛒 المنتجات المباعة ({regularItems.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regularItems.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.unitType?.toLowerCase() === 'box' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                {item.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Gift Products Section */}
              {giftItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                    🎁 الهدايا المجانية ({giftItems.length})
                  </h3>
                  <div className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Value</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {giftItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-orange-200">
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.unitType?.toLowerCase() === 'box' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                {item.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-500 line-through">${(item.quantity * item.defaultPrice).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600">FREE</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Box */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white">
                <h3 className="font-bold mb-3">ملخص الفاتورة</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-80">المنتجات ({regularItems.reduce((s, i) => s + i.quantity, 0)} قطعة)</span>
                    <span className="font-bold">${regularTotal.toFixed(2)}</span>
                  </div>
                  {giftItems.length > 0 && (
                    <div className="flex justify-between text-orange-300">
                      <span>🎁 هدايا ({giftItems.reduce((s, i) => s + i.quantity, 0)} قطعة)</span>
                      <span className="font-bold">مجاناً (قيمتها ${giftValue.toFixed(2)})</span>
                    </div>
                  )}
                  {extraCharge > 0 && (
                    <div className="flex justify-between text-yellow-300">
                      <span>تكلفة إضافية للهدايا</span>
                      <span className="font-bold">+${extraCharge.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/30 flex justify-between items-center">
                  <span className="text-lg">المبلغ المطلوب من العميل</span>
                  <span className="text-2xl font-bold">${selectedTask.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => setShowViewModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Products Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package size={20} /> Products Summary - {dateFilter}
              </h2>
              <button onClick={() => { setShowSummaryModal(false); setSummaryVanFilter('') }}><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Van Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Van</label>
                <select 
                  value={summaryVanFilter} 
                  onChange={(e) => setSummaryVanFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Vans</option>
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
                    <div className="text-center py-8 text-gray-500">
                      <Package size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No products found {selectedVan ? `for ${selectedVan.name}` : `for ${dateFilter}`}</p>
                    </div>
                  )
                }

                return (
                  <>
                    {selectedVan && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <span className="font-semibold text-green-800">Van: {selectedVan.name}</span>
                      </div>
                    )}
                    <div className="bg-blue-50 rounded-lg p-3 mb-4 flex justify-between items-center">
                      <span className="font-medium text-blue-800">Total Products: {sortedProducts.length}</span>
                      <span className="font-bold text-blue-800">Total Quantity: {totalItems}</span>
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-sm font-semibold text-gray-600">#</th>
                          <th className="text-left px-4 py-2 text-sm font-semibold text-gray-600">Product</th>
                          <th className="text-left px-4 py-2 text-sm font-semibold text-gray-600">Unit</th>
                          <th className="text-right px-4 py-2 text-sm font-semibold text-gray-600">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedProducts.map((product, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium">{product.productName}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${product.unitType?.toLowerCase() === 'box' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                {product.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-blue-600">{product.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
            <div className="p-4 border-t flex justify-between">
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
                    <!DOCTYPE html><html><head><title>Products Summary</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
                      .header h1 { font-size: 18px; margin-bottom: 5px; }
                      .header p { color: #666; }
                      .van-info { background: #f0f9f0; border: 1px solid #4ade80; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
                      .summary { display: flex; justify-content: space-between; background: #eff6ff; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
                      table { width: 100%; border-collapse: collapse; }
                      th { background: #f3f4f6; text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; font-size: 11px; }
                      td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
                      .unit-box { background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
                      .unit-piece { background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
                      .qty { text-align: right; font-weight: bold; color: #2563eb; }
                      .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #ccc; font-size: 10px; color: #666; }
                      @media print { body { padding: 10px; } @page { margin: 10mm; } }
                    </style></head><body>
                      <div class="header">
                        <h1>Products Summary</h1>
                        <p>Date: ${selectedDate}</p>
                      </div>
                      ${selectedVan ? `<div class="van-info"><strong>Van:</strong> ${selectedVan.name}</div>` : ''}
                      <div class="summary">
                        <span><strong>Total Products:</strong> ${sortedProducts.length}</span>
                        <span><strong>Total Quantity:</strong> ${totalItems}</span>
                      </div>
                      <table>
                        <thead><tr><th>#</th><th>Product</th><th>Unit</th><th style="text-align:right">Qty</th></tr></thead>
                        <tbody>
                          ${sortedProducts.map((p, i) => `
                            <tr>
                              <td>${i + 1}</td>
                              <td>${p.productName}</td>
                              <td><span class="${p.unitType?.toLowerCase() === 'box' ? 'unit-box' : 'unit-piece'}">${p.unitType?.toLowerCase() === 'box' ? 'Box' : 'Piece'}</span></td>
                              <td class="qty">${p.quantity}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div class="footer">Printed: ${new Date().toLocaleString()}</div>
                      <script>window.onload = function() { window.print(); }</script>
                    </body></html>
                  `)
                  printWindow.document.close()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Printer size={18} /> Print Summary
              </button>
              <button onClick={() => { setShowSummaryModal(false); setSummaryVanFilter('') }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Delivery Image Viewer */}
      {proofImageUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setProofImageUrl(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 bg-purple-600 text-white">
              <h3 className="font-semibold flex items-center gap-2"><FileText size={18} /> Proof of Delivery</h3>
              <button onClick={() => setProofImageUrl(null)}><X size={22} /></button>
            </div>
            <div className="p-4">
              <img src={proofImageUrl} alt="Proof of Delivery" className="w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
