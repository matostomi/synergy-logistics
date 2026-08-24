import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Package, Store, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { getRememberedUsername } from '../services/tokenStorage'
import { dashboardService } from '../services/api'
import WeatherWidget from '../components/WeatherWidget'

const STAT_TILES = [
  { key: 'total_shipments', label: 'Total Shipments', Icon: Package },
  { key: 'completed', label: 'Completed', Icon: CheckCircle2 },
  { key: 'in_transit', label: 'In Transit', Icon: Truck },
  { key: 'total_customers', label: 'Customers', Icon: Store },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState(getRememberedUsername())
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(!!getRememberedUsername())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')

  const [stats, setStats] = useState(null)
  const [apiOnline, setApiOnline] = useState(null) // null = checking, true/false = result

  // welcome/loading transition after a successful login
  const [welcomeUser, setWelcomeUser] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    dashboardService
      .publicStats()
      .then(({ data }) => {
        setStats(data)
        setApiOnline(true)
      })
      .catch(() => setApiOnline(false))
  }, [])

  useEffect(() => {
    if (!welcomeUser) return
    const start = Date.now()
    const duration = 900
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100))
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(timer)
        navigate('/')
      }
    }, 30)
    return () => clearInterval(timer)
  }, [welcomeUser, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(username, password, remember)
      setWelcomeUser(user)
    } catch (err) {
      setError('Invalid username or password.')
      setSubmitting(false)
    }
  }

  if (welcomeUser) {
    return (
      <div className="login-welcome-shell">
        <div className="login-welcome-card">
          <div className="login-welcome-check">✔</div>
          <h2>Welcome back</h2>
          <p>{welcomeUser.role?.replace(/_/g, ' ') || 'User'}</p>
          <div className="login-welcome-track">
            <div className="login-welcome-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="login-welcome-pct">Loading dashboard… {progress}%</div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      {/* LEFT: hero photo + branding + live stats */}
      <div className="login-hero-panel">
        <img
          className="login-hero-photo"
          src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop"
          alt="Freight truck on the highway"
        />
        <div className="login-hero-scrim" />
        <div className="login-hero-fade" />

        <div className="login-hero-content">
          <div className="login-hero-brand">
            <img src="/logo.png" alt="Synergy Plus Logistics" className="login-hero-logo" />
            <div>
              <h1>Synergy Plus Logistics</h1>
              <p>Moving Forward Together</p>
            </div>
          </div>

          <div className="login-hero-headline">
            <h2>Smart Logistics.<br /><span>Real-Time Visibility.</span></h2>
            <div className="login-hero-quote">
              <p>End-to-end shipment tracking for Ethiopia, Djibouti, and international logistics.</p>
            </div>
          </div>

          {stats && (
            <div className="login-stat-row">
              {STAT_TILES.map((t) => (
                <div key={t.key} className="login-stat-chip">
                  <span className="login-stat-icon"><t.Icon size={18} /></span>
                  <span className="login-stat-value">{stats[t.key]}</span>
                  <span className="login-stat-label">{t.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="login-status-row">
            <span className={`login-status-dot ${apiOnline ? 'online' : apiOnline === false ? 'offline' : ''}`} />
            {apiOnline === null ? 'Checking system status…' : apiOnline ? 'Backend API Online' : 'Backend Unreachable'}
          </div>
        </div>

        <div className="login-hero-footer">
          <span>Version 2.0 © 2026 Synergy Plus Logistics Service</span>
          <WeatherWidget />
        </div>
      </div>


      {/* RIGHT: glass form card */}
      <div className="login-form-panel">
        <div className="login-form-glow" />
        <div className="login-form-card">
          <div className="login-form-eyebrow">Secure Login</div>
          <h3 className="login-form-title">Sign in</h3>

          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="username">Username <span className="login-required">*</span></label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password <span className="login-required">*</span></label>
              <div className="login-password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              type="button"
              className="login-forgot"
              onClick={() => setForgotMessage('Contact your administrator to reset your password.')}
            >
              Forgot password?
            </button>
            {forgotMessage && <div className="login-forgot-message">{forgotMessage}</div>}
          </form>
        </div>
      </div>
    </div>
  )
}
