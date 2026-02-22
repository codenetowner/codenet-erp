import { useState, useEffect } from 'react'
import { accountingApi } from '../lib/api'
import { Plus, X, Eye, RotateCcw, Search } from 'lucide-react'

interface JournalEntryLine {
  id: number
  accountId: number
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description: string | null
}

interface JournalEntry {
  id: number
  entryNumber: string
  entryDate: string
  description: string | null
  referenceType: string | null
  referenceId: number | null
  totalDebit: number
  totalCredit: number
  isPosted: boolean
  isReversed: boolean
  createdAt: string
  lines: JournalEntryLine[]
}

interface Account {
  id: number
  code: string
  name: string
  accountType: string
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

export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [newEntry, setNewEntry] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { accountCode: '', debit: 0, credit: 0, description: '' },
      { accountCode: '', debit: 0, credit: 0, description: '' },
    ]
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (filterType) params.referenceType = filterType

      const [entriesData, accountsData] = await Promise.all([
        accountingApi.getJournalEntries(params),
        accountingApi.getAccounts({ activeOnly: true })
      ])
      setEntries(entriesData)
      setAccounts(accountsData)
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300)
    return () => clearTimeout(timer)
  }, [startDate, endDate, filterType])

  const addLine = () => {
    setNewEntry(prev => ({
      ...prev,
      lines: [...prev.lines, { accountCode: '', debit: 0, credit: 0, description: '' }]
    }))
  }

  const removeLine = (idx: number) => {
    if (newEntry.lines.length <= 2) return
    setNewEntry(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }))
  }

  const updateLine = (idx: number, field: string, value: any) => {
    setNewEntry(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)
    }))
  }

  const handleCreate = async () => {
    const totalDebit = newEntry.lines.reduce((s, l) => s + Number(l.debit), 0)
    const totalCredit = newEntry.lines.reduce((s, l) => s + Number(l.credit), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      alert(`Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)})`)
      return
    }

    if (newEntry.lines.some(l => !l.accountCode)) {
      alert('All lines must have an account selected')
      return
    }

    setSaving(true)
    try {
      await accountingApi.createJournalEntry({
        entryDate: newEntry.entryDate,
        description: newEntry.description,
        lines: newEntry.lines.filter(l => l.debit > 0 || l.credit > 0).map(l => ({
          accountCode: l.accountCode,
          debit: Number(l.debit),
          credit: Number(l.credit),
          description: l.description || null
        }))
      })
      setShowCreateModal(false)
      setNewEntry({
        entryDate: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
          { accountCode: '', debit: 0, credit: 0, description: '' },
          { accountCode: '', debit: 0, credit: 0, description: '' },
        ]
      })
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create entry')
    } finally {
      setSaving(false)
    }
  }

  const handleReverse = async (entry: JournalEntry) => {
    if (!confirm(`Reverse entry ${entry.entryNumber}? This will create a mirror entry.`)) return
    try {
      await accountingApi.reverseJournalEntry(entry.id)
      loadData()
      setViewEntry(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reverse entry')
    }
  }

  const filteredEntries = entries.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.entryNumber.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
  })

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalDebitNew = newEntry.lines.reduce((s, l) => s + Number(l.debit), 0)
  const totalCreditNew = newEntry.lines.reduce((s, l) => s + Number(l.credit), 0)
  const isBalanced = Math.abs(totalDebitNew - totalCreditNew) < 0.001

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500 mt-1">{entries.length} entries</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus size={18} /> Manual Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {Object.entries(REF_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Entries Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Entry #</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No journal entries found</td></tr>
              ) : filteredEntries.map(entry => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{entry.entryNumber}</td>
                  <td className="px-4 py-2.5">{new Date(entry.entryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 max-w-[250px] truncate">{entry.description || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {REF_TYPE_LABELS[entry.referenceType || ''] || entry.referenceType || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">${fmt(entry.totalDebit)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">${fmt(entry.totalCredit)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {entry.isReversed ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Reversed</span>
                    ) : entry.isPosted ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Posted</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setViewEntry(entry)} className="p-1 text-gray-400 hover:text-blue-600"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Entry Modal */}
      {viewEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{viewEntry.entryNumber}</h2>
                <p className="text-sm text-gray-500">{new Date(viewEntry.entryDate).toLocaleDateString()} - {REF_TYPE_LABELS[viewEntry.referenceType || ''] || 'Manual'}</p>
              </div>
              <button onClick={() => setViewEntry(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {viewEntry.description && <p className="text-sm text-gray-600 mb-4">{viewEntry.description}</p>}

            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2">Account</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-right px-4 py-2">Debit</th>
                  <th className="text-right px-4 py-2">Credit</th>
                </tr>
              </thead>
              <tbody>
                {viewEntry.lines.map(line => (
                  <tr key={line.id} className="border-t">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{line.description || '-'}</td>
                    <td className="px-4 py-2 text-right font-mono">{line.debit > 0 ? `$${fmt(line.debit)}` : ''}</td>
                    <td className="px-4 py-2 text-right font-mono">{line.credit > 0 ? `$${fmt(line.credit)}` : ''}</td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-50 font-bold">
                  <td className="px-4 py-2" colSpan={2}>Total</td>
                  <td className="px-4 py-2 text-right font-mono">${fmt(viewEntry.totalDebit)}</td>
                  <td className="px-4 py-2 text-right font-mono">${fmt(viewEntry.totalCredit)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between mt-4">
              <div className="flex gap-2">
                {viewEntry.isReversed && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">This entry has been reversed</span>}
              </div>
              <div className="flex gap-2">
                {!viewEntry.isReversed && viewEntry.isPosted && (
                  <button onClick={() => handleReverse(viewEntry)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    <RotateCcw size={14} /> Reverse
                  </button>
                )}
                <button onClick={() => setViewEntry(null)} className="px-4 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Manual Journal Entry</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={newEntry.entryDate} onChange={e => setNewEntry({...newEntry, entryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Entry description" />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Lines</h3>
              <button onClick={addLine} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><Plus size={14} /> Add Line</button>
            </div>

            <table className="w-full text-sm border rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">Account</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2 w-28">Debit</th>
                  <th className="text-right px-3 py-2 w-28">Credit</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {newEntry.lines.map((line, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-1.5">
                      <select value={line.accountCode} onChange={e => updateLine(idx, 'accountCode', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                        <option value="">Select account...</option>
                        {accounts.map(a => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Line note" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" step="0.01" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-right" placeholder="0.00" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" step="0.01" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-right" placeholder="0.00" />
                    </td>
                    <td className="px-1">
                      {newEntry.lines.length > 2 && (
                        <button onClick={() => removeLine(idx)} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">${fmt(totalDebitNew)}</td>
                  <td className="px-3 py-2 text-right font-mono">${fmt(totalCreditNew)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {!isBalanced && totalDebitNew > 0 && (
              <p className="text-sm text-red-600 mb-4">
                Difference: ${fmt(Math.abs(totalDebitNew - totalCreditNew))} — Debits must equal Credits
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !isBalanced || totalDebitNew === 0} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Posting...' : 'Post Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
