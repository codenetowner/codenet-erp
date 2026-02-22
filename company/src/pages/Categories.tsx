import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, X, Eye, Loader2, Tags, Upload, Image } from 'lucide-react'
import { categoriesApi } from '../lib/api'
import api from '../lib/api'

interface Category {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  parentId: number | null
  isActive: boolean
  subcategoryCount: number
  productCount: number
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [showSubcatModal, setShowSubcatModal] = useState(false)
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const [formData, setFormData] = useState({ name: '', description: '', imageUrl: '', isActive: true })
  const [subcatFormData, setSubcatFormData] = useState({ name: '', description: '', imageUrl: '', isActive: true })
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const subcatFileInputRef = useRef<HTMLInputElement>(null)

  const uploadCategoryImage = async (categoryId: number, file: File): Promise<string | null> => {
    const formDataUpload = new FormData()
    formDataUpload.append('image', file)
    try {
      const res = await api.post(`/categories/${categoryId}/upload-image`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data.imageUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      return null
    }
  }

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const res = await categoriesApi.getAll({ parentOnly: true })
      setCategories(res.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubcategories = async (categoryId: number) => {
    try {
      const res = await categoriesApi.getSubcategories(categoryId)
      setSubcategories(res.data)
    } catch (error) {
      console.error('Failed to load subcategories:', error)
      setSubcategories([])
    }
  }

  const resetForm = () => setFormData({ name: '', description: '', imageUrl: '', isActive: true })
  const resetSubcatForm = () => setSubcatFormData({ name: '', description: '', imageUrl: '', isActive: true })

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat)
    setFormData({ name: cat.name, description: cat.description || '', imageUrl: cat.imageUrl || '', isActive: cat.isActive })
    setShowModal(true)
  }

  const handleViewSubcategories = async (cat: Category) => {
    setSelectedCategory(cat)
    await loadSubcategories(cat.id)
    setShowSubcatModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData)
      } else {
        const res = await categoriesApi.create({ ...formData, imageUrl: '' })
        // Upload pending image file for newly created category
        const pendingFile = (fileInputRef.current as any)?._pendingFile
        if (pendingFile && res.data?.id) {
          await uploadCategoryImage(res.data.id, pendingFile)
          ;(fileInputRef.current as any)._pendingFile = null
        }
      }
      setShowModal(false)
      resetForm()
      setEditingCategory(null)
      loadCategories()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitSubcat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subcatFormData.name.trim() || !selectedCategory) return
    setSaving(true)
    try {
      await categoriesApi.create({ ...subcatFormData, parentId: selectedCategory.id })
      setShowAddSubcatModal(false)
      resetSubcatForm()
      loadSubcategories(selectedCategory.id)
      loadCategories() // refresh count
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save subcategory')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await categoriesApi.delete(id)
      loadCategories()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete category')
    }
  }

  const handleDeleteSubcat = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return
    try {
      await categoriesApi.delete(id)
      if (selectedCategory) loadSubcategories(selectedCategory.id)
      loadCategories()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete subcategory')
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
            <Tags className="text-blue-600" /> Categories
          </h1>
          <p className="text-gray-500 text-sm">Manage product categories and subcategories</p>
        </div>
        <button onClick={() => { resetForm(); setEditingCategory(null); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Image</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subcategories</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No categories found</td></tr>
            ) : categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                      <Tags size={20} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{cat.subcategoryCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                    <button onClick={() => handleViewSubcategories(cat)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="View Subcategories"><Eye size={16} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
                  <div className="flex items-center gap-3">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="" className="w-12 h-12 rounded object-cover border" />
                    ) : (
                      <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                        <Image size={20} className="text-gray-400" />
                      </div>
                    )}
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
                      if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return }
                      if (editingCategory) {
                        setUploadingImage(true)
                        const url = await uploadCategoryImage(editingCategory.id, file)
                        setUploadingImage(false)
                        if (url) setFormData(prev => ({ ...prev, imageUrl: url }))
                        else alert('Failed to upload image')
                      } else {
                        setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }))
                        ;(fileInputRef.current as any)._pendingFile = file
                      }
                    }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="rounded" />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Subcategories Modal */}
      {showSubcatModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">Subcategories - {selectedCategory.name}</h2>
              <button onClick={() => setShowSubcatModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="flex justify-between items-center mb-4">
                <h6 className="font-medium">List of Subcategories</h6>
                <button onClick={() => { resetSubcatForm(); setShowAddSubcatModal(true) }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Plus size={16} /> Add Subcategory
                </button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Subcategory</th>
                      <th className="px-3 py-2 text-left">Image</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcategories.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No subcategories</td></tr>
                    ) : subcategories.map((sub) => (
                      <tr key={sub.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{sub.name}</td>
                        <td className="px-3 py-2">
                          {sub.imageUrl ? (
                            <img src={sub.imageUrl} alt={sub.name} className="w-8 h-8 rounded object-cover" />
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleDeleteSubcat(sub.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setShowSubcatModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white rounded-t-xl">
              <h2 className="text-lg font-semibold">Add Subcategory</h2>
              <button onClick={() => setShowAddSubcatModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitSubcat} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory Name *</label>
                  <input type="text" value={subcatFormData.name} onChange={(e) => setSubcatFormData({...subcatFormData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory Image</label>
                  <div className="flex items-center gap-3">
                    {subcatFormData.imageUrl ? (
                      <img src={subcatFormData.imageUrl} alt="" className="w-12 h-12 rounded object-cover border" />
                    ) : (
                      <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                        <Image size={20} className="text-gray-400" />
                      </div>
                    )}
                    <button type="button" onClick={() => subcatFileInputRef.current?.click()} disabled={uploadingImage} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                    <input type="file" ref={subcatFileInputRef} accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
                      if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return }
                      setSubcatFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }))
                      ;(subcatFileInputRef.current as any)._pendingFile = file
                    }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subcatActive" checked={subcatFormData.isActive} onChange={(e) => setSubcatFormData({...subcatFormData, isActive: e.target.checked})} className="rounded" />
                <label htmlFor="subcatActive" className="text-sm">Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddSubcatModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
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
