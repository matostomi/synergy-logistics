import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { shipmentsService, customersService, driversService } from '../services/api'
import StatusPill from '../components/StatusPill'

const STATUS_CHOICES = [
  ['pending', 'Pending'],
  ['in_transit', 'In Transit'],
  ['at_customs', 'At Customs'],
  ['technical_issues', 'Technical Issues'],
  ['waiting_cargo_release', 'Waiting Cargo Release'],
  ['factory_unloading', 'Factory Unloading'],
  ['empty_container_returned', 'Empty Container Returned'],
  ['operation_fully_completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

const FILTER_KEYS = ['status', 'search', 'customer', 'driver', 'customs', 'destination', 'date_from', 'date_to', 'awaiting_registration']

function FilterField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const selectStyle = {
  width: '100%', background: 'var(--ink)', color: 'var(--paper)',
  border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px', fontSize: 13,
}

// Classify a free-text container_count value like '1X40', '2x20FT' into a size bucket.
function containerSize(raw) {
  if (!raw) return 'Unspecified'
  const text = raw.toUpperCase()
  if (text.includes('40')) return '40FT'
  if (text.includes('20')) return '20FT'
  return 'Other'
}

// "20 x 20FT" when uniform, "15 x 20FT, 5 x 40FT" when the bill has mixed sizes.
function sizeLabel(sizeCounts, total) {
  const entries = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1])
  if (entries.length === 1) {
    return `${total} x ${entries[0][0]}`
  }
  return entries.map(([size, count]) => `${count} x ${size}`).join(', ')
}

