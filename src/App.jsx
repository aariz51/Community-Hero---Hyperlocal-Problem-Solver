import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Landing from './pages/Landing'
import Report from './pages/Report'
import MapView from './pages/MapView'
import IssueDetail from './pages/IssueDetail'
import Dashboard from './pages/Dashboard'
import MyReports from './pages/MyReports'
import AskAgent from './pages/AskAgent'

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/report" element={<Report />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/issue/:id" element={<IssueDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/me" element={<MyReports />} />
        <Route path="/ask" element={<AskAgent />} />
      </Routes>
    </>
  )
}
