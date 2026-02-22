import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function InventorySettings() {
  const [valuationMethod, setValuationMethod] = useState('fifo')
  const [costSpikeThreshold, setCostSpikeThreshold] = useState(20)
  const [lowMarginThreshold, setLowMarginThreshold] = useState(10)
  const [enableCostAlerts, setEnableCostAlerts] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/inventorysettings')
      setValuationMethod(res.data.valuationMethod || 'fifo')
      setCostSpikeThreshold(res.data.costSpikeThreshold || 20)
      setLowMarginThreshold(res.data.lowMarginThreshold || 10)
      setEnableCostAlerts(res.data.enableCostAlerts ?? true)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put('/inventorysettings', {
        valuationMethod,
        costSpikeThreshold,
        lowMarginThreshold,
        enableCostAlerts
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory Settings</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valuation Method</label>
            <select
              value={valuationMethod}
              onChange={(e) => setValuationMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="fifo">FIFO (First In, First Out)</option>
              <option value="lifo">LIFO (Last In, First Out)</option>
              <option value="weighted_average">Weighted Average</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Method used to calculate inventory cost</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Spike Threshold (%)</label>
            <input
              type="number"
              value={costSpikeThreshold}
              onChange={(e) => setCostSpikeThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when cost increases by this percentage</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Margin Threshold (%)</label>
            <input
              type="number"
              value={lowMarginThreshold}
              onChange={(e) => setLowMarginThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when profit margin falls below this percentage</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="costAlerts"
              checked={enableCostAlerts}
              onChange={(e) => setEnableCostAlerts(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="costAlerts" className="text-sm font-medium text-gray-700">Enable Cost Alerts</label>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
