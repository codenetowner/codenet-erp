import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, Users, DollarSign, Truck, Plus, CreditCard, Receipt } from 'lucide-react'
import { statsApi } from '../lib/api'

interface DashboardData {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  suspendedCompanies: number
  totalIncome: number
  totalVans: number
  totalDrivers: number
  recentCompanies: Array<{
    id: number
    name: string
    status: string
    createdAt: string
  }>
  recentBillings: Array<{
    id: number
    companyName: string
    amount: number
    paymentDate: string
  }>
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await statsApi.getDashboard()
      return res.data
    }
  })

  const stats = [
    { 
      label: 'Total Companies', 
      value: data?.totalCompanies ?? 0, 
      icon: Building2, 
      color: 'bg-purple-600',
      detail: `${data?.activeCompanies ?? 0} active`
    },
    { 
      label: 'Active Companies', 
      value: data?.activeCompanies ?? 0, 
      icon: Users, 
      color: 'bg-green-600',
      detail: `${data?.suspendedCompanies ?? 0} suspended`
    },
    { 
      label: 'Total Revenue', 
      value: `$${(data?.totalIncome ?? 0).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-blue-600',
      detail: 'All time'
    },
    { 
      label: 'Total Vans', 
      value: data?.totalVans ?? 0, 
      icon: Truck, 
      color: 'bg-yellow-600',
      detail: `${data?.totalDrivers ?? 0} drivers`
    },
  ]

  // Only show loading if no cached data
  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/companies" className="btn-secondary flex items-center gap-2">
            <Plus size={18} />
            Add Company
          </Link>
          <Link to="/plans" className="btn-secondary flex items-center gap-2">
            <CreditCard size={18} />
            View Plans
          </Link>
          <Link to="/billing" className="btn-secondary flex items-center gap-2">
            <Receipt size={18} />
            View Billing
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.detail}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Companies</h2>
            <Link to="/companies" className="text-purple-400 hover:text-purple-300 text-sm">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentCompanies && data.recentCompanies.length > 0 ? (
              data.recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{company.name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    company.status === 'active' ? 'bg-green-900 text-green-300' : 
                    company.status === 'suspended' ? 'bg-red-900 text-red-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {company.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No companies yet</p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Payments</h2>
            <Link to="/billing" className="text-purple-400 hover:text-purple-300 text-sm">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentBillings && data.recentBillings.length > 0 ? (
              data.recentBillings.map((billing) => (
                <div key={billing.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{billing.companyName}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(billing.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${billing.amount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No payments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
