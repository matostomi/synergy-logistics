import { NavLink } from 'react-router-dom'
import {
  BarChart3, Bell, Calendar, CalendarDays, Database, Home, Info,
  Package, Settings, Users, Wrench,
} from 'lucide-react'
import { useAuth } from '../services/AuthContext'

// One size for every nav glyph, so the label baseline never shifts between rows.
const NAV_ICON_SIZE = 18

const links = [
  { to: '/', label: 'Dashboard', Icon: Home, end: true },
  { to: '/shipments', label: 'Shipments', Icon: Package },
  { to: '/master-operations', label: 'Master Operations', Icon: Database },
  { to: '/customers', label: 'Customers', Icon: Users },
  { to: '/reports', label: 'Reports', Icon: BarChart3 },
  { to: '/tasks', label: 'Tasks & Calendar', Icon: CalendarDays },
  { to: '/operations', label: 'Operations Calendar', Icon: Calendar },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="sidebar">
      <div className="brand">
  <img src="/logo.png" alt="Synergy Plus Logistics" className="brand-logo" />

  <strong>Synergy Plus Logistics Service</strong>

  <span className="brand-tagline">
    Moving Forward Together
  </span>
</div>
      <ul className="nav-list">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon"><link.Icon size={NAV_ICON_SIZE} /></span>{link.label}
            </NavLink>
          </li>
        ))}
        {isAdmin && (
          <li>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon"><Settings size={NAV_ICON_SIZE} /></span>Settings
            </NavLink>
          </li>
        )}
        <li>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon"><Info size={NAV_ICON_SIZE} /></span>About
          </NavLink>
        </li>
        <li>
          <NavLink to="/services-info" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon"><Wrench size={NAV_ICON_SIZE} /></span>Services
          </NavLink>
        </li>
      </ul>

      <div style={{ marginTop: 'auto' }}>
        {user && (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
            {user.username}
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user.role?.replace(/_/g, ' ')}
            </div>
          </div>
        )}
        <button className="btn secondary" onClick={logout} style={{ width: '100%' }}>
          Log out
        </button>
      </div>
    </aside>
  )
}
