import { useEffect, useState } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { dashboardService } from '../services/api'

function BillRow({ bill }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginLeft: 18, marginBottom: 2 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '5px 0', fontSize: 13, background: 'none', border: 'none',
          color: 'inherit', font: 'inherit', width: '100%', textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <strong>{bill.label}</strong>
        <span style={{ color: '#888' }}>— {bill.size_label}</span>
      </button>
      {open && (
        <div style={{ marginLeft: 20, borderLeft: '1px solid #333', paddingLeft: 12, marginBottom: 4 }}>
          {bill.shipments.map((s, i) => (
            <div key={s.id} style={{ fontSize: 12.5, padding: '4px 0', color: '#ccc' }}>
              <div>
                <strong>Container {i + 1}</strong>
                {s.container_number ? ` — ${s.container_number}` : ''}
                {s.size ? ` (${s.size})` : ''}
              </div>
              <div style={{ color: '#999', marginLeft: 2 }}>
                {s.status_display}
                {s.operation_number ? ` · Op ${s.operation_number}` : ''}
                {s.destination_address ? ` · ${s.destination_address}` : ''}
              </div>
              {s.remark && (
                <div style={{ color: '#8a8', marginLeft: 2, fontStyle: 'italic' }}>{s.remark}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerGroup({ group }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 8, borderBottom: '1px solid #2a2a2a', paddingBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600,
          fontSize: 14, background: 'none', border: 'none', color: '#fff', font: 'inherit',
          width: '100%', textAlign: 'left', padding: 0,
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {group.customer_name}
        <span style={{ color: '#888', fontWeight: 400 }}>
          — {group.bill_count} {group.bill_count === 1 ? 'bill' : 'bills'}, {group.total_containers} total
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {group.bills.map((bill) => (
            <BillRow key={bill.label} bill={bill} />
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
        {data && data.groups.length === 0 && (
          <div style={{ color: '#888' }}>Nothing here right now.</div>
        )}
        {data && data.groups.map((group) => (
          <CustomerGroup key={group.customer_name} group={group} />
        ))}
      </div>
    </div>
  )
}
