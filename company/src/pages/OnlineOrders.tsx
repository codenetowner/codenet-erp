import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp, Phone, MapPin, FileText, UserPlus, Globe } from 'lucide-react'
import { onlineOrdersApi, employeesApi } from '../lib/api'

interface OrderItem {
  id: number
  productId: number
  productName: string
  unitType: string
  quantity: number
  unitPrice: number
  total: number
  currency: string
  notes?: string
}

interface OnlineOrder {
  id: number
  orderNumber: string
  appCustomerId?: number
  customerName: string
  customerPhone: string
  status: string
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  paymentMethod?: string
  paymentStatus: string
  deliveryType: string
  deliveryAddress?: string
  notes?: string
  createdAt: string
  itemCount: number
  items: OrderItem[]
  assignedDriverType?: string
  assignedCompanyDriverId?: number
  assignedFreelanceDriverId?: number
}

interface OrderStats {
  pending: number
  confirmed: number
  preparing: number
  delivering: number
  delivered: number
  cancelled: number
  todayOrders: number
  todayRevenue: number
}

const statusTabs = [
  { key: '', label: 'All', icon: Package },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'delivering', label: 'Delivering', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  delivering: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const nextStatus: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'delivered',
}

export default function OnlineOrders() {
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null)
  const [showDriverModal, setShowDriverModal] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: orders = [], isLoading } = useQuery<OnlineOrder[]>({
    queryKey: ['online-orders', statusFilter],
    queryFn: () => onlineOrdersApi.getAll({ status: statusFilter || undefined }),
    refetchInterval: 15000,
  })

  const { data: stats } = useQuery<OrderStats>({
    queryKey: ['online-order-stats'],
    queryFn: () => onlineOrdersApi.getStats(),
    refetchInterval: 15000,
  })

  const { data: employeesRes } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.getAll(),
  })
  const drivers: any[] = employeesRes?.data || []

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: number; status: string; cancelReason?: string }) =>
      onlineOrdersApi.updateStatus(id, { status, cancelReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] })
      queryClient.invalidateQueries({ queryKey: ['online-order-stats'] })
    },
  })

  const assignDriverMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: number; driverId: number }) =>
      onlineOrdersApi.assignDriver(id, { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] })
      setShowDriverModal(null)
    },
  })

  const requestDriverMutation = useMutation({
    mutationFn: (id: number) => onlineOrdersApi.requestDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] })
      queryClient.invalidateQueries({ queryKey: ['online-order-stats'] })
    },
  })

  const canAssign = (order: OnlineOrder) =>
    order.deliveryType === 'delivery' &&
    !['delivered', 'cancelled'].includes(order.status) &&
    !order.assignedCompanyDriverId && !order.assignedFreelanceDriverId

  const advanceStatus = (order: OnlineOrder) => {
    const next = nextStatus[order.status]
    if (next) {
      updateStatusMutation.mutate({ id: order.id, status: next })
    }
  }

  const cancelOrder = (orderId: number) => {
    updateStatusMutation.mutate({ id: orderId, status: 'cancelled', cancelReason })
    setShowCancelModal(null)
    setCancelReason('')
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Online Orders</h1>
        <p className="text-gray-500 mt-1">Manage incoming online orders</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Today's Orders</p>
            <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-2xl font-bold text-gray-900">${fmt(stats.todayRevenue)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-green-600">Delivered</p>
            <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {statusTabs.map((tab) => {
          const count = stats ? (stats as any)[tab.key] : undefined
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {count !== undefined && tab.key && (
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No orders found{statusFilter ? ` with status "${statusFilter}"` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Order Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-gray-900">#{order.orderNumber || order.id}</span>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    <span>{order.customerName}</span>
                    <span className="text-gray-400">{order.customerPhone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">${fmt(order.total)}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                  {order.assignedCompanyDriverId && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">Company Driver</span>
                  )}
                  {order.assignedDriverType === 'freelance' && !order.assignedFreelanceDriverId && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700">Awaiting Freelancer</span>
                  )}
                  {order.assignedFreelanceDriverId && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">Freelance Driver</span>
                  )}
                  {canAssign(order) && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowDriverModal(order.id)}
                        className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 flex items-center gap-1"
                        title="Assign company driver"
                      >
                        <UserPlus size={12} /> Assign Driver
                      </button>
                      <button
                        onClick={() => requestDriverMutation.mutate(order.id)}
                        disabled={requestDriverMutation.isPending}
                        className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50"
                        title="Send to external freelance delivery"
                      >
                        <Globe size={12} /> External Delivery
                      </button>
                    </div>
                  )}
                  <span className="text-gray-400 text-sm">{order.itemCount} items</span>
                  {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedOrder === order.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="grid grid-cols-3 gap-6">
                    {/* Items */}
                    <div className="col-span-2">
                      <h4 className="font-medium text-gray-700 mb-2">Order Items</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left pb-2">Product</th>
                            <th className="text-right pb-2">Qty</th>
                            <th className="text-right pb-2">Price</th>
                            <th className="text-right pb-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="py-2 text-gray-800">{item.productName}</td>
                              <td className="py-2 text-right text-gray-600">{item.quantity} {item.unitType}</td>
                              <td className="py-2 text-right text-gray-600">${fmt(item.unitPrice)}</td>
                              <td className="py-2 text-right font-medium text-gray-800">${fmt(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="text-gray-500">
                            <td colSpan={3} className="pt-2 text-right">Subtotal:</td>
                            <td className="pt-2 text-right">${fmt(order.subtotal)}</td>
                          </tr>
                          {order.deliveryFee > 0 && (
                            <tr className="text-gray-500">
                              <td colSpan={3} className="text-right">Delivery:</td>
                              <td className="text-right">${fmt(order.deliveryFee)}</td>
                            </tr>
                          )}
                          {order.discount > 0 && (
                            <tr className="text-green-600">
                              <td colSpan={3} className="text-right">Discount:</td>
                              <td className="text-right">-${fmt(order.discount)}</td>
                            </tr>
                          )}
                          <tr className="font-bold text-gray-900">
                            <td colSpan={3} className="text-right pt-1">Total:</td>
                            <td className="text-right pt-1">${fmt(order.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Customer & Actions */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Customer</h4>
                        <p className="text-sm text-gray-800">{order.customerName}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} /> {order.customerPhone}</p>
                        {order.deliveryAddress && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={12} /> {order.deliveryAddress}</p>
                        )}
                        {order.notes && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><FileText size={12} /> {order.notes}</p>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Info</h4>
                        <div className="text-sm space-y-1">
                          <p className="text-gray-500">Payment: <span className="text-gray-700">{order.paymentMethod || 'N/A'}</span></p>
                          <p className="text-gray-500">Delivery: <span className="text-gray-700 capitalize">{order.deliveryType}</span></p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2">
                        {nextStatus[order.status] && (
                          <button
                            onClick={() => advanceStatus(order)}
                            disabled={updateStatusMutation.isPending}
                            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {updateStatusMutation.isPending && <Loader2 className="animate-spin" size={14} />}
                            Move to "{nextStatus[order.status]}"
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => setShowCancelModal(order.id)}
                            className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Cancel Order</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
              rows={3}
              placeholder="Reason for cancellation (optional)..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(null); setCancelReason('') }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                Keep Order
              </button>
              <button
                onClick={() => cancelOrder(showCancelModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-1">Assign Company Driver</h3>
            <p className="text-sm text-gray-500 mb-4">Select a driver from your team to deliver this order</p>
            {drivers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No drivers found. Add employees with a "driver" role first.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                {drivers.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => assignDriverMutation.mutate({ id: showDriverModal, driverId: d.id })}
                    disabled={assignDriverMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                      {d.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.phone || d.role || 'Driver'}</p>
                    </div>
                    <UserPlus size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowDriverModal(null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