// Group shipment rows into bills: prefer bill_number, fall back to
// operation_number + declaration_number when the bill hasn't been assigned
// yet (e.g. shipments still Awaiting Registration).
function groupByBill(shipments) {
  const map = new Map()
  for (const s of shipments) {
    const key = s.bill_number || `no-bill:${s.operation_number || ''}|${s.declaration_number || ''}|${s.customer_name || ''}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        bill_number: s.bill_number,
        operation_number: s.operation_number,
        declaration_number: s.declaration_number,
        customer_name: s.customer_name,
        destination_address: s.destination_address,
        items: [],
        sizeCounts: {},
        statuses: new Set(),
      })
    }
    const g = map.get(key)
    g.items.push(s)
    const size = containerSize(s.container_count)
    g.sizeCounts[size] = (g.sizeCounts[size] || 0) + 1
    g.statuses.add(s.status)
  }
  return Array.from(map.values())
}

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [openBills, setOpenBills] = useState(() => new Set())
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const active = useMemo(() => {
    const obj = {}
    FILTER_KEYS.forEach((k) => {
      const v = searchParams.get(k)
      if (v) obj[k] = v
    })
    return obj
  }, [searchParams])

  // Local draft state for the filter panel inputs (only applied to the URL on submit)
  const [draft, setDraft] = useState(active)
  useEffect(() => setDraft(active), [active])

  useEffect(() => {
    customersService.list().then(({ data }) => setCustomers(data.results ?? data)).catch(() => {})
    driversService.list().then(({ data }) => setDrivers(data.results ?? data)).catch(() => {})
  }, [])

  useEffect(() => {
    shipmentsService
      .list(Object.keys(active).length ? active : undefined)
      .then(({ data }) => setShipments(data.results ?? data))
      .catch(() => setError('Could not load shipments.'))
  }, [active])

  const bills = useMemo(() => groupByBill(shipments), [shipments])

  const toggleBill = (key) => {
    setOpenBills((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const applyFilters = (e) => {
    e.preventDefault()
    const next = {}
    Object.entries(draft).forEach(([k, v]) => { if (v) next[k] = v })
    setSearchParams(next)
  }

  const clearFilters = () => {
    setDraft({})
    setSearchParams({})
  }

  const activeCount = Object.keys(active).length
  const activeLabels = {
    status: (v) => `Status: ${v.replace(/_/g, ' ')}`,
    search: (v) => `Search: "${v}"`,
    customer: (v) => `Customer: ${customers.find((c) => String(c.id) === v)?.company_name || v}`,
    driver: (v) => `Driver: ${drivers.find((d) => String(d.id) === v)?.full_name || v}`,
    customs: (v) => `Customs: ${v}`,
    destination: (v) => `Destination: ${v}`,
    date_from: (v) => `From ${v}`,
    date_to: (v) => `To ${v}`,
    awaiting_registration: () => 'Awaiting registration',
  }

  return (
    <>
      <div className="topline">
        <Link to="/" style={{ color: 'var(--signal)' }}>← Back to dashboard</Link>
      </div>
      <h1 className="page-title">Shipments</h1>

      <form
        onSubmit={applyFilters}
        style={{
          background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 10,
          padding: 16, marginBottom: 20, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'end',
        }}
      >
        <FilterField label="Customer">
          <select style={selectStyle} value={draft.customer || ''} onChange={(e) => setDraft((d) => ({ ...d, customer: e.target.value }))}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </FilterField>

        <FilterField label="Driver">
          <select style={selectStyle} value={draft.driver || ''} onChange={(e) => setDraft((d) => ({ ...d, driver: e.target.value }))}>
            <option value="">All drivers</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </FilterField>

        <FilterField label="Status">
          <select style={selectStyle} value={draft.status || ''} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="">All statuses</option>
            {STATUS_CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FilterField>

        <FilterField label="Customs Office">
          <input
            style={selectStyle} placeholder="e.g. Djibouti"
            value={draft.customs || ''} onChange={(e) => setDraft((d) => ({ ...d, customs: e.target.value }))}
          />
        </FilterField>

        <FilterField label="Destination">
          <input
            style={selectStyle} placeholder="e.g. Mojo"
            value={draft.destination || ''} onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
          />
        </FilterField>

        <FilterField label="Date From">
          <input
            type="date" style={selectStyle}
            value={draft.date_from || ''} onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
          />
        </FilterField>

        <FilterField label="Date To">
          <input
            type="date" style={selectStyle}
            value={draft.date_to || ''} onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
          />
        </FilterField>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn">Apply Filters</button>
          <button type="button" className="btn secondary" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      {activeCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {Object.entries(active).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 12, background: 'rgba(255,122,48,0.12)', color: 'var(--signal)',
                border: '1px solid rgba(255,122,48,0.3)', borderRadius: 999, padding: '4px 10px',
              }}
            >
              {activeLabels[k] ? activeLabels[k](v) : `${k}: ${v}`}
            </span>
          ))}
        </div>
      )}

      {error && <div className="error-text">{error}</div>}

      <table>
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <th>Customer</th>
            <th>Operation #</th>
            <th>Bill No</th>
            <th>Decl #</th>
            <th>Size</th>
            <th>Destination</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => {
            const isOpen = openBills.has(bill.key)
            const statusArray = Array.from(bill.statuses)
            return (
              <>
                <tr
                  key={bill.key}
                  onClick={() => toggleBill(bill.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{bill.customer_name || '—'}</div>
                  </td>
                  <td>{bill.operation_number || '—'}</td>
                  <td>{bill.bill_number || '—'}</td>
                  <td>{bill.declaration_number || '—'}</td>
                  <td>{sizeLabel(bill.sizeCounts, bill.items.length)}</td>
                  <td>{bill.destination_address || '—'}</td>
                  <td>
                    {statusArray.length === 1
                      ? <StatusPill status={statusArray[0]} />
                      : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Mixed ({statusArray.length})</span>}
                  </td>
                </tr>
                {isOpen && bill.items.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/shipments/${s.id}`)}
                    style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <td></td>
                    <td colSpan={2} style={{ paddingLeft: 28, fontSize: 13, color: 'var(--text-dim)' }}>
                      Container {i + 1}{s.container_number ? ` — ${s.container_number}` : ''}
                    </td>
                    <td colSpan={2} style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                      {containerSize(s.container_count)}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>{s.container_count || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>{s.destination_address || '—'}</td>
                    <td><StatusPill status={s.status} /></td>
                  </tr>
                ))}
              </>
            )
          })}
          {bills.length === 0 && !error && (
            <tr>
              <td colSpan={8} style={{ color: 'var(--text-dim)' }}>No shipments found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
