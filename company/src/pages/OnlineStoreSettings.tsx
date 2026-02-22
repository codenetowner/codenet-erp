import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, Store, Truck, MapPin, MessageCircle, Palette } from 'lucide-react'
import { onlineStoreSettingsApi } from '../lib/api'

interface StoreSettings {
  isOnlineStoreEnabled: boolean
  storeDescription: string | null
  storeBannerUrl: string | null
  storeThemeColor: string
  deliveryEnabled: boolean
  deliveryFee: number
  minOrderAmount: number
  storeLat: number | null
  storeLng: number | null
  whatsappNumber: string | null
  isPremium: boolean
  premiumTier: string | null
  storeCategoryId: number | null
  storeCategoryName: string | null
  storeCategories: { storeCategoryId: number; name: string }[]
}

interface AvailableCategory {
  id: number
  name: string
  nameAr: string | null
  icon: string | null
}

export default function OnlineStoreSettings() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    isOnlineStoreEnabled: false,
    storeDescription: '',
    storeBannerUrl: '',
    storeThemeColor: '#003366',
    deliveryEnabled: false,
    deliveryFee: 0,
    minOrderAmount: 0,
    storeLat: '',
    storeLng: '',
    whatsappNumber: '',
    storeCategoryId: null as number | null,
    storeCategoryIds: [] as number[],
  })

  const { data: settings, isLoading } = useQuery<StoreSettings>({
    queryKey: ['online-store-settings'],
    queryFn: () => onlineStoreSettingsApi.get(),
  })

  const { data: availableCategories = [] } = useQuery<AvailableCategory[]>({
    queryKey: ['available-store-categories'],
    queryFn: () => onlineStoreSettingsApi.getAvailableCategories(),
  })

  useEffect(() => {
    if (settings) {
      setForm({
        isOnlineStoreEnabled: settings.isOnlineStoreEnabled,
        storeDescription: settings.storeDescription || '',
        storeBannerUrl: settings.storeBannerUrl || '',
        storeThemeColor: settings.storeThemeColor || '#003366',
        deliveryEnabled: settings.deliveryEnabled,
        deliveryFee: settings.deliveryFee,
        minOrderAmount: settings.minOrderAmount,
        storeLat: settings.storeLat?.toString() || '',
        storeLng: settings.storeLng?.toString() || '',
        whatsappNumber: settings.whatsappNumber || '',
        storeCategoryId: settings.storeCategoryId,
        storeCategoryIds: settings.storeCategories?.map(c => c.storeCategoryId) || [],
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: any) => onlineStoreSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-settings'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      ...form,
      storeLat: form.storeLat ? parseFloat(form.storeLat) : null,
      storeLng: form.storeLng ? parseFloat(form.storeLng) : null,
    })
  }

  const toggleCategory = (catId: number) => {
    setForm(prev => ({
      ...prev,
      storeCategoryIds: prev.storeCategoryIds.includes(catId)
        ? prev.storeCategoryIds.filter(id => id !== catId)
        : [...prev.storeCategoryIds, catId],
    }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Online Store Settings</h1>
        <p className="text-gray-500 mt-1">Configure your online store for the marketplace</p>
      </div>

      {settings?.isPremium && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <span className="text-yellow-600 font-medium">Premium Store</span>
          <span className="text-yellow-700 text-sm capitalize">Tier: {settings.premiumTier}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Enable/Disable */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="text-emerald-600" size={24} />
              <div>
                <h2 className="font-semibold text-gray-900">Online Store</h2>
                <p className="text-sm text-gray-500">Enable to list your store in the marketplace</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOnlineStoreEnabled}
                onChange={(e) => setForm({ ...form, isOnlineStoreEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Palette size={20} className="text-emerald-600" />
            Store Appearance
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
            <textarea
              value={form.storeDescription}
              onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
              placeholder="Describe your store..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
            <input
              type="text"
              value={form.storeBannerUrl}
              onChange={(e) => setForm({ ...form, storeBannerUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.storeThemeColor}
                  onChange={(e) => setForm({ ...form, storeThemeColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={form.storeThemeColor}
                  onChange={(e) => setForm({ ...form, storeThemeColor: e.target.value })}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Store Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Store Categories</h2>
          <p className="text-sm text-gray-500">Select the categories that describe your store</p>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  form.storeCategoryIds.includes(cat.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {availableCategories.length === 0 && (
              <p className="text-gray-400 text-sm">No categories available. Admin needs to create them first.</p>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-emerald-600" />
              Delivery Settings
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.deliveryEnabled}
                onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {form.deliveryEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-600" />
            Store Location
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="text"
                value={form.storeLat}
                onChange={(e) => setForm({ ...form, storeLat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g. 33.8938"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="text"
                value={form.storeLng}
                onChange={(e) => setForm({ ...form, storeLng: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g. 35.5018"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle size={20} className="text-emerald-600" />
            WhatsApp
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+961..."
            />
            <p className="text-xs text-gray-400 mt-1">Include country code for WhatsApp checkout</p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Save Settings
          </button>
        </div>

        {updateMutation.isSuccess && (
          <p className="text-green-600 text-sm text-right">Settings saved successfully!</p>
        )}
        {updateMutation.isError && (
          <p className="text-red-600 text-sm text-right">Failed to save settings. Please try again.</p>
        )}
      </form>
    </div>
  )
}
