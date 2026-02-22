import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import AddCustomer from './pages/AddCustomer'
import CreateOrder from './pages/CreateOrder'
import POS from './pages/POS'
import CollectCash from './pages/CollectCash'
import Deposit from './pages/Deposit'
import EndShift from './pages/EndShift'
import Profile from './pages/Profile'
import Leads from './pages/Leads'
import Returns from './pages/Returns'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Home />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/add" element={<AddCustomer />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="create-order" element={<CreateOrder />} />
        <Route path="create-order/:customerId" element={<CreateOrder />} />
        <Route path="pos" element={<POS />} />
        <Route path="collect-cash" element={<CollectCash />} />
        <Route path="collect-cash/:customerId" element={<CollectCash />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="end-shift" element={<EndShift />} />
        <Route path="profile" element={<Profile />} />
        <Route path="leads" element={<Leads />} />
        <Route path="returns" element={<Returns />} />
      </Route>
    </Routes>
  )
}

export default App
