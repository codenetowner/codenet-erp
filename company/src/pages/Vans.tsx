import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, History, Warehouse, X, Loader2, ArrowDownToLine, ArrowUpFromLine, Search, BarChart3, Printer, Calendar, DollarSign, CheckCircle, Users } from 'lucide-react'
import api from '../lib/api'
import { vansApi, warehousesApi, productsApi } from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface VanStock {
  productId: number
  productName: string
  productSku: string
  quantity: number
}

interface Movement {
  id: number
  productId: number
  productName: string
  productSku: string
  movementType: string
  quantity: number
  warehouseId: number | null
  warehouseName: string | null
  notes: string | null
  createdAt: string
}

interface Product {
  id: number
  name: string
  sku: string
  barcode: string | null
}

interface Van {
  id: number
  name: string
  plateNumber: string | null
  assignedDriverId: number | null
  assignedDriverName: string | null
  warehouseId: number | null
  warehouseName: string | null
  maxCash: number
  currentCash: number
  status: string
  notes: string | null
}

interface WarehouseOption { id: number; name: string }
interface DriverOption { id: number; name: string; warehouseId: number | null }

// Performance Report Types
interface VanPerformance {
  stock: { productId: number; productName: string; productSku: string; quantity: number }[]
  tasks: { id: number; taskNumber: string; customerName: string; total: number; paidAmount: number; debtAmount: number; status: string; paymentType: string; completedAt: string | null; items: { productName: string; quantity: number; unitPrice: number; total: number }[] }[]
  collections: { id: number; collectionNumber: string; customerName: string; amount: number; paymentType: string; collectionDate: string }[]
  orders: { id: number; orderNumber: string; customerName: string; totalAmount: number; paidAmount: number; paymentStatus: string; orderDate: string; items: { productName: string; quantity: number; unitPrice: number; total: number }[] }[]
  todayLoads: { productId: number; productName: string; quantity: number }[]
}

