import { useState, useEffect } from 'react'
import { UserPlus, Phone, MapPin, Building2, Plus, ChevronLeft, Loader2, Check, Store, FileText } from 'lucide-react'
import { leadsApi } from '../lib/api'

interface Lead {
  id: number
  name: string
  shopName?: string
  phone?: string
  address?: string
  city?: string
  area?: string
  businessType?: string
  notes?: string
  status: string
  createdAt: string
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    phone: '',
    address: '',
    city: '',
    area: '',
    businessType: '',
    estimatedPotential: '',
    notes: ''
  })

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const res = await leadsApi.getMyLeads()
      setLeads(res.data)
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      shopName: '',
      phone: '',
      address: '',
      city: '',
      area: '',
      businessType: '',
      estimatedPotential: '',
      notes: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter the contact name')
      return
    }

    setSaving(true)
    try {
      await leadsApi.capture(formData)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setShowForm(false)
        resetForm()
        loadLeads()
      }, 1500)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to capture lead')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700'
      case 'contacted': return 'bg-yellow-100 text-yellow-700'
      case 'qualified': return 'bg-emerald-100 text-emerald-700'
      case 'converted': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (showForm) {
    return (
      <div className="page-container pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 -mx-4 -mt-4 mb-4">
          <button onClick={() => setShowForm(false)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">Capture New Lead</h1>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check size={40} className="text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-600">Lead Captured!</p>
            <p className="text-gray-500 mt-1">Successfully saved</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UserPlus size={18} className="text-primary-600" />
                Contact Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter contact name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Store size={18} className="text-primary-600" />
                Business Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Shop/Business Name</label>
                  <input
                    type="text"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter shop name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select type</option>
                    <option value="Grocery">Grocery Store</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Cafe">Cafe</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail">Retail Shop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Estimated Potential</label>
                  <select
                    value={formData.estimatedPotential}
                    onChange={(e) => setFormData({ ...formData, estimatedPotential: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select potential</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-primary-600" />
                Location
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Area</label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Area/District"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                Additional Notes
              </h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Any additional notes about this lead..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Capture Lead
                </>
              )}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="page-container pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-primary-600 text-white px-4 py-4 -mx-4 -mt-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Leads</h1>
            <p className="text-primary-100 text-sm">Capture potential customers</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-primary-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            New Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-primary-600">{leads.length}</p>
          <p className="text-sm text-gray-500">Total Captured</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-green-600">
            {leads.filter(l => l.status === 'converted').length}
          </p>
          <p className="text-sm text-gray-500">Converted</p>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={32} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">No Leads Yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Start capturing potential customers you meet in the field
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium"
          >
            Capture First Lead
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{lead.name}</h3>
                    {lead.shopName && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building2 size={12} />
                        {lead.shopName}
                      </p>
                    )}
                    {lead.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone size={12} />
                        {lead.phone}
                      </p>
                    )}
                    {(lead.area || lead.city) && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} />
                        {[lead.area, lead.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              {lead.notes && (
                <p className="text-sm text-gray-600 mt-3 pl-15 border-l-2 border-gray-200 ml-6 pl-3">
                  {lead.notes}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2 text-right">
                {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
