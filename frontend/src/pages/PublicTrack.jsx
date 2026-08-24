import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicTrackService } from '../services/api'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'

export default function PublicTrack() {
  const { trackingNumber } = useParams()
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    publicTrackService
      .track(trackingNumber)
      .then(({ data }) => setShipment(data))
      .catch(() => setError('Shipment not found.'))
  }, [trackingNumber])

  return (
    <div className="login-shell">
      <div className="login-card" style={{ width: 380 }}>
        <div className="brand" style={{ alignItems: 'center', marginBottom: 20, textAlign: 'center' }}>
          <img src="/logo.png" alt="Synergy Plus Logistics" style={{ width: 56, height: 56, borderRadius: 10, margin: '0 auto 8px' }} />
          <strong>Synergy Plus Logistics Service</strong>
          <span className="brand-tagline">Moving Forward Together</span>
        </div>

        {error && <div className="error-text">{error}</div>}

        {shipment && (
          <>
            <h2 style={{ marginBottom: 4 }}>{shipment.tracking_number}</h2>
            <div style={{ marginBottom: 16 }}><StatusPill status={shipment.status} /></div>

            <ProgressBar percent={shipment.progress_percent} statusLabel={shipment.status.replace(/_/g, ' ')} />

            <div style={{ marginTop: 20, fontSize: 14, lineHeight: 2 }}>
              <div><span style={{ color: 'var(--text-dim)' }}>Customer:</span> {shipment.customer_name}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Destination:</span> {shipment.destination_address || '—'}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Container:</span> {shipment.container_number || '—'}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Driver:</span> {shipment.driver_name || 'Not yet assigned'}</div>
              {shipment.eta_display && <div><span style={{ color: 'var(--text-dim)' }}>ETA:</span> {shipment.eta_display}</div>}
            </div>
          </>
        )}

        {!shipment && !error && <div style={{ color: 'var(--text-dim)' }}>Loading…</div>}
      </div>
    </div>
  )
}
