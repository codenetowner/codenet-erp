import { useState, useEffect } from 'react'
import { FileText, Download, Printer, TrendingUp, Users, DollarSign, Package, Loader2, Truck } from 'lucide-react'
import { reportsApi, vansApi } from '../lib/api'

interface DashboardData {
  todaySales: number
  todayOrders: number
  todayCollections: number
  todayDeposits: number
  monthSales: number
  monthOrders: number
  monthCollections: number
  totalOutstandingDebt: number
  cashInVans: number
  activeDrivers: number
}

interface Van {
  id: number
  name: string
  driverName?: string
}

interface VanPerformance {
  vanId: number
  vanName: string
  driverName: string
  totalSales: number
  totalOrders: number
  cashCollected: number
  deposits: number
  currentCash: number
}

interface ReportData {
  [key: string]: any
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Van Performance state
  const [vans, setVans] = useState<Van[]>([])
  const [selectedVan, setSelectedVan] = useState<string>('')
  const [vanPerformance, setVanPerformance] = useState<VanPerformance[]>([])

  const reports = [
    { id: 'vanPerformance', name: 'Van Performance', icon: Truck, description: 'Sales and activity per van' },
    { id: 'sales', name: 'Sales Report', icon: DollarSign, description: 'Summary of all orders and sales' },
    { id: 'collections', name: 'Collections Report', icon: Package, description: 'Summary of all cash collections' },
    { id: 'stock', name: 'Stock Report', icon: Package, description: 'Current inventory levels' },
    { id: 'expenses', name: 'Expenses Report', icon: TrendingUp, description: 'Summary of all expenses' },
    { id: 'driver', name: 'Driver Performance', icon: Users, description: 'Driver activity and performance' },
  ]

  useEffect(() => {
    loadDashboard()
    loadVans()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await reportsApi.getDashboard()
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    }
  }

  const loadVans = async () => {
    try {
      const res = await vansApi.getAll()
      setVans(res.data.map((v: any) => ({ id: v.id, name: v.name, driverName: v.driverName })))
    } catch (err) {
      console.error('Failed to load vans:', err)
    }
  }

