import { useEffect, useState } from 'react'
import { Download, RefreshCw, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { usersService, backupService, googleSheetService, referenceDataService, statusColorService } from '../services/api'
import { useAutoSync } from '../services/AutoSyncContext'
import { useStatusColors } from '../services/StatusColorContext'
import ThemeToggle from '../components/ThemeToggle'

const ROLES = [
  ['admin', 'Administrator'],
  ['operations_officer', 'Operations Officer'],
  ['manager', 'Manager'],
  ['driver', 'Driver'],
  ['customer', 'Customer'],
]

const STATUS_LABELS = [
  ['pending', 'Pending'],
  ['in_transit', 'In Transit'],
  ['at_customs', 'At Customs'],
  ['technical_issues', 'Technical Issues'],
  ['waiting_cargo_release', 'Waiting Cargo Release'],
  ['factory_unloading', 'Factory Unloading'],
  ['empty_container_returned', 'Empty Container Returned'],
  ['delivered', 'Completed'],
  ['cancelled', 'Cancelled'],
]

const inputStyle = {
  background: 'var(--ink)', color: 'var(--paper)',
  border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 13,
}

/** Small add/remove list manager, shared by Destinations / Customs Locations / Border Crossings. */
function ReferenceListEditor({ title, service }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    service.list().then(({ data }) => setItems(data.results ?? data)).catch(() => setError(`Could not load ${title.toLowerCase()}.`))
  }
  useEffect(load, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      await service.create(name)
      setNewName('')
      load()
    } catch (err) {
      setError(err.response?.data?.name?.[0] || `Could not add "${name}".`)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id) => {
    try {
      await service.remove(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('Could not remove that entry.')
    }
  }

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
      <div className="topline" style={{ marginBottom: 10 }}>{title}</div>
      {error && <div className="error-text" style={{ fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span>{item.name}</span>
            <button
              onClick={() => handleRemove(item.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>None added yet.</div>}
      </div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder={`Add ${title.toLowerCase().replace(/s$/, '')}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn secondary" disabled={saving}>Add</button>
      </form>
    </div>
  )
}

function StatusColorsEditor() {
  const { colors, defaults, refresh } = useStatusColors()
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => setDraft(colors), [colors])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await statusColorService.update(draft)
      refresh()
      setMessage('Saved.')
    } catch {
      setMessage('Could not save status colors.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => setDraft(defaults)

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, padding: 16, maxWidth: 480 }}>
      <div className="topline" style={{ marginBottom: 12 }}>Status Colors</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STATUS_LABELS.map(([value, label]) => (
          <div key={value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span className={`status-pill status-${value}`}>{label}</span>
            <input
              type="color"
              value={draft[value] || defaults[value] || '#8a94a0'}
              onChange={(e) => setDraft((d) => ({ ...d, [value]: e.target.value }))}
              style={{ width: 36, height: 26, border: '1px solid var(--line)', borderRadius: 4, background: 'none', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Colors'}</button>
        <button className="btn secondary" onClick={handleReset} disabled={saving}>Reset to Defaults</button>
      </div>
      {message && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>{message}</div>}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const {
    enabled: autoSyncEnabled,
    setEnabled: setAutoSyncEnabled,
    intervalSeconds,
    setIntervalSeconds,
    lastSyncAt,
    lastSyncResult,
    syncing: autoSyncing,
  } = useAutoSync()

  const load = () => {
    usersService
      .list()
      .then(({ data }) => setUsers(data.results ?? data))
      .catch(() => setError('Could not load users. Admin access is required for this page.'))
  }

  useEffect(load, [])

  const handleRoleChange = async (id, role) => {
    setSavingId(id)
    try {
      await usersService.update(id, { role })
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
    } catch {
      setError('Could not update that role.')
    } finally {
      setSavingId(null)
    }
  }

  const handleRestore = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!window.confirm('Restoring will overwrite existing data with the backup file. Continue?')) {
      e.target.value = ''
      return
    }
    setRestoring(true)
    setRestoreMessage('')
    try {
      await backupService.restore(file)
      setRestoreMessage('Backup restored successfully. Refresh the app to see the restored data.')
    } catch {
      setRestoreMessage('Restore failed — check that this is a valid backup file.')
    } finally {
      setRestoring(false)
      e.target.value = ''
    }
  }

  const handleGoogleSheetSync = async () => {
    setSyncing(true)
    setSyncMessage('')
    try {
      const { data } = await googleSheetService.sync()
      setSyncMessage(`Synced: ${data.pulled_created} new from sheet, ${data.pulled_updated} updated from sheet.`)
    } catch (err) {
      setSyncMessage(err.response?.data?.detail || 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="error-text">
        Settings is only available to Administrators.
      </div>
    )
  }

  return (
    <>
      <div className="topline">System</div>
      <h1 className="page-title">Settings</h1>

      {error && <div className="error-text">{error}</div>}

      <div className="topline" style={{ marginBottom: 12 }}>Appearance</div>
      <div style={{ marginBottom: 32 }}>
        <ThemeToggle />
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Users &amp; Roles</div>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email || '—'}</td>
              <td>
                <select
                  value={u.role}
                  disabled={savingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  style={{
                    background: 'var(--ink)', color: 'var(--paper)',
                    border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px',
                  }}
                >
                  {ROLES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>Backup &amp; Restore</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <a className="btn" href={backupService.downloadUrl()} target="_blank" rel="noreferrer">
          <Download size={15} /> Download Backup
        </a>
        <label className="btn secondary" style={{ cursor: 'pointer' }}>
          {restoring ? 'Restoring…' : <><Upload size={15} /> Restore from Backup</>}
          <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} disabled={restoring} />
        </label>
      </div>
      {restoreMessage && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)' }}>{restoreMessage}</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', maxWidth: 600 }}>
        For automatic scheduled backups, see the instructions provided alongside this update
        for setting up a daily task in Windows Task Scheduler.
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>Google Sheets Sync</div>
      <button className="btn" onClick={handleGoogleSheetSync} disabled={syncing}>
        {syncing ? 'Syncing…' : <><RefreshCw size={15} /> Sync Now</>}
      </button>
      {syncMessage && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-dim)' }}>{syncMessage}</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', maxWidth: 600 }}>
        Reads the Google Sheet and updates the app to match. Read-only — this never
        writes back to your sheet, so your formatting and dropdowns stay untouched.
      </div>

      <div style={{
        marginTop: 20, padding: 16, background: 'var(--panel)',
        border: '1px solid var(--line)', borderRadius: 8, maxWidth: 480,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
          />
          Auto-sync automatically
        </label>

        {autoSyncEnabled && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Every</span>
            <select
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
              style={{
                background: 'var(--ink)', color: 'var(--paper)',
                border: '1px solid var(--line)', borderRadius: 6, padding: '5px 8px', fontSize: 13,
              }}
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
            </select>
          </div>
        )}

        {autoSyncEnabled && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            {autoSyncing && 'Syncing now…'}
            {!autoSyncing && lastSyncAt && (
              <>
                Last synced {lastSyncAt.toLocaleTimeString()} —{' '}
                {lastSyncResult?.ok
                  ? `${lastSyncResult.pulled_created} new, ${lastSyncResult.pulled_updated} updated`
                  : lastSyncResult?.detail || 'unknown result'}
              </>
            )}
            {!autoSyncing && !lastSyncAt && 'Waiting for first sync…'}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
          Runs quietly in the background while the app is open in your browser — it stops if you
          close the tab. This setting is remembered on this computer/browser.
        </div>
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>Manage</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <Link to="/customers" className="btn secondary">Customers</Link>
        <Link to="/drivers" className="btn secondary">Driver Database</Link>
        <Link to="/vehicles" className="btn secondary">Vehicle Database</Link>
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Reference Data</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
        <ReferenceListEditor title="Destinations" service={referenceDataService.destinations} />
        <ReferenceListEditor title="Customs Locations" service={referenceDataService.customsLocations} />
        <ReferenceListEditor title="Border Crossings" service={referenceDataService.borderCrossings} />
      </div>

      <StatusColorsEditor />

      <div style={{ marginTop: 32, color: 'var(--text-dim)', fontSize: 13, maxWidth: 600 }}>
        <strong style={{ color: 'var(--paper)' }}>Roadmap:</strong> a dedicated audit log view
        (currently the Notifications page covers shipment status changes) is a good next step.
        New users are still added via the Django admin at <code>/admin/</code> for now.
      </div>
    </>
  )
}
