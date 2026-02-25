import { useState, useEffect } from 'react'
import { 
  UserPlus, Phone, MapPin, Building2, CheckCircle, XCircle, 
  ArrowRight, Search, Filter, Loader2, TrendingUp, Users, 
  Award, Printer, Eye, Calendar, BarChart3, PieChart 
} from 'lucide-react'
import { 
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
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
  new: '#06b6d4',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  converted: '#10b981',
  rejected: '#f43f5e'
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
      case 'new': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'contacted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'qualified': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'converted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
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
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #06b6d4; }
          .header h1 { font-size: 28px; color: #0f172a; margin-bottom: 5px; }
          .header p { color: #64748b; font-size: 14px; }
          .summary-section { margin-bottom: 30px; }
          .summary-section h2 { font-size: 18px; color: #0f172a; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; }
          .kpi-card .value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
          .kpi-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
          .metric-box { background: #f8fafc; border-radius: 10px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; }
          .metric-box .big-value { font-size: 42px; font-weight: bold; color: #06b6d4; }
          .metric-box .label { font-size: 12px; color: #64748b; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; color: #334155; text-transform: uppercase; font-size: 10px; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
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
            <div class="kpi-card"><div class="value" style="color: #06b6d4;">${summary?.newLeads || 0}</div><div class="label">New</div></div>
            <div class="kpi-card"><div class="value" style="color: #f59e0b;">${summary?.contactedLeads || 0}</div><div class="label">Contacted</div></div>
            <div class="kpi-card"><div class="value" style="color: #8b5cf6;">${summary?.qualifiedLeads || 0}</div><div class="label">Qualified</div></div>
            <div class="kpi-card"><div class="value" style="color: #10b981;">${summary?.convertedLeads || 0}</div><div class="label">Converted</div></div>
            <div class="kpi-card"><div class="value" style="color: #f43f5e;">${summary?.rejectedLeads || 0}</div><div class="label">Rejected</div></div>
          </div>
          <div class="metrics-row">
            <div class="metric-box"><div class="big-value">${summary?.totalLeads || 0}</div><div class="label">Total Leads</div></div>
            <div class="metric-box"><div class="big-value">${conversionRate}%</div><div class="label">Conversion Rate</div></div>
            <div class="metric-box"><div class="big-value">${qualificationRate}%</div><div class="label">Qualification Rate</div></div>
          </div>
        </div>
        <div class="summary-section">
          <h2>All Leads (${leads.length})</h2>
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Shop/Business</th><th>Phone</th><th>Location</th><th>Status</th></tr></thead>
            <tbody>
              ${leads.map((lead, idx) => `
                <tr>
                  <td>${idx + 1}</td><td><strong>${lead.name}</strong></td><td>${lead.shopName || '-'}</td>
                  <td>${lead.phone || '-'}</td><td>${lead.area || lead.city || '-'}</td><td>${statusLabels[lead.status]}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="footer"><p>ERP System • Confidential Report</p></div>
      </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-tight">CRM / Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">Track and manage your sales pipeline efficiently.</p>
        </div>
        <button
          onClick={printReport}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-cyan-400 hover:text-white border border-cyan-500/30 hover:bg-cyan-600 hover:border-cyan-500 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] font-medium text-sm"
        >
          <Printer size={18} />
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 relative z-10">
          
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.newLeads}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">New Leads</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-cyan-400 shadow-inner">
                <UserPlus size={22} />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.convertedLeads}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Converted</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-emerald-400 shadow-inner">
                <Award size={22} />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{summary.rejectedLeads}</p>
                <p className="text-sm font-medium text-slate-400 mt-1">Rejected</p>
              </div>
              <div className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-rose-400 shadow-inner">
                <XCircle size={22} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-600 to-purple-600 rounded-2xl p-5 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] relative overflow-hidden group">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-3xl font-bold">{conversionRate}%</p>
                <p className="text-sm text-cyan-100 font-medium mt-1">Conversion Rate</p>
              </div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                <TrendingUp size={22} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 relative z-10 p-1 bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            activeTab === 'list' 
              ? 'bg-slate-800 text-cyan-400 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users size={16} />
          Lead List
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all text-sm ${
            activeTab === 'analytics' 
              ? 'bg-slate-800 text-purple-400 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        /* --- Analytics View --- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><PieChart size={18} /></div>
              Pipeline Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none"
                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }} itemStyle={{ color: '#f8fafc' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400"><BarChart3 size={18} /></div>
              Leads by Status
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                    {barChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><MapPin size={18} /></div>
              Location Heatmap
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      ) : (
        /* --- List View --- */
        <div className="relative z-10">
          {/* Filters */}
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, company, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadData()}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 placeholder-slate-500 text-sm transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer py-1"
                >
                  <option value="" className="bg-slate-800">All Status</option>
                  <option value="new" className="bg-slate-800">New</option>
                  <option value="contacted" className="bg-slate-800">Contacted</option>
                  <option value="qualified" className="bg-slate-800">Qualified</option>
                  <option value="converted" className="bg-slate-800">Converted</option>
                  <option value="rejected" className="bg-slate-800">Rejected</option>
                </select>
              </div>
              <button
                onClick={loadData}
                className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <Loader2 className="animate-spin mx-auto text-cyan-500 mb-4" size={32} />
                <p className="text-slate-400 font-medium">Synchronizing Pipeline...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-800">
                   <UserPlus size={32} className="text-slate-600" />
                </div>
                <p className="text-lg font-medium text-slate-300">No leads found</p>
                <p className="text-sm text-slate-500 mt-2">Adjust your filters or capture new leads to see them here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800 font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Lead Info</th>
                      <th className="px-6 py-4">Contact Details</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-900/20">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{lead.name}</p>
                              {lead.shopName && <p className="text-xs text-slate-500 mt-0.5">{lead.shopName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1.5">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <Phone size={13} className="text-slate-500" /> <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <Building2 size={13} className="text-slate-500" /> <span className="text-xs truncate max-w-[150px]">{lead.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={14} className="text-slate-500" />
                            <span>{lead.area || lead.city || lead.address || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 font-medium">{lead.capturedBy || '—'}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar size={11} /> {new Date(lead.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadgeColor(lead.status)} backdrop-blur-sm`}>
                            {statusLabels[lead.status] || lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}
                              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {lead.status !== 'converted' && lead.status !== 'rejected' && (
                              <>
                                <button
                                  onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }}
                                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                  title="Convert to Customer"
                                >
                                  <ArrowRight size={16} />
                                </button>
                                <button
                                  onClick={() => handleReject(lead.id)}
                                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Reject Lead"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {lead.status === 'converted' && (
                              <span className="p-2 text-emerald-500"><CheckCircle size={16} /></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Detail Modal --- */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-800/50 p-6 border-b border-slate-800 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedLead.name}</h2>
                  {selectedLead.shopName && <p className="text-cyan-400 text-sm font-medium mt-0.5">{selectedLead.shopName}</p>}
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-md border ${getStatusBadgeColor(selectedLead.status)}`}>
                {statusLabels[selectedLead.status] || selectedLead.status}
              </span>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedLead.phone && (
                <div className="flex items-center gap-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="p-2 bg-slate-800 rounded-lg"><Phone size={16} className="text-cyan-400" /></div>
                  <div><p className="text-xs text-slate-500">Phone Number</p><p className="font-medium text-slate-200">{selectedLead.phone}</p></div>
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="p-2 bg-slate-800 rounded-lg"><Building2 size={16} className="text-purple-400" /></div>
                  <div><p className="text-xs text-slate-500">Email Address</p><p className="font-medium text-slate-200">{selectedLead.email}</p></div>
                </div>
              )}
              {(selectedLead.address || selectedLead.area || selectedLead.city) && (
                <div className="flex items-center gap-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="p-2 bg-slate-800 rounded-lg"><MapPin size={16} className="text-amber-400" /></div>
                  <div><p className="text-xs text-slate-500">Location</p><p className="font-medium text-slate-200">{[selectedLead.address, selectedLead.area, selectedLead.city].filter(Boolean).join(', ')}</p></div>
                </div>
              )}
              {selectedLead.estimatedPotential && (
                <div className="flex items-center gap-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <div className="p-2 bg-slate-800 rounded-lg"><TrendingUp size={16} className="text-emerald-400" /></div>
                  <div><p className="text-xs text-slate-500">Estimated Potential</p><p className="font-medium text-slate-200">{selectedLead.estimatedPotential}</p></div>
                </div>
              )}
              {selectedLead.notes && (
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Internal Notes</p>
                  <p className="text-sm text-slate-300 italic">"{selectedLead.notes}"</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 flex gap-3 bg-slate-950">
              <button onClick={() => setShowDetailModal(false)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-medium transition-colors">
                Close
              </button>
              {selectedLead.status !== 'converted' && selectedLead.status !== 'rejected' && (
                <button onClick={() => { setShowDetailModal(false); setShowConvertModal(true); }} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 font-medium transition-colors shadow-lg shadow-cyan-900/30">
                  Convert to Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Convert Modal --- */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Convert to Customer</h2>
            <p className="text-slate-400 text-sm mb-6">You are about to move this lead into your active customer pipeline.</p>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6 flex items-center gap-4">
               <div className="w-12 h-12 bg-cyan-600/20 text-cyan-400 rounded-xl flex items-center justify-center text-lg font-bold border border-cyan-500/30">
                 {selectedLead.name.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p className="font-bold text-slate-200">{selectedLead.name}</p>
                 {selectedLead.shopName && <p className="text-xs text-slate-400">{selectedLead.shopName}</p>}
               </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConvertModal(false)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm">
                Cancel
              </button>
              <button onClick={handleConvert} disabled={converting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                {converting ? <><Loader2 size={16} className="animate-spin" /> Processing</> : <><CheckCircle size={16} /> Confirm Conversion</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
