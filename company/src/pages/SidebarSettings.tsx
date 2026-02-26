import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'

interface SidebarSection {
  id?: number
  name: string
  pages: string[]
}

// All available pages in the system
const ALL_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'employees', label: 'Employees' },
  { id: 'attendances-time-off', label: 'Attendances & Time Off' },
  { id: 'users-companies', label: 'Users & Companies' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'sales-teams', label: 'Sales Teams' },
  { id: 'locations-warehouses', label: 'Locations & Warehouses' },
  { id: 'products', label: 'Products & Variants' },
  { id: 'product-categories', label: 'Product Categories' },
  { id: 'units-of-measure', label: 'Units of Measure (UoM)' },
  { id: 'inventory-adjustments', label: 'Inventory Adjustments' },
  { id: 'inventory-valuation', label: 'Inventory Valuation' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'bill-of-materials', label: 'Bill of Materials (BOM)' },
  { id: 'purchase-orders', label: 'Purchase Orders (PO)' },
  { id: 'manufacturing-orders', label: 'Manufacturing Orders (MO)' },
  { id: 'customers', label: 'Customers' },
  { id: 'crm-pipeline', label: 'CRM / Pipeline' },
  { id: 'activities', label: 'Activities' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'point-of-sale', label: 'Point of Sale (POS)' },
  { id: 'sales-orders', label: 'Sales Orders' },
  { id: 'credit-notes', label: 'Credit Notes / Refunds' },
  { id: 'payment-collections', label: 'Payment Collections' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'employee-expenses', label: 'Employee Expenses' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'chart-of-accounts', label: 'Chart of Accounts' },
  { id: 'journal-entries', label: 'Journal Entries' },
  { id: 'account-ledger', label: 'Account Ledger' },
  { id: 'financial-reports', label: 'Financial Reports' },
  { id: 'sales-analysis', label: 'Sales Analysis' },
  { id: 'advanced-analytics', label: 'Advanced Analytics' },
  { id: 'ecommerce-config', label: 'eCommerce Configuration' },
  { id: 'web-orders', label: 'Web Orders' },
  { id: 'general-settings', label: 'General Settings' },
  { id: 'user-interface', label: 'User Interface' },
]

export default function SidebarSettings() {
  const { user } = useAuth()
  const [sections, setSections] = useState<SidebarSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [draggedPage, setDraggedPage] = useState<{ sectionIndex: number; pageIndex: number } | null>(null)

  // Filter available pages based on company's pagePermissions from admin
  // If no pagePermissions set, show all pages
  const AVAILABLE_PAGES = useMemo(() => {
    if (user?.pagePermissions && user.pagePermissions.length > 0) {
      return ALL_PAGES.filter(page => user.pagePermissions!.includes(page.id))
    }
    return ALL_PAGES
  }, [user?.pagePermissions])

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await api.get('/sidebar/config')
      if (response.data.sections && response.data.sections.length > 0) {
        // Filter saved sections to only include allowed pages
        const allowedPages = user?.pagePermissions && user.pagePermissions.length > 0 
          ? user.pagePermissions 
          : ALL_PAGES.map(p => p.id)
        const filteredSections = response.data.sections.map((section: SidebarSection) => ({
          ...section,
          pages: section.pages.filter((pageId: string) => allowedPages.includes(pageId))
        })).filter((section: SidebarSection) => section.pages.length > 0)
        setSections(filteredSections.length > 0 ? filteredSections : [{ name: 'Pages', pages: allowedPages }])
      } else {
        // Default: put all allowed pages in one section
        const allowedPages = user?.pagePermissions && user.pagePermissions.length > 0 
          ? user.pagePermissions 
          : ALL_PAGES.map(p => p.id)
        setSections([{ name: 'Pages', pages: allowedPages }])
      }
    } catch (error) {
      console.error('Failed to load sidebar config:', error)
      // Fallback: put all allowed pages in one section
      const allowedPages = user?.pagePermissions && user.pagePermissions.length > 0 
        ? user.pagePermissions 
        : ALL_PAGES.map(p => p.id)
      setSections([{ name: 'Pages', pages: allowedPages }])
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

  const handlePageDragStart = (sectionIndex: number, pageIndex: number) => {
    setDraggedPage({ sectionIndex, pageIndex })
  }

  const handlePageDragOver = (e: React.DragEvent, sectionIndex: number, pageIndex: number) => {
    e.preventDefault()
    if (!draggedPage || draggedPage.sectionIndex !== sectionIndex) return
    if (draggedPage.pageIndex === pageIndex) return

    const updated = [...sections]
    const pages = [...updated[sectionIndex].pages]
    const draggedItem = pages[draggedPage.pageIndex]
    pages.splice(draggedPage.pageIndex, 1)
    pages.splice(pageIndex, 0, draggedItem)
    updated[sectionIndex].pages = pages
    setSections(updated)
    setDraggedPage({ sectionIndex, pageIndex })
  }

  const handlePageDragEnd = () => {
    setDraggedPage(null)
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
                      {/* Current pages in order - draggable */}
                      {section.pages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Current order (drag to reorder):</p>
                          <div className="space-y-1">
                            {section.pages.map((pageId, pageIndex) => {
                              const page = AVAILABLE_PAGES.find(p => p.id === pageId)
                              if (!page) return null
                              return (
                                <div
                                  key={pageId}
                                  draggable
                                  onDragStart={() => handlePageDragStart(index, pageIndex)}
                                  onDragOver={(e) => handlePageDragOver(e, index, pageIndex)}
                                  onDragEnd={handlePageDragEnd}
                                  className={`flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded cursor-grab active:cursor-grabbing ${
                                    draggedPage?.sectionIndex === index && draggedPage?.pageIndex === pageIndex ? 'opacity-50' : ''
                                  }`}
                                >
                                  <GripVertical size={14} className="text-emerald-400" />
                                  <span className="text-sm flex-1">{page.label}</span>
                                  <button
                                    onClick={() => togglePage(index, pageId)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add pages */}
                      <p className="text-xs text-gray-500 mb-2">Add pages to this section:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_PAGES.map(page => {
                          const isInSection = section.pages.includes(page.id)
                          const isAssignedElsewhere = !isInSection && sections.some((s, i) => i !== index && s.pages.includes(page.id))
                          if (isInSection) return null // Already shown above
                          return (
                            <label
                              key={page.id}
                              className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${
                                isAssignedElsewhere ? 'bg-gray-100 text-gray-400' :
                                'bg-white border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={false}
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
