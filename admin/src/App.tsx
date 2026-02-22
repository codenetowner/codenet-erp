import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Plans from './pages/Plans'
import Billing from './pages/Billing'
import StoreCategories from './pages/StoreCategories'
import AdsManager from './pages/AdsManager'
import PremiumStores from './pages/PremiumStores'
import Analytics from './pages/Analytics'
import DeliveryDrivers from './pages/DeliveryDrivers'
import DriverPayouts from './pages/DriverPayouts'
import Licenses from './pages/Licenses'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Dashboard />} />
        <Route path="companies" element={<Companies />} />
        <Route path="plans" element={<Plans />} />
        <Route path="billing" element={<Billing />} />
        <Route path="store-categories" element={<StoreCategories />} />
        <Route path="ads" element={<AdsManager />} />
        <Route path="premium" element={<PremiumStores />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="drivers" element={<DeliveryDrivers />} />
        <Route path="payouts" element={<DriverPayouts />} />
        <Route path="licenses" element={<Licenses />} />
      </Route>
    </Routes>
  )
}

export default App
