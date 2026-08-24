import { useEffect, useState } from 'react'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import { driversService } from '../services/api'

const TYPE_OPTIONS = [['van', 'Van'], ['truck', 'Truck'], ['trailer', 'Trailer'], ['motorcycle', 'Motorcycle']]
const FUEL_OPTIONS = [['', '—'], ['diesel', 'Diesel'], ['petrol', 'Petrol'], ['electric', 'Electric']]

const EMPTY_FORM = {
  plate_number: '', vehicle_type: 'truck', capacity_kg: '', fuel_type: '',
  insurance_expiry: '', last_maintenance_date: '', is_active: true,
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = () => {
    driversService.vehicles().then(({ data }) => setVehicles(data.results ?? data)).catch(() => setError('Could not load vehicles.'))
  }

  useEffect(load, [])

  const openAddForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (v) => {
    setForm({
      plate_number: v.plate_number, vehicle_type: v.vehicle_type, capacity_kg: v.capacity_kg || '',
      fuel_type: v.fuel_type || '', insurance_expiry: v.insurance_expiry || '',
      last_maintenance_date: v.last_maintenance_date || '', is_active: v.is_active,
    })
    setEditingId(v.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      capacity_kg: form.capacity_kg || 0,
      insurance_expiry: form.insurance_expiry || null,
      last_maintenance_date: form.last_maintenance_date || null,
    }
    try {
      if (editingId) await driversService.updateVehicle(editingId, payload)
      else await driversService.createVehicle(payload)
      setShowForm(false)
      load()
    } catch {
      setError('Could not save this vehicle. Check that the plate number is unique.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return
    try {
      await driversService.removeVehicle(id)
      load()
    } catch {
      setError('Could not delete this vehicle.')
    }
  }

  const insuranceWarning = (date) => {
    if (!date) return false
    const days = (new Date(date) - new Date()) / 86400000
    return days < 30
  }

  return (
    <>
      <div className="topline">Fleet</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Vehicles</h1>
        <button className="btn" onClick={openAddForm}><Plus size={16} /> Add Vehicle</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-row">
            <input placeholder="Plate number" value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required />
            <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
              {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input placeholder="Capacity (kg)" type="number" value={form.capacity_kg}
              onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} />
          </div>
          <div className="form-row">
            <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
              {FUEL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="date-field">
              Insurance expiry
              <input type="date" value={form.insurance_expiry}
                onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} />
            </label>
            <label className="date-field">
              Last maintenance
              <input type="date" value={form.last_maintenance_date}
                onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })} />
            </label>
          </div>
          <div className="form-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Vehicle'}</button>
            <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Plate</th><th>Type</th><th>Fuel</th><th>Capacity</th><th>Insurance Expiry</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.plate_number}</td>
              <td>{v.vehicle_type}</td>
              <td>{v.fuel_type || '—'}</td>
              <td>{v.capacity_kg} kg</td>
              <td style={{ color: insuranceWarning(v.insurance_expiry) ? 'var(--danger)' : undefined }}>
                {v.insurance_expiry || '—'}
                {insuranceWarning(v.insurance_expiry) && <AlertTriangle size={13} style={{ marginLeft: 4, verticalAlign: '-2px' }} />}
              </td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditForm(v)}><Pencil size={13} /> Edit</button>
                <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(v.id)}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
          {vehicles.length === 0 && !error && (
            <tr><td colSpan={6} style={{ color: 'var(--text-dim)' }}>No vehicles yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  )
}
