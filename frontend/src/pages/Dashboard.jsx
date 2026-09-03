import { useEffect, useState } from 'react'
import {
  Ban, BarChart3, Building2, Calendar, ClipboardList, Factory, Package, Plane, Store, Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardService } from '../services/api'
import RecentActivity from '../components/RecentActivity'
import WeatherWidget from '../components/WeatherWidget'
import StatusBoard from '../components/StatusBoard'
import AnalyticsCharts from '../components/AnalyticsCharts'

const TILES = [
  { key: 'total', label: 'Total Shipments', Icon: Package, status: null, source: 'shipments' },
  // Sits next to Total Shipments on purpose: cargo that has arrived but has no
  // operation number yet, so it is invisible in every operation-numbered view.
  { key: 'awaiting_registration', label: 'Awaiting Registration', Icon: ClipboardList, source: 'shipments', query: 'awaiting_registration=true' },
  { key: 'active_operations', label: 'Active Operations', Icon: BarChart3, status: null, source: 'operations' },
  { key: 'air_shipments', label: 'Air Shipments', Icon: Plane, status: null, source: 'operations' },
  { key: 'trucks_in_transit', label: 'Trucks in Transit', Icon: Truck, to: '/master-operations?transport_mode=road&status=in_progress', source: 'operations' },
  { key: 'at_customs', label: 'At Customs', status: 'at_customs', Icon: Building2, source: 'shipments' },
  { key: 'factory_deliveries_today', label: 'Factory Deliveries Today', Icon: Factory, status: null, source: 'operations' },
  { key: 'cancelled', label: 'Cancelled Orders', Icon: Ban, status: 'cancelled', source: 'shipments' },
  // Lives in the same grid as the rest. On its own it sat in a second grid, where
  // auto-fit stretched the lone card across the full row.
  { key: 'total_customers', label: 'Active Customers', Icon: Store, source: 'root', to: '/customers' },
]

function subtext(tileKey, summary) {
  if (!summary) return null
  if (tileKey === 'total' && summary.trends?.created_today) {
    return `↑ +${summary.trends.created_today} today`
  }
  if (tileKey === 'trucks_in_transit' && summary.trends?.arriving_today) {
    return `${summary.trends.arriving_today} arriving today`
  }
  return null
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardService
      .summary()
      .then(({ data }) => {
        setSummary(data)
        setError('')
      })
      .catch(() => setError('Could not load dashboard data.'))
  }, [])

  return (
    <>
      <div className="dashboard-header">
        <div>
          <div className="topline">Overview</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Dashboard</h1>

            <Link
              to="/operations"
              style={{
                padding: '6px 14px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Calendar size={15} /> Operations & Calendar →
            </Link>
          </div>
        </div>
        <WeatherWidget />
      </div>

      {error && <div className="error-text">{error}</div>}

      {summary && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 32 }}>
            {TILES.map((tile) => {
              const sub = subtext(tile.key, summary)
              const value =
                tile.source === 'operations' ? summary.operations?.[tile.key]
                : tile.source === 'root' ? summary[tile.key]
                : summary.shipments[tile.key]
              return (
                <Link
                  key={tile.key}
                  to={tile.to ? tile.to : tile.query ? `/shipments?${tile.query}` : tile.status ? `/shipments?status=${tile.status}` : '/shipments'}
                  className="kpi-card kpi-card-link"
                >
                  <div className="kpi-icon"><tile.Icon size={22} /></div>
                  <div className="kpi-value">{value ?? 0}</div>
                  <div className="kpi-label">{tile.label}</div>
                  {sub && <div className="kpi-sub">{sub}</div>}
                </Link>
              )
            })}
          </div>

        </>
      )}

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Analytics</h2>
        <AnalyticsCharts />
      </div>

      <div className="dashboard-grid">
        <StatusBoard />
        <RecentActivity />
      </div>
    </>
  )
}
