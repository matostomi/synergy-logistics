import { useEffect, useState } from 'react'
import { GitMerge, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customersService } from '../services/api'

const EMPTY_FORM = { company_name: '', contact_name: '', email: '', phone_number: '', factory_location: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [mergingId, setMergingId] = useState(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [merging, setMerging] = useState(false)

  const load = () => {
    customersService.list().then(({ data }) => setCustomers(data.results ?? data)).catch(() => setError('Could not load customers.'))
  }

  useEffect(load, [])

  const openAddForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (c) => {
    setForm({
      company_name: c.company_name, contact_name: c.contact_name || '', email: c.email || '',
      phone_number: c.phone_number || '', factory_location: c.factory_location || '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, email: form.email || null }
    try {
      if (editingId) await customersService.update(editingId, payload)
      else await customersService.create(payload)
      setShowForm(false)
      load()
    } catch {
      setError('Could not save this customer.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? Their shipments will remain but lose this link.')) return
    try {
      await customersService.remove(id)
      load()
    } catch {
      setError('Could not delete this customer.')
    }
  }

  const handleMerge = async (sourceId) => {
    if (!mergeTarget) return
    const source = customers.find((c) => c.id === sourceId)
    const target = customers.find((c) => c.id === Number(mergeTarget))
    if (!window.confirm(`Merge "${source.company_name}" into "${target.company_name}"? This can't be undone — "${source.company_name}" will be deleted and its shipments moved to "${target.company_name}".`)) {
      return
    }
    setMerging(true)
    setError('')
    try {
      const { data } = await customersService.merge(target.id, sourceId)
      setMergingId(null)
      setMergeTarget('')
      load()
      window.alert(`Merged. ${data.shipments_reassigned} shipment(s) moved to "${target.company_name}".`)
    } catch {
      setError('Could not merge these customers.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <>
      <div className="topline">Accounts</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Customers</h1>
        <button className="btn" onClick={openAddForm}><Plus size={16} /> Add Customer</button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-row">
            <input placeholder="Company name" value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
            <input placeholder="Contact name" value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div className="form-row">
            <input placeholder="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone number" value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="form-row">
            <input placeholder="Factory / fabric location" value={form.factory_location}
              onChange={(e) => setForm({ ...form, factory_location: e.target.value })} />
          </div>
          <div className="form-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Customer'}</button>
            <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Factory Location</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.company_name}</td>
              <td>{c.contact_name || '—'}</td>
              <td>{c.email || '—'}</td>
              <td>{c.phone_number || '—'}</td>
              <td>{c.factory_location || '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} to={`/shipments?search=${encodeURIComponent(c.company_name)}`}>Shipments</Link>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEditForm(c)}><Pencil size={13} /> Edit</button>
                  <button
                    className="btn secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => { setMergingId(mergingId === c.id ? null : c.id); setMergeTarget('') }}
                  >
                    <GitMerge size={13} /> Merge
                  </button>
                  <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(c.id)}><Trash2 size={13} /></button>
                </div>
                {mergingId === c.id && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Merge into:</span>
                    <select
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      style={{ background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}
                    >
                      <option value="">Select the customer to keep…</option>
                      {customers.filter((other) => other.id !== c.id).map((other) => (
                        <option key={other.id} value={other.id}>{other.company_name}</option>
                      ))}
                    </select>
                    <button
                      className="btn"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={!mergeTarget || merging}
                      onClick={() => handleMerge(c.id)}
                    >
                      {merging ? 'Merging…' : 'Confirm Merge'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {customers.length === 0 && !error && (
            <tr><td colSpan={6} style={{ color: 'var(--text-dim)' }}>No customers yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  )
}
