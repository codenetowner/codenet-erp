import { useState, useEffect, useRef } from 'react'
import { productsApi, warehousesApi } from '../lib/api'
import { TrendingUp, Package, AlertTriangle, RefreshCw, Printer, DollarSign, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ValuationItem {
  id: number
  productId: number
  productName: string
  productSku: string
  categoryName: string | null
  warehouseId: number
  warehouseName: string
  quantity: number
  unitCost: number
  totalValue: number
  retailPrice: number
  totalRetailValue: number
  salesActivity: number
  lastUpdated: string
}

interface ValuationData {
  totalInventoryValue: number
  totalRetailValue: number
  potentialProfit: number
  totalProducts: number
  totalQuantity: number
  highestValueProduct: string | null
  highestValueAmount: number
  lowestValueProduct: string | null
  lowestValueAmount: number
  slowMovingCount: number
  items: ValuationItem[]
}

interface Warehouse {
  id: number
  name: string
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Valuation() {
  const [loading, setLoading] = useState(true)
  const [valuation, setValuation] = useState<ValuationData | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | ''>('')
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory Valuation Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
            .summary-card h3 { color: #6b7280; font-size: 12px; margin: 0 0 5px 0; }
            .summary-card p { font-size: 24px; font-weight: bold; margin: 0; }
            .green { color: #10b981; }
            .blue { color: #3b82f6; }
            .amber { color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Inventory Valuation Report</h1>
            <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Inventory Value (Cost)</h3>
              <p class="green">$${valuation?.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="summary-card">
              <h3>Total Retail Value</h3>
              <p class="blue">$${valuation?.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="summary-card">
              <h3>Potential Profit</h3>
              <p class="green">$${valuation?.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="summary-card">
              <h3>Total Products / Quantity</h3>
              <p>${valuation?.totalProducts} / ${valuation?.totalQuantity.toLocaleString()} units</p>
            </div>
          </div>
          <h2>Inventory Details</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Warehouse</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Cost</th>
                <th class="text-right">Total Value</th>
                <th class="text-right">Retail Value</th>
              </tr>
            </thead>
            <tbody>
              ${valuation?.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.productSku}</td>
                  <td>${item.warehouseName}</td>
                  <td class="text-right">${item.quantity.toLocaleString()}</td>
                  <td class="text-right">$${item.unitCost.toFixed(3)}</td>
                  <td class="text-right">$${item.totalValue.toFixed(3)}</td>
                  <td class="text-right">$${item.totalRetailValue.toFixed(3)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Company Inventory Management System</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [valuationRes, warehousesRes] = await Promise.all([
        productsApi.getValuation(selectedWarehouse ? { warehouseId: selectedWarehouse } : {}),
        warehousesApi.getAll()
      ])
      setValuation(valuationRes.data)
      setWarehouses(warehousesRes.data)
    } catch (error) {
      console.error('Failed to load valuation data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedWarehouse])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
            <select 
              value={selectedWarehouse} 
              onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[150px]"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      <div ref={printRef}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm mb-1">Total Inventory Value</h3>
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            ${valuation?.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{valuation?.totalProducts || 0} products</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm mb-1">Total Retail Value</h3>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ${valuation?.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-xs text-green-500 mt-1">
            +${valuation?.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} potential profit
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm mb-1">Highest Value</h3>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 truncate">{valuation?.highestValueProduct || 'N/A'}</p>
          <p className="text-sm text-emerald-600">
            ${valuation?.highestValueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm mb-1">Slow Moving</h3>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{valuation?.slowMovingCount || 0}</p>
          <p className="text-xs text-gray-400 mt-1">No sales in 30 days</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Value Distribution by Warehouse */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Value by Warehouse</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(() => {
                    const warehouseData: { [key: string]: number } = {}
                    valuation?.items.forEach(item => {
                      warehouseData[item.warehouseName] = (warehouseData[item.warehouseName] || 0) + item.totalValue
                    })
                    return Object.entries(warehouseData).map(([name, value]) => ({ name, value }))
                  })()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={(props: any) => `${props.name}: $${(props.value / 1000).toFixed(1)}k`}
                >
                  {(() => {
                    const warehouseData: { [key: string]: number } = {}
                    valuation?.items.forEach(item => {
                      warehouseData[item.warehouseName] = (warehouseData[item.warehouseName] || 0) + item.totalValue
                    })
                    return Object.keys(warehouseData).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  })()}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Products by Value */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Top 10 Products by Value</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={valuation?.items
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .slice(0, 10)
                  .map(item => ({
                    name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
                    value: item.totalValue,
                    retail: item.totalRetailValue
                  }))}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
              >
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="value" name="Cost Value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost vs Retail Comparison */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Cost vs Retail Value Comparison</h3>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded"></span> Cost Value</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Retail Value</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-emerald-600">${valuation?.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-gray-500 mt-1">Total Cost Value</p>
            <div className="h-3 bg-emerald-500 rounded-full mt-3"></div>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600">${valuation?.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-gray-500 mt-1">Total Retail Value</p>
            <div className="h-3 bg-blue-500 rounded-full mt-3"></div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">Potential Profit Margin</p>
          <p className="text-3xl font-bold text-green-600">
            ${valuation?.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-lg ml-2">
              ({valuation && valuation.totalInventoryValue > 0 
                ? ((valuation.potentialProfit / valuation.totalInventoryValue) * 100).toFixed(1) 
                : 0}%)
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Inventory Details</h2>
          <p className="text-sm text-gray-500">Total quantity: {valuation?.totalQuantity.toLocaleString() || 0} units</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit Cost</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Value</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Retail Value</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Activity (30d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {valuation?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No inventory data available
                  </td>
                </tr>
              ) : (
                valuation?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      {item.categoryName && (
                        <div className="text-xs text-gray-500">{item.categoryName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.productSku}</td>
                    <td className="px-6 py-4 text-sm">{item.warehouseName}</td>
                    <td className="px-6 py-4 text-right font-medium">{item.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      ${item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-600">
                      ${item.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.salesActivity > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.salesActivity} sold
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          No sales
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
