import { useEffect, useState } from 'react'
import { Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { driversService } from '../services/api'
import StatusPill from '../components/StatusPill'

const STATUS_OPTIONS = [
  ['available', 'Available'],
  ['on_route', 'On Route'],
  ['off_duty', 'Off Duty'],
]

const EMPTY_FORM = { full_name: '', license_number: '', phone_number: '', status: 'available', vehicle: '' }

export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = () => {
    driversService.list().then(({ data }) => setDrivers(data.results ?? data)).catch(() => setError('Could not load drivers.'))
    driversService.vehicles().then(({ data }) => setVehicles(data.results ?? data)).catch(() => {})
  }

  useEffect(load, [])

  const openAddForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (driver) => {
    setForm({
      full_name: driver.full_name,
      license_number: driver.license_number,
      phone_number: driver.phone_number || '',
      status: driver.status,
      vehicle: driver.vehicle || '',
    })
    setEditingId(driver.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, vehicle: form.vehicle || null }
    try {
      if (editingId) {
        await driversService.update(editingId, payload)
      } else {
        await driversService.create(payload)
      }
      setShowForm(false)
      load()
    } catch {
      setError('Could not save this driver. Check that the license number is unique.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver? This cannot be undone.')) return
    try {
      await driversService.remove(id)
      load()
    } catch {
      setError('Could not delete this driver.')
    }
  }

  return (
    <>
      <div className="topline">Fleet</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Drivers</h1>
        <button className="btn" onClick={openAddForm}><Plus size={16} /> Add Driver</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-row">
            <input placeholder="Full name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input placeholder="License number" value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })} required />
            <input placeholder="Phone number" value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="form-row">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
              <option value="">No vehicle assigned</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
            </select>
          </div>
          <div className="form-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Driver'}</button>
            <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td>{d.full_name}</td>
              <td>{d.phone_number || '—'}</td>
              <td>{d.vehicle_detail?.plate_number || '—'}</td>
              <td><StatusPill status={d.status} /></td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditForm(d)}><Pencil size={13} /> Edit</button>
                <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(d.id)}><Trash2 size={13} /></button>
                {d.phone_number && (
                  <a className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} href={`tel:${d.phone_number}`}><Phone size={13} /></a>
                )}
              </td>
            </tr>
          ))}
          {drivers.length === 0 && !error && (
            <tr><td colSpan={5} style={{ color: 'var(--text-dim)' }}>No drivers yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  )
}
