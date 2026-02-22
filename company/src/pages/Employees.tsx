import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Star, X, Loader2, UserX, UserCheck, FileText, Printer, Check, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Eye, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { employeesApi, rolesApi, employeePaymentsApi, customersApi, productsApi } from '../lib/api'
import api from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface Employee {
  id: number
  name: string
  username: string
  phone: string | null
  role: string
  salaryType: string
  basePay: number
  hourlyRate: number
  commissionRate: number
  commissionBase: string | null
  minimumGuarantee: number
  expectedHoursPerWeek: number
  warehouse: string | null
  warehouseId: number | null
  managedWarehouses: string | null
  van: string | null
  vanId: number | null
  rating: number
  address: string | null
  useDefaultPermissions: boolean
  canAccessReports: boolean
  canApproveDeposits: boolean
  canEditPrices: boolean
  canEditCreditLimit: boolean
  status: string
}

interface Warehouse { id: number; name: string }
interface Van { id: number; name: string }
interface Role { id: number; name: string }

interface EmployeeOrder {
  id: number; orderNumber: string; orderDate: string
  totalAmount: number; paidAmount: number; paymentStatus: string
}

interface EmployeeTask {
  id: number; taskNumber: string; scheduledDate: string
  total: number; paidAmount: number; debtAmount: number; status: string
}

interface EmployeeCollection {
  id: number; collectionNumber: string; collectionDate: string
  amount: number; paymentType: string
}

interface EmployeeDeposit {
  id: number; depositDate: string; amount: number; status: string
}

interface EmployeeAttendance {
  id: number; date: string; checkIn: string | null; checkOut: string | null
  status: string; notes: string | null; overtimeHours: number; workedHours: number
}

interface EmployeeAttendanceSummary {
  totalDays: number; presentDays: number; absentDays: number
  lateDays: number; halfDays: number; leaveDays: number
  totalWorkedHours: number; totalOvertimeHours: number
}

interface VisitAnalysis {
  salesmanId: number
  salesmanName: string
  startDate: string
  endDate: string
  totalCustomersVisited: number
  totalVisits: number
  totalAssignedVisits: number
  totalCreatedVisits: number
  totalCompletedVisits: number
  totalSales: number
  customerVisits: CustomerVisitSummary[]
}

interface CustomerVisitSummary {
  customerId: number
  customerName: string
  customerPhone: string | null
  customerAddress: string | null
  totalVisits: number
  assignedVisits: number
  createdVisits: number
  completedVisits: number
  totalSales: number
  lastVisitDate: string
  visits: VisitDetail[]
}

interface VisitDetail {
  taskId: number
  taskNumber: string
  taskType: string
  status: string
  total: number
  scheduledDate: string
  createdAt: string
  isAssigned: boolean
  isCreatedBySalesman: boolean
}

interface EmployeeReportOptions {
  showSummary: boolean
  showOrders: boolean
  showTasks: boolean
  showCollections: boolean
  showDeposits: boolean
  showAttendance: boolean
  showSalaryPayments: boolean
}

interface EmployeePayment {
  id: number
  employeeId: number
  employeeName: string
  paymentType: string
  amount: number
  paymentDate: string
  periodStart?: string
  periodEnd?: string
  notes?: string
  createdBy?: string
  createdAt: string
}

interface EmployeeSalarySummary {
  employeeId: number
  employeeName: string
  salaryType: string
  salary: number
  commissionRate: number
  commissionBase: string | null
  commissionEarnedThisMonth: number
  totalPaidThisMonth: number
  totalPaidThisYear: number
  totalPaidAllTime: number
  // Daily employee attendance data
  presentDaysThisMonth: number
  halfDaysThisMonth: number
  dailyRate: number
  dailyEarnedThisMonth: number
  payments: EmployeePayment[]
}

const paymentTypeLabels: Record<string, string> = {
  'salary': 'Salary',
  'advance': 'Advance',
  'withdrawal': 'Withdrawal',
  'bonus': 'Bonus',
  'commission': 'Commission',
  'deduction': 'Deduction'
}

