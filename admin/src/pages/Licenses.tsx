import { useState, useEffect } from 'react'
import { licensesApi, companiesApi } from '../lib/api'
import { Key, Plus, RefreshCw, XCircle, Copy, Check, Monitor, Calendar, AlertTriangle } from 'lucide-react'

interface License {
  id: number
  licenseKey: string
  companyId: number
  companyName: string
  companyUsername: string
  licenseType: string
  status: string
  maxDevices: number
  activatedDevices: number
  issuedAt: string
  expiresAt: string
  lastCheckIn: string | null
  gracePeriodDays: number
  features: string | null
  notes: string | null
  createdAt: string
  activeActivations: number
}

interface Company {
  id: number
  name: string
  username: string
}

export default function Licenses() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    companyId: 0,
    licenseType: 'offline',
    maxDevices: 1,
    expiresAt: '',
    gracePeriodDays: 7,
    notes: ''
  })
  const [renewMonths, setRenewMonths] = useState(12)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [licensesRes, companiesRes] = await Promise.all([
        licensesApi.getAll(),
        companiesApi.getAll()
      ])
      setLicenses(licensesRes.data)
      setCompanies(companiesRes.data.companies || companiesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await licensesApi.create({
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined
      })
      setShowCreateModal(false)
      setFormData({
        companyId: 0,
        licenseType: 'offline',
        maxDevices: 1,
        expiresAt: '',
        gracePeriodDays: 7,
        notes: ''
      })
      fetchData()
    } catch (error) {
      console.error('Error creating license:', error)
      alert('Failed to create license')
    }
  }

  const handleRevoke = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this license? This will deactivate all devices.')) return
    try {
      await licensesApi.revoke(id)
      fetchData()
    } catch (error) {
      console.error('Error revoking license:', error)
    }
  }

  const handleRenew = async () => {
    if (!selectedLicense) return
    try {
      await licensesApi.renew(selectedLicense.id, renewMonths)
      setShowRenewModal(false)
      setSelectedLicense(null)
      fetchData()
    } catch (error) {
      console.error('Error renewing license:', error)
    }
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getStatusBadge = (license: License) => {
    const now = new Date()
    const expiresAt = new Date(license.expiresAt)
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (license.status === 'revoked') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Revoked</span>
    }
    if (license.status === 'suspended') {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">Suspended</span>
    }
    if (daysUntilExpiry < 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Expired</span>
    }
    if (daysUntilExpiry <= 7) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Expiring Soon</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Active</span>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenses</h1>
          <p className="text-gray-400">Manage offline installation licenses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
        >
          <Plus size={20} />
          Generate License
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Key className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Licenses</p>
              <p className="text-2xl font-bold text-white">{licenses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Check className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-white">
                {licenses.filter(l => l.status === 'active' && new Date(l.expiresAt) > new Date()).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Expiring Soon</p>
              <p className="text-2xl font-bold text-white">
                {licenses.filter(l => {
                  const days = Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return days > 0 && days <= 30
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Monitor className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Devices</p>
              <p className="text-2xl font-bold text-white">
                {licenses.reduce((sum, l) => sum + l.activeActivations, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">License Key</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Company</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Devices</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Expires</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {licenses.map((license) => (
              <tr key={license.id} className="hover:bg-gray-750">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-purple-400 bg-gray-900 px-2 py-1 rounded font-mono">
                      {license.licenseKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(license.licenseKey)}
                      className="p-1 hover:bg-gray-700 rounded"
                      title="Copy license key"
                    >
                      {copiedKey === license.licenseKey ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{license.companyName}</p>
                    <p className="text-gray-400 text-sm">@{license.companyUsername}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 capitalize">
                    {license.licenseType}
                  </span>
                </td>
                <td className="px-4 py-3">{getStatusBadge(license)}</td>
                <td className="px-4 py-3">
                  <span className="text-white">
                    {license.activeActivations} / {license.maxDevices}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-gray-300">{formatDate(license.expiresAt)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedLicense(license)
                        setShowRenewModal(true)
                      }}
                      className="p-1.5 hover:bg-gray-700 rounded text-green-400"
                      title="Renew license"
                    >
                      <RefreshCw size={16} />
                    </button>
                    {license.status !== 'revoked' && (
                      <button
                        onClick={() => handleRevoke(license.id)}
                        className="p-1.5 hover:bg-gray-700 rounded text-red-400"
                        title="Revoke license"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {licenses.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Key size={48} className="mx-auto mb-4 opacity-50" />
            <p>No licenses found. Generate your first license to get started.</p>
          </div>
        )}
      </div>

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Generate License</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company</label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value={0}>Select company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} (@{company.username})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">License Type</label>
                <select
                  value={formData.licenseType}
                  onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="trial">Trial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Devices</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxDevices}
                  onChange={(e) => setFormData({ ...formData, maxDevices: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expires At</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for 1 year from now</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Grace Period (days)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.gracePeriodDays}
                  onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew License Modal */}
      {showRenewModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Renew License</h2>
            <div className="mb-4">
              <p className="text-gray-400">
                Renew license for <span className="text-white font-medium">{selectedLicense.companyName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Current expiry: {formatDate(selectedLicense.expiresAt)}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Extend by (months)</label>
              <select
                value={renewMonths}
                onChange={(e) => setRenewMonths(parseInt(e.target.value))}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRenewModal(false)
                  setSelectedLicense(null)
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRenew}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                Renew
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
