import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ViewJobPage.css'
import UserNotificationsBell from '../components/UserNotificationsBell'
import { listJobs } from '../services/jobsApi'
import { getCurrentUser } from '../services/authApi'
import { listMyApplications } from '../services/myApplicationsApi'

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

function ViewJobPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [jobsError, setJobsError] = useState('')
  const [totalJobs, setTotalJobs] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('.view-job-hero')
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight
        setIsScrolled(window.scrollY > heroBottom - 100)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.user-profile')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isDropdownOpen])

  const [userData, setUserData] = useState({
    name: 'User',
    profileImage: '/imges/profile-placeholder.png'
  })

  useEffect(() => {
    let cancelled = false
    async function loadUserData() {
      try {
        const account = await getCurrentUser()
        if (cancelled) return
        if (account) {
          setUserData({
            name: account.full_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'User',
            profileImage: account.profile_image_url || '/imges/profile-placeholder.png'
          })
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load user data:', err)
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
      setJobsError('')
      setIsLoadingJobs(true)
      try {
        // Load user's applications to filter out jobs they've already applied for
        const [jobsRes, applicationsRes] = await Promise.all([
          listJobs({ q: searchQuery, active: true }), // Only active jobs
          listMyApplications({ limit: 1000, offset: 0 })
        ])
        if (cancelled) return
        
        // Get job IDs that user has already applied for
        const appliedJobIds = new Set(
          (applicationsRes?.applications || []).map(a => a.job_id)
        )
        
        // Filter out jobs user has already applied for
        const filteredJobs = (jobsRes?.jobs || []).filter(
          job => !appliedJobIds.has(job.id)
        )
        
        setJobs(filteredJobs)
        setTotalJobs(filteredJobs.length)
      } catch (e) {
        if (cancelled) return
        setJobsError(e?.message || 'Failed to load jobs')
        setJobs([])
        setTotalJobs(0)
      } finally {
        if (!cancelled) setIsLoadingJobs(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [searchQuery])

  return (
    <div className="view-job-page">
      {/* Header */}
      <header className={`view-job-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <div className="logo-section-header">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="header-logo-image"
            />
          </div>
          <nav className="header-nav">
            <a href="/dashboard/user" className="nav-link">Home</a>
            <a href="/view-job" className="nav-link active">View Job</a>
            <a href="/upload-cv" className="nav-link">Add CV</a>
          </nav>
        </div>

        <div className="header-center">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search" 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="header-right">
          <UserNotificationsBell />
          <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img 
              src={userData?.profileImage || '/imges/profile-placeholder.png'} 
              alt={userData?.name || 'User'}
              className="profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <span className="profile-name">{userData?.name || 'User'}</span>
            <button className="profile-dropdown">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="profile-dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    navigate('/profile')
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
                  className="dropdown-item"
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
      <section className="view-job-hero">
        <div className="hero-content-wrapper">
          <div className="hero-text-content">
            <h1 className="hero-title">
              Here you can view all your recent applicants all job applicants.
            </h1>
            <p className="hero-description">
              If you need to view and recent, simply click <a href="#" className="go-to-recent-link">Go to Recent Applicants</a>
            </p>
          </div>
          <div className="hero-robot">
            <img 
              src="/imges/hi robot.gif" 
              alt="Robot" 
              className="robot-gif"
            />
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="search-filter-section">
        <div className="search-filter-container">
          <div className="main-search-bar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="search-icon">
              <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search profiles, keywords, identifiers"
              className="main-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="filters-button">Filters</button>
        </div>
      </section>

      {/* Jobs List Section */}
      <section className="jobs-list-section">
        <div className="jobs-container">
          {jobsError && <div style={{ color: '#b91c1c', padding: '8px 4px' }}>{jobsError}</div>}
          {isLoadingJobs && <div style={{ color: '#475569', padding: '8px 4px' }}>Loading jobs...</div>}
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <div className="job-title-section">
                  <h3 className="job-title">{job.title}</h3>
                  <p className="job-company">{job.company?.name || '-'}</p>
                </div>
                <div className="job-status-badges">
                  <span className="status-badge status-new">{job.is_active ? 'Active' : 'Closed'}</span>
                </div>
              </div>

              <div className="job-details">
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8.66667C9.47276 8.66667 10.6667 7.47276 10.6667 6C10.6667 4.52724 9.47276 3.33333 8 3.33333C6.52724 3.33333 5.33333 4.52724 5.33333 6C5.33333 7.47276 6.52724 8.66667 8 8.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 14.6667C11.3333 12 14 9.33333 14 6C14 3.52724 11.4728 1.33333 8 1.33333C4.52724 1.33333 2 3.52724 2 6C2 9.33333 4.66667 12 8 14.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{job.location || '-'}</span>
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.3333 4H2.66667C1.93029 4 1.33333 4.59695 1.33333 5.33333V13.3333C1.33333 14.0697 1.93029 14.6667 2.66667 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V5.33333C14.6667 4.59695 14.0697 4 13.3333 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.6667 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.33333 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{job.employment_type || '-'}</span>
                </div>
                <div className="detail-item">
                  <span>{formatSalary(job) || '-'}</span>
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}</span>
                </div>
              </div>

              <div className="job-skills">
                {(job.skills || []).map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>

              <div className="job-card-footer">
                <button 
                  className="view-details-button"
                  onClick={() => navigate(`/job-details/${job.id}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="pagination-section">
          <p className="pagination-info">
            {totalJobs === 0 
              ? 'No results found'
              : `Showing ${jobs.length > 0 ? 1 : 0} to ${jobs.length} of ${totalJobs} result${totalJobs !== 1 ? 's' : ''}`
            }
          </p>
          <div className="pagination-controls">
            <button className="pagination-button" disabled>Previous</button>
            <button className="pagination-button active">1</button>
            <button className="pagination-button">Next</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ViewJobPage

