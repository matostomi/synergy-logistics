import { useEffect, useState } from 'react'
import {
  Building2, CheckCircle2, ClipboardList, Factory, Package, Plane, RefreshCw,
  Train, TrainFront, Truck,
} from 'lucide-react'
import { masterDatabaseService } from '../services/api'
import StatusPill from '../components/StatusPill'
import MasterOperationDetail from '../components/MasterOperationDetail'

const MODES = [
  { key: 'all', label: 'All', Icon: ClipboardList },
  { key: 'air', label: 'Air', Icon: Plane },
  { key: 'multimodal', label: 'Multimodal', Icon: RefreshCw },
  { key: 'unimodal', label: 'Unimodal · Road', Icon: Truck },
  { key: 'other', label: 'Other', Icon: Package },
]

const MODE_COLUMNS = {
  air: [['awb_number', 'AWB #'], ['customer_name', 'Customer'], ['transport_provider', 'Carrier'], ['declaration_number', 'Declaration']],
  multimodal: [['container_number', 'Container'], ['customer_name', 'Customer'], ['shipping_line', 'Ocean Carrier'], ['inland_transport_mode', 'Inland'], ['transport_provider', 'Provider']],
  unimodal: [['container_number', 'Container'], ['customer_name', 'Customer'], ['driver_name', 'Driver'], ['truck_plate_number', 'Truck'], ['transport_provider', 'Provider']],
  other: [['customer_name', 'Customer'], ['container_number', 'Reference'], ['transport_provider', 'Provider']],
  all: [['customer_name', 'Customer'], ['container_number', 'Container / Ref'], ['inland_transport_mode', 'Inland'], ['transport_provider', 'Provider']],
}

const prettyInland = (value) =>
  value === 'train' ? <><TrainFront size={13} /> ESL Train</>
  : value === 'road' ? <><Truck size={13} /> ESL Truck</>
  : '—'

export default function MasterOperations() {
  const [mode, setMode] = useState('all')
  const [stats, setStats] = useState(null)
  const [operations, setOperations] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    masterDatabaseService.stats(mode).then(({ data }) => setStats(data)).catch(() => {})
  }, [mode])

  useEffect(() => {
    setLoading(true)
    const params = { page }
    if (mode !== 'all') params.transport_mode = mode
    if (search.trim()) params.search = search.trim()

    masterDatabaseService.list(params)
      .then(({ data }) => {
        setOperations(data.results ?? data)
        setCount(data.count ?? (data.results ?? data).length)
        setError('')
      })
      .catch(() => setError('Could not load operations.'))
      .finally(() => setLoading(false))
  }, [mode, page, search])

  const columns = MODE_COLUMNS[mode] || MODE_COLUMNS.all
  const totalPages = Math.max(1, Math.ceil(count / 25))

  return (
    <>
      <div className="topline">Master Database · Phase 2</div>
      <h1 className="page-title">Master Operations</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: -16, marginBottom: 20 }}>
        {count.toLocaleString()} record{count === 1 ? '' : 's'} · transport structure enabled
      </p>

      <div className="mode-tabs">
        {MODES.map((item) => (
          <button
            key={item.key}
            className={`mode-tab ${mode === item.key ? 'active' : ''}`}
            onClick={() => { setMode(item.key); setPage(1) }}
          >
            <item.Icon size={14} /> {item.label}
            {stats?.mode_counts && item.key !== 'all' && (
              <span className="mode-tab-count">{stats.mode_counts[item.key] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {stats && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 12 }}>
            <div className="kpi-card"><div className="kpi-icon"><Package size={22} /></div><div className="kpi-value">{stats.total}</div><div className="kpi-label">Total Operations</div></div>
            <div className="kpi-card"><div className="kpi-icon"><Truck size={22} /></div><div className="kpi-value">{stats.active_operations}</div><div className="kpi-label">Active Operations</div></div>
            <div className="kpi-card"><div className="kpi-icon"><Building2 size={22} /></div><div className="kpi-value">{stats.at_customs}</div><div className="kpi-label">At Customs</div></div>
            <div className="kpi-card"><div className="kpi-icon"><CheckCircle2 size={22} /></div><div className="kpi-value">{stats.completed}</div><div className="kpi-label">Completed</div></div>
          </div>
          <div className="kpi-grid" style={{ marginBottom: 12 }}>
            <div className="kpi-card"><div className="kpi-icon"><Truck size={22} /></div><div className="kpi-value">{stats.trucks_in_transit}</div><div className="kpi-label">Trucks in Transit</div></div>
            <div className="kpi-card"><div className="kpi-icon"><Train size={22} /></div><div className="kpi-value">{stats.esl_train}</div><div className="kpi-label">ESL Train</div></div>
            <div className="kpi-card"><div className="kpi-icon"><Truck size={22} /></div><div className="kpi-value">{stats.esl_truck}</div><div className="kpi-label">ESL Truck</div></div>
            <div className="kpi-card"><div className="kpi-icon"><Plane size={22} /></div><div className="kpi-value">{stats.air_shipments}</div><div className="kpi-label">Air Shipments</div></div>
          </div>
          <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: '1fr' }}>
            <div className="kpi-card"><div className="kpi-icon"><Factory size={22} /></div><div className="kpi-value">{stats.factory_unloading}</div><div className="kpi-label">Factory Unloading</div></div>
          </div>
        </>
      )}

      {stats?.sub_breakdown?.length > 0 && (
        <div className="sub-breakdown-row">
          {stats.sub_breakdown.map((item) => (
            <span key={item.transport_provider} className="sub-breakdown-chip">
              {item.transport_provider}: <strong>{item.count}</strong>
            </span>
          ))}
        </div>
      )}

      <input
        className="master-search"
        placeholder="Search operation, customer, container, truck, declaration, carrier…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
      />

      {error && <div className="error-text">{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Operation #</th>
              {columns.map(([key, label]) => <th key={key}>{label}</th>)}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id} onClick={() => setSelectedId(op.id)} style={{ cursor: 'pointer' }}>
                <td>{op.operation_number}</td>
                {columns.map(([key]) => (
                  <td key={key}>{key === 'inland_transport_mode' ? prettyInland(op[key]) : (op[key] || '—')}</td>
                ))}
                <td><StatusPill status={op.status} /></td>
              </tr>
            ))}
            {!loading && operations.length === 0 && (
              <tr><td colSpan={columns.length + 2}>No operations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Page {page} of {totalPages}</span>
          <button className="btn secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      {selectedId && <MasterOperationDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  )
}
