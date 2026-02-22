import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, Phone, ChevronRight, RefreshCw, Warehouse, Plus } from 'lucide-react'
import { customersApi, warehousesApi } from '../lib/api'

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  creditLimit: number
  currentBalance: number
}

interface WarehouseOption {
  id: number
  name: string
}

export default function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null)
  const [driverWarehouseId, setDriverWarehouseId] = useState<number | null>(null)

  const loadWarehouses = async () => {
    try {
      const res = await warehousesApi.getAll()
      setWarehouses(res.data.warehouses || [])
      const driverWh = res.data.driverWarehouseId
      setDriverWarehouseId(driverWh)
      if (driverWh && selectedWarehouse === null) {
        setSelectedWarehouse(driverWh)
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error)
    }
  }

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const res = await customersApi.getAll(search || undefined, selectedWarehouse || undefined)
      setCustomers(res.data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [search, selectedWarehouse])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Customers</h1>
            <p className="text-primary-200 text-sm">{customers.length} customers</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/customers/add')} className="p-2 rounded-full bg-green-600 hover:bg-green-500">
              <Plus size={20} />
            </button>
            <button onClick={loadCustomers} className="p-2 rounded-full bg-primary-700 hover:bg-primary-600">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Warehouse Filter */}
        {warehouses.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Warehouse</span>
            </div>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value ? Number(e.target.value) : null)}
              className="input"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} {wh.id === driverWarehouseId ? '(My Warehouse)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Customer List */}
        {loading && customers.length === 0 ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-primary-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No customers found
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="card flex items-center justify-between active:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  {customer.address && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin size={14} />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone size={14} />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    ${Math.abs(customer.currentBalance).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {customer.currentBalance > 0 ? 'Owes' : 'Clear'}
                  </p>
                </div>
                <ChevronRight className="text-gray-400 ml-2" size={20} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
