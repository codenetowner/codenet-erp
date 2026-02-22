import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save } from 'lucide-react'
import api from '../lib/api'

interface SidebarSection {
  id?: number
  name: string
  pages: string[]
}

// All available pages in the system
const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'employees', label: 'Employees' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'roles', label: 'Roles' },
  { id: 'vans', label: 'Vans' },
  { id: 'salesmen', label: 'Salesmen' },
  { id: 'warehouses', label: 'Warehouses' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'units', label: 'Units' },
  { id: 'stock-adjustment', label: 'Stock Adjustment' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'inventory-settings', label: 'Inventory Settings' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'raw-material-purchases', label: 'RM Purchases' },
  { id: 'production-orders', label: 'Production Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'leads', label: 'Leads' },
  { id: 'tasks', label: 'Orders & Tasks' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'direct-sales', label: 'Direct Sales' },
  { id: 'cash', label: 'Cash' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'chart-of-accounts', label: 'Chart of Accounts' },
  { id: 'journal-entries', label: 'Journal Entries' },
  { id: 'account-ledger', label: 'Account Ledger' },
  { id: 'financial-reports', label: 'Financial Reports' },
  { id: 'reports', label: 'Reports' },
  { id: 'deep-report', label: 'Deep Report' },
  { id: 'online-store-settings', label: 'Store Settings' },
  { id: 'online-orders', label: 'Online Orders' },
  { id: 'settings', label: 'Settings' },
  { id: 'sidebar-settings', label: 'Sidebar Config' },
]

export default function SidebarSettings() {
  const [sections, setSections] = useState<SidebarSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [newSectionName, setNewSectionName] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await api.get('/sidebar/config')
      if (response.data.sections && response.data.sections.length > 0) {
        setSections(response.data.sections)
      } else {
        // Default sections if none exist
        setSections([
          { name: 'Main', pages: ['dashboard'] },
          { name: 'Team', pages: ['employees', 'attendance', 'roles'] },
          { name: 'Operations', pages: ['vans', 'salesmen', 'warehouses'] },
          { name: 'Inventory', pages: ['products', 'categories', 'units', 'stock-adjustment', 'valuation', 'inventory-settings'] },
          { name: 'Production', pages: ['raw-materials', 'raw-material-purchases', 'production-orders'] },
          { name: 'Sales', pages: ['customers', 'leads', 'tasks', 'quotes', 'direct-sales'] },
          { name: 'Finance', pages: ['cash', 'suppliers', 'expenses', 'currencies'] },
          { name: 'Accounting', pages: ['chart-of-accounts', 'journal-entries', 'account-ledger', 'financial-reports'] },
          { name: 'Reports', pages: ['reports', 'deep-report'] },
          { name: 'Online Store', pages: ['online-store-settings', 'online-orders'] },
          { name: 'Settings', pages: ['settings'] },
        ])
      }
    } catch (error) {
      console.error('Failed to load sidebar config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/sidebar/config', { sections })
      alert('Sidebar configuration saved!')
    } catch (error) {
      console.error('Failed to save sidebar config:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const addSection = () => {
    if (!newSectionName.trim()) return
    setSections([...sections, { name: newSectionName.trim(), pages: [] }])
    setNewSectionName('')
  }

  const deleteSection = (index: number) => {
    if (!confirm('Delete this section? Pages will be unassigned.')) return
    setSections(sections.filter((_, i) => i !== index))
  }

  const updateSectionName = (index: number, name: string) => {
    const updated = [...sections]
    updated[index].name = name
    setSections(updated)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setSections(updated)
  }

  const togglePage = (sectionIndex: number, pageId: string) => {
    const updated = [...sections]
    const section = updated[sectionIndex]
    if (section.pages.includes(pageId)) {
      section.pages = section.pages.filter(p => p !== pageId)
    } else {
      section.pages.push(pageId)
    }
    setSections(updated)
  }

  const getAssignedPages = () => {
    const assigned = new Set<string>()
    sections.forEach(s => s.pages.forEach(p => assigned.add(p)))
    return assigned
  }

  const getUnassignedPages = () => {
    const assigned = getAssignedPages()
    return AVAILABLE_PAGES.filter(p => !assigned.has(p.id))
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sidebar Configuration</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sections</h2>
            
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50">
                    <GripVertical size={18} className="text-gray-400 cursor-grab" />
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateSectionName(index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                    />
                    <span className="text-xs text-gray-500 px-2">{section.pages.length} pages</span>
                    <button
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                      className="p-1 text-blue-500 hover:text-blue-700 text-xs"
                    >
                      {expandedSection === index ? 'Hide' : 'Edit'}
                    </button>
                    <button
                      onClick={() => deleteSection(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {expandedSection === index && (
                    <div className="p-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Select pages for this section:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_PAGES.map(page => {
                          const isInSection = section.pages.includes(page.id)
                          const isAssignedElsewhere = !isInSection && sections.some((s, i) => i !== index && s.pages.includes(page.id))
                          return (
                            <label
                              key={page.id}
                              className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${
                                isInSection ? 'bg-emerald-50 border border-emerald-200' :
                                isAssignedElsewhere ? 'bg-gray-100 text-gray-400' :
                                'bg-white border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isInSection}
                                onChange={() => togglePage(index, page.id)}
                                disabled={isAssignedElsewhere}
                                className="w-3.5 h-3.5"
                              />
                              <span className={isAssignedElsewhere ? 'line-through' : ''}>{page.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new section */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addSection()}
              />
              <button
                onClick={addSection}
                disabled={!newSectionName.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>
          </div>
        </div>

        {/* Unassigned Pages */}
        <div className="bg-white rounded-xl shadow-sm p-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Unassigned Pages</h2>
          <p className="text-xs text-gray-500 mb-3">These pages are not assigned to any section:</p>
          
          {getUnassignedPages().length === 0 ? (
            <p className="text-sm text-gray-400 italic">All pages are assigned</p>
          ) : (
            <div className="space-y-1">
              {getUnassignedPages().map(page => (
                <div key={page.id} className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  {page.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Organize your sidebar by creating sections and assigning pages to them. 
          The order of sections and pages will be reflected in your sidebar navigation.
        </p>
      </div>
    </div>
  )
}
