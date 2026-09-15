import { useEffect, useState } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { dashboardService } from '../services/api'

function BillItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 4, borderBottom: '1px solid #2a2a2a', paddingBottom: 6 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '6px 0', fontSize: 13.5,
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <strong>{item.customer_name}</strong>
        <span style={{ color: '#666' }}>—</span>
        <strong>{item.label}</strong>
        <span style={{ color: '#888' }}>
          — {item.size_label || `${item.container_count} ${item.container_count === 1 ? 'container' : 'containers'}`}
        </span>
      </div>
      {open && (
        <div style={{ marginLeft: 20, borderLeft: '1px solid #333', paddingLeft: 12, marginBottom: 4 }}>
          {item.shipments.map((s, i) => (
            <div key={s.id} style={{ fontSize: 12.5, padding: '3px 0', color: '#ccc' }}>
              Container {i + 1}
              {s.container_number ? ` (${s.container_number})` : ''}
              {s.status_display ? ` — ${s.status_display}` : ''}
              {s.destination_address ? ` — ${s.destination_address}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GroupedDrilldownModal({ category, title, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    setError('')
    dashboardService
      .grouped(category)
      .then(({ data }) => setData(data))
      .catch(() => setError('Could not load details.'))
  }, [category])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#181818', borderRadius: 12, width: '90%', maxWidth: 640,
          maxHeight: '80vh', overflowY: 'auto', padding: 20, border: '1px solid #2a2a2a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && <div style={{ color: '#f66' }}>{error}</div>}
        {!data && !error && <div style={{ color: '#888' }}>Loading…</div>}
        {data && data.items.length === 0 && (
          <div style={{ color: '#888' }}>Nothing here right now.</div>
        )}
        {data && data.items.map((item) => (
          <BillItem key={`${item.customer_name}-${item.label}`} item={item} />
        ))}
      </div>
    </div>
  )
}
