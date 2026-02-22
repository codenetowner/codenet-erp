import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2, Receipt, Printer } from 'lucide-react'
import { expensesApi, vansApi } from '../lib/api'

interface Expense {
  id: number
  categoryId: number | null
  categoryName: string | null
  vanId: number | null
  vanName: string | null
  amount: number
  expenseDate: string
  description: string | null
  receiptUrl: string | null
}

interface ExpenseCategory {
  id: number
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  expenseCount: number
}

interface Van { id: number; name: string }

export default function Expenses() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [vans, setVans] = useState<Van[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vanFilter, setVanFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)

  // Form data
  const [expenseForm, setExpenseForm] = useState({
    categoryId: '', vanId: '', amount: 0, expenseDate: new Date().toISOString().split('T')[0], description: '', receiptUrl: ''
  })
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', isDefault: false, isActive: true })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [expRes, catRes, vanRes] = await Promise.all([
        expensesApi.getAll(),
        expensesApi.getCategories(),
        vansApi.getAll()
      ])
      setExpenses(expRes.data)
      setCategories(catRes.data)
      setVans(vanRes.data.map((v: any) => ({ id: v.id, name: v.name })))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExpenses = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (vanFilter) params.vanId = vanFilter
      if (categoryFilter) params.categoryId = categoryFilter
      const res = await expensesApi.getAll(params)
      setExpenses(res.data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    }
  }

  useEffect(() => { if (!loading) loadExpenses() }, [startDate, endDate, vanFilter, categoryFilter])

  const resetExpenseForm = () => setExpenseForm({
    categoryId: '', vanId: '', amount: 0, expenseDate: new Date().toISOString().split('T')[0], description: '', receiptUrl: ''
  })

  const resetCategoryForm = () => setCategoryForm({ name: '', description: '', isDefault: false, isActive: true })

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await expensesApi.create({
        ...expenseForm,
        categoryId: expenseForm.categoryId ? parseInt(expenseForm.categoryId) : null,
        vanId: expenseForm.vanId ? parseInt(expenseForm.vanId) : null
      })
      setShowExpenseModal(false)
      resetExpenseForm()
      loadExpenses()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return
    try {
      await expensesApi.delete(id)
      loadExpenses()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete')
    }
  }

  const printExpensesReport = () => {
    const filteredExpenses = expenses.filter(e => {
      if (vanFilter && e.vanId !== parseInt(vanFilter)) return false
      if (categoryFilter && e.categoryId !== parseInt(categoryFilter)) return false
      return true
    })
    
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const byCategory = filteredExpenses.reduce((acc, e) => {
      const cat = e.categoryName || 'Uncategorized'
      acc[cat] = (acc[cat] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expenses Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .summary-card .label { font-size: 12px; color: #666; }
          .by-category { margin-bottom: 20px; }
          .by-category h3 { margin-bottom: 10px; }
          .cat-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Expenses Report</h1>
          <p>${startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="value">${filteredExpenses.length}</div>
            <div class="label">Total Expenses</div>
          </div>
          <div class="summary-card">
            <div class="value">$${total.toFixed(3)}</div>
            <div class="label">Total Amount</div>
          </div>
        </div>

        <div class="by-category">
          <h3>By Category</h3>
          ${Object.entries(byCategory).map(([cat, amt]) => `
            <div class="cat-row">
              <span>${cat}</span>
              <span>$${amt.toFixed(3)}</span>
            </div>
          `).join('')}
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Van</th>
              <th>Description</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map(e => `
              <tr>
                <td>${new Date(e.expenseDate).toLocaleDateString()}</td>
                <td>${e.categoryName || '-'}</td>
                <td>${e.vanName || '-'}</td>
                <td>${e.description || '-'}</td>
                <td class="text-right">$${e.amount.toFixed(3)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4">Total</th>
              <th class="text-right">$${total.toFixed(3)}</th>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleEditCategory = (cat: ExpenseCategory) => {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, description: cat.description || '', isDefault: cat.isDefault, isActive: cat.isActive })
    setShowCategoryModal(true)
  }

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return
    setSaving(true)
    try {
      if (editingCategory) {
        await expensesApi.updateCategory(editingCategory.id, categoryForm)
      } else {
        await expensesApi.createCategory(categoryForm)
      }
      setShowCategoryModal(false)
      resetCategoryForm()
      setEditingCategory(null)
      const res = await expensesApi.getCategories()
      setCategories(res.data)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return
    try {
      await expensesApi.deleteCategory(id)
      const res = await expensesApi.getCategories()
      setCategories(res.data)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="text-blue-600" /> Expenses
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button onClick={() => setActiveTab('expenses')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'expenses' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Expenses
            </button>
            <button onClick={() => setActiveTab('categories')} className={`px-6 py-3 font-medium text-sm ${activeTab === 'categories' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Categories
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'expenses' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <select value={vanFilter} onChange={(e) => setVanFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Vans</option>
                  {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Types</option>
                  {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => { resetExpenseForm(); setShowExpenseModal(true) }} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Add Expense
                </button>
                <button onClick={printExpensesReport} className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  <Printer size={16} /> Print Report
                </button>
              </div>

              {/* Expenses Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Van</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No expenses found</td></tr>
                    ) : expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{exp.expenseDate.split('T')[0]}</td>
                        <td className="px-4 py-3 font-medium">{exp.categoryName || 'General'}</td>
                        <td className="px-4 py-3">{exp.vanName || '-'}</td>
                        <td className="px-4 py-3 font-medium text-red-600">${exp.amount.toFixed(3)}</td>
                        <td className="px-4 py-3 text-gray-500">{exp.description || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteExpense(exp.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'categories' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">{categories.length} categories</span>
                <button onClick={() => { resetCategoryForm(); setEditingCategory(null); setShowCategoryModal(true) }} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Add Category
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Default</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Active</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No categories</td></tr>
                    ) : categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{cat.description || '-'}</td>
                        <td className="px-4 py-3">
                          {cat.isDefault ? (
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleEditCategory(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button onClick={() => setShowExpenseModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={expenseForm.categoryId} onChange={(e) => setExpenseForm({...expenseForm, categoryId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">General</option>
                    {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Van (optional)</label>
                  <select value={expenseForm.vanId} onChange={(e) => setExpenseForm({...expenseForm, vanId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Not linked</option>
                    {vans.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({...expenseForm, expenseDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter description" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'New Expense Category'}</h2>
              <button onClick={() => setShowCategoryModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Office Supplies" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Short description" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isDefault} onChange={(e) => setCategoryForm({...categoryForm, isDefault: e.target.checked})} className="rounded" />
                  <span className="text-sm">Default category</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({...categoryForm, isActive: e.target.checked})} className="rounded" />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
