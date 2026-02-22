import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import { rolesApi } from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface Role {
  id: number
  name: string
  description: string | null
  permissions: string | null
  employeeCount: number
  isSystem: boolean
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({ name: '', permissions: {} as Record<string, boolean> })

  useEffect(() => { loadRoles() }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const res = await rolesApi.getAll()
      setRoles(res.data)
    } catch (error) {
      console.error('Failed to load roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', permissions: {} })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await rolesApi.create({
        name: formData.name,
        permissions: JSON.stringify(formData.permissions)
      })
      setShowModal(false)
      resetForm()
      loadRoles()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      permissions: role.permissions ? JSON.parse(role.permissions) : {}
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setSaving(true)
    try {
      await rolesApi.update(selectedRole.id, {
        name: formData.name,
        permissions: JSON.stringify(formData.permissions)
      })
      setShowEditModal(false)
      resetForm()
      loadRoles()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    try {
      await rolesApi.delete(id)
      loadRoles()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete role')
    }
  }

  const togglePermission = (key: string) => {
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, [key]: !formData.permissions[key] }
    })
  }

  const toggleGroupPermissions = (group: { group: string; items: string[] }) => {
    const allChecked = group.items.every(item => formData.permissions[item])
    const newPermissions = { ...formData.permissions }
    group.items.forEach(item => {
      newPermissions[item] = !allChecked
    })
    setFormData({ ...formData, permissions: newPermissions })
  }

  const toggleAllPermissions = () => {
    const allItems = permissionGroups.flatMap(g => g.items)
    const allChecked = allItems.every(item => formData.permissions[item])
    const newPermissions: Record<string, boolean> = {}
    allItems.forEach(item => {
      newPermissions[item] = !allChecked
    })
    setFormData({ ...formData, permissions: newPermissions })
  }

  const isGroupAllChecked = (group: { group: string; items: string[] }) => {
    return group.items.every(item => formData.permissions[item])
  }

  const isAllChecked = () => {
    return permissionGroups.flatMap(g => g.items).every(item => formData.permissions[item])
  }

  const permissionGroups = [
    { group: 'Dashboard', items: ['View dashboard', 'View statistics', 'View charts'] },
    { group: 'Employees', items: ['View employees', 'Create employees', 'Edit employees', 'Delete employees', 'Manage employee payments'] },
    { group: 'Attendance', items: ['View attendance', 'Create attendance', 'Edit attendance', 'Delete attendance'] },
    { group: 'Roles', items: ['View roles', 'Create roles', 'Edit roles', 'Delete roles'] },
    { group: 'Vans', items: ['View vans', 'Create vans', 'Edit vans', 'Delete vans', 'View van stock', 'Load van stock', 'Unload van stock'] },
    { group: 'Warehouses', items: ['View warehouses', 'Create warehouses', 'Edit warehouses', 'Delete warehouses', 'View warehouse stock', 'Adjust inventory'] },
    { group: 'Products', items: ['View products', 'Create products', 'Edit products', 'Delete products', 'Manage cost history'] },
    { group: 'Categories', items: ['View categories', 'Create categories', 'Edit categories', 'Delete categories'] },
    { group: 'Units', items: ['View units', 'Create units', 'Edit units', 'Delete units'] },
    { group: 'Inventory', items: ['View inventory valuation', 'Edit inventory settings', 'Adjust stock levels'] },
    { group: 'Customers', items: ['View customers', 'Create customers', 'Edit customers', 'Delete customers', 'View balances', 'Edit credit limit', 'Manage special prices'] },
    { group: 'Leads', items: ['View leads', 'Create leads', 'Edit leads', 'Convert leads', 'Reject leads', 'Delete leads'] },
    { group: 'Orders & Tasks', items: ['View orders', 'Create orders', 'Edit orders', 'Cancel orders', 'Delete orders', 'View tasks', 'Create tasks', 'Edit tasks', 'Delete tasks', 'Update task status'] },
    { group: 'Quotes', items: ['View quotes', 'Create quotes', 'Edit quotes', 'Delete quotes', 'Convert quotes to orders'] },
    { group: 'Direct Sales', items: ['View direct sales', 'Create direct sales'] },
    { group: 'Returns', items: ['View returns', 'Create returns', 'Approve returns', 'Reject returns', 'Process returns'] },
    { group: 'Suppliers', items: ['View suppliers', 'Create suppliers', 'Edit suppliers', 'Delete suppliers', 'View invoices', 'Create invoices', 'Manage payments'] },
    { group: 'Expenses', items: ['View expenses', 'Create expenses', 'Edit expenses', 'Delete expenses', 'Manage expense categories'] },
    { group: 'Cash Management', items: ['View collections', 'Create collections', 'View deposits', 'Create deposits', 'Approve deposits', 'Reject deposits', 'View van cash'] },
    { group: 'Currencies', items: ['View currencies', 'Create currencies', 'Edit currencies', 'Delete currencies'] },
    { group: 'Reports', items: ['View deep report', 'View sales report', 'View collections report', 'View stock report', 'View expenses report', 'View driver performance', 'View customer statements', 'View van performance'] },
    { group: 'Settings', items: ['View settings', 'Edit company settings', 'Manage roles & permissions'] },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <PermissionGate permission={PERMISSIONS.CREATE_ROLES}>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
            <Plus size={20} /> Add Role
          </button>
        </PermissionGate>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roles.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No roles found</td></tr>
            ) : roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{role.name}</td>
                <td className="px-6 py-4 text-gray-500">{role.description || '-'}</td>
                <td className="px-6 py-4">{role.employeeCount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${role.isSystem ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <PermissionGate permission={PERMISSIONS.EDIT_ROLES}>
                      <button onClick={() => handleEdit(role)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.DELETE_ROLES}>
                      {!role.isSystem && <button onClick={() => handleDelete(role.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>}
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{showEditModal ? 'Edit Role' : 'Add Role'}</h2>
              <button onClick={() => { setShowModal(false); setShowEditModal(false) }}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={showEditModal ? handleEditSubmit : handleAdd} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter role name" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Permissions</h3>
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-600 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={isAllChecked()} onChange={toggleAllPermissions} />
                      <span>Select All</span>
                    </label>
                  </div>
                  <div className="space-y-4">
                    {permissionGroups.map((group) => (
                      <div key={group.group} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-700">{group.group}</h4>
                          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={isGroupAllChecked(group)} onChange={() => toggleGroupPermissions(group)} />
                            <span>All</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.items.map((item) => (
                            <label key={item} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" className="rounded" checked={!!formData.permissions[item]} onChange={() => togglePermission(item)} />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); setShowEditModal(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
