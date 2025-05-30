import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import Login from './pages/Login'
import TodaysPatients from './pages/TodaysPatients'
import PatientManagement from './pages/PatientManagement'
import NewAppointment from './pages/NewAppointment'
import AppointmentScheduler from './pages/AppointmentScheduler'
import CheckoutPage from './pages/CheckoutPage'
import AuditRecords from './pages/AuditRecords'
import Reports from './pages/Reports'
import Ledger from './pages/Ledger'
import ImportExport from './pages/ImportExport'
import AppointmentHistory from './pages/AppointmentHistory'
import Settings from './pages/Settings'
import DoctorTodaysPatients from './pages/DoctorTodaysPatients'
import PatientFlow from './pages/PatientFlow'
import PatientVisits from './pages/PatientVisits'
import DoctorTemplates from './pages/DoctorTemplates'
import DoctorReports from './pages/DoctorReports'
import DoctorSettings from './pages/DoctorSettings'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/secretary" element={<TodaysPatients />} />
        <Route path="/secretary/todays-patients" element={<TodaysPatients />} />
        <Route path="/secretary/patients" element={<PatientManagement />} />
        <Route path="/secretary/patients/new" element={<PatientManagement />} />
        <Route path="/secretary/appointments/new" element={<NewAppointment />} />
        <Route path="/secretary/appointments/scheduler" element={<AppointmentScheduler />} />
        <Route path="/secretary/appointment-history" element={<AppointmentHistory />} />
        <Route path="/secretary/checkout/:appointmentId" element={<CheckoutPage />} />
        <Route path="/secretary/audit-records" element={<AuditRecords />} />
        <Route path="/secretary/reports" element={<Reports />} />
        <Route path="/secretary/ledger" element={<Ledger />} />
        <Route path="/secretary/import-export" element={<ImportExport />} />
        <Route path="/secretary/settings" element={<Settings />} />
        <Route path="/doctor" element={<DoctorTodaysPatients />} />
        <Route path="/doctor/scheduler" element={<AppointmentScheduler />} />
        <Route path="/doctor/patient/:appointmentId" element={<PatientFlow />} />
        <Route path="/doctor/visits" element={<PatientVisits />} />
        <Route path="/doctor/templates" element={<DoctorTemplates />} />
        <Route path="/doctor/reports" element={<DoctorReports />} />
        <Route path="/doctor/settings" element={<DoctorSettings />} />
        <Route path="/secret-admin" element={<AdminLogin />} />
        <Route path="/secret-admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  )
}



export default App
