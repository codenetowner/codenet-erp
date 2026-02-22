import { useEffect, useState } from 'react'
import {
  BarChart3, Users, ShoppingBag, DollarSign, TrendingUp,
  Store, Crown, Megaphone, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react'
import { analyticsApi } from '../lib/api'

interface AnalyticsData {
  customers: { total: number; thisMonth: number; lastMonth: number }
  orders: {
    total: number; today: number; thisMonth: number; lastMonth: number
    statusBreakdown: Record<string, number>
  }
  revenue: {
    totalGMV: number; gmvThisMonth: number; gmvLastMonth: number
    totalAdRevenue: number; adRevenueThisMonth: number
    premiumRevenue: number; activePremiums: number; totalPlatformRevenue: number
  }
  stores: { totalOnlineStores: number; premiumStores: number }
  topStores: { companyId: number; storeName: string; orderCount: number; revenue: number }[]
  ordersPerDay: { date: string; count: number; revenue: number }[]
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string; value: string; subtitle?: string
  icon: any; color: string; trend?: { value: number; label: string }
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend.value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.get()
      .then(res => setData(res.data))
      .catch(err => console.error('Analytics load failed:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-gray-400 py-20">
        Failed to load analytics data.
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    preparing: 'bg-indigo-500',
    delivering: 'bg-cyan-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
  }

  const maxDayCount = Math.max(...data.ordersPerDay.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm">Platform-wide metrics and performance</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={data.customers.total.toLocaleString()}
          subtitle={`${data.customers.thisMonth} new this month`}
          icon={Users}
          color="bg-blue-600"
          trend={{ value: pctChange(data.customers.thisMonth, data.customers.lastMonth), label: 'vs last month' }}
        />
        <StatCard
          title="Total Orders"
          value={data.orders.total.toLocaleString()}
          subtitle={`${data.orders.today} today · ${data.orders.thisMonth} this month`}
          icon={ShoppingBag}
          color="bg-purple-600"
          trend={{ value: pctChange(data.orders.thisMonth, data.orders.lastMonth), label: 'vs last month' }}
        />
        <StatCard
          title="GMV (Delivered)"
          value={`$${data.revenue.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`$${data.revenue.gmvThisMonth.toFixed(2)} this month`}
          icon={DollarSign}
          color="bg-green-600"
          trend={{ value: pctChange(data.revenue.gmvThisMonth, data.revenue.gmvLastMonth), label: 'vs last month' }}
        />
        <StatCard
          title="Platform Revenue"
          value={`$${data.revenue.totalPlatformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`Ads: $${data.revenue.totalAdRevenue.toFixed(2)} · Premium: $${data.revenue.premiumRevenue.toFixed(2)}`}
          icon={TrendingUp}
          color="bg-amber-600"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Online Stores"
          value={data.stores.totalOnlineStores.toString()}
          icon={Store}
          color="bg-teal-600"
        />
        <StatCard
          title="Premium Stores"
          value={data.stores.premiumStores.toString()}
          subtitle={`${data.revenue.activePremiums} active subscriptions`}
          icon={Crown}
          color="bg-yellow-600"
        />
        <StatCard
          title="Ad Revenue"
          value={`$${data.revenue.totalAdRevenue.toFixed(2)}`}
          subtitle={`$${data.revenue.adRevenueThisMonth.toFixed(2)} this month`}
          icon={Megaphone}
          color="bg-pink-600"
        />
        <StatCard
          title="Avg Order Value"
          value={data.orders.total > 0
            ? `$${(data.revenue.totalGMV / Math.max(data.orders.statusBreakdown.delivered || 1, 1)).toFixed(2)}`
            : '$0.00'}
          icon={BarChart3}
          color="bg-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders per day chart */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Orders (Last 30 Days)</h3>
          {data.ordersPerDay.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {data.ordersPerDay.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  style={{ minWidth: 4 }}
                >
                  <div
                    className="bg-purple-500 rounded-t hover:bg-purple-400 transition-colors w-full"
                    style={{ height: `${(day.count / maxDayCount) * 100}%`, minHeight: day.count > 0 ? 4 : 0 }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                    {day.date}: {day.count} orders · ${day.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No order data available</p>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Order Status</h3>
          <div className="space-y-3">
            {Object.entries(data.orders.statusBreakdown).map(([status, count]) => {
              const total = data.orders.total || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300 capitalize">{status}</span>
                    <span className="text-sm text-gray-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColors[status] || 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top stores */}
      {data.topStores.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Top Stores by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Store</th>
                  <th className="text-right py-2 px-3">Orders</th>
                  <th className="text-right py-2 px-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topStores.map((store, i) => (
                  <tr key={store.companyId} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{store.storeName}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300">{store.orderCount}</td>
                    <td className="py-2.5 px-3 text-right text-green-400 font-medium">${store.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
