import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { googleSheetService } from './api'
import { useAuth } from './AuthContext'

const AutoSyncContext = createContext(null)

const ENABLED_KEY = 'auto_sync_enabled'
const INTERVAL_KEY = 'auto_sync_interval_seconds'

export function AutoSyncProvider({ children }) {
  const { user } = useAuth()
  const [enabled, setEnabledState] = useState(localStorage.getItem(ENABLED_KEY) === 'true')
  const [intervalSeconds, setIntervalSecondsState] = useState(
    Number(localStorage.getItem(INTERVAL_KEY)) || 60
  )
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [lastSyncResult, setLastSyncResult] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const timerRef = useRef(null)

  const setEnabled = (value) => {
    setEnabledState(value)
    localStorage.setItem(ENABLED_KEY, value ? 'true' : 'false')
  }

  const setIntervalSeconds = (value) => {
    setIntervalSecondsState(value)
    localStorage.setItem(INTERVAL_KEY, String(value))
  }

  const runSync = useCallback(async () => {
    setSyncing((currentlySyncing) => {
      if (currentlySyncing) return currentlySyncing
      return true
    })
    try {
      const { data } = await googleSheetService.sync()
      setLastSyncResult({ ok: true, ...data })
    } catch (err) {
      setLastSyncResult({ ok: false, detail: err.response?.data?.detail || 'Sync failed.' })
    } finally {
      setLastSyncAt(new Date())
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    // Only admins can trigger the sync endpoint — matches backend permission.
    if (!enabled || user?.role !== 'admin') return

    runSync() // run once immediately when turned on
    timerRef.current = setInterval(runSync, intervalSeconds * 1000)
    return () => clearInterval(timerRef.current)
  }, [enabled, intervalSeconds, user, runSync])

  return (
    <AutoSyncContext.Provider
      value={{ enabled, setEnabled, intervalSeconds, setIntervalSeconds, lastSyncAt, lastSyncResult, syncing, runSync }}
    >
      {children}
    </AutoSyncContext.Provider>
  )
}

export function useAutoSync() {
  const ctx = useContext(AutoSyncContext)
  if (!ctx) throw new Error('useAutoSync must be used within an AutoSyncProvider')
  return ctx
}
