import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, UserX, PauseCircle, PlayCircle, Phone, Mail, Car } from 'lucide-react'
import { companyApi } from '../lib/api'

export default function Drivers() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '', vehicleType: 'car', vehiclePlate: '' })

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: companyApi.getDrivers,
  })

  const addMutation = useMutation({
    mutationFn: (data: any) => companyApi.addDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      setShowAdd(false)
      setForm({ name: '', phone: '', password: '', vehicleType: 'car', vehiclePlate: '' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => companyApi.toggleDriverStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => companyApi.removeDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.password) return
    addMutation.mutate(form)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-slate-400 text-sm mt-1">{drivers.length} drivers in your fleet</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="text-center py-20">
          <Car size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No drivers yet. Add your first driver to get started.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Driver</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Contact</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Vehicle</th>
                <th className="text-center px-5 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-center px-5 py-3 text-slate-400 font-medium">Online</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Deliveries</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Earned</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d: any) => (
                <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {d.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-300 flex items-center gap-1"><Phone size={12} />{d.phone}</span>
                      {d.email && <span className="text-slate-500 flex items-center gap-1"><Mail size={12} />{d.email}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-300 capitalize">{d.vehicleType}{d.vehiclePlate ? ` • ${d.vehiclePlate}` : ''}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${d.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </td>
                  <td className="px-5 py-3 text-right text-white font-medium">{d.totalDeliveries}</td>
                  <td className="px-5 py-3 text-right text-emerald-400 font-medium">${(d.totalEarnings ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleMutation.mutate(d.id)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title={d.status === 'approved' ? 'Suspend' : 'Activate'}
                      >
                        {d.status === 'approved' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Remove ${d.name}?`)) removeMutation.mutate(d.id) }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Add New Driver</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Driver name" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Password" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Vehicle Type</label>
                  <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="van">Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Plate</label>
                  <input value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Plate #" />
                </div>
              </div>
              {addMutation.isError && <p className="text-red-400 text-sm">{(addMutation.error as any)?.response?.data?.message || 'Failed'}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {addMutation.isPending && <Loader2 size={14} className="animate-spin" />} Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