export default function Vans() {
  const [vans, setVans] = useState<Van[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showMovementsModal, setShowMovementsModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [selectedVan, setSelectedVan] = useState<Van | null>(null)
  
  // Performance state
  const [performanceDate, setPerformanceDate] = useState(new Date().toISOString().split('T')[0])
  const [performanceData, setPerformanceData] = useState<VanPerformance | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  
  // Stock & Movements data
  const [vanStock, setVanStock] = useState<VanStock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)
  
  // Load stock form
  const [loadFormData, setLoadFormData] = useState({ productId: '', quantity: 0, notes: '' })
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '', plateNumber: '', warehouseId: '', assignedDriverId: '',
    maxCash: 10000, status: 'active', notes: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vansRes, whRes, driversRes] = await Promise.all([
        vansApi.getAll(),
        warehousesApi.getAll(),
        vansApi.getDrivers()
      ])
      setVans(vansRes.data)
      setWarehouses(whRes.data)
      setDrivers(driversRes.data || [])
    } catch (error) {
      console.error('Failed to load vans:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', plateNumber: '', warehouseId: '', assignedDriverId: '', maxCash: 10000, status: 'active', notes: '' })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await vansApi.create({
        ...formData,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
        assignedDriverId: formData.assignedDriverId ? parseInt(formData.assignedDriverId) : null,
      })
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create van')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (van: Van) => {
    setSelectedVan(van)
    setFormData({
      name: van.name,
      plateNumber: van.plateNumber || '',
      warehouseId: van.warehouseId?.toString() || '',
      assignedDriverId: van.assignedDriverId?.toString() || '',
      maxCash: van.maxCash,
      status: van.status,
      notes: van.notes || ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVan) return
    setSaving(true)
    try {
      await vansApi.update(selectedVan.id, {
        ...formData,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
        assignedDriverId: formData.assignedDriverId ? parseInt(formData.assignedDriverId) : null,
      })
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update van')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this van?')) return
    try {
      await vansApi.delete(id)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete van')
    }
  }

  // Open Van Stock Modal
  const handleViewStock = async (van: Van) => {
    setSelectedVan(van)
    setShowStockModal(true)
    setLoadingStock(true)
    try {
      const [stockRes, productsRes] = await Promise.all([
        vansApi.getStock(van.id),
        productsApi.getAll()
      ])
      setVanStock(stockRes.data)
      setProducts(productsRes.data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode })))
    } catch (error) {
      console.error('Failed to load stock:', error)
    } finally {
      setLoadingStock(false)
    }
  }

  // Open Movements Modal
  const handleViewMovements = async (van: Van) => {
    setSelectedVan(van)
    setShowMovementsModal(true)
    setLoadingMovements(true)
    try {
      const res = await vansApi.getMovements(van.id, 50)
      setMovements(res.data)
    } catch (error) {
      console.error('Failed to load movements:', error)
    } finally {
      setLoadingMovements(false)
    }
  }

  // Open Load Stock Modal
  const handleOpenLoadModal = async (van: Van) => {
    setSelectedVan(van)
    setShowLoadModal(true)
    setLoadFormData({ productId: '', quantity: 0, notes: '' })
    setProductSearch('')
    try {
      const res = await productsApi.getAll()
      setProducts(res.data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode })))
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  // Load stock to van
  const handleLoadStock = async () => {
    if (!selectedVan || !loadFormData.productId || loadFormData.quantity <= 0) return
    setLoadingAction(true)
    try {
      await vansApi.loadStock(selectedVan.id, {
        productId: parseInt(loadFormData.productId),
        quantity: loadFormData.quantity,
        notes: loadFormData.notes || undefined
      })
      alert('Stock loaded successfully!')
      setShowLoadModal(false)
      // Refresh stock if stock modal was open
      if (showStockModal) handleViewStock(selectedVan)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to load stock')
    } finally {
      setLoadingAction(false)
    }
  }

  // Unload stock from van
  const handleUnloadStock = async (productId: number, quantity: number) => {
    if (!selectedVan) return
    const unloadQty = prompt(`Enter quantity to unload (max ${quantity}):`)
    if (!unloadQty) return
    const qty = parseFloat(unloadQty)
    if (isNaN(qty) || qty <= 0 || qty > quantity) {
      alert('Invalid quantity')
      return
    }
    setLoadingAction(true)
    try {
      await vansApi.unloadStock(selectedVan.id, { productId, quantity: qty })
      alert('Stock unloaded successfully!')
      handleViewStock(selectedVan)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to unload stock')
    } finally {
      setLoadingAction(false)
    }
  }

  const getMovementBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      'load_van': { bg: 'bg-green-100', text: 'text-green-700', label: 'Loaded' },
      'unload_van': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Unloaded' },
      'sale': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sale' },
      'return': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Return' },
      'adjustment': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Adjustment' },
    }
    return styles[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'available': 'bg-green-100 text-green-700',
      'on_duty': 'bg-blue-100 text-blue-700',
      'maintenance': 'bg-yellow-100 text-yellow-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  // Load Van Performance Data
  const handleViewPerformance = async (van: Van, date?: string) => {
    setSelectedVan(van)
    setShowPerformanceModal(true)
    setLoadingPerformance(true)
    const targetDate = date || performanceDate
    
    try {
      const [stockRes, tasksRes, collectionsRes, ordersRes, movementsRes] = await Promise.all([
        vansApi.getStock(van.id),
        api.get(`/tasks?vanId=${van.id}&date=${targetDate}`),
        api.get(`/collections?date=${targetDate}`),
        api.get(`/orders?vanId=${van.id}&date=${targetDate}`),
        vansApi.getMovements(van.id, 200)
      ])
      
      // Filter movements for today's loads (load_van type on target date)
      const todayLoadsMap = new Map<number, { productId: number; productName: string; quantity: number }>()
      movementsRes.data.forEach((m: any) => {
        const d = new Date(m.createdAt)
        const movementDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (m.movementType === 'load_van' && movementDate === targetDate) {
          const existing = todayLoadsMap.get(m.productId)
          if (existing) {
            existing.quantity += m.quantity
          } else {
            todayLoadsMap.set(m.productId, { productId: m.productId, productName: m.productName, quantity: m.quantity })
          }
        }
      })
      
      setPerformanceData({
        stock: stockRes.data,
        tasks: tasksRes.data.map((t: any) => ({
          id: t.id, taskNumber: t.taskNumber, customerName: t.customerName || t.customer?.name || 'Unknown',
          total: t.total, paidAmount: t.paidAmount || 0, debtAmount: t.debtAmount || 0,
          status: t.status, paymentType: t.paymentType || 'cash', completedAt: t.completedAt,
          items: t.items?.map((i: any) => ({ productName: i.productName || i.product?.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })) || []
        })),
        collections: collectionsRes.data.map((c: any) => ({
          id: c.id, collectionNumber: c.collectionNumber, customerName: c.customerName || c.customer?.name || 'Unknown',
          amount: c.amount, paymentType: c.paymentType, collectionDate: c.collectionDate
        })),
        orders: ordersRes.data.map((o: any) => ({
          id: o.id, orderNumber: o.orderNumber, customerName: o.customerName || o.customer?.name || 'Unknown',
          totalAmount: o.totalAmount, paidAmount: o.paidAmount, paymentStatus: o.paymentStatus, orderDate: o.orderDate,
          items: o.items?.map((i: any) => ({ productName: i.productName || i.product?.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })) || []
        })),
        todayLoads: Array.from(todayLoadsMap.values())
      })
    } catch (error) {
      console.error('Failed to load performance:', error)
      setPerformanceData({ stock: [], tasks: [], collections: [], orders: [], todayLoads: [] })
    } finally {
      setLoadingPerformance(false)
    }
  }

  // Print Performance Report
  const printPerformanceReport = () => {
    if (!selectedVan || !performanceData) return
    
    const totalSales = performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.total, 0) +
                       performanceData.orders.reduce((s, o) => s + o.totalAmount, 0)
    const totalCash = performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.paidAmount, 0) +
                      performanceData.orders.reduce((s, o) => s + o.paidAmount, 0)
    const totalDebt = performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.debtAmount, 0)
    const totalCollected = performanceData.collections.reduce((s, c) => s + c.amount, 0)
    const completedTasks = performanceData.tasks.filter(t => t.status === 'Completed').length
    
    // Aggregate sold products
    const soldProducts = new Map<string, { qty: number; total: number }>()
    performanceData.tasks.filter(t => t.status === 'Completed').forEach(t => {
      t.items.forEach(i => {
        const existing = soldProducts.get(i.productName) || { qty: 0, total: 0 }
        existing.qty += i.quantity
        existing.total += i.total
        soldProducts.set(i.productName, existing)
      })
    })
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) { alert('Please allow popups'); return }
    
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Van Performance - ${selectedVan.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { font-size: 20px; } .header p { color: #666; font-size: 10px; }
        .van-info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; display: flex; gap: 20px; }
        .van-info .item { } .van-info .label { font-size: 9px; color: #666; } .van-info .value { font-weight: bold; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px; }
        .summary-card { border: 1px solid #ddd; padding: 8px; border-radius: 5px; text-align: center; }
        .summary-card .label { font-size: 9px; color: #666; } .summary-card .value { font-size: 16px; font-weight: bold; }
        .summary-card .value.green { color: #22c55e; } .summary-card .value.blue { color: #3b82f6; }
        .summary-card .value.red { color: #ef4444; } .summary-card .value.purple { color: #9333ea; }
        .section { margin-bottom: 15px; } .section h2 { font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
        th { background: #f5f5f5; font-size: 9px; } .text-right { text-align: right; } .text-center { text-align: center; }
        .badge { padding: 2px 6px; border-radius: 3px; font-size: 9px; }
        .badge-green { background: #dcfce7; color: #166534; } .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-red { background: #fee2e2; color: #991b1b; } .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>🚐 Van Daily Performance Report</h1>
        <p>${selectedVan.name} ${selectedVan.plateNumber ? '(' + selectedVan.plateNumber + ')' : ''} | Date: ${performanceDate} | Generated: ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="van-info">
        <div class="item"><div class="label">Driver</div><div class="value">${selectedVan.assignedDriverName || 'Not Assigned'}</div></div>
        <div class="item"><div class="label">Warehouse</div><div class="value">${selectedVan.warehouseName || 'Not Assigned'}</div></div>
        <div class="item"><div class="label">Current Cash</div><div class="value">$${selectedVan.currentCash.toFixed(3)}</div></div>
        <div class="item"><div class="label">Status</div><div class="value">${selectedVan.status}</div></div>
      </div>
      
      <div class="summary">
        <div class="summary-card"><div class="label">Total Sales</div><div class="value blue">$${totalSales.toFixed(3)}</div></div>
        <div class="summary-card"><div class="label">Cash Received</div><div class="value green">$${totalCash.toFixed(3)}</div></div>
        <div class="summary-card"><div class="label">Credit Given</div><div class="value red">$${totalDebt.toFixed(3)}</div></div>
        <div class="summary-card"><div class="label">Debt Collected</div><div class="value purple">$${totalCollected.toFixed(3)}</div></div>
        <div class="summary-card"><div class="label">Tasks Done</div><div class="value">${completedTasks}/${performanceData.tasks.length}</div></div>
      </div>
      
      <div class="section">
        <h2>📦 Inventory & Sales Summary</h2>
        ${(() => {
          const loadsMap = new Map();
          performanceData.todayLoads.forEach(l => loadsMap.set(l.productName, (loadsMap.get(l.productName) || 0) + l.quantity));
          const allProducts = new Map();
          performanceData.stock.forEach(s => allProducts.set(s.productName, { sku: s.productSku, stock: s.quantity, loaded: loadsMap.get(s.productName) || 0, soldQty: 0, soldTotal: 0 }));
          soldProducts.forEach((data, name) => {
            const ex = allProducts.get(name) || { sku: '-', stock: 0, loaded: loadsMap.get(name) || 0, soldQty: 0, soldTotal: 0 };
            ex.soldQty = data.qty; ex.soldTotal = data.total;
            allProducts.set(name, ex);
          });
          loadsMap.forEach((qty, name) => { if (!allProducts.has(name)) allProducts.set(name, { sku: '-', stock: 0, loaded: qty, soldQty: 0, soldTotal: 0 }); });
          if (allProducts.size === 0) return '<p style="color:#666;padding:10px;">No inventory data</p>';
          return '<table><thead><tr><th>Product</th><th>SKU</th><th class="text-right" style="color:#9333ea;">Loaded</th><th class="text-right" style="color:#22c55e;">In Stock</th><th class="text-right" style="color:#3b82f6;">Sold</th><th class="text-right">Sales $</th></tr></thead><tbody>' +
            Array.from(allProducts.entries()).map(([name, data]) => '<tr><td>' + name + '</td><td>' + data.sku + '</td><td class="text-right">' + (data.loaded > 0 ? data.loaded : '-') + '</td><td class="text-right">' + data.stock + '</td><td class="text-right">' + (data.soldQty > 0 ? data.soldQty : '-') + '</td><td class="text-right">' + (data.soldTotal > 0 ? '$' + data.soldTotal.toFixed(3) : '-') + '</td></tr>').join('') +
            '</tbody></table>';
        })()}
      </div>
      
      <div class="section">
        <h2>✅ Tasks (${performanceData.tasks.length})</h2>
        ${performanceData.tasks.length > 0 ? `<table><thead><tr><th>Task #</th><th>Customer</th><th class="text-right">Total</th><th class="text-right">Paid</th><th class="text-right">Debt</th><th class="text-center">Status</th></tr></thead><tbody>
          ${performanceData.tasks.map(t => `<tr><td>${t.taskNumber}</td><td>${t.customerName}</td><td class="text-right">$${t.total.toFixed(3)}</td><td class="text-right">$${t.paidAmount.toFixed(3)}</td><td class="text-right ${t.debtAmount > 0 ? 'text-red' : ''}">$${t.debtAmount.toFixed(3)}</td><td class="text-center"><span class="badge ${t.status === 'Completed' ? 'badge-green' : 'badge-blue'}">${t.status}</span></td></tr>`).join('')}
        </tbody></table>` : '<p style="color:#666;padding:10px;">No tasks today</p>'}
      </div>
      
      <div class="section">
        <h2>💵 Debt Collections (${performanceData.collections.length})</h2>
        ${performanceData.collections.length > 0 ? `<table><thead><tr><th>Collection #</th><th>Customer</th><th class="text-right">Amount</th><th class="text-center">Payment</th></tr></thead><tbody>
          ${performanceData.collections.map(c => `<tr><td>${c.collectionNumber}</td><td>${c.customerName}</td><td class="text-right">$${c.amount.toFixed(3)}</td><td class="text-center">${c.paymentType}</td></tr>`).join('')}
        </tbody></table>` : '<p style="color:#666;padding:10px;">No collections today</p>'}
      </div>
      
      <div class="footer">Catalyst Performance Report - Confidential</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.focus(); printWindow.print() }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vans</h1>
        <PermissionGate permission={PERMISSIONS.CREATE_VANS}>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
            <Plus size={20} /> Add Van
          </button>
        </PermissionGate>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plate Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Max Cash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Cash</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vans.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No vans found</td></tr>
            ) : vans.map((van) => (
              <tr key={van.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{van.name}</td>
                <td className="px-4 py-3 text-gray-500">{van.plateNumber || '-'}</td>
                <td className="px-4 py-3">{van.assignedDriverName || '-'}</td>
                <td className="px-4 py-3">{van.warehouseName || '-'}</td>
                <td className="px-4 py-3">${van.maxCash.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">${van.currentCash.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(van.status)}`}>
                    {van.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleViewPerformance(van)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Today's Performance"><BarChart3 size={16} /></button>
                    <PermissionGate permission={PERMISSIONS.VIEW_VAN_STOCK}>
                      <button onClick={() => handleViewStock(van)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Van Stock"><Package size={16} /></button>
                      <button onClick={() => handleViewMovements(van)} className="p-1 text-cyan-600 hover:bg-cyan-50 rounded" title="Transfer Log"><History size={16} /></button>
                    </PermissionGate>
                    {/* <PermissionGate permission={PERMISSIONS.LOAD_VAN_STOCK}>
                      <button onClick={() => handleOpenLoadModal(van)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Load Stock"><Warehouse size={16} /></button>
                    </PermissionGate> */}
                    <PermissionGate permission={PERMISSIONS.EDIT_VANS}>
                      <button onClick={() => handleEdit(van)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.DELETE_VANS}>
                      <button onClick={() => handleDelete(van.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Van Modal */}
      {(showModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{showEditModal ? 'Edit Van' : 'Add Van'}</h2>
              <button onClick={() => { setShowModal(false); setShowEditModal(false) }}><X size={24} /></button>
            </div>
            <form onSubmit={showEditModal ? handleEditSubmit : handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Van Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter van name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                  <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({...formData, plateNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter plate number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
                  <select 
                    value={formData.assignedDriverId} 
                    onChange={(e) => {
                      const driverId = e.target.value
                      const selectedDriver = drivers.find(d => d.id.toString() === driverId)
                      setFormData({
                        ...formData, 
                        assignedDriverId: driverId,
                        warehouseId: selectedDriver?.warehouseId?.toString() || formData.warehouseId
                      })
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">None</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                  <select value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">None</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cash Capacity</label>
                  <input type="number" value={formData.maxCash} onChange={(e) => setFormData({...formData, maxCash: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter max cash" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="active">Available</option>
                    <option value="on_duty">On Duty</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Enter notes" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setShowEditModal(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Van Stock Modal */}
      {showStockModal && selectedVan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-green-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package size={20} /> Van Stock — {selectedVan.name}
              </h2>
              <button onClick={() => setShowStockModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingStock ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : vanStock.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No stock in this van</p>
                  <p className="text-sm">Load stock from warehouse to get started</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Quantity</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vanStock.map((item) => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{item.productName}</td>
                          <td className="px-4 py-3 text-gray-500">{item.productSku}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => handleUnloadStock(item.productId, item.quantity)}
                              className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded border border-orange-200"
                              disabled={loadingAction}
                            >
                              <ArrowUpFromLine size={14} className="inline mr-1" /> Unload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-between pt-4 mt-4 border-t">
                <button 
                  onClick={() => handleOpenLoadModal(selectedVan)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <ArrowDownToLine size={16} /> Load Stock
                </button>
                <button onClick={() => setShowStockModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movements Modal */}
      {showMovementsModal && selectedVan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-cyan-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History size={20} /> Transfer Log — {selectedVan.name}
              </h2>
              <button onClick={() => setShowMovementsModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingMovements ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No transfer history</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Warehouse</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {movements.map((m) => {
                        const badge = getMovementBadge(m.movementType)
                        return (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{new Date(m.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{m.productName}</div>
                              <div className="text-xs text-gray-500">{m.productSku}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                            <td className="px-4 py-3 text-gray-500">{m.warehouseName || '-'}</td>
                            <td className="px-4 py-3 text-gray-500 text-sm">{m.notes || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end pt-4 mt-4 border-t">
                <button onClick={() => setShowMovementsModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Stock Modal */}
      {showLoadModal && selectedVan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white rounded-t-xl">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ArrowDownToLine size={20} /> Load Stock — {selectedVan.name}
              </h2>
              <button onClick={() => setShowLoadModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              {!selectedVan.warehouseId ? (
                <div className="text-center py-8 text-orange-600 bg-orange-50 rounded-lg">
                  <Warehouse size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Van not assigned to warehouse</p>
                  <p className="text-sm">Please assign this van to a warehouse first</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <span className="font-medium">Loading from:</span> {selectedVan.warehouseName}
                  </div>
                  
                  {/* Product Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setShowProductDropdown(true)
                          setLoadFormData({ ...loadFormData, productId: '' })
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Search product..."
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg ${loadFormData.productId ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                      />
                    </div>
                    {showProductDropdown && productSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {products
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                       p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                                       (p.barcode && p.barcode.includes(productSearch)))
                          .slice(0, 10)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setLoadFormData({ ...loadFormData, productId: p.id.toString() })
                                setProductSearch(`${p.name} (${p.sku})`)
                                setShowProductDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                            </div>
                          ))
                        }
                        {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                                              p.sku.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500">No products found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={loadFormData.quantity || ''}
                      onChange={(e) => setLoadFormData({ ...loadFormData, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter quantity"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={loadFormData.notes}
                      onChange={(e) => setLoadFormData({ ...loadFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Optional notes"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowLoadModal(false)} 
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {selectedVan.warehouseId && (
                  <button 
                    onClick={handleLoadStock}
                    disabled={!loadFormData.productId || loadFormData.quantity <= 0 || loadingAction}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loadingAction ? 'Loading...' : 'Load Stock'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && selectedVan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-orange-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 size={20} /> Daily Performance — {selectedVan.name}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Calendar size={16} />
                  <input type="date" value={performanceDate} onChange={(e) => { setPerformanceDate(e.target.value); handleViewPerformance(selectedVan, e.target.value) }} className="bg-transparent text-white text-sm border-none outline-none" />
                </div>
                <button onClick={printPerformanceReport} className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30"><Printer size={16} /> Print</button>
                <button onClick={() => setShowPerformanceModal(false)}><X size={24} /></button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(95vh-70px)]">
              {loadingPerformance ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" size={40} /></div>
              ) : performanceData ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 flex flex-wrap gap-6 text-sm">
                    <div><span className="text-gray-500">Driver:</span> <strong>{selectedVan.assignedDriverName || 'Not Assigned'}</strong></div>
                    <div><span className="text-gray-500">Warehouse:</span> <strong>{selectedVan.warehouseName || '-'}</strong></div>
                    <div><span className="text-gray-500">Cash in Van:</span> <strong className="text-green-600">${selectedVan.currentCash.toFixed(3)}</strong></div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 font-medium">Total Sales</div>
                      <div className="text-xl font-bold text-blue-700">${(performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.total, 0) + performanceData.orders.reduce((s, o) => s + o.totalAmount, 0)).toFixed(3)}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-green-600 font-medium">Cash Received</div>
                      <div className="text-xl font-bold text-green-700">${(performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.paidAmount, 0) + performanceData.orders.reduce((s, o) => s + o.paidAmount, 0)).toFixed(3)}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 font-medium">Credit Given</div>
                      <div className="text-xl font-bold text-red-700">${performanceData.tasks.filter(t => t.status === 'Completed').reduce((s, t) => s + t.debtAmount, 0).toFixed(3)}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-purple-600 font-medium">Debt Collected</div>
                      <div className="text-xl font-bold text-purple-700">${performanceData.collections.reduce((s, c) => s + c.amount, 0).toFixed(3)}</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 font-medium">Tasks Done</div>
                      <div className="text-xl font-bold text-gray-700">{performanceData.tasks.filter(t => t.status === 'Completed').length}/{performanceData.tasks.length}</div>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 font-semibold text-sm flex items-center gap-2"><Package size={16} className="text-green-600" /> Inventory & Sales Summary</div>
                    <div className="max-h-56 overflow-y-auto">
                      {(() => {
                        const sold = new Map<string, { qty: number; total: number }>()
                        performanceData.tasks.filter(t => t.status === 'Completed').forEach(t => t.items.forEach(i => { const ex = sold.get(i.productName) || { qty: 0, total: 0 }; ex.qty += i.quantity; ex.total += i.total; sold.set(i.productName, ex) }))
                        performanceData.orders.forEach(o => o.items.forEach(i => { const ex = sold.get(i.productName) || { qty: 0, total: 0 }; ex.qty += i.quantity; ex.total += i.total; sold.set(i.productName, ex) }))
                        
                        // Build today's loads map by product name
                        const loadsMap = new Map<string, number>()
                        performanceData.todayLoads.forEach(l => loadsMap.set(l.productName, (loadsMap.get(l.productName) || 0) + l.quantity))
                        
                        const allProducts = new Map<string, { stock: number; loaded: number; soldQty: number; soldTotal: number }>()
                        performanceData.stock.forEach(s => allProducts.set(s.productName, { stock: s.quantity, loaded: loadsMap.get(s.productName) || 0, soldQty: 0, soldTotal: 0 }))
                        sold.forEach((data, name) => {
                          const ex = allProducts.get(name) || { stock: 0, loaded: loadsMap.get(name) || 0, soldQty: 0, soldTotal: 0 }
                          ex.soldQty = data.qty; ex.soldTotal = data.total
                          allProducts.set(name, ex)
                        })
                        // Also add products that were loaded but not in stock anymore
                        loadsMap.forEach((qty, name) => {
                          if (!allProducts.has(name)) {
                            allProducts.set(name, { stock: 0, loaded: qty, soldQty: 0, soldTotal: 0 })
                          }
                        })
                        if (allProducts.size === 0) return <div className="p-4 text-center text-gray-500 text-sm">No inventory data</div>
                        return <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0"><tr>
                            <th className="px-3 py-2 text-left">Product</th>
                            <th className="px-3 py-2 text-right text-purple-600">Loaded</th>
                            <th className="px-3 py-2 text-right text-green-600">In Stock</th>
                            <th className="px-3 py-2 text-right text-blue-600">Sold</th>
                            <th className="px-3 py-2 text-right text-emerald-600">Sales $</th>
                          </tr></thead>
                          <tbody className="divide-y">{Array.from(allProducts.entries()).map(([name, data]) => (
                            <tr key={name} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{name}</td>
                              <td className="px-3 py-2 text-right text-purple-700 font-medium">{data.loaded > 0 ? data.loaded : '-'}</td>
                              <td className="px-3 py-2 text-right text-green-700 font-medium">{data.stock}</td>
                              <td className="px-3 py-2 text-right text-blue-700 font-medium">{data.soldQty > 0 ? data.soldQty : '-'}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 font-medium">{data.soldTotal > 0 ? `$${data.soldTotal.toFixed(3)}` : '-'}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      })()}
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden mt-4">
                    <div className="bg-gray-100 px-3 py-2 font-semibold text-sm flex items-center gap-2"><Users size={16} className="text-indigo-600" /> Sales by Customer</div>
                    <div className="max-h-56 overflow-y-auto">
                      {(() => {
                        // Group by customer+product
                        const salesMap = new Map<string, { customer: string; product: string; qty: number; total: number }>()
                        performanceData.tasks.filter(t => t.status === 'Completed').forEach(t => {
                          t.items.forEach(i => {
                            const key = `${t.customerName}|||${i.productName}`
                            const existing = salesMap.get(key)
                            if (existing) {
                              existing.qty += i.quantity
                              existing.total += i.total
                            } else {
                              salesMap.set(key, { customer: t.customerName, product: i.productName, qty: i.quantity, total: i.total })
                            }
                          })
                        })
                        performanceData.orders.forEach(o => {
                          o.items.forEach(i => {
                            const key = `${o.customerName}|||${i.productName}`
                            const existing = salesMap.get(key)
                            if (existing) {
                              existing.qty += i.quantity
                              existing.total += i.total
                            } else {
                              salesMap.set(key, { customer: o.customerName, product: i.productName, qty: i.quantity, total: i.total })
                            }
                          })
                        })
                        const customerSales = Array.from(salesMap.values())
                        if (customerSales.length === 0) return <div className="p-4 text-center text-gray-500 text-sm">No customer sales</div>
                        return <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0"><tr>
                            <th className="px-3 py-2 text-left">Customer</th>
                            <th className="px-3 py-2 text-left">Product</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr></thead>
                          <tbody className="divide-y">{customerSales.map((s, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{s.customer}</td>
                              <td className="px-3 py-2">{s.product}</td>
                              <td className="px-3 py-2 text-right">{s.qty}</td>
                              <td className="px-3 py-2 text-right text-green-600 font-medium">${s.total.toFixed(3)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      })()}
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden mt-4">
                    <div className="bg-gray-100 px-3 py-2 font-semibold text-sm flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> Tasks ({performanceData.tasks.length})</div>
                    <div className="max-h-52 overflow-y-auto">
                      {performanceData.tasks.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">No tasks</div> : (
                        <table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left">Task #</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Debt</th><th className="px-3 py-2 text-center">Status</th></tr></thead>
                        <tbody className="divide-y">{performanceData.tasks.map(t => <tr key={t.id} className="hover:bg-gray-50"><td className="px-3 py-2 font-medium">{t.taskNumber}</td><td className="px-3 py-2">{t.customerName}</td><td className="px-3 py-2 text-right">${t.total.toFixed(3)}</td><td className="px-3 py-2 text-right text-green-600">${t.paidAmount.toFixed(3)}</td><td className="px-3 py-2 text-right text-red-600">{t.debtAmount > 0 ? `$${t.debtAmount.toFixed(3)}` : '-'}</td><td className="px-3 py-2 text-center"><span className={`px-2 py-1 rounded text-xs font-medium ${t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span></td></tr>)}</tbody></table>
                      )}
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden mt-4">
                    <div className="bg-gray-100 px-3 py-2 font-semibold text-sm flex items-center gap-2"><DollarSign size={16} className="text-purple-600" /> Debt Collections ({performanceData.collections.length})</div>
                    <div className="max-h-40 overflow-y-auto">
                      {performanceData.collections.length === 0 ? <div className="p-4 text-center text-gray-500 text-sm">No collections</div> : (
                        <table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left">Collection #</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-center">Payment</th></tr></thead>
                        <tbody className="divide-y">{performanceData.collections.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-3 py-2 font-medium">{c.collectionNumber}</td><td className="px-3 py-2">{c.customerName}</td><td className="px-3 py-2 text-right text-purple-600 font-medium">${c.amount.toFixed(3)}</td><td className="px-3 py-2 text-center">{c.paymentType}</td></tr>)}</tbody></table>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
