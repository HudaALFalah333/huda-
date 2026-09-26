import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ViewMyJobsHRPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { listMyJobsHR } from '../services/jobsApi'
import { getCurrentUser } from '../services/authApi'

function formatSalary(job) {
  const min = job?.salary_min ?? null
  const max = job?.salary_max ?? null
  const currency = job?.currency || ''
  const minStr = min == null ? '' : String(min)
  const maxStr = max == null ? '' : String(max)
  if (!minStr && !maxStr) return ''
  if (minStr && maxStr) return `${minStr}-${maxStr} ${currency}`.trim()
  return `${minStr || maxStr} ${currency}`.trim()
}

function ViewMyJobsHRPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalJobs, setTotalJobs] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.view-my-jobs-hr-user-profile')) {
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setIsLoading(true)
      try {
        const res = await listMyJobsHR({ limit: 50, offset: 0 })
        if (cancelled) return
        setJobs(res?.jobs || [])
        setTotalJobs(res?.total || 0)
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Failed to load jobs')
        setJobs([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="view-my-jobs-hr-page">
      {/* Header */}
      <header className={`view-my-jobs-hr-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="view-my-jobs-hr-header-left">
          <div className="view-my-jobs-hr-logo-section">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="view-my-jobs-hr-logo-image"
            />
          </div>
          <nav className="view-my-jobs-hr-header-nav">
            <a href="/dashboard/hr" className="view-my-jobs-hr-nav-link">Home</a>
            <a href="/view-applicants/hr" className="view-my-jobs-hr-nav-link">View Applicants</a>
            <a href="/scheduled-interviews/hr" className="view-my-jobs-hr-nav-link">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="view-my-jobs-hr-nav-link">Add New Job</a>
            <a href="/my-jobs/hr" className="view-my-jobs-hr-nav-link active">My Jobs</a>
          </nav>
        </div>

        <div className="view-my-jobs-hr-header-center">
          <div className="view-my-jobs-hr-search-container">
            <input 
              type="text" 
              placeholder="Search" 
              className="view-my-jobs-hr-search-input"
            />
            <button className="view-my-jobs-hr-search-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="view-my-jobs-hr-header-right">
          <HRNotificationsBell />
          <div className="view-my-jobs-hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img 
              src={hrData?.profileImage || '/imges/profile-placeholder.png'} 
              alt={hrData?.name || 'HR User'}
              className="view-my-jobs-hr-profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <span className="view-my-jobs-hr-profile-name">{hrData?.name || 'HR User'}</span>
            <button className="view-my-jobs-hr-profile-dropdown">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="view-my-jobs-hr-profile-dropdown-menu">
                <button
                  className="view-my-jobs-hr-dropdown-item"
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
                <button
                  className="view-my-jobs-hr-dropdown-item"
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

      {/* Main Content */}
      <main className="view-my-jobs-hr-content">
        <div className="view-my-jobs-hr-container">
          <h1 className="view-my-jobs-hr-title">My Posted Jobs</h1>
          <p className="view-my-jobs-hr-subtitle">
            {totalJobs === 0 
              ? 'No jobs posted yet'
              : `Showing ${jobs.length} of ${totalJobs} job${totalJobs !== 1 ? 's' : ''}`
            }
          </p>

          {error && (
            <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '24px' }}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ marginBottom: '16px' }}>No jobs posted yet.</p>
              <button
                onClick={() => navigate('/add-new-job/hr')}
                style={{
                  padding: '12px 24px',
                  background: '#080066',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Post Your First Job
              </button>
            </div>
          ) : (
            <div className="view-my-jobs-hr-jobs-list">
              {jobs.map((job) => (
                <div key={job.id} className="view-my-jobs-hr-job-card">
                  <div className="view-my-jobs-hr-job-header">
                    <div className="view-my-jobs-hr-job-title-section">
                      <h2 className="view-my-jobs-hr-job-title">{job.title}</h2>
                      <div className="view-my-jobs-hr-job-meta">
                        <span className="view-my-jobs-hr-job-company">{job.company?.name || 'N/A'}</span>
                        {job.department && (
                          <>
                            <span className="view-my-jobs-hr-job-separator">•</span>
                            <span className="view-my-jobs-hr-job-department">{job.department}</span>
                          </>
                        )}
                        {job.location && (
                          <>
                            <span className="view-my-jobs-hr-job-separator">•</span>
                            <span className="view-my-jobs-hr-job-location">{job.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="view-my-jobs-hr-job-status">
                      <span className={`view-my-jobs-hr-status-badge ${job.is_active ? 'active' : 'inactive'}`}>
                        {job.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="view-my-jobs-hr-job-details">
                    {job.employment_type && (
                      <div className="view-my-jobs-hr-job-detail">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                          <path d="M8 10C4.68629 10 2 11.6863 2 14V16H14V14C14 11.6863 11.3137 10 8 10Z" fill="currentColor"/>
                        </svg>
                        <span>{job.employment_type}</span>
                      </div>
                    )}
                    {formatSalary(job) && (
                      <div className="view-my-jobs-hr-job-detail">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 1V15M4 4H12M4 8H12M4 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>{formatSalary(job)}</span>
                      </div>
                    )}
                    <div className="view-my-jobs-hr-job-detail">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                    </div>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div className="view-my-jobs-hr-job-skills">
                      {job.skills.map((skill, index) => (
                        <span key={index} className="view-my-jobs-hr-skill-tag">{skill}</span>
                      ))}
                    </div>
                  )}

                  <div className="view-my-jobs-hr-job-footer">
                    <button
                      className="view-my-jobs-hr-view-button"
                      onClick={() => navigate(`/job-details/${job.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="view-my-jobs-hr-applicants-button"
                      onClick={() => navigate(`/view-applicants/hr?job_id=${job.id}`)}
                    >
                      View Applicants
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ViewMyJobsHRPage
