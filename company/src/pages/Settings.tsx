import { useState, useEffect } from 'react'
import { Upload } from 'lucide-react'
import { settingsApi } from '../lib/api'

export default function Settings() {
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [showSecondaryPrice, setShowSecondaryPrice] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await settingsApi.get()
      const data = response.data
      setCompanyName(data.name || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setExchangeRate(String(data.exchangeRate ?? 1))
      setShowSecondaryPrice(data.showSecondaryPrice ?? false)
      setCurrencySymbol(data.currencySymbol || '$')
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update({
        name: companyName,
        phone,
        address,
        exchangeRate: parseFloat(exchangeRate) || 1,
        showSecondaryPrice,
        currencySymbol
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Settings</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <hr className="border-gray-200" />
          <h2 className="text-lg font-semibold text-gray-800">Pricing & Currency</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Currency Symbol</label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="$"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showSecondaryPrice"
              checked={showSecondaryPrice}
              onChange={(e) => setShowSecondaryPrice(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300"
            />
            <label htmlFor="showSecondaryPrice" className="text-sm font-medium text-gray-700">Show Secondary Price in POS</label>
          </div>

          {showSecondaryPrice && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-48 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Secondary price = Unit price × {exchangeRate || '1'}</p>
            </div>
          )}

          <hr className="border-gray-200" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
            <div className="mt-1 flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <Upload size={32} className="text-gray-400" />
              </div>
              <button type="button" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Upload Logo
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used on invoices and reports</p>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
