import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import { attendanceApi } from '../lib/api'

interface Employee {
  id: number
  name: string
  role: string | null
}

interface AttendanceRecord {
  id: number
  employeeId: number
  employeeName: string
  employeeRole: string | null
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  notes: string | null
  overtimeHours: number
  workedHours: number
}

interface AttendanceSummary {
  employeeId: number
  employeeName: string
  employeeRole: string | null
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  halfDays: number
  leaveDays: number
  totalWorkedHours: number
  totalOvertimeHours: number
}

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  half_day: 'bg-orange-100 text-orange-800',
  leave: 'bg-blue-100 text-blue-800'
}

const statusLabels: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  leave: 'Leave'
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<'daily' | 'summary'>('daily')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [filterEmployee, setFilterEmployee] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)

  // Form
  const [formData, setFormData] = useState({
    employeeId: 0,
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    status: 'present',
    notes: '',
    overtimeHours: 0
  })

  // Bulk attendance
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0])
  const [bulkAttendances, setBulkAttendances] = useState<{
    employeeId: number
    status: string
    checkIn: string
    checkOut: string
    notes: string
  }[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (activeTab === 'daily') {
      loadAttendances()
    } else {
      loadSummary()
    }
  }, [activeTab, selectedDate, startDate, endDate, filterEmployee, filterStatus])

  const loadEmployees = async () => {
    try {
      const res = await attendanceApi.getEmployees()
      setEmployees(res.data)
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  const loadAttendances = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {}
      if (selectedDate) {
        params.startDate = selectedDate
        params.endDate = selectedDate
      }
      if (filterEmployee) params.employeeId = filterEmployee
      if (filterStatus) params.status = filterStatus

      const res = await attendanceApi.getAll(params)
      setAttendances(res.data)
    } catch (error) {
      console.error('Failed to load attendances:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      setLoading(true)
      const res = await attendanceApi.getSummary({ startDate, endDate })
      setSummary(res.data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: 0,
      date: selectedDate,
      checkIn: '',
      checkOut: '',
      status: 'present',
      notes: '',
      overtimeHours: 0
    })
    setEditingRecord(null)
  }

  const handleAdd = () => {
    resetForm()
    setFormData(prev => ({ ...prev, date: selectedDate }))
    setShowModal(true)
  }

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setFormData({
      employeeId: record.employeeId,
      date: record.date.split('T')[0],
      checkIn: record.checkIn ? record.checkIn.split('T')[1]?.substring(0, 5) || '' : '',
      checkOut: record.checkOut ? record.checkOut.split('T')[1]?.substring(0, 5) || '' : '',
      status: record.status,
      notes: record.notes || '',
      overtimeHours: record.overtimeHours
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId) {
      alert('Please select an employee')
      return
    }

    setSaving(true)
    try {
      const data = {
        employeeId: formData.employeeId,
        date: formData.date,
        checkIn: formData.checkIn ? `${formData.date}T${formData.checkIn}:00` : null,
        checkOut: formData.checkOut ? `${formData.date}T${formData.checkOut}:00` : null,
        status: formData.status,
        notes: formData.notes || null,
        overtimeHours: formData.overtimeHours
      }

      if (editingRecord) {
        await attendanceApi.update(editingRecord.id, data)
      } else {
        await attendanceApi.create(data)
      }

      setShowModal(false)
      loadAttendances()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return

    try {
      await attendanceApi.delete(id)
      loadAttendances()
    } catch (error) {
      alert('Failed to delete attendance record')
    }
  }

  const handleOpenBulk = () => {
    setBulkDate(selectedDate)
    setBulkAttendances(employees.map(emp => ({
      employeeId: emp.id,
      status: 'present',
      checkIn: '09:00',
      checkOut: '17:00',
      notes: ''
    })))
    setShowBulkModal(true)
  }

  const handleBulkSubmit = async () => {
    setSaving(true)
    try {
      const data = bulkAttendances.map(att => ({
        employeeId: att.employeeId,
        date: bulkDate,
        checkIn: att.checkIn ? `${bulkDate}T${att.checkIn}:00` : null,
        checkOut: att.checkOut ? `${bulkDate}T${att.checkOut}:00` : null,
        status: att.status,
        notes: att.notes || null,
        overtimeHours: 0
      }))

      await attendanceApi.createBulk(data)
      setShowBulkModal(false)
      loadAttendances()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save bulk attendance')
    } finally {
      setSaving(false)
    }
  }

  const updateBulkAttendance = (employeeId: number, field: string, value: any) => {
    setBulkAttendances(prev => prev.map(att =>
      att.employeeId === employeeId ? { ...att, [field]: value } : att
    ))
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>
        <div className="flex gap-2">
          <button
            onClick={handleOpenBulk}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            <Calendar size={20} />
            Mark Bulk Attendance
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={20} />
            Add Record
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-2 px-4 font-medium ${activeTab === 'daily' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-2 px-4 font-medium ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          Summary Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {activeTab === 'daily' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value ? parseInt(e.target.value) : '')}
                  className="px-3 py-2 border rounded-lg min-w-[150px]"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg min-w-[120px]"
                >
                  <option value="">All Status</option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : activeTab === 'daily' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Overtime</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No attendance records found for this date
                  </td>
                </tr>
              ) : (
                attendances.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{record.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.employeeRole || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[record.status] || record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatTime(record.checkIn)}</td>
                    <td className="px-4 py-3 text-sm">{formatTime(record.checkOut)}</td>
                    <td className="px-4 py-3 text-sm">{record.workedHours > 0 ? `${record.workedHours}h` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{record.overtimeHours > 0 ? `${record.overtimeHours}h` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{record.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Days</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Present</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Absent</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Late</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Half Day</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Leave</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hours Worked</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No attendance records found for this period
                  </td>
                </tr>
              ) : (
                summary.map(emp => (
                  <tr key={emp.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.employeeRole || '-'}</td>
                    <td className="px-4 py-3 text-center">{emp.totalDays}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{emp.presentDays}</td>
                    <td className="px-4 py-3 text-center text-red-600 font-medium">{emp.absentDays}</td>
                    <td className="px-4 py-3 text-center text-yellow-600 font-medium">{emp.lateDays}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-medium">{emp.halfDays}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{emp.leaveDays}</td>
                    <td className="px-4 py-3 text-center">{emp.totalWorkedHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-center">{emp.totalOvertimeHours.toFixed(1)}h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingRecord ? 'Edit Attendance' : 'Add Attendance Record'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  disabled={!!editingRecord}
                >
                  <option value={0}>Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  disabled={!!editingRecord}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                  <input
                    type="time"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                  <input
                    type="time"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.overtimeHours}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Attendance Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Mark Bulk Attendance</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Employee</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Status</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Check In</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Check Out</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bulkAttendances.map(att => {
                    const emp = employees.find(e => e.id === att.employeeId)
                    return (
                      <tr key={att.employeeId}>
                        <td className="px-3 py-2 font-medium">{emp?.name}</td>
                        <td className="px-3 py-2">
                          <select
                            value={att.status}
                            onChange={(e) => updateBulkAttendance(att.employeeId, 'status', e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-full"
                          >
                            {Object.entries(statusLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={att.checkIn}
                            onChange={(e) => updateBulkAttendance(att.employeeId, 'checkIn', e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-full"
                            disabled={att.status === 'absent' || att.status === 'leave'}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={att.checkOut}
                            onChange={(e) => updateBulkAttendance(att.employeeId, 'checkOut', e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-full"
                            disabled={att.status === 'absent' || att.status === 'leave'}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={att.notes}
                            onChange={(e) => updateBulkAttendance(att.employeeId, 'notes', e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-full"
                            placeholder="Notes..."
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save All Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
