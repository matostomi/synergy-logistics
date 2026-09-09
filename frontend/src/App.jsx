import { ThemeProvider } from './services/ThemeContext'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './services/AuthContext'
import { NotificationProvider } from './services/NotificationContext'
import { AutoSyncProvider } from './services/AutoSyncContext'
import { StatusColorProvider } from './services/StatusColorContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NotificationBell from './components/NotificationBell'
import ToastNotifications from './components/ToastNotifications'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shipments from './pages/Shipments'
import ShipmentDetail from './pages/ShipmentDetail'
import Drivers from './pages/Drivers'
import Vehicles from './pages/Vehicles'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import About from './pages/About'
import Notifications from './pages/Notifications'
import TasksCalendar from './pages/TasksCalendar'
import OperationsCalendar from './pages/OperationsCalendar'
import MasterOperations from './pages/MasterOperations'
import Services from './pages/Services'
import PublicTrack from './pages/PublicTrack'

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-area">
     <div className="top-bar">

    <SearchBar />

    <div className="top-actions">

        <NotificationBell />

        <div className="user-avatar">
            A
        </div>

    </div>

</div>
        <main className="main">{children}</main>
      </div>
    </div>
  )
}

function withLayout(Component) {
  return (
    <ProtectedRoute>
      <Layout>
        <Component />
      </Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
     <ThemeProvider>
      <NotificationProvider>
        <ToastNotifications />
        <StatusColorProvider>
          <AutoSyncProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/track/:trackingNumber" element={<PublicTrack />} />
              <Route path="/" element={withLayout(Dashboard)} />
              <Route path="/shipments" element={withLayout(Shipments)} />
              <Route path="/shipments/:id" element={withLayout(ShipmentDetail)} />
              <Route path="/drivers" element={withLayout(Drivers)} />
              <Route path="/vehicles" element={withLayout(Vehicles)} />
              <Route path="/customers" element={withLayout(Customers)} />
              <Route path="/reports" element={withLayout(Reports)} />
              <Route path="/settings" element={withLayout(Settings)} />
              <Route path="/about" element={withLayout(About)} />
              <Route path="/notifications" element={withLayout(Notifications)} />
              <Route path="/tasks" element={withLayout(TasksCalendar)} />
              <Route path="/operations" element={withLayout(OperationsCalendar)} />
              <Route path="/master-operations" element={withLayout(MasterOperations)} />
              <Route path="/services-info" element={withLayout(Services)} />
            </Routes>
          </AutoSyncProvider>
        </StatusColorProvider>
      </NotificationProvider>
     </ThemeProvider>
    </AuthProvider>
  )
}
