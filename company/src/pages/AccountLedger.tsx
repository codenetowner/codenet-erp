import { useState, useEffect } from 'react'
import { accountingApi } from '../lib/api'
import { Search, ArrowLeft, Printer } from 'lucide-react'

interface Account {
  id: number
  code: string
  name: string
  accountType: string
  balance: number
}

interface LedgerLine {
  id: number
  entryDate: string
  entryNumber: string
  description: string | null
  referenceType: string | null
  referenceId: number | null
  debit: number
  credit: number
  runningBalance: number
}

interface AccountLedger {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  currentBalance: number
  lines: LedgerLine[]
}

const REF_TYPE_LABELS: Record<string, string> = {
  order: 'Sales Order',
  direct_sale: 'Direct Sale',
  collection: 'Collection',
  expense: 'Expense',
  supplier_invoice: 'Supplier Invoice',
  supplier_payment: 'Supplier Payment',
  salary: 'Salary',
  production: 'Production',
  return: 'Return',
  deposit: 'Deposit',
  rm_purchase: 'RM Purchase',
  manual: 'Manual',
  reversal: 'Reversal',
}

export default function AccountLedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [ledger, setLedger] = useState<AccountLedger | null>(null)
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => { loadAccounts() }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await accountingApi.getAccounts({ activeOnly: true })
      setAccounts(data)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLedger = async (accountId: number) => {
    setSelectedAccountId(accountId)
    setLedgerLoading(true)
    try {
      const params: Record<string, any> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const data = await accountingApi.getLedger(accountId, params)
      setLedger(data)
    } catch (err) {
      console.error('Failed to load ledger:', err)
    } finally {
      setLedgerLoading(false)
    }
  }

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger(selectedAccountId)
    }
  }, [startDate, endDate])

  const filteredAccounts = accounts.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
  })

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const typeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800'
      case 'liability': return 'bg-orange-100 text-orange-800'
      case 'equity': return 'bg-purple-100 text-purple-800'
      case 'revenue': return 'bg-green-100 text-green-800'
      case 'expense': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Account list view
  if (!ledger) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Select an account to view its transaction history</p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Account Name</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(account => (
                  <tr
                    key={account.id}
                    onClick={() => loadLedger(account.id)}
                    className="border-t hover:bg-emerald-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{account.code}</td>
                    <td className="px-4 py-2.5 font-medium">{account.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${typeColor(account.accountType)}`}>
                        {account.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">${fmt(account.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Ledger detail view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setLedger(null); setSelectedAccountId(null) }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg print:hidden">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="font-mono text-gray-500 text-lg">{ledger.accountCode}</span> {ledger.accountName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${typeColor(ledger.accountType)}`}>
                {ledger.accountType}
              </span>
              <span className="text-sm text-gray-500">Current Balance: <span className="font-semibold font-mono">${fmt(ledger.currentBalance)}</span></span>
            </div>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 print:hidden">
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Date Filters */}
      <div className="flex gap-3 print:hidden">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Ledger Table */}
      {ledgerLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Entry #</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
                <th className="text-right px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.lines.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No transactions found for this account</td></tr>
              ) : ledger.lines.map(line => (
                <tr key={line.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(line.entryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{line.entryNumber}</td>
                  <td className="px-4 py-2 max-w-[250px] truncate text-gray-600">{line.description || '-'}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {REF_TYPE_LABELS[line.referenceType || ''] || line.referenceType || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{line.debit > 0 ? `$${fmt(line.debit)}` : ''}</td>
                  <td className="px-4 py-2 text-right font-mono">{line.credit > 0 ? `$${fmt(line.credit)}` : ''}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">${fmt(line.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          {ledger.lines.length > 0 && (
            <div className="border-t bg-gray-50 px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-500">{ledger.lines.length} transactions</span>
              <div className="flex gap-6">
                <span>Total Debit: <span className="font-semibold font-mono">${fmt(ledger.lines.reduce((s, l) => s + l.debit, 0))}</span></span>
                <span>Total Credit: <span className="font-semibold font-mono">${fmt(ledger.lines.reduce((s, l) => s + l.credit, 0))}</span></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
