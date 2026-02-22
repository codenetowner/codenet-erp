import { useState, useEffect } from 'react'
import { accountingApi } from '../lib/api'
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Search, RotateCcw } from 'lucide-react'

interface Account {
  id: number
  code: string
  name: string
  accountType: string
  category: string | null
  parentId: number | null
  parentName: string | null
  description: string | null
  isSystem: boolean
  isActive: boolean
  balance: number
  createdAt: string
}

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset', color: 'bg-blue-100 text-blue-800' },
  { value: 'liability', label: 'Liability', color: 'bg-orange-100 text-orange-800' },
  { value: 'equity', label: 'Equity', color: 'bg-purple-100 text-purple-800' },
  { value: 'revenue', label: 'Revenue', color: 'bg-green-100 text-green-800' },
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-800' },
]

const CATEGORIES: Record<string, string[]> = {
  asset: ['Current Asset', 'Fixed Asset', 'Other Asset'],
  liability: ['Current Liability', 'Long-term Liability'],
  equity: ['Equity'],
  revenue: ['Income', 'Other Income'],
  expense: ['COGS', 'Operating Expense', 'Other Expense'],
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    asset: true, liability: true, equity: true, revenue: true, expense: true
  })
  const [form, setForm] = useState({
    code: '', name: '', accountType: 'asset', category: '', parentId: null as number | null, description: '', isActive: true
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadAccounts() }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await accountingApi.getAccounts()
      setAccounts(data)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingAccount(null)
    setForm({ code: '', name: '', accountType: 'asset', category: '', parentId: null, description: '', isActive: true })
    setShowModal(true)
  }

  const openEdit = (account: Account) => {
    setEditingAccount(account)
    setForm({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      category: account.category || '',
      parentId: account.parentId,
      description: account.description || '',
      isActive: account.isActive
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.code || !form.name || !form.accountType) return
    setSaving(true)
    try {
      if (editingAccount) {
        await accountingApi.updateAccount(editingAccount.id, form)
      } else {
        await accountingApi.createAccount(form)
      }
      setShowModal(false)
      loadAccounts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (account: Account) => {
    if (account.isSystem) return alert('Cannot delete system account')
    if (!confirm(`Delete account "${account.code} - ${account.name}"?`)) return
    try {
      await accountingApi.deleteAccount(account.id)
      loadAccounts()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete account')
    }
  }

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const handleReset = async () => {
    try {
      setResetting(true)
      await accountingApi.resetAccounting()
      setShowResetConfirm(false)
      await loadAccounts()
    } catch (err) {
      console.error('Failed to reset accounting:', err)
      alert('Failed to reset accounting data')
    } finally {
      setResetting(false)
    }
  }

  const filtered = accounts.filter(a => {
    if (filterType && a.accountType !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q)
    }
    return true
  })

  const grouped = ACCOUNT_TYPES.map(type => ({
    ...type,
    accounts: filtered.filter(a => a.accountType === type.value)
  })).filter(g => g.accounts.length > 0)

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            <RotateCcw size={18} /> Reset Balances
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Plus size={18} /> Add Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-gray-500">Total Assets</p>
          <p className="text-lg font-bold text-blue-600">${fmt(accounts.filter(a => a.accountType === 'asset').reduce((s, a) => s + a.balance, 0))}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-gray-500">Total Liabilities</p>
          <p className="text-lg font-bold text-orange-600">${fmt(accounts.filter(a => a.accountType === 'liability').reduce((s, a) => s + a.balance, 0))}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold text-green-600">${fmt(accounts.filter(a => a.accountType === 'revenue').reduce((s, a) => s + a.balance, 0))}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-lg font-bold text-red-600">${fmt(accounts.filter(a => a.accountType === 'expense').reduce((s, a) => s + a.balance, 0))}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.value} className="bg-white rounded-lg border overflow-hidden">
              <button
                onClick={() => toggleType(group.value)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedTypes[group.value] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${group.color}`}>{group.label}</span>
                  <span className="text-sm text-gray-500">({group.accounts.length} accounts)</span>
                </div>
                <span className="text-sm font-semibold">${fmt(group.accounts.reduce((s, a) => s + a.balance, 0))}</span>
              </button>
              {expandedTypes[group.value] && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-2">Code</th>
                      <th className="text-left px-4 py-2">Account Name</th>
                      <th className="text-left px-4 py-2">Category</th>
                      <th className="text-right px-4 py-2">Balance</th>
                      <th className="text-center px-4 py-2">Status</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.accounts.map(account => (
                      <tr key={account.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold">{account.code}</td>
                        <td className="px-4 py-2.5">
                          {account.name}
                          {account.isSystem && <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">System</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{account.category || '-'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">${fmt(account.balance)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(account)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                            {!account.isSystem && (
                              <button onClick={() => handleDelete(account)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingAccount ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
                  <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1050" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                  <select value={form.accountType} onChange={e => setForm({...form, accountType: e.target.value, category: ''})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Petty Cash" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    {(CATEGORIES[form.accountType] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
                  <select value={form.parentId ?? ''} onChange={e => setForm({...form, parentId: e.target.value ? Number(e.target.value) : null})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">None (Top Level)</option>
                    {accounts.filter(a => a.accountType === form.accountType && a.id !== editingAccount?.id).map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional description" />
              </div>
              {editingAccount && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
                  Active
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <RotateCcw size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reset Accounting Data</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will delete <strong>all journal entries</strong> and reset <strong>all account balances to zero</strong>. 
              The chart of accounts structure will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleReset} disabled={resetting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {resetting ? 'Resetting...' : 'Reset All Balances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
