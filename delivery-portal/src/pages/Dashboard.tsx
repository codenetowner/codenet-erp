import { useQuery } from '@tanstack/react-query'
import { Users, Wifi, Truck, CheckCircle, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { companyApi } from '../lib/api'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: companyApi.getDashboard,
    refetchInterval: 15000,
  })

  const company = JSON.parse(localStorage.getItem('dp_company') || '{}')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  const cards = [
    { label: 'Total Drivers', value: stats?.totalDrivers ?? 0, icon: Users, color: 'bg-blue-500/10 text-blue-400', iconBg: 'bg-blue-500/20' },
    { label: 'Online Now', value: stats?.onlineDrivers ?? 0, icon: Wifi, color: 'bg-emerald-500/10 text-emerald-400', iconBg: 'bg-emerald-500/20' },
    { label: 'Active Orders', value: stats?.activeOrders ?? 0, icon: Truck, color: 'bg-amber-500/10 text-amber-400', iconBg: 'bg-amber-500/20' },
    { label: 'Completed Today', value: stats?.completedToday ?? 0, icon: CheckCircle, color: 'bg-violet-500/10 text-violet-400', iconBg: 'bg-violet-500/20' },
    { label: "Today's Revenue", value: `$${(stats?.todayRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400', iconBg: 'bg-emerald-500/20' },
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'bg-blue-500/10 text-blue-400', iconBg: 'bg-blue-500/20' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {company.name}</h1>
        <p className="text-slate-400 text-sm mt-1">Here's your fleet overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={20} className={card.color.split(' ')[1]} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Quick Tips</h2>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Go to <span className="text-indigo-400 font-medium">Drivers</span> to add and manage your delivery team</li>
          <li>• View all fleet orders in the <span className="text-indigo-400 font-medium">Orders</span> tab</li>
          <li>• Drivers log in with the Catalyst Driver mobile app using their phone and password</li>
        </ul>
      </div>
    </div>
  )
}
