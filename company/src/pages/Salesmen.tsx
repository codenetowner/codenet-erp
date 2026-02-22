import { useState, useEffect } from 'react'
import { Users, Calendar, BarChart3, UserPlus, Target, X, Loader2, Printer, DollarSign, ClipboardList, Percent, Plus, MapPin, Trash2 } from 'lucide-react'
import { salesmenApi, customersApi, tasksApi } from '../lib/api'

interface Salesman {
  id: number
  name: string
  username: string
  phone: string | null
  status: string
  commissionRate: number
  leadsToday: number
  totalLeads: number
  customersToday: number
  totalCustomers: number
  tasksToday: number
  tasksSalesToday: number
  commissionToday: number
  totalTasksSales: number
  totalCommission: number
}

interface LeadPerformance {
  id: number
  businessName: string
  contactName: string | null
  phone: string | null
  address: string | null
  status: string
  createdAt: string
}

interface CustomerPerformance {
  id: number
  name: string
  code: string | null
  phone: string | null
  address: string | null
  customerType: string | null
  createdAt: string
}

interface TaskPerformance {
  id: number
  taskNumber: string
  customerName: string | null
  total: number
  status: string
  createdAt: string
}

interface DailyPerformance {
  salesmanId: number
  salesmanName: string
  date: string
  commissionRate: number
  leadsToday: number
  customersToday: number
  tasksToday: number
  tasksSalesToday: number
  commissionToday: number
  totalLeads: number
  totalCustomers: number
  totalTasksSales: number
  totalCommission: number
  leads: LeadPerformance[]
  customers: CustomerPerformance[]
  tasks: TaskPerformance[]
}

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
}

interface VisitTask {
  id: number
  taskNumber: string
  type: string
  customerId: number | null
  customerName: string | null
  salesmanId: number | null
  salesmanName: string | null
  scheduledDate: string
  status: string
  notes: string | null
  total: number
  createdAt: string
}

