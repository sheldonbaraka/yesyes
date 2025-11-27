import { Routes, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Tasks from './pages/Tasks'
import Shopping from './pages/Shopping'
import Budget from './pages/Budget'
import Communication from './pages/Communication'
import Documents from './pages/Documents'
import Photos from './pages/Photos'
import Kids from './pages/Kids'
import HomeManagement from './pages/Home'
import Health from './pages/Health'
import Travel from './pages/Travel'
import Support from './pages/Support'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/kids" element={<Kids />} />
        <Route path="/home" element={<HomeManagement />} />
        <Route path="/health" element={<Health />} />
        <Route path="/travel" element={<Travel />} />
        <Route path="/support" element={<Support />} />
      </Route>
    </Routes>
  )
}