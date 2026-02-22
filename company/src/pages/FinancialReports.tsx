import { useState } from 'react'
import { accountingApi } from '../lib/api'
import { FileText, TrendingUp, BarChart3, Printer } from 'lucide-react'

interface IncomeStatementLine {
  accountCode: string
  accountName: string
  category: string | null
  amount: number
}

interface IncomeStatement {
  startDate: string
  endDate: string
  revenue: IncomeStatementLine[]
  totalRevenue: number
  costOfGoodsSold: IncomeStatementLine[]
  totalCOGS: number
  grossProfit: number
  operatingExpenses: IncomeStatementLine[]
  totalOperatingExpenses: number
  netProfit: number
}

interface BalanceSheetLine {
  accountCode: string
  accountName: string
  category: string | null
  amount: number
}

interface BalanceSheet {
  asOfDate: string
  assets: BalanceSheetLine[]
  totalAssets: number
  liabilities: BalanceSheetLine[]
  totalLiabilities: number
  equity: BalanceSheetLine[]
  totalEquity: number
  totalLiabilitiesAndEquity: number
}

interface TrialBalanceLine {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  category: string | null
  debit: number
  credit: number
  balance: number
}

type ReportType = 'income' | 'balance' | 'trial'

export default function FinancialReports() {
  const [reportType, setReportType] = useState<ReportType>('income')
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])

  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null)
  const [trialBalance, setTrialBalance] = useState<TrialBalanceLine[]>([])

  const loadReport = async () => {
    setLoading(true)
    try {
      if (reportType === 'income') {
        const data = await accountingApi.getIncomeStatement(startDate, endDate)
        setIncomeStatement(data)
      } else if (reportType === 'balance') {
        const data = await accountingApi.getBalanceSheet({ asOfDate })
        setBalanceSheet(data)
      } else {
        const data = await accountingApi.getTrialBalance({ asOfDate })
        setTrialBalance(data)
      }
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 print:hidden">
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Report Selector */}
      <div className="grid grid-cols-3 gap-4 print:hidden">
        {([
          { type: 'income' as ReportType, label: 'Income Statement', desc: 'Revenue, expenses & profit', icon: TrendingUp, color: 'emerald' },
          { type: 'balance' as ReportType, label: 'Balance Sheet', desc: 'Assets, liabilities & equity', icon: BarChart3, color: 'blue' },
          { type: 'trial' as ReportType, label: 'Trial Balance', desc: 'All accounts debit/credit', icon: FileText, color: 'purple' },
        ]).map(r => (
          <button
            key={r.type}
            onClick={() => setReportType(r.type)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              reportType === r.type ? `border-${r.color}-500 bg-${r.color}-50` : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <r.icon size={24} className={reportType === r.type ? `text-${r.color}-600` : 'text-gray-400'} />
            <h3 className="font-semibold mt-2">{r.label}</h3>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="flex gap-3 items-end print:hidden">
        {reportType === 'income' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">As of Date</label>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
        <button onClick={loadReport} disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm">
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* Income Statement */}
      {reportType === 'income' && incomeStatement && (
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Income Statement</h2>
            <p className="text-sm text-gray-500">{new Date(incomeStatement.startDate).toLocaleDateString()} — {new Date(incomeStatement.endDate).toLocaleDateString()}</p>
          </div>

          {/* Revenue */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 border-b pb-1">Revenue</h3>
            {incomeStatement.revenue.map((item, i) => (
              <div key={i} className="flex justify-between py-1 text-sm">
                <span className="text-gray-600 pl-4">{item.accountName}</span>
                <span className="font-mono">${fmt(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-semibold border-t mt-1">
              <span>Total Revenue</span>
              <span className="font-mono text-green-700">${fmt(incomeStatement.totalRevenue)}</span>
            </div>
          </div>

          {/* COGS */}
          {incomeStatement.costOfGoodsSold.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 border-b pb-1">Cost of Goods Sold</h3>
              {incomeStatement.costOfGoodsSold.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.accountName}</span>
                  <span className="font-mono">${fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold border-t mt-1">
                <span>Total COGS</span>
                <span className="font-mono">${fmt(incomeStatement.totalCOGS)}</span>
              </div>
            </div>
          )}

          {/* Gross Profit */}
          <div className="flex justify-between py-3 font-bold text-lg border-y bg-gray-50 px-4 rounded mb-6">
            <span>Gross Profit</span>
            <span className={`font-mono ${incomeStatement.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${fmt(incomeStatement.grossProfit)}
            </span>
          </div>

          {/* Operating Expenses */}
          {incomeStatement.operatingExpenses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 border-b pb-1">Operating Expenses</h3>
              {incomeStatement.operatingExpenses.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.accountName}</span>
                  <span className="font-mono">${fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold border-t mt-1">
                <span>Total Operating Expenses</span>
                <span className="font-mono">${fmt(incomeStatement.totalOperatingExpenses)}</span>
              </div>
            </div>
          )}

          {/* Net Profit */}
          <div className={`flex justify-between py-4 font-bold text-xl border-y-2 px-4 rounded ${incomeStatement.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span>Net Profit</span>
            <span className={`font-mono ${incomeStatement.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${fmt(incomeStatement.netProfit)}
            </span>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {reportType === 'balance' && balanceSheet && (
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Balance Sheet</h2>
            <p className="text-sm text-gray-500">As of {new Date(balanceSheet.asOfDate).toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets */}
            <div>
              <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 border-b border-blue-200 pb-1">Assets</h3>
              {balanceSheet.assets.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">{item.accountName}</span>
                  <span className="font-mono">${fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 font-bold border-t-2 border-blue-200 mt-2">
                <span className="text-blue-700">Total Assets</span>
                <span className="font-mono text-blue-700">${fmt(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-3 border-b border-orange-200 pb-1">Liabilities</h3>
              {balanceSheet.liabilities.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">{item.accountName}</span>
                  <span className="font-mono">${fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold border-t mt-1 mb-4">
                <span>Total Liabilities</span>
                <span className="font-mono">${fmt(balanceSheet.totalLiabilities)}</span>
              </div>

              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 border-b border-purple-200 pb-1">Equity</h3>
              {balanceSheet.equity.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">{item.accountName}</span>
                  <span className="font-mono">${fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold border-t mt-1 mb-4">
                <span>Total Equity</span>
                <span className="font-mono">${fmt(balanceSheet.totalEquity)}</span>
              </div>

              <div className="flex justify-between py-3 font-bold border-t-2 border-purple-200">
                <span className="text-purple-700">Total L + E</span>
                <span className="font-mono text-purple-700">${fmt(balanceSheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>

          {/* Balance check */}
          <div className={`mt-6 text-center py-3 rounded-lg ${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity) < 0.01 ? (
              <span className="font-semibold">✓ Balance Sheet is balanced</span>
            ) : (
              <span className="font-semibold">✗ Out of balance by ${fmt(Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity))}</span>
            )}
          </div>
        </div>
      )}

      {/* Trial Balance */}
      {reportType === 'trial' && trialBalance.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="text-center py-4 border-b">
            <h2 className="text-xl font-bold">Trial Balance</h2>
            <p className="text-sm text-gray-500">As of {new Date(asOfDate).toLocaleDateString()}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.map(line => (
                <tr key={line.accountId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{line.accountCode}</td>
                  <td className="px-4 py-2">{line.accountName}</td>
                  <td className="px-4 py-2 text-gray-500 capitalize">{line.accountType}</td>
                  <td className="px-4 py-2 text-right font-mono">{line.debit > 0 ? `$${fmt(line.debit)}` : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{line.credit > 0 ? `$${fmt(line.credit)}` : ''}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-gray-50 font-bold">
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right font-mono">${fmt(trialBalance.reduce((s, l) => s + l.debit, 0))}</td>
                <td className="px-4 py-3 text-right font-mono">${fmt(trialBalance.reduce((s, l) => s + l.credit, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && (
        (reportType === 'income' && !incomeStatement) ||
        (reportType === 'balance' && !balanceSheet) ||
        (reportType === 'trial' && trialBalance.length === 0)
      ) && (
        <div className="text-center py-12 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Click "Generate Report" to view the report</p>
        </div>
      )}
    </div>
  )
}