  const generateReport = async () => {
    if (!selectedReport || !startDate || !endDate) return
    setLoading(true)
    try {
      let data
      switch (selectedReport) {
        case 'vanPerformance':
          data = await reportsApi.getVanPerformance(startDate, endDate, selectedVan ? parseInt(selectedVan) : undefined)
          setVanPerformance(data.vans || [])
          break
        case 'sales':
          data = await reportsApi.getSales(startDate, endDate)
          break
        case 'collections':
          data = await reportsApi.getCollections(startDate, endDate)
          break
        case 'stock':
          data = await reportsApi.getStock()
          break
        case 'expenses':
          data = await reportsApi.getExpenses(startDate, endDate)
          break
        case 'driver':
          data = await reportsApi.getDriverPerformance(startDate, endDate)
          break
      }
      setReportData(data)
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Today Sales</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.todaySales)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Month Sales</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.monthSales)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Outstanding Debt</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dashboard.totalOutstandingDebt)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Drivers</p>
                <p className="text-lg font-bold text-gray-900">{dashboard.activeDrivers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Select Report</h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => { setSelectedReport(report.id); setReportData(null) }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    selectedReport === report.id
                      ? 'bg-emerald-50 border-2 border-emerald-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className={selectedReport === report.id ? 'text-emerald-500' : 'text-gray-400'} />
                    <div>
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500">{report.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters & Results */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            {/* Van filter - only show for Van Performance report */}
            {selectedReport === 'vanPerformance' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Van</label>
                <select
                  value={selectedVan}
                  onChange={(e) => setSelectedVan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Vans</option>
                  {vans.map(v => (
                    <option key={v.id} value={v.id}>{v.name} {v.driverName ? `(${v.driverName})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={generateReport}
                disabled={!selectedReport || loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                Generate Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={18} /> Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Printer size={18} /> Print
              </button>
            </div>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                {reports.find(r => r.id === selectedReport)?.name}
              </h2>
              
              {selectedReport === 'sales' && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totalSales)}</p>
                      <p className="text-sm text-gray-500">Total Sales</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{reportData.totalOrders}</p>
                      <p className="text-sm text-gray-500">Orders</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.averageOrderValue)}</p>
                      <p className="text-sm text-gray-500">Avg Order Value</p>
                    </div>
                  </div>
                  {reportData.topProducts?.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Top Products</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Product</th>
                            <th className="text-right p-2">Qty Sold</th>
                            <th className="text-right p-2">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topProducts.map((p: any, i: number) => (
                            <tr key={`${p.productId}-${p.variantId ?? 'base'}-${i}`} className="border-b">
                              <td className="p-2">
                                <div>{p.productName}</div>
                                {p.variantName && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                                    {p.variantName}
                                  </span>
                                )}
                              </td>
                              <td className="text-right p-2">{p.quantitySold}</td>
                              <td className="text-right p-2">{formatCurrency(p.totalRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === 'collections' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totalAmount)}</p>
                      <p className="text-sm text-gray-500">Total Collected</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{reportData.totalCollections}</p>
                      <p className="text-sm text-gray-500">Collections</p>
                    </div>
                  </div>
                  {reportData.byDriver?.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">By Driver</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Driver</th>
                            <th className="text-right p-2">Count</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.byDriver.map((d: any) => (
                            <tr key={d.driverId} className="border-b">
                              <td className="p-2">{d.driverName}</td>
                              <td className="text-right p-2">{d.count}</td>
                              <td className="text-right p-2">{formatCurrency(d.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === 'stock' && (
                <div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{reportData.totalProducts}</p>
                      <p className="text-sm text-gray-500">Total Products</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalWarehouseValue)}</p>
                      <p className="text-sm text-gray-500">Warehouse Value</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{reportData.lowStockCount}</p>
                      <p className="text-sm text-gray-500">Low Stock Items</p>
                    </div>
                  </div>
                  {reportData.lowStockProducts?.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Low Stock Alert</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Product</th>
                            <th className="text-right p-2">Warehouse</th>
                            <th className="text-right p-2">Vans</th>
                            <th className="text-right p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.lowStockProducts.map((p: any) => (
                            <tr key={p.productId} className="border-b">
                              <td className="p-2">{p.productName}</td>
                              <td className="text-right p-2">{p.warehouseStock}</td>
                              <td className="text-right p-2">{p.vanStock}</td>
                              <td className="text-right p-2 font-medium text-red-600">{p.totalStock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === 'expenses' && (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalAmount)}</p>
                      <p className="text-sm text-gray-500">Total Expenses</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{reportData.totalExpenses}</p>
                      <p className="text-sm text-gray-500">Transactions</p>
                    </div>
                  </div>
                  {reportData.byCategory?.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">By Category</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Category</th>
                            <th className="text-right p-2">Count</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.byCategory.map((c: any, i: number) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{c.categoryName}</td>
                              <td className="text-right p-2">{c.count}</td>
                              <td className="text-right p-2">{formatCurrency(c.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === 'vanPerformance' && (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{reportData.totalVans}</p>
                      <p className="text-sm text-gray-500">Total Vans</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(vanPerformance.reduce((sum, v) => sum + v.totalSales, 0))}</p>
                      <p className="text-sm text-gray-500">Total Sales</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{vanPerformance.reduce((sum, v) => sum + v.totalOrders, 0)}</p>
                      <p className="text-sm text-gray-500">Total Orders</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(vanPerformance.reduce((sum, v) => sum + v.currentCash, 0))}</p>
                      <p className="text-sm text-gray-500">Cash in Vans</p>
                    </div>
                  </div>
                  
                  {vanPerformance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-semibold">Van</th>
                            <th className="text-left p-3 font-semibold">Driver</th>
                            <th className="text-right p-3 font-semibold">Orders</th>
                            <th className="text-right p-3 font-semibold">Sales</th>
                            <th className="text-right p-3 font-semibold">Collections</th>
                            <th className="text-right p-3 font-semibold">Deposits</th>
                            <th className="text-right p-3 font-semibold">Current Cash</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vanPerformance.map((v) => (
                            <tr key={v.vanId} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium">{v.vanName}</td>
                              <td className="p-3">{v.driverName}</td>
                              <td className="text-right p-3">{v.totalOrders}</td>
                              <td className="text-right p-3 font-medium text-emerald-600">{formatCurrency(v.totalSales)}</td>
                              <td className="text-right p-3 text-blue-600">{formatCurrency(v.cashCollected)}</td>
                              <td className="text-right p-3 text-red-600">-{formatCurrency(v.deposits)}</td>
                              <td className="text-right p-3 font-bold">{formatCurrency(v.currentCash)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Truck size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No van performance data for the selected period</p>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === 'driver' && (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center mb-6">
                    <p className="text-2xl font-bold text-emerald-600">{reportData.totalDrivers}</p>
                    <p className="text-sm text-gray-500">Drivers</p>
                  </div>
                  {reportData.drivers?.length > 0 && (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Driver</th>
                          <th className="text-right p-2">Orders</th>
                          <th className="text-right p-2">Sales</th>
                          <th className="text-right p-2">Collections</th>
                          <th className="text-right p-2">Shifts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.drivers.map((d: any) => (
                          <tr key={d.driverId} className="border-b">
                            <td className="p-2">{d.driverName}</td>
                            <td className="text-right p-2">{d.totalOrders}</td>
                            <td className="text-right p-2">{formatCurrency(d.totalSales)}</td>
                            <td className="text-right p-2">{formatCurrency(d.totalCollections)}</td>
                            <td className="text-right p-2">{d.shiftsWorked}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {!reportData && selectedReport && (
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Select date range and click "Generate Report" to view data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
