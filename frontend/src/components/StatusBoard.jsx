import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Circle } from 'lucide-react'
import { shipmentsService } from '../services/api'

// StatusColorContext writes --status-color-<status> onto :root from the colours
// an admin picks in Settings, so the dot reads its colour from there and the
// hex below is only the fallback for a status with no row saved yet.
const COLUMNS = [
  { status: 'in_transit', label: 'Moving', fallback: '#22c55e' },
  { status: 'technical_issues', label: 'Technical Issue', fallback: '#ef4444' },
  { status: 'at_customs', label: 'At Customs', fallback: '#eab308' },
  { status: 'delivered', label: 'Delivered', fallback: '#3b82f6' },
]

function StatusDot({ status, fallback }) {
  const color = `var(--status-color-${status}, ${fallback})`
  return <Circle size={10} color={color} fill={color} style={{ flexShrink: 0 }} />
}

export default function StatusBoard() {
  const [data, setData] = useState({})

  useEffect(() => {
    COLUMNS.forEach((col) => {
      shipmentsService
        .list({ status: col.status, ordering: '-updated_at' })
        .then(({ data: res }) => {
          setData((prev) => ({ ...prev, [col.status]: (res.results ?? res).slice(0, 5) }))
        })
        .catch(() => {})
    })
  }, [])

  return (
    <div>
      <div className="topline" style={{ marginBottom: 4 }}>Operations Board</div>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        A live GPS map needs a real location source (a driver app or GPS tracker per truck) —
        this board gives the same at-a-glance view using actual shipment status instead.
      </p>
      <div className="status-board">
        {COLUMNS.map((col) => (
          <div key={col.status} className="status-column">
            <div className="status-column-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status={col.status} fallback={col.fallback} /> {col.label}
            </div>
            {(data[col.status] || []).length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>None right now</div>
            )}
            {(data[col.status] || []).map((s) => (
              <Link key={s.id} to={`/shipments/${s.id}`} className="status-board-card">
                <div style={{ fontWeight: 600 }}>{s.customer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {s.container_number || s.tracking_number}
                </div>
              </Link>
            ))}
            <Link to={`/shipments?status=${col.status}`} className="status-column-more">
              View all →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
