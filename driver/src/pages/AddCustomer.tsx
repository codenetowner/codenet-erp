import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customersApi } from '../lib/api'
import { ArrowLeft, Save, MapPin } from 'lucide-react'

export default function AddCustomer() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    customerType: 'retail',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Customer name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await customersApi.create({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        customerType: form.customerType,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
        notes: form.notes || undefined,
      })
      navigate('/customers')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to create customer')
    } finally {
      setIsLoading(false)
    }
  }

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm({
            ...form,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Failed to get location')
        }
      )
    } else {
      setError('Geolocation is not supported')
    }
  }

  // Parse Google Maps link to extract lat/lng
  const parseGoogleMapsLink = (url: string) => {
    try {
      const patterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,           // /@lat,lng
        /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,      // ?q=lat,lng
        /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/,   // /place/lat,lng
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,         // ll=lat,lng
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/        // !3d lat !4d lng
      ]
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          setForm({ ...form, latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) })
          return
        }
      }
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-primary-700 hover:bg-primary-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Add Customer</h1>
            <p className="text-primary-200 text-sm">Create new customer</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Enter customer name"
            />
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="Enter phone number"
            />
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="Enter email"
            />
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              placeholder="Enter address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input"
              />
            </div>
            <div className="card">
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
            <select
              value={form.customerType}
              onChange={(e) => setForm({ ...form, customerType: e.target.value })}
              className="input"
            >
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="distributor">Distributor</option>
            </select>
          </div>


          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Google Maps Link</label>
            <input
              type="text"
              onChange={(e) => parseGoogleMapsLink(e.target.value)}
              className="input"
              placeholder="Paste Google Maps link here"
            />
            <span className="text-xs text-gray-500">or</span>
          </div>
          <div className="card">
            <button
              type="button"
              onClick={getLocation}
              className="w-full py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50"
            >
              <MapPin size={20} />
              {form.latitude ? `Location Set ✓ (${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)})` : 'Get Current Location'}
            </button>
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={20} />
                <span>Save Customer</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
