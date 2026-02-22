import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, X, Loader2, Grid3X3, ToggleLeft, ToggleRight } from 'lucide-react'
import { storeCategoriesApi } from '../lib/api'

interface StoreCategory {
  id: number
  name: string
  nameAr?: string
  icon?: string
  imageUrl?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  storeCount: number
}

interface CategoryForm {
  name: string
  nameAr: string
  icon: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
}

const initialForm: CategoryForm = {
  name: '',
  nameAr: '',
  icon: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
}

export default function StoreCategories() {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CategoryForm>(initialForm)
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading } = useQuery<StoreCategory[]>({
    queryKey: ['store-categories'],
    queryFn: async () => {
      const res = await storeCategoriesApi.getAll()
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => storeCategoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) =>
      storeCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeCategoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] })
    },
  })

  const openCreate = () => {
    setForm(initialForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (cat: StoreCategory) => {
    setForm({
      name: cat.name,
      nameAr: cat.nameAr || '',
      icon: cat.icon || '',
      imageUrl: cat.imageUrl || '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    })
    setEditingId(cat.id)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleDelete = (cat: StoreCategory) => {
    if (cat.storeCount > 0) {
      alert('Cannot delete category with stores assigned. Deactivate it instead.')
      return
    }
    if (confirm(`Delete "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Store Categories</h1>
          <p className="text-gray-400 mt-1">Manage marketplace store categories</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`card p-5 border ${cat.isActive ? 'border-gray-700' : 'border-red-800 opacity-60'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-purple-900/50 flex items-center justify-center">
                      <Grid3X3 className="text-purple-400" size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold">{cat.name}</h3>
                    {cat.nameAr && (
                      <p className="text-gray-400 text-sm" dir="rtl">{cat.nameAr}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {cat.storeCount} {cat.storeCount === 1 ? 'store' : 'stores'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Order: {cat.sortOrder}</span>
                  {cat.isActive ? (
                    <span className="px-2 py-0.5 bg-green-900/40 text-green-400 rounded text-xs">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-900/40 text-red-400 rounded text-xs">Inactive</span>
                  )}
                </div>
              </div>

              {cat.icon && (
                <div className="mt-2 text-xs text-gray-500">Icon: {cat.icon}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {categories.length === 0 && !isLoading && (
        <div className="text-center py-20 text-gray-500">
          No store categories yet. Create one to get started.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Arabic Name</label>
                <input
                  type="text"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="input-field"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Icon</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="input-field"
                    placeholder="e.g. shopping-cart"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Image URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="text-gray-400 hover:text-white"
                >
                  {form.isActive ? (
                    <ToggleRight className="text-green-400" size={28} />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
                <span className="text-sm text-gray-300">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="animate-spin" size={16} />
                  )}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
