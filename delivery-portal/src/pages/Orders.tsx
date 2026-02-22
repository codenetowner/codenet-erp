import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, MapPin, User, Package } from 'lucide-react'
import { companyApi } from '../lib/api'

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-400',
  preparing: 'bg-amber-500/10 text-amber-400',
  delivering: 'bg-violet-500/10 text-violet-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

const filters = ['all', 'delivering', 'delivered', 'cancelled']

export default function Orders() {
  const [filter, setFilter] = useState('all')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => companyApi.getOrders(filter === 'all' ? undefined : filter),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fleet Orders</h1>
          <p className="text-slate-400 text-sm mt-1">{orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No orders found</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Order</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Store</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Customer</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Driver</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Address</th>
                <th className="text-center px-5 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Total</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-5 py-3">
                    <span className="text-indigo-400 font-medium text-xs">{o.orderNumber}</span>
                  </td>
                  <td className="px-5 py-3 text-white">{o.storeName}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <User size={13} className="text-slate-500" />
                      <span>{o.customerName}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{o.customerPhone}</span>
                  </td>
                  <td className="px-5 py-3">
                    {o.driverName ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-xs font-medium">{o.driverName}</span>
                    ) : (
                      <span className="text-slate-600 text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {o.deliveryAddress ? (
                      <div className="flex items-center gap-1 text-slate-400 text-xs max-w-[200px]">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{o.deliveryAddress}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">Pickup</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[o.status] || 'bg-slate-700 text-slate-400'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-white font-medium">${(o.total ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-slate-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
