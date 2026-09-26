import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './HRDashboardPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { getCurrentUser } from '../services/authApi'
import { getDashboardStats } from '../services/dashboardApi'
import { listApplicationsHR } from '../services/hrApplicationsApi'
import { listInterviewsHR } from '../services/interviewsApi'

function HRDashboardPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const videoContainer = document.querySelector('.hr-video-background-container')
      if (videoContainer) {
        const containerBottom = videoContainer.offsetTop + videoContainer.offsetHeight
        setIsScrolled(window.scrollY > containerBottom - 100)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.hr-user-profile')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isDropdownOpen])

  const [hrData, setHrData] = useState({
    name: 'HR User',
    profileImage: '/imges/profile-placeholder.png'
  })

  useEffect(() => {
    let cancelled = false
    async function loadUserData() {
      try {
        const account = await getCurrentUser()
        if (cancelled) return
        if (account) {
          setHrData({
            name: account.full_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'HR User',
            profileImage: account.profile_image_url || '/imges/profile-placeholder.png'
          })
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load HR data:', err)
      }
    }
    loadUserData()
    return () => {
      cancelled = true
    }
  }, [])

  const [stats, setStats] = useState({
    totalApplicants: { value: 0, change: '+0%', changeColor: 'green' },
    openPositions: { value: 0, change: '+0', changeColor: 'blue' },
    interviewsScheduled: { value: 0, change: '+0', changeColor: 'blue' },
    offersExtended: { value: 0, change: '+0', changeColor: 'blue' }
  })
  const [recentApplicants, setRecentApplicants] = useState([])
  const [upcomingInterviews, setUpcomingInterviews] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true)
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true)

  // Load dashboard stats
  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      setIsLoadingStats(true)
      try {
        const res = await getDashboardStats()
        if (cancelled) return
        if (res?.stats) {
          setStats({
            totalApplicants: { value: res.stats.totalApplicants || 0, change: '+0%', changeColor: 'green' },
            openPositions: { value: res.stats.openPositions || 0, change: '+0', changeColor: 'blue' },
            interviewsScheduled: { value: res.stats.interviewsScheduled || 0, change: '+0', changeColor: 'blue' },
            offersExtended: { value: res.stats.offersExtended || 0, change: '+0', changeColor: 'blue' }
          })
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load dashboard stats:', err)
      } finally {
        if (!cancelled) setIsLoadingStats(false)
      }
    }
    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  // Load recent applicants
  useEffect(() => {
    let cancelled = false
    async function loadApplicants() {
      setIsLoadingApplicants(true)
      try {
        const res = await listApplicationsHR({ limit: 5, offset: 0 })
        if (cancelled) return
        if (res?.applications) {
          const formatted = res.applications.map(app => {
            // Map status to display format
            let statusColor = 'blue'
            let statusText = app.status
            if (app.status === 'NEW') {
              statusText = 'New'
              statusColor = 'blue'
            } else if (app.status === 'UNDER_REVIEW') {
              statusText = 'Under Review'
              statusColor = 'orange'
            } else if (app.status === 'INTERVIEW_SCHEDULED') {
              statusText = 'Interview'
              statusColor = 'purple'
            } else if (app.status === 'ACCEPTED') {
              statusText = 'Accepted'
              statusColor = 'green'
            } else if (app.status === 'REJECTED') {
              statusText = 'Rejected'
              statusColor = 'red'
            } else if (app.status === 'OFFERED') {
              statusText = 'Offered'
              statusColor = 'green'
            }

            // Map match score to display with percentage
            let matchText = 'Low (0%)'
            let matchColor = 'low'
            if (app.match_score !== null && app.match_score !== undefined) {
              const score = Number(app.match_score) || 0
              if (score >= 80) {
                matchText = `High (${score}%)`
                matchColor = 'high'
              } else if (score >= 50) {
                matchText = `Medium (${score}%)`
                matchColor = 'medium'
              } else {
                matchText = `Low (${score}%)`
                matchColor = 'low'
              }
            }

            return {
              id: app.id,
              candidate: app.full_name || [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Unknown',
              role: app.job_title || 'N/A',
              department: app.job_department || 'N/A',
              status: statusText,
              statusColor: statusColor,
              match: matchText,
              matchColor: matchColor,
              submitted: app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'
            }
          })
          setRecentApplicants(formatted)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load recent applicants:', err)
      } finally {
        if (!cancelled) setIsLoadingApplicants(false)
      }
    }
    loadApplicants()
    return () => {
      cancelled = true
    }
  }, [])

  // Load upcoming interviews
  useEffect(() => {
    let cancelled = false
    async function loadInterviews() {
      setIsLoadingInterviews(true)
      try {
        const now = new Date().toISOString()
        // Load upcoming interviews - include both CONFIRMED and DRAFT status, exclude CANCELLED
        // The backend already filters out CANCELLED, so we just need future interviews
        const res = await listInterviewsHR({ from: now, limit: 5, offset: 0 })
        if (cancelled) return
        if (res?.interviews && Array.isArray(res.interviews)) {
          // Filter to only show CONFIRMED or DRAFT interviews (not CANCELLED or COMPLETED)
          const upcoming = res.interviews
            .filter(int => int && (int.status === 'CONFIRMED' || int.status === 'DRAFT'))
            .map(int => {
              try {
                const scheduledDate = new Date(int.scheduled_at)
                if (isNaN(scheduledDate.getTime())) {
                  console.warn('Invalid scheduled_at date:', int.scheduled_at)
                  return null
                }
                return {
                  id: int.id,
                  candidate: int.candidate_name || 'Unknown',
                  role: int.job_title || 'N/A',
                  date: scheduledDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                  time: scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  interviewer: int.hr_interviewer_name || 'TBD',
                  status: int.status
                }
              } catch (e) {
                console.error('Error parsing interview date:', e, int)
                return null
              }
            })
            .filter(item => item !== null) // Remove any null items from date parsing errors
          setUpcomingInterviews(upcoming)
        } else {
          setUpcomingInterviews([])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load upcoming interviews:', err)
        setUpcomingInterviews([])
      } finally {
        if (!cancelled) setIsLoadingInterviews(false)
      }
    }
    loadInterviews()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="hr-dashboard-page">
      {/* Video Background Container with Header and Hero */}
      <div className="hr-video-background-container">
        <video 
          className="hr-dashboard-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video/video%20dashboard%20HR.mp4" type="video/mp4" />
        </video>
        <div className="hr-dashboard-video-overlay"></div>
        
        {/* Header */}
        <header className={`hr-dashboard-header ${isScrolled ? 'scrolled' : ''}`}>
          <div className="hr-header-left">
            <div className="hr-logo-section-header">
              <img 
                src="/imges/ejo white logo.png" 
                alt="EJO SUPPORT Logo" 
                className="hr-header-logo-image"
              />
            </div>
            <nav className="hr-header-nav">
              <a href="/dashboard/hr" className="hr-nav-link active">Home</a>
              <a href="/view-applicants/hr" className="hr-nav-link">View Applicants</a>
              <a href="/scheduled-interviews/hr" className="hr-nav-link">Scheduled Interviews</a>
              <a href="/add-new-job/hr" className="hr-nav-link">Add New Job</a>
              <a href="/my-jobs/hr" className="hr-nav-link">My Jobs</a>
            </nav>
          </div>

          <div className="hr-header-center">
            <div className="hr-search-container">
              <input 
                type="text" 
                placeholder="Search" 
                className="hr-search-input"
              />
              <button className="hr-search-button">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="hr-header-right">
            <HRNotificationsBell buttonClassName="hr-notification-button" />
            <div className="hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img 
                src={hrData?.profileImage || '/imges/profile-placeholder.png'} 
                alt={hrData?.name || 'HR User'}
                className="hr-profile-image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
                }}
              />
              <span className="hr-profile-name">{hrData?.name || 'HR User'}</span>
              <button className="hr-profile-dropdown">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {/* HR Dropdown Menu - Independent dropdown for HR dashboard only */}
              {isDropdownOpen && (
                <div className="hr-profile-dropdown-menu">
                  {/* MY PROFILE */}
                  <button
                    className="hr-dropdown-item"
                    onClick={() => {
                      navigate('/profile/hr')
                      setIsDropdownOpen(false)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                      <path d="M8 10C4.68629 10 2 11.6863 2 14V16H14V14C14 11.6863 11.3137 10 8 10Z" fill="currentColor"/>
                    </svg>
                    MY PROFILE
                  </button>

                  {/* Log Out */}
                  <button 
                    className="hr-dropdown-item"
                    onClick={() => {
                      navigate('/')
                      setIsDropdownOpen(false)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11 11.3333L14 8L11 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hr-hero-section">
          <div className="hr-hero-content">
            <h1 className="hr-hero-title">
              Welcome back, {hrData?.name || 'HR User'}
            </h1>
            <h2 className="hr-hero-subtitle">
              for EJO Support Company!
            </h2>
            <p className="hr-hero-description">
              Manage recruitment activities and track hiring progress
            </p>
            <button
              className="hr-approved-job-button"
              onClick={() => navigate('/view-applicants/hr')}
            >
              Approved Job
            </button>
          </div>
        </section>
      </div>

      {/* Statistics Cards */}
      <section className="hr-stats-section">
        <div className="hr-stat-card">
          <div className="hr-stat-change hr-stat-change-green">{stats.totalApplicants.change}</div>
          <div className="hr-stat-number">{stats.totalApplicants.value}</div>
          <div className="hr-stat-label">Total Applicants</div>
        </div>
        <div className="hr-stat-card">
          <div className="hr-stat-change hr-stat-change-blue">{stats.openPositions.change}</div>
          <div className="hr-stat-number">{stats.openPositions.value}</div>
          <div className="hr-stat-label">Open Positions</div>
        </div>
        <div className="hr-stat-card">
          <div className="hr-stat-change hr-stat-change-blue">{stats.interviewsScheduled.change}</div>
          <div className="hr-stat-number">{stats.interviewsScheduled.value}</div>
          <div className="hr-stat-label">Interviews Scheduled</div>
        </div>
        <div className="hr-stat-card">
          <div className="hr-stat-change hr-stat-change-blue">{stats.offersExtended.change}</div>
          <div className="hr-stat-number">{stats.offersExtended.value}</div>
          <div className="hr-stat-label">Offers Extended</div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="hr-main-content">
        {/* Recent Applicants Table */}
        <div className="hr-recent-applicants-card">
          <div className="hr-card-header">
            <h2 className="hr-card-title">Recent Applicants</h2>
            <a href="/view-applicants/hr" className="hr-view-all-link">View All</a>
          </div>
          <p className="hr-card-instruction">Click a row to view the report summary.</p>
          
          <div className="hr-table-container">
            <table className="hr-applicants-table">
              <thead>
                <tr>
                  <th>CANDIDATE</th>
                  <th>ROLE</th>
                  <th>DEPARTMENT</th>
                  <th>STATUS</th>
                  <th>MATCH</th>
                  <th>SUBMITTED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoadingApplicants ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      Loading applicants...
                    </td>
                  </tr>
                ) : recentApplicants.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      No applicants yet
                    </td>
                  </tr>
                ) : (
                  recentApplicants.map((applicant) => (
                    <tr 
                      key={applicant.id}
                      onClick={() => navigate(`/view-applicant-details/hr/${applicant.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="hr-table-candidate">{applicant.candidate}</td>
                      <td>{applicant.role}</td>
                      <td>{applicant.department}</td>
                      <td>
                        <span className={`hr-status-pill hr-status-${applicant.statusColor}`}>
                          {applicant.status}
                        </span>
                      </td>
                      <td>
                        <span className={`hr-match-pill hr-match-${applicant.matchColor}`}>
                          {applicant.match}
                        </span>
                      </td>
                      <td>{applicant.submitted}</td>
                      <td>
                        <button 
                          className="hr-view-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/view-applicant-details/hr/${applicant.id}`)
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            <circle cx="12" cy="12" r="3" stroke="#2563eb" strokeWidth="1.5" fill="none"/>
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="hr-upcoming-interviews-card">
          <div className="hr-card-header">
            <h2 className="hr-card-title">Upcoming Interviews</h2>
            <a href="/scheduled-interviews/hr" className="hr-view-all-link">View All</a>
          </div>
          
          <div className="hr-interviews-list">
            {isLoadingInterviews ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Loading interviews...
              </div>
            ) : upcomingInterviews.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                No upcoming interviews
              </div>
            ) : (
              upcomingInterviews.map((interview) => (
                <div key={interview.id} className="hr-interview-item">
                  <div className="hr-interview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="hr-interview-content">
                    <div className="hr-interview-candidate">{interview.candidate}</div>
                    <div className="hr-interview-role">{interview.role}</div>
                    <div className="hr-interview-date">{interview.date} at {interview.time}</div>
                    <div className="hr-interview-interviewer">With {interview.interviewer}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Action Cards */}
      <section className="hr-action-cards-section">
        <div 
          className="hr-action-card hr-action-card-blue"
          onClick={() => navigate('/view-applicants/hr')}
          style={{ cursor: 'pointer' }}
        >
          <div className="hr-action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hr-action-title">View Applicants</div>
          <div className="hr-action-subtitle">Browse All Candidates</div>
        </div>

        <div 
          className="hr-action-card hr-action-card-purple"
          onClick={() => navigate('/scheduled-interviews/hr')}
          style={{ cursor: 'pointer' }}
        >
          <div className="hr-action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2V6" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 2V6" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10H21" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hr-action-title">Schedule Interview</div>
          <div className="hr-action-subtitle">Set up new interviews</div>
        </div>

        <div 
          className="hr-action-card hr-action-card-yellow"
          onClick={() => navigate('/add-new-job/hr')}
          style={{ cursor: 'pointer' }}
        >
          <div className="hr-action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V11C16 10.4696 15.7893 9.96086 15.4142 9.58579C15.0391 9.21071 14.5304 9 14 9H10C9.46957 9 8.96086 9.21071 8.58579 9.58579C8.21071 9.96086 8 10.4696 8 11V21" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 7V5C6 4.46957 6.21071 3.96086 6.58579 3.58579C6.96086 3.21071 7.46957 3 8 3H16C16.5304 3 17.0391 3.21071 17.4142 3.58579C17.7893 3.96086 18 4.46957 18 5V7" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hr-action-title">Post New Job</div>
          <div className="hr-action-subtitle">Create job listing</div>
        </div>

        <div 
          className="hr-action-card hr-action-card-green"
          onClick={() => navigate('/my-jobs/hr')}
          style={{ cursor: 'pointer' }}
        >
          <div className="hr-action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V11C16 10.4696 15.7893 9.96086 15.4142 9.58579C15.0391 9.21071 14.5304 9 14 9H10C9.46957 9 8.96086 9.21071 8.58579 9.58579C8.21071 9.96086 8 10.4696 8 11V21" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 7V5C6 4.46957 6.21071 3.96086 6.58579 3.58579C6.96086 3.21071 7.46957 3 8 3H16C16.5304 3 17.0391 3.21071 17.4142 3.58579C17.7893 3.96086 18 4.46957 18 5V7" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hr-action-title">My Jobs</div>
          <div className="hr-action-subtitle">View all job postings</div>
        </div>
      </section>
    </div>
  )
}

export default HRDashboardPage

