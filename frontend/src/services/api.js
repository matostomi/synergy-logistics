import axios from 'axios'
import { getToken, clearTokens } from './tokenStorage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: BASE_URL,
})

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = getToken('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh the access token once on a 401, then retry the original request
let isRefreshing = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true
      isRefreshing = true
      try {
        const refresh = getToken('refresh_token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
        const isPersistent = !!localStorage.getItem('refresh_token')
        ;(isPersistent ? localStorage : sessionStorage).setItem('access_token', data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: (username, password) => api.post('/auth/login/', { username, password }),
  register: (payload) => api.post('/accounts/register/', payload),
  me: () => api.get('/accounts/me/'),
}

export const shipmentsService = {
  list: (params) => api.get('/shipments/', { params }),
  get: (id) => api.get(`/shipments/${id}/`),
  create: (payload) => api.post('/shipments/', payload),
  update: (id, payload) => api.patch(`/shipments/${id}/`, payload),
  remove: (id) => api.delete(`/shipments/${id}/`),
  updateStatus: (id, payload) => api.post(`/shipments/${id}/update_status/`, payload),
  track: (number) => api.get('/shipments/track/', { params: { number } }),
}

export const driversService = {
  list: (params) => api.get('/drivers/', { params }),
  create: (payload) => api.post('/drivers/', payload),
  update: (id, payload) => api.patch(`/drivers/${id}/`, payload),
  remove: (id) => api.delete(`/drivers/${id}/`),
  vehicles: () => api.get('/drivers/vehicles/'),
  createVehicle: (payload) => api.post('/drivers/vehicles/', payload),
  updateVehicle: (id, payload) => api.patch(`/drivers/vehicles/${id}/`, payload),
  removeVehicle: (id) => api.delete(`/drivers/vehicles/${id}/`),
}

export const documentsService = {
  list: (shipmentId) => api.get('/shipments/documents/', { params: { shipment: shipmentId } }),
  upload: (shipmentId, docType, file) => {
    const formData = new FormData()
    formData.append('shipment', shipmentId)
    formData.append('doc_type', docType)
    formData.append('file', file)
    return api.post('/shipments/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  remove: (id) => api.delete(`/shipments/documents/${id}/`),
}

export const backupService = {
  downloadUrl: () => `${BASE_URL}/dashboard/backup/download/`,
  restore: (file) => {
    const formData = new FormData()
    formData.append('backup_file', file)
    return api.post('/dashboard/backup/restore/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const publicTrackService = {
  track: (trackingNumber) => api.get('/shipments/track/', { params: { number: trackingNumber } }),
}

export const googleSheetService = {
  sync: () => api.post('/integrations/google-sheet/sync/'),
}

export const tasksService = {
  list: (params) => api.get('/tasks/', { params }),
  create: (payload) => api.post('/tasks/', payload),
  update: (id, payload) => api.patch(`/tasks/${id}/`, payload),
  remove: (id) => api.delete(`/tasks/${id}/`),
  calendar: (year, month) => api.get('/tasks/calendar/', { params: { year, month } }),
  checkDeadlines: () => api.post('/tasks/check-deadlines/'),
}

export const customersService = {
  list: (params) => api.get('/customers/', { params }),
  create: (payload) => api.post('/customers/', payload),
  update: (id, payload) => api.patch(`/customers/${id}/`, payload),
  remove: (id) => api.delete(`/customers/${id}/`),
  merge: (keepId, mergeId) => api.post(`/customers/${keepId}/merge/`, { merge_id: mergeId }),
}

export const dashboardService = {
  publicStats: () => axios.get(`${BASE_URL}/dashboard/public-stats/`),
  summary: () => api.get('/dashboard/summary/'),
  analytics: (months = 12) => api.get('/dashboard/analytics/', { params: { months } }),
  recentActivity: (limit = 15) => api.get('/dashboard/recent-activity/', { params: { limit } }),
  dailyReport: () => api.get('/dashboard/daily-report/'),
  calendar: ({ start, end }) => api.get('/dashboard/calendar/', { params: { start, end } }),
}

export const notificationsService = {
  list: (params) => api.get('/dashboard/notifications/', { params }),
  markRead: (id) => api.post(`/dashboard/notifications/${id}/mark_read/`),
  markAllRead: (params) => api.post('/dashboard/notifications/mark_all_read/', null, { params }),
  unreadCount: () => api.get('/dashboard/notifications/unread_count/'),
  checkDelays: () => api.post('/dashboard/notifications/check_delays/'),
}

export const usersService = {
  list: () => api.get('/accounts/users/'),
  update: (id, payload) => api.patch(`/accounts/users/${id}/`, payload),
}

export const referenceDataService = {
  destinations: {
    list: () => api.get('/dashboard/destinations/'),
    create: (name) => api.post('/dashboard/destinations/', { name }),
    remove: (id) => api.delete(`/dashboard/destinations/${id}/`),
  },
  customsLocations: {
    list: () => api.get('/dashboard/customs-locations/'),
    create: (name) => api.post('/dashboard/customs-locations/', { name }),
    remove: (id) => api.delete(`/dashboard/customs-locations/${id}/`),
  },
  borderCrossings: {
    list: () => api.get('/dashboard/border-crossings/'),
    create: (name) => api.post('/dashboard/border-crossings/', { name }),
    remove: (id) => api.delete(`/dashboard/border-crossings/${id}/`),
  },
}

export const statusColorService = {
  get: () => api.get('/dashboard/status-colors/'),
  update: (colors) => api.patch('/dashboard/status-colors/', { colors }),
}

export const reportsService = {
  list: () => api.get('/reports/'),
  create: (payload) => api.post('/reports/', payload),
}

export const masterDatabaseService = {
  list: (params) => api.get('/master-database/operations/', { params }),
  get: (id) => api.get(`/master-database/operations/${id}/`),
  stats: (mode) => api.get('/master-database/stats/', { params: mode && mode !== 'all' ? { mode } : {} }),
}

export default api
