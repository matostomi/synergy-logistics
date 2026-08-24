import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { shipmentsService } from '../services/api'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import ShipmentTimeline from '../components/ShipmentTimeline'
import DocumentCenter from '../components/DocumentCenter'

const FIELD_GROUPS = [
  {
    title: 'Operation',
    fields: [
      ['operation_number', 'Operation number'],
      ['bill_number', 'Bill number'],
      ['declaration_number', 'Declaration #'],
      ['customs_office', 'Customs office'],
      ['border_crossing', 'Border crossing'],
    ],
  },
  {
    title: 'Container / cargo',
    fields: [
      ['container_number', 'Container number'],
      ['container_count', 'No. of containers'],
      ['liner', 'Liner'],
      ['weight_kg', 'Weight'],
      ['items', 'Items'],
      ['destination_address', 'Destination'],
    ],
  },
  {
    title: 'Dates',
    fields: [
      ['document_received_date', 'Document received'],
      ['loading_date', 'Loading date'],
      ['vessel_arrival_date', 'Vessel arrival'],
      ['customs_arrival', 'Customs arrival'],
      ['customs_released', 'Customs released'],
      ['factory_arrival', 'Factory arrival'],
      ['factory_unloading', 'Factory unloading'],
      ['empty_container_return_date', 'Empty container return'],
    ],
  },
  {
    title: 'Other',
    fields: [
      ['truck_plate_number_raw', 'Truck plate number'],
      ['rate', 'Rate'],
      ['cost', 'Cost'],
      ['remark', 'Remark'],
    ],
  },
]

export default function ShipmentDetail() {
  const { id } = useParams()
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    shipmentsService
      .get(id)
      .then(({ data }) => setShipment(data))
      .catch(() => setError('Could not load this shipment.'))
  }, [id])

  if (error) {
    return <div className="error-text">{error}</div>
  }

  if (!shipment) {
    return <div style={{ color: 'var(--text-dim)' }}>Loading…</div>
  }

  return (
    <>
      <div className="topline">
        <Link to="/shipments" style={{ color: 'var(--signal)' }}>← Back to shipments</Link>
      </div>
      <div className="topline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{shipment.tracking_number}</span>
        <StatusPill status={shipment.status} />
      </div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>{shipment.customer_name}</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 4, fontSize: 15 }}>
        Operation #: <strong style={{ color: 'var(--paper)' }}>{shipment.operation_number || '—'}</strong>
        <span style={{ margin: '0 10px' }}>·</span>
        Decl #: <strong style={{ color: 'var(--paper)' }}>{shipment.declaration_number || '—'}</strong>
      </p>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 16 }}>
        {shipment.eta_display && (
          <span>
            ETA: <strong style={{ color: 'var(--paper)' }}>{shipment.eta_display}</strong>
          </span>
        )}
      </p>

      <div style={{ marginBottom: 24, maxWidth: 480 }}>
        <ProgressBar percent={shipment.progress_percent} statusLabel={shipment.status.replace(/_/g, ' ')} />
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Timeline</div>
      <div style={{ marginBottom: 32 }}>
        <ShipmentTimeline shipment={shipment} />
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div className="topline" style={{ marginBottom: 8 }}>QR Tracking</div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/track/${shipment.tracking_number}`)}`}
            alt="QR code"
            style={{ borderRadius: 8, border: '1px solid var(--line)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, maxWidth: 140 }}>
            Scan for a public status page — no login needed.
          </div>
        </div>

        {shipment.customer_phone && (
          <div>
            <div className="topline" style={{ marginBottom: 8 }}>Notify Customer</div>
            <a
              className="btn"
              style={{ display: 'inline-block', background: '#25D366', borderColor: '#25D366' }}
              target="_blank" rel="noreferrer"
              href={`https://wa.me/${shipment.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Dear Customer,\nYour shipment ${shipment.tracking_number} has reached ${shipment.destination_address || 'its destination'}.\nStatus: ${shipment.status.replace(/_/g, ' ')}\nThank you.\nSynergy Plus Logistics Service`
              )}`}
            >
              <MessageSquare size={15} /> Send WhatsApp Update
            </a>
          </div>
        )}
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Documents</div>
      <div style={{ marginBottom: 32 }}>
        <DocumentCenter shipmentId={shipment.id} />
      </div>

      {shipment.events?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="topline" style={{ marginBottom: 12 }}>Notification History</div>
          <table>
            <tbody>
              {shipment.events.map((e) => (
                <tr key={e.id}>
                  <td style={{ width: 160 }}>{new Date(e.timestamp).toLocaleString()}</td>
                  <td><StatusPill status={e.status} /></td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {FIELD_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 24 }}>
          <div className="topline" style={{ marginBottom: 12 }}>{group.title}</div>
          <table>
            <tbody>
              {group.fields.map(([key, label]) => (
                <tr key={key}>
                  <th style={{ width: 220 }}>{label}</th>
                  <td>{shipment[key] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}
