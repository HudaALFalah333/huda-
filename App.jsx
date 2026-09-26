import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginUserPage from './pages/LoginUserPage'
import LoginHRPage from './pages/LoginHRPage'
import SignupUserPage from './pages/SignupUserPage'
import UserDashboardPage from './pages/UserDashboardPage'
import HRDashboardPage from './pages/HRDashboardPage'
import ViewApplicantsHRPage from './pages/ViewApplicantsHRPage'
import ViewApplicantDetailsHRPage from './pages/ViewApplicantDetailsHRPage'
import ScheduledInterviewsHRPage from './pages/ScheduledInterviewsHRPage'
import AddNewJobHRPage from './pages/AddNewJobHRPage'
import HRMyProfilePage from './pages/HRMyProfilePage'
import ViewMyJobsHRPage from './pages/ViewMyJobsHRPage'
import ViewJobPage from './pages/ViewJobPage'
import JobDetailsPage from './pages/JobDetailsPage'
import MyProfilePage from './pages/MyProfilePage'
import UploadCVPage from './pages/UploadCVPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login/user" element={<LoginUserPage />} />
        <Route path="/login/hr" element={<LoginHRPage />} />
        <Route path="/signup/user" element={<SignupUserPage />} />
        <Route path="/dashboard/user" element={<UserDashboardPage />} />
        <Route path="/dashboard/hr" element={<HRDashboardPage />} />
        <Route path="/view-applicants/hr" element={<ViewApplicantsHRPage />} />
        <Route path="/view-applicant-details/hr/:id" element={<ViewApplicantDetailsHRPage />} />
        <Route path="/scheduled-interviews/hr" element={<ScheduledInterviewsHRPage />} />
        <Route path="/add-new-job/hr" element={<AddNewJobHRPage />} />
        <Route path="/profile/hr" element={<HRMyProfilePage />} />
        <Route path="/my-jobs/hr" element={<ViewMyJobsHRPage />} />
        <Route path="/view-job" element={<ViewJobPage />} />
        <Route path="/job-details/:id" element={<JobDetailsPage />} />
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/upload-cv" element={<UploadCVPage />} />
      </Routes>
    </Router>
  )
}

export default App


