import { useState, useEffect } from 'react'
import { UserPlus, Phone, MapPin, Building2, CheckCircle, XCircle, ArrowRight, Search, Filter, Loader2, TrendingUp, Users, Award, Printer, Eye, Calendar, BarChart3, PieChart } from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { leadsApi } from '../lib/api'

interface Lead {
  id: number
  name: string
  shopName?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  area?: string
  businessType?: string
  estimatedPotential?: string
  notes?: string
  status: string
  capturedBy?: string
  assignedTo?: string
  createdAt: string
}

interface LeadsSummary {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  qualifiedLeads: number
  convertedLeads: number
  rejectedLeads: number
}

const statusColors: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#10b981',
  converted: '#22c55e',
  rejected: '#ef4444'
}

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  rejected: 'Rejected'
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [summary, setSummary] = useState<LeadsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [converting, setConverting] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list')

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [leadsData, summaryData] = await Promise.all([
        leadsApi.getAll({ status: statusFilter || undefined, search: searchTerm || undefined }),
        leadsApi.getSummary()
      ])
      setLeads(leadsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (!selectedLead) return
    setConverting(true)
    try {
      await leadsApi.convert(selectedLead.id, {
        customerType: 'Retail',
        creditLimit: 0
      })
      setShowConvertModal(false)
      setSelectedLead(null)
      loadData()
    } catch (err) {
      console.error('Failed to convert lead:', err)
    } finally {
      setConverting(false)
    }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Are you sure you want to reject this lead?')) return
    try {
      await leadsApi.reject(id, 'Not qualified')
      loadData()
    } catch (err) {
      console.error('Failed to reject lead:', err)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'contacted': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'qualified': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'converted': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const pieChartData = summary ? [
    { name: 'New', value: summary.newLeads, color: statusColors.new },
    { name: 'Contacted', value: summary.contactedLeads, color: statusColors.contacted },
    { name: 'Qualified', value: summary.qualifiedLeads, color: statusColors.qualified },
    { name: 'Converted', value: summary.convertedLeads, color: statusColors.converted },
    { name: 'Rejected', value: summary.rejectedLeads, color: statusColors.rejected }
  ].filter(d => d.value > 0) : []

  const conversionRate = summary && summary.totalLeads > 0 
    ? ((summary.convertedLeads / summary.totalLeads) * 100).toFixed(1) 
    : '0'

  const qualificationRate = summary && summary.totalLeads > 0 
    ? (((summary.qualifiedLeads + summary.convertedLeads) / summary.totalLeads) * 100).toFixed(1) 
    : '0'

  const barChartData = summary ? [
    { name: 'New', count: summary.newLeads, fill: statusColors.new },
    { name: 'Contacted', count: summary.contactedLeads, fill: statusColors.contacted },
    { name: 'Qualified', count: summary.qualifiedLeads, fill: statusColors.qualified },
    { name: 'Converted', count: summary.convertedLeads, fill: statusColors.converted },
    { name: 'Rejected', count: summary.rejectedLeads, fill: statusColors.rejected }
  ] : []

  const leadsByArea = leads.reduce((acc, lead) => {
    const area = lead.area || lead.city || 'Unknown'
    acc[area] = (acc[area] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const areaChartData = Object.entries(leadsByArea)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const printReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leads Report - ${new Date().toLocaleDateString()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #10b981; }
          .header h1 { font-size: 28px; color: #10b981; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .summary-section { margin-bottom: 30px; }
          .summary-section h2 { font-size: 18px; color: #333; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px; }
          .kpi-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; }
          .kpi-card .value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
          .kpi-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .kpi-card.blue .value { color: #3b82f6; }
          .kpi-card.amber .value { color: #f59e0b; }
          .kpi-card.emerald .value { color: #10b981; }
          .kpi-card.green .value { color: #22c55e; }
          .kpi-card.red .value { color: #ef4444; }
          .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
          .metric-box { background: #f8fafc; border-radius: 10px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; }
          .metric-box .big-value { font-size: 42px; font-weight: bold; color: #10b981; }
          .metric-box .label { font-size: 12px; color: #64748b; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px 10px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; color: #374151; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          tr:nth-child(even) { background: #fafafa; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .status-new { background: #dbeafe; color: #1d4ed8; }
          .status-contacted { background: #fef3c7; color: #b45309; }
          .status-qualified { background: #d1fae5; color: #047857; }
          .status-converted { background: #dcfce7; color: #15803d; }
          .status-rejected { background: #fee2e2; color: #b91c1c; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
          @media print { body { padding: 15px; } .kpi-card { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Leads Performance Report</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="summary-section">
          <h2>Lead Pipeline Overview</h2>
          <div class="kpi-grid">
            <div class="kpi-card blue">
              <div class="value">${summary?.newLeads || 0}</div>
              <div class="label">New Leads</div>
            </div>
            <div class="kpi-card amber">
              <div class="value">${summary?.contactedLeads || 0}</div>
              <div class="label">Contacted</div>
            </div>
            <div class="kpi-card emerald">
              <div class="value">${summary?.qualifiedLeads || 0}</div>
              <div class="label">Qualified</div>
            </div>
            <div class="kpi-card green">
              <div class="value">${summary?.convertedLeads || 0}</div>
              <div class="label">Converted</div>
            </div>
            <div class="kpi-card red">
              <div class="value">${summary?.rejectedLeads || 0}</div>
              <div class="label">Rejected</div>
            </div>
          </div>

          <div class="metrics-row">
            <div class="metric-box">
              <div class="big-value">${summary?.totalLeads || 0}</div>
              <div class="label">Total Leads</div>
            </div>
            <div class="metric-box">
              <div class="big-value">${conversionRate}%</div>
              <div class="label">Conversion Rate</div>
            </div>
            <div class="metric-box">
              <div class="big-value">${qualificationRate}%</div>
              <div class="label">Qualification Rate</div>
            </div>
          </div>
        </div>

        <div class="summary-section">
          <h2>All Leads (${leads.length})</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Shop/Business</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Captured By</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${leads.map((lead, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${lead.name}</strong></td>
                  <td>${lead.shopName || '-'}</td>
                  <td>${lead.phone || '-'}</td>
                  <td>${lead.area || lead.city || lead.address || '-'}</td>
                  <td>${lead.capturedBy || '-'}</td>
                  <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td><span class="status-badge status-${lead.status}">${lead.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Catalyst Lead Management System • Confidential Report</p>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your sales pipeline</p>
        </div>
        <button
          onClick={printReport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
        >
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{summary.newLeads}</p>
                <p className="text-sm text-gray-500 mt-1">New Leads</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{summary.convertedLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Converted</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Award size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">{summary.rejectedLeads}</p>
                <p className="text-sm text-gray-500 mt-1">Rejected</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{conversionRate}%</p>
                <p className="text-sm text-emerald-100 mt-1">Conversion Rate</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'list' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users size={18} />
          Lead List
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'analytics' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        /* Analytics View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-emerald-600" />
              Lead Pipeline Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Bar Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-600" />
              Leads by Status
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads by Area */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-emerald-600" />
              Leads by Location
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-4xl font-bold text-gray-800">{summary?.totalLeads || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Total Leads</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-4xl font-bold text-emerald-600">{conversionRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Conversion Rate</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-4xl font-bold text-blue-600">{qualificationRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Qualification Rate</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-4xl font-bold text-amber-600">
                  {summary && summary.totalLeads > 0 
                    ? ((summary.rejectedLeads / summary.totalLeads) * 100).toFixed(1) 
                    : '0'}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Rejection Rate</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, shop, phone or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadData()}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <button
                onClick={loadData}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-emerald-500" size={40} />
                <p className="text-gray-500 mt-4">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <UserPlus size={56} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No leads found</p>
                <p className="text-sm mt-1">Leads captured from the mobile app will appear here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead Info</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{lead.name}</p>
                            {lead.shopName && <p className="text-sm text-gray-500">{lead.shopName}</p>}
                            {lead.businessType && <p className="text-xs text-gray-400">{lead.businessType}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="text-xs text-gray-400 mt-1">{lead.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          <span>{lead.area || lead.city || lead.address || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-700">{lead.capturedBy || '-'}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusBadgeColor(lead.status)}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => { setSelectedLead(lead); setShowDetailModal(true) }}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {lead.status !== 'converted' && lead.status !== 'rejected' && (
                            <>
                              <button
                                onClick={() => { setSelectedLead(lead); setShowConvertModal(true) }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Convert to Customer"
                              >
                                <ArrowRight size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(lead.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject Lead"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          {lead.status === 'converted' && (
                            <span className="p-2 text-green-600">
                              <CheckCircle size={18} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedLead.name}</h2>
                  {selectedLead.shopName && <p className="text-gray-500">{selectedLead.shopName}</p>}
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(selectedLead.status)}`}>
                {statusLabels[selectedLead.status] || selectedLead.status}
              </span>
            </div>
            
            <div className="space-y-4">
              {selectedLead.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                </div>
              )}
              {(selectedLead.address || selectedLead.area || selectedLead.city) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{[selectedLead.address, selectedLead.area, selectedLead.city].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}
              {selectedLead.businessType && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Business Type</p>
                    <p className="font-medium">{selectedLead.businessType}</p>
                  </div>
                </div>
              )}
              {selectedLead.estimatedPotential && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <TrendingUp size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Estimated Potential</p>
                    <p className="font-medium">{selectedLead.estimatedPotential}</p>
                  </div>
                </div>
              )}
              {selectedLead.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{selectedLead.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Captured</p>
                  <p className="font-medium">{new Date(selectedLead.createdAt).toLocaleDateString()} by {selectedLead.capturedBy || 'Unknown'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedLead.status !== 'converted' && selectedLead.status !== 'rejected' && (
                <button
                  onClick={() => { setShowDetailModal(false); setShowConvertModal(true) }}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  Convert to Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Convert Lead to Customer</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedLead.name}</p>
                  {selectedLead.shopName && <p className="text-sm text-gray-500">{selectedLead.shopName}</p>}
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will create a new customer record with all the lead's information including contact details and location.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {converting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Convert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
