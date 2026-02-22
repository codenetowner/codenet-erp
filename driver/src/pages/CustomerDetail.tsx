import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, ShoppingCart, Wallet, RefreshCw } from 'lucide-react'
import { customersApi } from '../lib/api'

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  creditLimit: number
  currentBalance: number
}

export default function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCustomer()
    }
  }, [id])

  const loadCustomer = async () => {
    try {
      const res = await customersApi.getById(parseInt(id!))
      setCustomer(res.data)
    } catch (error) {
      console.error('Failed to load customer:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/customers" className="mt-4 text-primary-600">Back to Customers</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 -ml-2 hover:bg-primary-500 rounded-lg">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <p className="text-primary-200 text-sm">Customer #{id}</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Contact Info */}
        <div className="card mb-4">
          {customer.address && (
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <MapPin size={18} />
              <span>{customer.address}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={18} />
              <a href={`tel:${customer.phone}`} className="text-primary-600">{customer.phone}</a>
            </div>
          )}
        </div>

        {/* Balance Card */}
        <div className="card mb-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <p className="text-primary-200 text-sm">Outstanding Balance</p>
          <p className="text-3xl font-bold mt-1">${customer.currentBalance.toFixed(2)}</p>
          <div className="flex justify-between mt-4 text-sm">
            <div>
              <p className="text-primary-200">Credit Limit</p>
              <p className="font-medium">${customer.creditLimit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-primary-200">Available</p>
              <p className="font-medium">${Math.max(0, customer.creditLimit - customer.currentBalance).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link 
            to={`/create-order/${id}`}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <ShoppingCart size={20} />
            New Order
          </Link>
          <Link 
            to={`/collect-cash/${id}`}
            className="btn btn-success flex items-center justify-center gap-2"
          >
            <Wallet size={20} />
            Collect
          </Link>
        </div>
      </div>
    </div>
  )
}