const salaryTypeLabels: Record<string, string> = {
  'monthly': 'Monthly',
  'daily': 'Daily',
  'hourly': 'Hourly',
  'commission': 'Commission',
  'monthly_commission': 'Monthly + Commission'
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [vans, setVans] = useState<Van[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  
  const [selectedType, setSelectedType] = useState('')
  const [formRole, setFormRole] = useState('Driver')
  const [formSalaryType, setFormSalaryType] = useState('monthly')
  
  const [formData, setFormData] = useState({
    name: '', username: '', password: '', phone: '',
    basePay: 0, hourlyRate: 0, commissionRate: 0,
    commissionBase: 'sales', minimumGuarantee: 0, expectedHoursPerWeek: 40,
    warehouseId: '' as string, vanId: '' as string, address: '',
    useDefaultPermissions: true, canAccessReports: false,
    canApproveDeposits: false, canEditPrices: false, canEditCreditLimit: false,
  })
  
  const [ratingValue, setRatingValue] = useState(5)

  // Report State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportEmployee, setReportEmployee] = useState<Employee | null>(null)
  const [reportOrders, setReportOrders] = useState<EmployeeOrder[]>([])
  const [reportTasks, setReportTasks] = useState<EmployeeTask[]>([])
  const [reportCollections, setReportCollections] = useState<EmployeeCollection[]>([])
  const [reportDeposits, setReportDeposits] = useState<EmployeeDeposit[]>([])
  const [reportAttendances, setReportAttendances] = useState<EmployeeAttendance[]>([])
  const [reportAttendanceSummary, setReportAttendanceSummary] = useState<EmployeeAttendanceSummary | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportOptions, setReportOptions] = useState<EmployeeReportOptions>({
    showSummary: true,
    showOrders: true,
    showTasks: true,
    showCollections: true,
    showDeposits: true,
    showAttendance: true,
    showSalaryPayments: true
  })
  const [reportSalaryPayments, setReportSalaryPayments] = useState<EmployeePayment[]>([])

  // Salary Management State
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null)
  const [salarySummary, setSalarySummary] = useState<EmployeeSalarySummary | null>(null)
  const [loadingSalary, setLoadingSalary] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentFilterMonth, setPaymentFilterMonth] = useState(new Date().getMonth() + 1)
  const [paymentFilterYear, setPaymentFilterYear] = useState(new Date().getFullYear())
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'salary',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // Visit Analysis State
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [analysisEmployee, setAnalysisEmployee] = useState<Employee | null>(null)
  const [visitAnalysis, setVisitAnalysis] = useState<VisitAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisStartDate, setAnalysisStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
  })
  const [analysisEndDate, setAnalysisEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expandedCustomers, setExpandedCustomers] = useState<number[]>([])

  // Visibility Control State
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [visibilityEmployee, setVisibilityEmployee] = useState<Employee | null>(null)
  const [visibilitySettings, setVisibilitySettings] = useState({ restrictCustomers: false, restrictProducts: false })
  const [allCustomers, setAllCustomers] = useState<{id: number; name: string}[]>([])
  const [allProducts, setAllProducts] = useState<{id: number; name: string}[]>([])
  const [assignedCustomerIds, setAssignedCustomerIds] = useState<number[]>([])
  const [assignedProductIds, setAssignedProductIds] = useState<number[]>([])
  const [loadingVisibility, setLoadingVisibility] = useState(false)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [visibilityTab, setVisibilityTab] = useState<'customers' | 'products'>('customers')
  const [visibilitySearch, setVisibilitySearch] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [empRes, whRes, vanRes, rolesRes] = await Promise.all([
        employeesApi.getAll(),
        employeesApi.getWarehouses(),
        employeesApi.getVans(),
        rolesApi.getAll()
      ])
      setEmployees(empRes.data)
      setWarehouses(whRes.data)
      setVans(vanRes.data)
      setRoles(rolesRes.data)
      if (rolesRes.data.length > 0 && !selectedType) {
        setSelectedType(rolesRes.data[0].name)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '', username: '', password: '', phone: '',
      basePay: 0, hourlyRate: 0, commissionRate: 0,
      commissionBase: 'sales', minimumGuarantee: 0, expectedHoursPerWeek: 40,
      warehouseId: '', vanId: '', address: '',
      useDefaultPermissions: true, canAccessReports: false,
      canApproveDeposits: false, canEditPrices: false, canEditCreditLimit: false,
    })
    setFormRole('Driver')
    setFormSalaryType('monthly')
  }

  const handleTypeSelect = () => {
    setShowTypeModal(false)
    resetForm()
    setFormRole(selectedType)
    setShowAddModal(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await employeesApi.create({
        ...formData,
        role: formRole,
        salaryType: formSalaryType,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
        vanId: formData.vanId ? parseInt(formData.vanId) : null,
      })
      setShowAddModal(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp)
    setFormRole(emp.role)
    setFormSalaryType(emp.salaryType)
    setFormData({
      name: emp.name, username: emp.username, password: '', phone: emp.phone || '',
      basePay: emp.basePay, hourlyRate: emp.hourlyRate, commissionRate: emp.commissionRate,
      commissionBase: emp.commissionBase || 'sales', minimumGuarantee: emp.minimumGuarantee,
      expectedHoursPerWeek: emp.expectedHoursPerWeek,
      warehouseId: emp.warehouseId?.toString() || '', vanId: emp.vanId?.toString() || '',
      address: emp.address || '', useDefaultPermissions: emp.useDefaultPermissions,
      canAccessReports: emp.canAccessReports, canApproveDeposits: emp.canApproveDeposits,
      canEditPrices: emp.canEditPrices, canEditCreditLimit: emp.canEditCreditLimit,
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return
    setSaving(true)
    try {
      await employeesApi.update(selectedEmployee.id, {
        ...formData,
        role: formRole,
        salaryType: formSalaryType,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
        vanId: formData.vanId ? parseInt(formData.vanId) : null,
      })
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return
    try {
      await employeesApi.delete(id)
      loadData()
    } catch (error) {
      alert('Failed to delete employee')
    }
  }

  const handleRating = (emp: Employee) => {
    setSelectedEmployee(emp)
    setRatingValue(emp.rating)
    setShowRatingModal(true)
  }

  const handleRatingSubmit = async () => {
    if (!selectedEmployee) return
    try {
      await employeesApi.updateRating(selectedEmployee.id, ratingValue)
      setShowRatingModal(false)
      loadData()
    } catch (error) {
      alert('Failed to update rating')
    }
  }

  const handleToggleStatus = async (emp: Employee) => {
    const action = emp.status === 'active' ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} ${emp.name}?`)) return
    try {
      await employeesApi.toggleStatus(emp.id)
      loadData()
    } catch (error) {
      alert(`Failed to ${action} employee`)
    }
  }

  const isRoleDependent = (roles: string[]) => roles.includes(formRole.toLowerCase())

  // Salary Management Functions
  const handleOpenSalary = async (employee: Employee) => {
    setSalaryEmployee(employee)
    setShowSalaryModal(true)
    setLoadingSalary(true)
    setPaymentForm({
      paymentType: 'salary',
      amount: employee.basePay,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    })
    
    try {
      const summary = await employeePaymentsApi.getByEmployee(employee.id)
      setSalarySummary(summary)
    } catch (error) {
      console.error('Failed to load salary data:', error)
      setSalarySummary(null)
    } finally {
      setLoadingSalary(false)
    }
  }

  const handleCreatePayment = async () => {
    if (!salaryEmployee || paymentForm.amount <= 0) return
    setSavingPayment(true)
    
    try {
      await employeePaymentsApi.create({
        employeeId: salaryEmployee.id,
        paymentType: paymentForm.paymentType,
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes || null
      })
      
      // Reload salary data
      const summary = await employeePaymentsApi.getByEmployee(salaryEmployee.id)
      setSalarySummary(summary)
      
      // Reset form
      setPaymentForm({
        paymentType: 'salary',
        amount: salaryEmployee.basePay,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (error: any) {
      const errMsg = error.response?.data?.details || error.response?.data?.error || error.response?.data?.message || 'Failed to create payment'
      alert(`Error: ${errMsg}`)
      console.error('Payment error:', error.response?.data)
    } finally {
      setSavingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return
    
    try {
      await employeePaymentsApi.delete(paymentId)
      if (salaryEmployee) {
        const summary = await employeePaymentsApi.getByEmployee(salaryEmployee.id)
        setSalarySummary(summary)
      }
    } catch (error) {
      alert('Failed to delete payment')
    }
  }

  // Visit Analysis Functions
  const handleOpenAnalysis = async (employee: Employee) => {
    setAnalysisEmployee(employee)
    setShowAnalysisModal(true)
    setExpandedCustomers([])
    loadVisitAnalysis(employee.id)
  }

  const loadVisitAnalysis = async (employeeId: number) => {
    setLoadingAnalysis(true)
    try {
      const res = await employeesApi.getVisitAnalysis(employeeId, analysisStartDate, analysisEndDate)
      setVisitAnalysis(res.data)
    } catch (error) {
      console.error('Failed to load visit analysis:', error)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const toggleCustomerExpand = (customerId: number) => {
    setExpandedCustomers(prev => 
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    )
  }

  // Visibility Control Functions
  const handleOpenVisibility = async (employee: Employee) => {
    setVisibilityEmployee(employee)
    setShowVisibilityModal(true)
    setLoadingVisibility(true)
    setVisibilitySearch('')
    
    try {
      const [visibilityRes, customersRes, productsRes] = await Promise.all([
        employeesApi.getVisibility(employee.id),
        customersApi.getAll(),
        productsApi.getAll()
      ])
      
      setVisibilitySettings({
        restrictCustomers: visibilityRes.data.restrictCustomers,
        restrictProducts: visibilityRes.data.restrictProducts
      })
      setAssignedCustomerIds(visibilityRes.data.assignedCustomerIds || [])
      setAssignedProductIds(visibilityRes.data.assignedProductIds || [])
      setAllCustomers(customersRes.data.map((c: any) => ({ id: c.id, name: c.name })))
      setAllProducts(productsRes.data.map((p: any) => ({ id: p.id, name: p.name })))
    } catch (error) {
      console.error('Failed to load visibility data:', error)
      alert('Failed to load visibility settings')
    } finally {
      setLoadingVisibility(false)
    }
  }

  const handleSaveVisibility = async () => {
    if (!visibilityEmployee) return
    setSavingVisibility(true)
    
    try {
      await Promise.all([
        employeesApi.updateVisibilitySettings(visibilityEmployee.id, visibilitySettings),
        employeesApi.assignCustomers(visibilityEmployee.id, assignedCustomerIds),
        employeesApi.assignProducts(visibilityEmployee.id, assignedProductIds)
      ])
      alert('Visibility settings saved successfully!')
      setShowVisibilityModal(false)
    } catch (error) {
      console.error('Failed to save visibility:', error)
      alert('Failed to save visibility settings')
    } finally {
      setSavingVisibility(false)
    }
  }

  const toggleCustomerAssignment = (customerId: number) => {
    setAssignedCustomerIds(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const toggleProductAssignment = (productId: number) => {
    setAssignedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const calculateMonthlyBalance = () => {
    if (!salaryEmployee || !salarySummary) return { owed: 0, paid: 0, balance: 0, commission: 0, bonus: 0, totalOwed: 0, advances: 0, deductions: 0, dailyEarned: 0, presentDays: 0, halfDays: 0 }
    
    // For daily employees, use dailyEarnedThisMonth instead of fixed salary
    const isDaily = salaryEmployee.salaryType === 'daily'
    const baseSalary = isDaily ? (salarySummary.dailyEarnedThisMonth || 0) : salaryEmployee.basePay
    const commission = salarySummary.commissionEarnedThisMonth || 0
    
    // Salary payments
    const salaryPayments = salarySummary.payments
      .filter(p => p.paymentType === 'salary')
      .reduce((sum, p) => sum + p.amount, 0)
    
    // Advances count as money already given (reduce balance)
    const advances = salarySummary.payments
      .filter(p => p.paymentType === 'advance')
      .reduce((sum, p) => sum + p.amount, 0)
    
    // Bonus adds to what's owed (like commission)
    const bonus = salarySummary.payments
      .filter(p => p.paymentType === 'bonus')
      .reduce((sum, p) => sum + p.amount, 0)
    
    // Deductions reduce what's owed to employee
    const deductions = salarySummary.payments
      .filter(p => p.paymentType === 'deduction')
      .reduce((sum, p) => sum + p.amount, 0)
    
    // Total owed = base + commission + bonus - deductions
    const totalOwed = baseSalary + commission + bonus - deductions
    
    // Total paid = salary + advances
    const totalPaid = salaryPayments + advances
    
    return { 
      owed: baseSalary, 
      paid: totalPaid, 
      balance: totalOwed - totalPaid, 
      commission, 
      bonus, 
      totalOwed, 
      advances, 
      deductions,
      dailyEarned: salarySummary.dailyEarnedThisMonth || 0,
      presentDays: salarySummary.presentDaysThisMonth || 0,
      halfDays: salarySummary.halfDaysThisMonth || 0
    }
  }

  // Report Functions
  const handleOpenReport = async (employee: Employee) => {
    setReportEmployee(employee)
    setShowReportModal(true)
    setLoadingReport(true)
    
    try {
      const [ordersRes, tasksRes, collectionsRes, depositsRes, attendanceRes, salaryRes] = await Promise.all([
        api.get(`/orders?driverId=${employee.id}`),
        api.get(`/tasks?driverId=${employee.id}`),
        api.get(`/cash/collections?driverId=${employee.id}`),
        api.get(`/cash/deposits?driverId=${employee.id}`),
        api.get(`/attendance/employee/${employee.id}`),
        employeePaymentsApi.getByEmployee(employee.id).catch(() => ({ payments: [] }))
      ])
      
      setReportOrders(ordersRes.data.map((o: any) => ({
        id: o.id, orderNumber: o.orderNumber, orderDate: o.orderDate,
        totalAmount: o.totalAmount, paidAmount: o.paidAmount, paymentStatus: o.paymentStatus
      })))
      
      setReportTasks(tasksRes.data.map((t: any) => ({
        id: t.id, taskNumber: t.taskNumber, scheduledDate: t.scheduledDate,
        total: t.total, paidAmount: t.paidAmount || 0, debtAmount: t.debtAmount || 0, status: t.status
      })))
      
      setReportCollections(collectionsRes.data.map((c: any) => ({
        id: c.id, collectionNumber: c.collectionNumber, collectionDate: c.collectionDate,
        amount: c.amount, paymentType: c.paymentType
      })))
      
      setReportDeposits(depositsRes.data.map((d: any) => ({
        id: d.id, depositDate: d.depositDate || d.createdAt, amount: d.amount, status: d.status || 'pending'
      })))
      
      setReportAttendances(attendanceRes.data.attendances || [])
      setReportAttendanceSummary(attendanceRes.data.summary || null)
      setReportSalaryPayments(salaryRes.payments || [])
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoadingReport(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

  const generateEmployeeReport = () => {
    if (!reportEmployee) return
    
    const totalOrders = reportOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalTasks = reportTasks.reduce((sum, t) => sum + t.total, 0)
    const totalSales = totalOrders + totalTasks
    const totalCollected = reportOrders.reduce((sum, o) => sum + o.paidAmount, 0) + 
                          reportTasks.reduce((sum, t) => sum + t.paidAmount, 0)
    const totalCollections = reportCollections.reduce((sum, c) => sum + c.amount, 0)
    const totalDeposits = reportDeposits.reduce((sum, d) => sum + d.amount, 0)
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Report - ${reportEmployee.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .employee-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .employee-info h2 { font-size: 18px; margin-bottom: 10px; }
          .employee-info .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .employee-info .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .employee-info .value { font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .summary-card .value.blue { color: #3b82f6; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .status-completed { color: #22c55e; }
          .status-pending { color: #f59e0b; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Employee Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="employee-info">
          <h2>${reportEmployee.name}</h2>
          <div class="grid">
            <div class="item">
              <div class="label">Username</div>
              <div class="value">${reportEmployee.username}</div>
            </div>
            <div class="item">
              <div class="label">Phone</div>
              <div class="value">${reportEmployee.phone || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Role</div>
              <div class="value">${reportEmployee.role}</div>
            </div>
            <div class="item">
              <div class="label">Salary Type</div>
              <div class="value">${salaryTypeLabels[reportEmployee.salaryType] || reportEmployee.salaryType}</div>
            </div>
            <div class="item">
              <div class="label">Base Pay</div>
              <div class="value">${formatCurrency(reportEmployee.basePay)}</div>
            </div>
            <div class="item">
              <div class="label">Commission</div>
              <div class="value">${reportEmployee.commissionRate > 0 ? reportEmployee.commissionRate + '%' : '-'}</div>
            </div>
            <div class="item">
              <div class="label">Rating</div>
              <div class="value">${reportEmployee.rating}/10</div>
            </div>
            <div class="item">
              <div class="label">Warehouse</div>
              <div class="value">${reportEmployee.warehouse || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Van</div>
              <div class="value">${reportEmployee.van || '-'}</div>
            </div>
          </div>
        </div>
        
        ${reportOptions.showSummary ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Sales</div>
            <div class="value blue">${formatCurrency(totalSales)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Cash Collected</div>
            <div class="value green">${formatCurrency(totalCollected)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Debt Collections</div>
            <div class="value">${formatCurrency(totalCollections)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Deposits</div>
            <div class="value red">${formatCurrency(totalDeposits)}</div>
          </div>
        </div>
        ` : ''}
        
        ${reportOptions.showOrders && reportOrders.length > 0 ? `
        <div class="section">
          <h2>POS Orders (${reportOrders.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportOrders.map(o => `
                <tr>
                  <td>${o.orderNumber}</td>
                  <td>${formatDate(o.orderDate)}</td>
                  <td class="text-right">${formatCurrency(o.totalAmount)}</td>
                  <td class="text-right">${formatCurrency(o.paidAmount)}</td>
                  <td class="text-center">${o.paymentStatus}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalOrders)}</th>
                <th class="text-right">${formatCurrency(reportOrders.reduce((s, o) => s + o.paidAmount, 0))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showTasks && reportTasks.length > 0 ? `
        <div class="section">
          <h2>Completed Tasks (${reportTasks.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Task #</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Debt</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportTasks.map(t => `
                <tr>
                  <td>${t.taskNumber}</td>
                  <td>${formatDate(t.scheduledDate)}</td>
                  <td class="text-right">${formatCurrency(t.total)}</td>
                  <td class="text-right">${formatCurrency(t.paidAmount)}</td>
                  <td class="text-right">${t.debtAmount > 0 ? formatCurrency(t.debtAmount) : '-'}</td>
                  <td class="text-center">${t.status}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalTasks)}</th>
                <th class="text-right">${formatCurrency(reportTasks.reduce((s, t) => s + t.paidAmount, 0))}</th>
                <th class="text-right">${formatCurrency(reportTasks.reduce((s, t) => s + t.debtAmount, 0))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showCollections && reportCollections.length > 0 ? `
        <div class="section">
          <h2>Debt Collections (${reportCollections.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Collection #</th>
                <th>Date</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Payment Type</th>
              </tr>
            </thead>
            <tbody>
              ${reportCollections.map(c => `
                <tr>
                  <td>${c.collectionNumber}</td>
                  <td>${formatDate(c.collectionDate)}</td>
                  <td class="text-right">${formatCurrency(c.amount)}</td>
                  <td class="text-center">${c.paymentType}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total</th>
                <th class="text-right">${formatCurrency(totalCollections)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showDeposits && reportDeposits.length > 0 ? `
        <div class="section">
          <h2>Deposits (${reportDeposits.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportDeposits.map(d => `
                <tr>
                  <td>${formatDate(d.depositDate)}</td>
                  <td class="text-right">${formatCurrency(d.amount)}</td>
                  <td class="text-center">${d.status}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th class="text-right">${formatCurrency(totalDeposits)}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showAttendance && reportAttendanceSummary ? `
        <div class="section">
          <h2>Attendance Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Present Days</div>
              <div class="value green">${reportAttendanceSummary.presentDays}</div>
            </div>
            <div class="summary-card">
              <div class="label">Absent Days</div>
              <div class="value red">${reportAttendanceSummary.absentDays}</div>
            </div>
            <div class="summary-card">
              <div class="label">Late Days</div>
              <div class="value" style="color: #eab308;">${reportAttendanceSummary.lateDays}</div>
            </div>
            <div class="summary-card">
              <div class="label">Leave Days</div>
              <div class="value blue">${reportAttendanceSummary.leaveDays}</div>
            </div>
          </div>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Days</div>
              <div class="value">${reportAttendanceSummary.totalDays}</div>
            </div>
            <div class="summary-card">
              <div class="label">Half Days</div>
              <div class="value" style="color: #f97316;">${reportAttendanceSummary.halfDays}</div>
            </div>
            <div class="summary-card">
              <div class="label">Hours Worked</div>
              <div class="value">${reportAttendanceSummary.totalWorkedHours.toFixed(1)}h</div>
            </div>
            <div class="summary-card">
              <div class="label">Overtime Hours</div>
              <div class="value">${reportAttendanceSummary.totalOvertimeHours.toFixed(1)}h</div>
            </div>
          </div>
          ${reportAttendances.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-center">Status</th>
                <th class="text-center">Check In</th>
                <th class="text-center">Check Out</th>
                <th class="text-center">Hours</th>
              </tr>
            </thead>
            <tbody>
              ${reportAttendances.slice(0, 20).map(a => `
                <tr>
                  <td>${formatDate(a.date)}</td>
                  <td class="text-center">${a.status}</td>
                  <td class="text-center">${a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td class="text-center">${a.checkOut ? new Date(a.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td class="text-center">${a.workedHours > 0 ? a.workedHours + 'h' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${reportAttendances.length > 20 ? `<p style="text-align: center; color: #666; margin-top: 10px;">Showing 20 of ${reportAttendances.length} records</p>` : ''}
          ` : ''}
        </div>
        ` : ''}
        
        ${reportOptions.showSalaryPayments && reportSalaryPayments.length > 0 ? `
        <div class="section">
          <h2>Salary Payments (${reportSalaryPayments.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th class="text-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportSalaryPayments.map(p => `
                <tr>
                  <td>${formatDate(p.paymentDate)}</td>
                  <td>${paymentTypeLabels[p.paymentType] || p.paymentType}</td>
                  <td class="text-right">${formatCurrency(p.amount)}</td>
                  <td>${p.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total Salary Paid</th>
                <th class="text-right">${formatCurrency(reportSalaryPayments.reduce((sum, p) => sum + p.amount, 0))}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Employee Report - Confidential</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(reportHTML)
    printWindow.document.close()
    
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <PermissionGate permission={PERMISSIONS.CREATE_EMPLOYEES}>
          <button onClick={() => setShowTypeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
            <Plus size={20} /> Add Employee
          </button>
        </PermissionGate>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Salary Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Base Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Van</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-500">No employees found</td></tr>
            ) : employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3 text-gray-500">{emp.username}</td>
                <td className="px-4 py-3">{emp.phone || '-'}</td>
                <td className="px-4 py-3">{emp.role}</td>
                <td className="px-4 py-3">{salaryTypeLabels[emp.salaryType] || emp.salaryType}</td>
                <td className="px-4 py-3 font-medium">${emp.basePay.toLocaleString()}</td>
                <td className="px-4 py-3">{emp.commissionRate > 0 ? `${emp.commissionRate}%` : '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs">{emp.rating}</span>
                </td>
                <td className="px-4 py-3">{emp.address || '-'}</td>
                <td className="px-4 py-3">{emp.managedWarehouses || emp.warehouse || '-'}</td>
                <td className="px-4 py-3">{emp.van || 'None'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <PermissionGate permission={PERMISSIONS.MANAGE_EMPLOYEE_PAYMENTS}>
                      <button onClick={() => handleOpenSalary(emp)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Salary & Payments"><DollarSign size={16} /></button>
                    </PermissionGate>
                    {emp.role === 'Salesman' && (
                      <button onClick={() => handleOpenAnalysis(emp)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Visit Analysis"><BarChart3 size={16} /></button>
                    )}
                    <PermissionGate permission={PERMISSIONS.EDIT_EMPLOYEES}>
                      <button onClick={() => handleOpenVisibility(emp)} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Visibility Control"><Eye size={16} /></button>
                      <button onClick={() => handleRating(emp)} className="p-1 text-cyan-600 hover:bg-cyan-50 rounded" title="Set Rating"><Star size={16} /></button>
                      <button 
                        onClick={() => handleToggleStatus(emp)} 
                        className={`p-1 rounded ${emp.status === 'active' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} 
                        title={emp.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {emp.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button onClick={() => handleEdit(emp)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    </PermissionGate>
                    <button onClick={() => handleOpenReport(emp)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Print Report"><FileText size={16} /></button>
                    <PermissionGate permission={PERMISSIONS.DELETE_EMPLOYEES}>
                      <button onClick={() => handleDelete(emp.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Select Employee Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Select Employee Type</h2>
              <button onClick={() => setShowTypeModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowTypeModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleTypeSelect} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Continue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{showEditModal ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false) }}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={showEditModal ? handleEditSubmit : handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter username" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password {showEditModal ? '' : '*'}</label>
                    <input type="password" required={!showEditModal} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder={showEditModal ? 'Leave blank to keep' : 'Enter password'} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter phone" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  {isRoleDependent(['driver', 'supervisor', 'manager']) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Warehouse</label>
                      <select value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">None</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {isRoleDependent(['driver']) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Van</label>
                      <select value={formData.vanId} onChange={(e) => setFormData({...formData, vanId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">None</option>
                        {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                    <select value={formSalaryType} onChange={(e) => setFormSalaryType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily (Per Attendance)</option>
                      <option value="hourly">Hourly</option>
                      <option value="commission">Commission</option>
                      <option value="monthly_commission">Monthly + Commission</option>
                    </select>
                  </div>
                  {(formSalaryType === 'monthly' || formSalaryType === 'monthly_commission') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Pay / Monthly Salary</label>
                      <input type="number" value={formData.basePay} onChange={(e) => setFormData({...formData, basePay: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter amount" />
                    </div>
                  )}
                  {formSalaryType === 'daily' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (per day attended)</label>
                      <input type="number" value={formData.basePay} onChange={(e) => setFormData({...formData, basePay: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter daily rate" />
                    </div>
                  )}
                  {formSalaryType === 'hourly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                      <input type="number" value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter rate" />
                    </div>
                  )}
                </div>

                {formSalaryType.includes('commission') && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                      <input type="number" value={formData.commissionRate} onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter rate" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commission Base</label>
                      <select value={formData.commissionBase} onChange={(e) => setFormData({...formData, commissionBase: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="sales">Sales</option>
                        <option value="collections">Collections</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                )}

                {formSalaryType === 'hourly' && isRoleDependent(['driver', 'supervisor', 'manager']) && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Hours/Week</label>
                      <input type="number" value={formData.expectedHoursPerWeek} onChange={(e) => setFormData({...formData, expectedHoursPerWeek: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter hours" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter address" />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.useDefaultPermissions} onChange={(e) => setFormData({...formData, useDefaultPermissions: e.target.checked})} className="rounded" />
                    <span className="text-sm">Use default role permissions</span>
                  </label>
                  {!formData.useDefaultPermissions && (
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.canAccessReports} onChange={(e) => setFormData({...formData, canAccessReports: e.target.checked})} className="rounded" /> Can access reports
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.canApproveDeposits} onChange={(e) => setFormData({...formData, canApproveDeposits: e.target.checked})} className="rounded" /> Can approve deposits
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.canEditPrices} onChange={(e) => setFormData({...formData, canEditPrices: e.target.checked})} className="rounded" /> Can edit prices
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.canEditCreditLimit} onChange={(e) => setFormData({...formData, canEditCreditLimit: e.target.checked})} className="rounded" /> Can edit credit limit
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Saving...' : (showEditModal ? 'Save Changes' : 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Set Performance Rating</h2>
              <button onClick={() => setShowRatingModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">Employee: {selectedEmployee?.name}</p>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select value={ratingValue} onChange={(e) => setRatingValue(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowRatingModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleRatingSubmit} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Report Modal */}
      {showReportModal && reportEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-bold">Employee Report</h2>
                    <p className="text-sm text-gray-500">{reportEmployee.name} - {reportEmployee.role}</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {loadingReport ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="ml-2">Loading report data...</span>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Orders:</span>
                        <span className="ml-2 font-medium">{reportOrders.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tasks:</span>
                        <span className="ml-2 font-medium">{reportTasks.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Collections:</span>
                        <span className="ml-2 font-medium">{reportCollections.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Deposits:</span>
                        <span className="ml-2 font-medium">{reportDeposits.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Report Options */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Include in Report:</h3>
                    
                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showSummary}
                        onChange={(e) => setReportOptions({...reportOptions, showSummary: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Summary</p>
                        <p className="text-sm text-gray-500">Total sales, collections, deposits</p>
                      </div>
                      {reportOptions.showSummary && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showOrders}
                        onChange={(e) => setReportOptions({...reportOptions, showOrders: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">POS Orders ({reportOrders.length})</p>
                        <p className="text-sm text-gray-500">All POS sales by this employee</p>
                      </div>
                      {reportOptions.showOrders && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showTasks}
                        onChange={(e) => setReportOptions({...reportOptions, showTasks: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Completed Tasks ({reportTasks.length})</p>
                        <p className="text-sm text-gray-500">All delivery tasks completed</p>
                      </div>
                      {reportOptions.showTasks && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showCollections}
                        onChange={(e) => setReportOptions({...reportOptions, showCollections: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Debt Collections ({reportCollections.length})</p>
                        <p className="text-sm text-gray-500">All debt collections made</p>
                      </div>
                      {reportOptions.showCollections && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showDeposits}
                        onChange={(e) => setReportOptions({...reportOptions, showDeposits: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Deposits ({reportDeposits.length})</p>
                        <p className="text-sm text-gray-500">All cash deposits made</p>
                      </div>
                      {reportOptions.showDeposits && <Check size={18} className="text-emerald-600" />}
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showAttendance}
                        onChange={(e) => setReportOptions({...reportOptions, showAttendance: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Attendance ({reportAttendances.length})</p>
                        <p className="text-sm text-gray-500">Attendance records and summary</p>
                      </div>
                      {reportOptions.showAttendance && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 mt-3">
                      <input
                        type="checkbox"
                        checked={reportOptions.showSalaryPayments}
                        onChange={(e) => setReportOptions({...reportOptions, showSalaryPayments: e.target.checked})}
                        className="w-5 h-5 text-purple-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Salary Payments ({reportSalaryPayments.length})</p>
                        <p className="text-sm text-gray-500">All salary, advances, and withdrawals</p>
                      </div>
                      {reportOptions.showSalaryPayments && <Check size={18} className="text-purple-600" />}
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateEmployeeReport()
                  setShowReportModal(false)
                }}
                disabled={loadingReport}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Management Modal */}
      {showSalaryModal && salaryEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
              <div>
                <h2 className="text-lg font-semibold">Salary & Payments</h2>
                <p className="text-sm text-purple-200">{salaryEmployee.name} - {salaryTypeLabels[salaryEmployee.salaryType]}</p>
              </div>
              <button onClick={() => setShowSalaryModal(false)}><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingSalary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : (
                <>
                  {/* Balance Summary */}
                  {(() => {
                    const balance = calculateMonthlyBalance()
                    const isOverdraw = balance.balance < 0
                    const isDaily = salaryEmployee.salaryType === 'daily'
                    return (
                      <div className="space-y-4 mb-6">
                        {/* Daily Employee Attendance Breakdown */}
                        {isDaily && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                            <p className="text-sm font-medium text-amber-800 mb-2">📅 Attendance This Month</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-gray-700">Daily Rate: <strong>${salaryEmployee.basePay}</strong></span>
                              <span className="text-green-700">Present: <strong>{balance.presentDays} days</strong></span>
                              <span className="text-orange-700">Half Days: <strong>{balance.halfDays}</strong></span>
                              <span className="text-blue-700">Earned: <strong>${balance.dailyEarned.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-600">{isDaily ? 'Earned (Attendance)' : 'Base Salary'}</p>
                            <p className="text-xl font-bold text-blue-600">${balance.owed.toLocaleString()}</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-600">Commission</p>
                            <p className="text-xl font-bold text-purple-600">${balance.commission.toLocaleString()}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-600">Paid</p>
                            <p className="text-xl font-bold text-green-600">${balance.paid.toLocaleString()}</p>
                          </div>
                          <div className={`p-4 rounded-lg text-center ${isOverdraw ? 'bg-red-50' : balance.balance === 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                            <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                              Balance
                              {isOverdraw && <AlertTriangle size={14} className="text-red-500" />}
                            </p>
                            <p className={`text-xl font-bold ${isOverdraw ? 'text-red-600' : balance.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {isOverdraw ? (
                                <span className="flex items-center justify-center gap-1">
                                  <TrendingDown size={18} />
                                  -${Math.abs(balance.balance).toLocaleString()}
                                </span>
                              ) : balance.balance > 0 ? (
                                <span className="flex items-center justify-center gap-1">
                                  <TrendingUp size={18} />
                                  ${balance.balance.toLocaleString()}
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-1">✓ Paid</span>
                              )}
                            </p>
                            {isOverdraw && <p className="text-xs text-red-500 mt-1">Overdraw!</p>}
                          </div>
                        </div>
                        {(balance.commission > 0 || balance.bonus > 0 || balance.deductions > 0) && (
                          <div className="bg-purple-100 border border-purple-200 p-3 rounded-lg text-center">
                            <p className="text-sm text-purple-700">
                              <strong>Total to Pay:</strong> ${balance.totalOwed.toLocaleString()} 
                              (Base
                              {balance.commission > 0 && ' + Commission'}
                              {balance.bonus > 0 && ' + Bonus'}
                              {balance.deductions > 0 && ' - Deductions'})
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Payment Breakdown This Month */}
                  {salarySummary && (() => {
                    const breakdown = {
                      advance: salarySummary.payments.filter(p => p.paymentType === 'advance').reduce((s, p) => s + p.amount, 0),
                      withdrawal: salarySummary.payments.filter(p => p.paymentType === 'withdrawal').reduce((s, p) => s + p.amount, 0),
                      bonus: salarySummary.payments.filter(p => p.paymentType === 'bonus').reduce((s, p) => s + p.amount, 0),
                      commission: salarySummary.payments.filter(p => p.paymentType === 'commission').reduce((s, p) => s + p.amount, 0),
                      deduction: salarySummary.payments.filter(p => p.paymentType === 'deduction').reduce((s, p) => s + p.amount, 0),
                    }
                    const hasExtras = breakdown.advance > 0 || breakdown.withdrawal > 0 || breakdown.bonus > 0 || breakdown.commission > 0 || breakdown.deduction > 0
                    return hasExtras ? (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-xs text-gray-500 mb-2">Other Payments This Month</p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          {breakdown.advance > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Advance: ${breakdown.advance}</span>}
                          {breakdown.withdrawal > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">Withdrawal: ${breakdown.withdrawal}</span>}
                          {breakdown.bonus > 0 && <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Bonus: ${breakdown.bonus}</span>}
                          {breakdown.commission > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Commission: ${breakdown.commission}</span>}
                          {breakdown.deduction > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Deduction: -${breakdown.deduction}</span>}
                        </div>
                      </div>
                    ) : null
                  })()}

                  {/* Totals Summary */}
                  {salarySummary && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">This Month</p>
                          <p className="font-bold">${salarySummary.totalPaidThisMonth.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">This Year</p>
                          <p className="font-bold">${salarySummary.totalPaidThisYear.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">All Time</p>
                          <p className="font-bold">${salarySummary.totalPaidAllTime.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Payment Form */}
                  <div className="bg-purple-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-purple-800 mb-3">Record Payment</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={paymentForm.paymentType}
                          onChange={(e) => setPaymentForm({...paymentForm, paymentType: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {Object.entries(paymentTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <input
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={paymentForm.paymentDate}
                          onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCreatePayment}
                      disabled={savingPayment || paymentForm.amount <= 0}
                      className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingPayment ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                      {savingPayment ? 'Saving...' : 'Record Payment'}
                    </button>
                  </div>

                  {/* Payment History */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">Payment History</h3>
                      <div className="flex gap-2">
                        <select
                          value={paymentFilterMonth}
                          onChange={(e) => setPaymentFilterMonth(parseInt(e.target.value))}
                          className="px-2 py-1 text-sm border rounded-lg"
                        >
                          {[
                            { value: 1, label: 'January' },
                            { value: 2, label: 'February' },
                            { value: 3, label: 'March' },
                            { value: 4, label: 'April' },
                            { value: 5, label: 'May' },
                            { value: 6, label: 'June' },
                            { value: 7, label: 'July' },
                            { value: 8, label: 'August' },
                            { value: 9, label: 'September' },
                            { value: 10, label: 'October' },
                            { value: 11, label: 'November' },
                            { value: 12, label: 'December' }
                          ].map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <select
                          value={paymentFilterYear}
                          onChange={(e) => setPaymentFilterYear(parseInt(e.target.value))}
                          className="px-2 py-1 text-sm border rounded-lg"
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {(() => {
                      const filteredPayments = salarySummary?.payments.filter(p => {
                        const date = new Date(p.paymentDate)
                        return date.getMonth() + 1 === paymentFilterMonth && date.getFullYear() === paymentFilterYear
                      }) || []
                      const filteredTotal = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
                      
                      return filteredPayments.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-3 py-2">Date</th>
                                <th className="text-left px-3 py-2">Type</th>
                                <th className="text-right px-3 py-2">Amount</th>
                                <th className="text-left px-3 py-2">Notes</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {filteredPayments.map(payment => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      payment.paymentType === 'salary' ? 'bg-blue-100 text-blue-700' :
                                      payment.paymentType === 'advance' ? 'bg-orange-100 text-orange-700' :
                                      payment.paymentType === 'withdrawal' ? 'bg-red-100 text-red-700' :
                                      payment.paymentType === 'bonus' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {paymentTypeLabels[payment.paymentType] || payment.paymentType}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">${payment.amount.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">{payment.notes || '-'}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      onClick={() => handleDeletePayment(payment.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan={2} className="px-3 py-2 font-semibold">Total for {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][paymentFilterMonth-1]} {paymentFilterYear}</td>
                                <td className="px-3 py-2 text-right font-bold text-purple-600">${filteredTotal.toLocaleString()}</td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No payments for {['January','February','March','April','May','June','July','August','September','October','November','December'][paymentFilterMonth-1]} {paymentFilterYear}</p>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowSalaryModal(false)}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Control Modal */}
      {showVisibilityModal && visibilityEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-amber-600 text-white">
              <div>
                <h2 className="text-lg font-semibold">Visibility Control</h2>
                <p className="text-sm text-amber-100">{visibilityEmployee.name} - {visibilityEmployee.role}</p>
              </div>
              <button onClick={() => setShowVisibilityModal(false)}><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingVisibility ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={32} /></div>
              ) : (
                <>
                  {/* Restriction Toggles */}
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3">Restriction Settings</h3>
                    <p className="text-sm text-gray-600 mb-4">When enabled, this employee will only see assigned items. When disabled, they see all items.</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibilitySettings.restrictCustomers}
                          onChange={(e) => setVisibilitySettings(prev => ({ ...prev, restrictCustomers: e.target.checked }))}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <span className="font-medium">Restrict Customers</span>
                        <span className="text-sm text-gray-500">({assignedCustomerIds.length} assigned)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibilitySettings.restrictProducts}
                          onChange={(e) => setVisibilitySettings(prev => ({ ...prev, restrictProducts: e.target.checked }))}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <span className="font-medium">Restrict Products</span>
                        <span className="text-sm text-gray-500">({assignedProductIds.length} assigned)</span>
                      </label>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setVisibilityTab('customers')}
                      className={`px-4 py-2 rounded-lg font-medium ${visibilityTab === 'customers' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Customers ({assignedCustomerIds.length})
                    </button>
                    <button
                      onClick={() => setVisibilityTab('products')}
                      className={`px-4 py-2 rounded-lg font-medium ${visibilityTab === 'products' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Products ({assignedProductIds.length})
                    </button>
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    value={visibilitySearch}
                    onChange={(e) => setVisibilitySearch(e.target.value)}
                    placeholder={`Search ${visibilityTab}...`}
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                  />

                  {/* Item List */}
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {visibilityTab === 'customers' ? (
                      allCustomers
                        .filter(c => c.name.toLowerCase().includes(visibilitySearch.toLowerCase()))
                        .map(customer => (
                          <label key={customer.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                            <input
                              type="checkbox"
                              checked={assignedCustomerIds.includes(customer.id)}
                              onChange={() => toggleCustomerAssignment(customer.id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span>{customer.name}</span>
                          </label>
                        ))
                    ) : (
                      allProducts
                        .filter(p => p.name.toLowerCase().includes(visibilitySearch.toLowerCase()))
                        .map(product => (
                          <label key={product.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                            <input
                              type="checkbox"
                              checked={assignedProductIds.includes(product.id)}
                              onChange={() => toggleProductAssignment(product.id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span>{product.name}</span>
                          </label>
                        ))
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4">
                    {visibilityTab === 'customers' ? (
                      <>
                        <button onClick={() => setAssignedCustomerIds(allCustomers.map(c => c.id))} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Select All</button>
                        <button onClick={() => setAssignedCustomerIds([])} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Deselect All</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setAssignedProductIds(allProducts.map(p => p.id))} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Select All</button>
                        <button onClick={() => setAssignedProductIds([])} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Deselect All</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowVisibilityModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVisibility}
                disabled={savingVisibility}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {savingVisibility ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Analysis Modal */}
      {showAnalysisModal && analysisEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
              <h2 className="text-lg font-semibold">Visit Analysis - {analysisEmployee.name}</h2>
              <button onClick={() => setShowAnalysisModal(false)}><X size={24} /></button>
            </div>

            {/* Date Filters */}
            <div className="p-4 border-b bg-gray-50 flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={analysisStartDate}
                  onChange={(e) => setAnalysisStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={analysisEndDate}
                  onChange={(e) => setAnalysisEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={() => loadVisitAnalysis(analysisEmployee.id)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingAnalysis ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={32} /></div>
              ) : visitAnalysis ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-700">{visitAnalysis.totalCustomersVisited}</div>
                      <div className="text-sm text-blue-600">Customers Visited</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-700">{visitAnalysis.totalVisits}</div>
                      <div className="text-sm text-green-600">Total Visits</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-700">{visitAnalysis.totalCompletedVisits}</div>
                      <div className="text-sm text-purple-600">Completed</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-amber-700">${visitAnalysis.totalSales.toFixed(2)}</div>
                      <div className="text-sm text-amber-600">Total Sales</div>
                    </div>
                  </div>

                  <div className="mb-4 flex gap-4 text-sm">
                    <span className="text-indigo-600">● Assigned: {visitAnalysis.totalAssignedVisits}</span>
                    <span className="text-teal-600">● Created by Salesman: {visitAnalysis.totalCreatedVisits}</span>
                  </div>

                  {/* Customer List */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Customer</th>
                          <th className="px-4 py-3 text-center font-semibold">Visits</th>
                          <th className="px-4 py-3 text-center font-semibold">Assigned</th>
                          <th className="px-4 py-3 text-center font-semibold">Created</th>
                          <th className="px-4 py-3 text-center font-semibold">Completed</th>
                          <th className="px-4 py-3 text-right font-semibold">Sales</th>
                          <th className="px-4 py-3 text-center font-semibold">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitAnalysis.customerVisits.map(cv => (
                          <>
                            <tr 
                              key={cv.customerId} 
                              className="border-t hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleCustomerExpand(cv.customerId)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {expandedCustomers.includes(cv.customerId) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  <div>
                                    <div className="font-medium">{cv.customerName}</div>
                                    {cv.customerPhone && <div className="text-xs text-gray-500">{cv.customerPhone}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">{cv.totalVisits}</td>
                              <td className="px-4 py-3 text-center text-indigo-600">{cv.assignedVisits}</td>
                              <td className="px-4 py-3 text-center text-teal-600">{cv.createdVisits}</td>
                              <td className="px-4 py-3 text-center text-green-600">{cv.completedVisits}</td>
                              <td className="px-4 py-3 text-right">${cv.totalSales.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center text-gray-500">{new Date(cv.lastVisitDate).toLocaleDateString()}</td>
                            </tr>
                            {expandedCustomers.includes(cv.customerId) && cv.visits.map(v => (
                              <tr key={v.taskId} className="bg-gray-50 border-t">
                                <td className="px-4 py-2 pl-10" colSpan={2}>
                                  <div className="text-sm">
                                    <span className="font-medium">{v.taskNumber}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${v.isAssigned ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                                      {v.isAssigned ? 'Assigned' : 'Created'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center text-sm">{v.taskType}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'Completed' || v.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {v.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-sm">${v.total.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center text-sm text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </>
                        ))}
                      </tbody>
                    </table>
                    {visitAnalysis.customerVisits.length === 0 && (
                      <div className="p-8 text-center text-gray-500">No visits found for this period</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">No data available</div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
