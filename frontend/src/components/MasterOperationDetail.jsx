import { useEffect, useState } from 'react'
import { masterDatabaseService } from '../services/api'
import StatusPill from '../components/StatusPill'

const TIMELINE_STAGES = [
  ['document_received_date', 'Document Received'],
  ['departure_date', 'Departure'],
  ['customs_arrival_date', 'Customs Arrival'],
  ['customs_release_date', 'Customs Release'],
  ['factory_arrival_date', 'Factory Arrival'],
  ['offloading_date', 'Offloading'],
  ['empty_return_date', 'Empty Return'],
]

export default function MasterOperationDetail({ id, onClose }) {
  const [op, setOp] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    masterDatabaseService.get(id).then(({ data }) => setOp(data)).catch(() => setError('Could not load this record.'))
  }, [id])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {error && <div className="error-text">{error}</div>}
        {!op && !error && <div style={{ color: 'var(--text-dim)' }}>Loading…</div>}

        {op && (
          <>
            <div className="topline">{op.operation_number}</div>
            <h2 style={{ marginBottom: 4 }}>{op.customer_name}</h2>
            <div style={{ marginBottom: 20 }}><StatusPill status={op.status} /></div>

            <div className="detail-section-title">Shipment Information</div>
            <div className="detail-grid">
              <div><span>Declaration</span><strong>{op.declaration_number || '—'}</strong></div>
              <div><span>Bill Number</span><strong>{op.bill_number || '—'}</strong></div>
              <div><span>Container</span><strong>{op.container_number || '—'}</strong></div>
              <div><span>Type</span><strong>{op.operation_type || '—'}</strong></div>
              <div><span>Transport Structure</span><strong>{op.transport_mode || '—'}</strong></div>
              <div><span>Provider</span><strong>{op.transport_provider || '—'}</strong></div>
            </div>

            {op.transport_mode === 'unimodal' && (
              <>
                <div className="detail-section-title">Transport</div>
                <div className="detail-grid">
                  <div><span>Driver</span><strong>{op.driver_name || '—'}</strong></div>
                  <div><span>Ethiopia Phone</span><strong>{op.driver_phone_ethiopia || '—'}</strong></div>
                  <div><span>Djibouti Phone</span><strong>{op.driver_phone_djibouti || '—'}</strong></div>
                  <div><span>Truck Plate</span><strong>{op.truck_plate_number || '—'}</strong></div>
                  <div><span>Transport Association</span><strong>{op.transport_association || '—'}</strong></div>
                  <div><span>Rate</span><strong>{op.transport_rate || '—'}</strong></div>
                </div>
              </>
            )}

            {op.transport_mode === 'multimodal' && (
              <>
                <div className="detail-section-title">Shipping</div>
                <div className="detail-grid">
                  <div><span>Shipping Line</span><strong>{op.shipping_line || '—'}</strong></div>
                  <div><span>Vessel</span><strong>{op.vessel || '—'}</strong></div>
                  <div><span>Port of Loading</span><strong>{op.port_of_loading || '—'}</strong></div>
                  <div><span>Port of Discharge</span><strong>{op.port_of_discharge || '—'}</strong></div>
                  <div><span>FCL/LCL</span><strong>{op.fcl_lcl || '—'}</strong></div>
                </div>
              </>
            )}

            {op.transport_mode === 'air' && (
              <>
                <div className="detail-section-title">Air Shipment</div>
                <div className="detail-grid">
                  <div><span>AWB #</span><strong>{op.awb_number || '—'}</strong></div>
                  <div><span>Airline</span><strong>{op.airline || '—'}</strong></div>
                  <div><span>Flight #</span><strong>{op.flight_number || '—'}</strong></div>
                  <div><span>Origin Airport</span><strong>{op.origin_airport || '—'}</strong></div>
                  <div><span>Destination Airport</span><strong>{op.destination_airport || '—'}</strong></div>
                  <div><span>Chargeable Weight</span><strong>{op.chargeable_weight || '—'}</strong></div>
                </div>
              </>
            )}

            <div className="detail-section-title">Cargo</div>
            <div className="detail-grid">
              <div><span>Gross Weight</span><strong>{op.gross_weight || '—'}</strong></div>
              <div><span>Net Weight</span><strong>{op.net_weight || '—'}</strong></div>
              <div><span>Items</span><strong>{op.num_items || '—'}</strong></div>
              <div><span>Packages</span><strong>{op.num_packages || '—'}</strong></div>
            </div>

            <div className="detail-section-title">Timeline</div>
            <div className="detail-timeline">
              {TIMELINE_STAGES.map(([field, label]) => {
                const value = op[field]
                return (
                  <div key={field} className={`detail-timeline-item ${value ? 'done' : ''}`}>
                    <span className="detail-timeline-mark">{value ? '✓' : '○'}</span>
                    <span>{label}</span>
                    {value && <span className="detail-timeline-date">{value}</span>}
                  </div>
                )
              })}
            </div>

            {op.remark && (
              <>
                <div className="detail-section-title">Remark</div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{op.remark}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