export default function Salesmen() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null)
  const [performanceDate, setPerformanceDate] = useState(new Date().toISOString().split('T')[0])
  const [performanceData, setPerformanceData] = useState<DailyPerformance | null>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)

  // Visit Tasks List
  const [visitTasks, setVisitTasks] = useState<VisitTask[]>([])
  const [visitDateFilter, setVisitDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [visitStatusFilter, setVisitStatusFilter] = useState('')
  const [visitSalesmanFilter, setVisitSalesmanFilter] = useState('')

  // Visit Task Creation
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [savingVisit, setSavingVisit] = useState(false)
  const [visitForm, setVisitForm] = useState({
    salesmanId: '',
    customerId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [customerSearch, setCustomerSearch] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesmenRes, tasksRes] = await Promise.all([
        salesmenApi.getAll(),
        tasksApi.getAll()
      ])
      setSalesmen(salesmenRes.data)
      // Filter to only show Customer Visit tasks
      setVisitTasks(tasksRes.data.filter((t: any) => t.type === 'Customer Visit'))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPerformance = async (salesman: Salesman, date?: string) => {
    setSelectedSalesman(salesman)
    setShowPerformanceModal(true)
    setLoadingPerformance(true)
    const targetDate = date || performanceDate
    
    try {
      const res = await salesmenApi.getPerformance(salesman.id, targetDate)
      setPerformanceData(res.data)
    } catch (error) {
      console.error('Failed to load performance:', error)
      setPerformanceData(null)
    } finally {
      setLoadingPerformance(false)
    }
  }

  const handleDateChange = (date: string) => {
    setPerformanceDate(date)
    if (selectedSalesman) {
      handleViewPerformance(selectedSalesman, date)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleOpenVisitModal = async (salesman?: Salesman) => {
    setShowVisitModal(true)
    setVisitForm({
      salesmanId: salesman?.id.toString() || '',
      customerId: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setCustomerSearch('')
    
    if (customers.length === 0) {
      setLoadingCustomers(true)
      try {
        const res = await customersApi.getAll()
        setCustomers(res.data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address })))
      } catch (error) {
        console.error('Failed to load customers:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }
  }

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitForm.salesmanId || !visitForm.customerId) {
      alert('Please select a salesman and customer')
      return
    }
    
    setSavingVisit(true)
    try {
      await tasksApi.create({
        type: 'Customer Visit',
        customerId: parseInt(visitForm.customerId),
        salesmanId: parseInt(visitForm.salesmanId),
        scheduledDate: visitForm.scheduledDate,
        notes: visitForm.notes || 'Visit task assigned by company',
        items: []
      })
      setShowVisitModal(false)
      await loadData()
      alert('Visit task created successfully!')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create visit task')
    } finally {
      setSavingVisit(false)
    }
  }

  const handleDeleteVisitTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this visit task?')) return
    try {
      await tasksApi.delete(taskId)
      await loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete task')
    }
  }

  const filteredVisitTasks = visitTasks.filter(t => {
    if (visitDateFilter && !t.scheduledDate.startsWith(visitDateFilter)) return false
    if (visitStatusFilter && t.status !== visitStatusFilter) return false
    if (visitSalesmanFilter && t.salesmanId?.toString() !== visitSalesmanFilter) return false
    return true
  })

  const getVisitStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  )

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salesmen</h1>
          <p className="text-gray-600">{salesmen.length} active salesmen</p>
        </div>
        <button
          onClick={() => handleOpenVisitModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          Assign Visit Task
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Salesmen</p>
              <p className="text-xl font-bold text-gray-900">{salesmen.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Leads Today</p>
              <p className="text-xl font-bold text-gray-900">{salesmen.reduce((sum, s) => sum + s.leadsToday, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Customers Today</p>
              <p className="text-xl font-bold text-gray-900">{salesmen.reduce((sum, s) => sum + s.customersToday, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasks Today</p>
              <p className="text-xl font-bold text-gray-900">{salesmen.reduce((sum, s) => sum + s.tasksToday, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sales Today</p>
              <p className="text-xl font-bold text-gray-900">${salesmen.reduce((sum, s) => sum + s.tasksSalesToday, 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Percent className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Commission Today</p>
              <p className="text-xl font-bold text-gray-900">${salesmen.reduce((sum, s) => sum + s.commissionToday, 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Salesmen List */}
      {salesmen.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Salesmen Found</h3>
          <p className="text-gray-500">Create employees with the "Salesman" role to see them here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesman</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Customers</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tasks</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales Today</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission Today</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Commission</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesmen.map((salesman) => (
                <tr key={salesman.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{salesman.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{salesman.name}</p>
                        <p className="text-sm text-gray-500">{salesman.phone || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">{salesman.commissionRate}%</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${salesman.leadsToday > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {salesman.leadsToday} today
                      </span>
                      <span className="text-xs text-gray-500 mt-1">{salesman.totalLeads} total</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${salesman.customersToday > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        {salesman.customersToday} today
                      </span>
                      <span className="text-xs text-gray-500 mt-1">{salesman.totalCustomers} total</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 rounded text-sm font-medium ${salesman.tasksToday > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                      {salesman.tasksToday}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-gray-900 font-medium">${salesman.tasksSalesToday.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-emerald-600 font-semibold">${salesman.commissionToday.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="text-orange-600 font-semibold">${salesman.totalCommission.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenVisitModal(salesman)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                        title="Assign Visit Task"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Visit</span>
                      </button>
                      <button
                        onClick={() => handleViewPerformance(salesman)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Visit Tasks Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Visit Tasks</h2>
              <span className="text-sm text-gray-500">({filteredVisitTasks.length} tasks)</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={visitDateFilter}
              onChange={(e) => setVisitDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={visitSalesmanFilter}
              onChange={(e) => setVisitSalesmanFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Salesmen</option>
              {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={visitStatusFilter}
              onChange={(e) => setVisitStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              onClick={() => { setVisitDateFilter(''); setVisitStatusFilter(''); setVisitSalesmanFilter('') }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Salesman</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVisitTasks.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No visit tasks found</td></tr>
              ) : filteredVisitTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{task.taskNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.salesmanName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.customerName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.scheduledDate.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisitStatusBadge(task.status)}`}>
                      {task.status === 'Completed' ? '✓ Visited' : task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{task.notes || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteVisitTask(task.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Modal */}
      {showPerformanceModal && selectedSalesman && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:rounded-none">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b print:hidden">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedSalesman.name} - Daily Performance</h2>
                <p className="text-gray-500">View leads and customers captured</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-lg" title="Print">
                  <Printer className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => setShowPerformanceModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block p-6 border-b">
              <h1 className="text-2xl font-bold">{selectedSalesman.name} - Daily Performance Report</h1>
              <p className="text-gray-600">Date: {performanceDate}</p>
            </div>

            {/* Date Selector */}
            <div className="p-4 bg-gray-50 border-b flex items-center gap-4 print:hidden">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={performanceDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 print:overflow-visible">
              {loadingPerformance ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : performanceData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Leads Today</p>
                      <p className="text-2xl font-bold text-green-700">{performanceData.leadsToday}</p>
                      <p className="text-xs text-green-500 mt-1">{performanceData.totalLeads} total</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600">Customers Today</p>
                      <p className="text-2xl font-bold text-purple-700">{performanceData.customersToday}</p>
                      <p className="text-xs text-purple-500 mt-1">{performanceData.totalCustomers} total</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-indigo-600">Tasks Today</p>
                      <p className="text-2xl font-bold text-indigo-700">{performanceData.tasksToday}</p>
                      <p className="text-xs text-indigo-500 mt-1">${performanceData.tasksSalesToday.toFixed(2)} sales</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600">Commission ({performanceData.commissionRate}%)</p>
                      <p className="text-2xl font-bold text-orange-700">${performanceData.commissionToday.toFixed(2)}</p>
                      <p className="text-xs text-orange-500 mt-1">${performanceData.totalCommission.toFixed(2)} total</p>
                    </div>
                  </div>

                  {/* Leads Table */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Leads Captured ({performanceData.leads.length})
                    </h3>
                    {performanceData.leads.length === 0 ? (
                      <p className="text-gray-500 py-4 text-center bg-gray-50 rounded-lg">No leads captured on this date</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {performanceData.leads.map((lead) => (
                              <tr key={lead.id}>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{lead.businessName}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{lead.contactName || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{lead.phone || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{lead.address || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{lead.status}</span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">{formatTime(lead.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Customers Table */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      Customers Created ({performanceData.customers.length})
                    </h3>
                    {performanceData.customers.length === 0 ? (
                      <p className="text-gray-500 py-4 text-center bg-gray-50 rounded-lg">No customers created on this date</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {performanceData.customers.map((customer) => (
                              <tr key={customer.id}>
                                <td className="px-4 py-2 text-sm font-medium text-blue-600">{customer.code || '-'}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{customer.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{customer.phone || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{customer.address || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{customer.customerType || 'Retail'}</span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">{formatTime(customer.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tasks Table */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                      Tasks Created ({performanceData.tasks.length})
                      {performanceData.tasks.length > 0 && (
                        <span className="text-sm font-normal text-gray-500">
                          - Commission: ${performanceData.commissionToday.toFixed(2)}
                        </span>
                      )}
                    </h3>
                    {performanceData.tasks.length === 0 ? (
                      <p className="text-gray-500 py-4 text-center bg-gray-50 rounded-lg">No tasks created on this date</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task #</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {performanceData.tasks.map((task) => {
                              const isCompleted = task.status === 'Completed' || task.status === 'Delivered'
                              const taskCommission = isCompleted ? task.total * (performanceData.commissionRate / 100) : 0
                              return (
                                <tr key={task.id}>
                                  <td className="px-4 py-2 text-sm font-medium text-indigo-600">{task.taskNumber}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{task.customerName || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">${task.total.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      isCompleted ? 'bg-green-100 text-green-700' : 
                                      task.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 
                                      'bg-gray-100 text-gray-700'
                                    }`}>{task.status}</span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-medium text-orange-600">
                                    {isCompleted ? `$${taskCommission.toFixed(2)}` : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">{formatTime(task.createdAt)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-2 text-sm font-medium text-gray-700">Total</td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                                ${performanceData.tasks.reduce((sum, t) => sum + t.total, 0).toFixed(2)}
                              </td>
                              <td></td>
                              <td className="px-4 py-2 text-sm text-right font-bold text-orange-600">
                                ${performanceData.commissionToday.toFixed(2)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Failed to load performance data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visit Task Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Assign Visit Task</h2>
              <button onClick={() => setShowVisitModal(false)} className="p-1 hover:bg-indigo-500 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              {/* Salesman Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salesman *</label>
                <select
                  value={visitForm.salesmanId}
                  onChange={(e) => setVisitForm({...visitForm, salesmanId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select salesman</option>
                  {salesmen.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {loadingCustomers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredCustomers.length === 0 ? (
                      <p className="p-3 text-gray-500 text-center text-sm">No customers found</p>
                    ) : (
                      filteredCustomers.slice(0, 50).map(c => (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${visitForm.customerId === c.id.toString() ? 'bg-indigo-50' : ''}`}
                        >
                          <input
                            type="radio"
                            name="customer"
                            value={c.id}
                            checked={visitForm.customerId === c.id.toString()}
                            onChange={(e) => setVisitForm({...visitForm, customerId: e.target.value})}
                            className="text-indigo-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={visitForm.scheduledDate}
                  onChange={(e) => setVisitForm({...visitForm, scheduledDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({...visitForm, notes: e.target.value})}
                  placeholder="Optional notes for this visit..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVisit || !visitForm.salesmanId || !visitForm.customerId}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {savingVisit ? 'Creating...' : 'Create Visit Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
