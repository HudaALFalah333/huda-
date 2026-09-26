import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './ScheduledInterviewsHRPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { listInterviewsHR, cancelInterview, updateInterview } from '../services/interviewsApi'
import { getCurrentUser } from '../services/authApi'

function ScheduledInterviewsHRPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('job_id') ? Number(searchParams.get('job_id')) : null
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [scheduledInterviews, setScheduledInterviews] = useState([])
  const [allInterviews, setAllInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [searchError, setSearchError] = useState('')
  const [totalInterviews, setTotalInterviews] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.scheduled-interviews-hr-user-profile')) {
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

  // Load all interviews for search filter dropdown (candidates)
  useEffect(() => {
    let cancelled = false
    async function loadAllInterviews() {
      try {
        const res = await listInterviewsHR({ 
          jobId: jobIdFromUrl || undefined,
          limit: 1000, 
          offset: 0 
        })
        if (cancelled) return
        
        // Get unique candidates from interviews for dropdown
        const uniqueCandidates = new Map()
        ;(res?.interviews || []).forEach((i) => {
          const key = `${i.application_id}-${i.candidate_name}`
          if (!uniqueCandidates.has(key)) {
            uniqueCandidates.set(key, {
              applicationId: i.application_id,
              candidateName: i.candidate_name || 'Candidate',
              jobTitle: i.job_title || ''
            })
          }
        })
        
        setAllInterviews(Array.from(uniqueCandidates.values()))
      } catch (e) {
        if (cancelled) return
        console.error('Failed to load interviews:', e)
        setAllInterviews([])
      }
    }
    loadAllInterviews()
    return () => {
      cancelled = true
    }
  }, [jobIdFromUrl]) // Reload when job_id changes

  const loadInterviews = async () => {
    setError('')
    setIsLoading(true)
    try {
      // If job_id is in URL, filter by that job
      const res = await listInterviewsHR({ 
        jobId: jobIdFromUrl || undefined,
        limit: 50, 
        offset: 0 
      })
      // Filter out cancelled interviews
      const rows = (res?.interviews || [])
        .filter(i => i.status !== 'CANCELLED')
        .map((i) => {
        const d = i.scheduled_at ? new Date(i.scheduled_at) : null
        return {
          id: i.id,
          applicationId: i.application_id,
          candidateName: i.candidate_name || 'Candidate',
          jobTitle: i.job_title || '',
          status: i.status || '',
          date: d ? d.toLocaleDateString() : '-',
          time: d
            ? `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${i.duration_minutes || 60} min)`
            : '-',
          interviewer: i.hr_interviewer_name || '',
          meetingType: i.meeting_type || '',
          meetingLink: i.meeting_link || ''
        }
      })
      setScheduledInterviews(rows)
      setTotalInterviews(res?.total || 0)
    } catch (e) {
      setError(e?.message || 'Failed to load interviews')
      setScheduledInterviews([])
      setTotalInterviews(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Load scheduled interviews
  useEffect(() => {
    let cancelled = false
    async function load() {
      await loadInterviews()
      if (cancelled) return
    }
    load()
    return () => {
      cancelled = true
    }
  }, [jobIdFromUrl]) // Reload when job_id changes

  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError('')
    setIsSearching(true)
    setError('')
    
    try {
      // If no filters are selected, reload all interviews (respecting job_id if present)
      if (!selectedCandidate && !selectedDate && !selectedTime) {
        const res = await listInterviewsHR({ 
          jobId: jobIdFromUrl || undefined,
          limit: 50, 
          offset: 0 
        })
        // Filter out cancelled interviews
        const rows = (res?.interviews || [])
          .filter(i => i.status !== 'CANCELLED')
          .map((i) => {
          const d = i.scheduled_at ? new Date(i.scheduled_at) : null
          return {
            id: i.id,
            applicationId: i.application_id,
            candidateName: i.candidate_name || 'Candidate',
            jobTitle: i.job_title || '',
            status: i.status || '',
            date: d ? d.toLocaleDateString() : '-',
            time: d
              ? `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${i.duration_minutes || 60} min)`
              : '-',
            interviewer: i.hr_interviewer_name || '',
            meetingType: i.meeting_type || '',
            meetingLink: i.meeting_link || ''
          }
        })
        setScheduledInterviews(rows)
        setTotalInterviews(res?.total || rows.length)
        setIsSearching(false)
        return
      }
      
      // Load all interviews for client-side filtering (respecting job_id if present)
      const res = await listInterviewsHR({ 
        jobId: jobIdFromUrl || undefined,
        limit: 1000, 
        offset: 0 
      })
      // Filter out cancelled interviews
      let filtered = (res?.interviews || []).filter(i => i.status !== 'CANCELLED')
      
      // Filter by candidate (application_id) if provided
      if (selectedCandidate && selectedCandidate !== '') {
        const applicationId = Number(selectedCandidate)
        if (Number.isFinite(applicationId)) {
          filtered = filtered.filter(i => {
            const iAppId = Number(i.application_id)
            return Number.isFinite(iAppId) && iAppId === applicationId
          })
        }
      }
      
      // Filter by date if provided
      if (selectedDate) {
        const filterDate = new Date(selectedDate + 'T00:00:00')
        filterDate.setHours(0, 0, 0, 0)
        const nextDay = new Date(filterDate)
        nextDay.setDate(nextDay.getDate() + 1)
        
        filtered = filtered.filter(i => {
          if (!i.scheduled_at) return false
          const interviewDate = new Date(i.scheduled_at)
          interviewDate.setHours(0, 0, 0, 0)
          return interviewDate >= filterDate && interviewDate < nextDay
        })
      }
      
      // Filter by time if provided
      if (selectedTime) {
        const timeParts = selectedTime.split(':')
        if (timeParts.length >= 2) {
          const filterHours = parseInt(timeParts[0], 10)
          const filterMinutes = parseInt(timeParts[1], 10)
          
          if (!isNaN(filterHours) && !isNaN(filterMinutes)) {
            filtered = filtered.filter(i => {
              if (!i.scheduled_at) return false
              const interviewDate = new Date(i.scheduled_at)
              // Compare hours and minutes (using local time from the Date object)
              return interviewDate.getHours() === filterHours && interviewDate.getMinutes() === filterMinutes
            })
          }
        }
      }
      
      // Map to display format
      const rows = filtered.map((i) => {
        const d = i.scheduled_at ? new Date(i.scheduled_at) : null
        return {
          id: i.id,
          applicationId: i.application_id,
          candidateName: i.candidate_name || 'Candidate',
          jobTitle: i.job_title || '',
          status: i.status || '',
          date: d ? d.toLocaleDateString() : '-',
          time: d
            ? `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${i.duration_minutes || 60} min)`
            : '-',
          interviewer: i.hr_interviewer_name || '',
          meetingType: i.meeting_type || '',
          meetingLink: i.meeting_link || ''
        }
      })
      
      setScheduledInterviews(rows)
      setTotalInterviews(rows.length)
    } catch (e) {
      setSearchError(e?.message || 'Failed to search interviews')
      setScheduledInterviews([])
      setTotalInterviews(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleDelete = async (interviewId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to cancel this interview?')) {
      return
    }
    
    try {
      setError('')
      await cancelInterview(interviewId)
      // Reload interviews after deletion
      await loadInterviews()
    } catch (e) {
      setError(e?.message || 'Failed to cancel interview')
    }
  }

  const handleEdit = (interview, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // For now, show an alert - can be replaced with a modal later
    const newDate = prompt('Enter new date and time (ISO format):', interview.date + 'T' + interview.time.split(' ')[0])
    const newLink = prompt('Enter new meeting link:', interview.meetingLink)
    
    if (newDate || newLink !== null) {
      const updates = {}
      if (newDate) {
        updates.scheduled_at = new Date(newDate).toISOString()
      }
      if (newLink !== null) {
        updates.meeting_link = newLink || null
      }
      
      if (Object.keys(updates).length > 0) {
        updateInterview(interview.id, updates)
          .then(() => {
            loadInterviews()
          })
          .catch((e) => {
            setError(e?.message || 'Failed to update interview')
          })
      }
    }
  }

  return (
    <div className="scheduled-interviews-hr-page">
      {/* Header */}
      <header className={`scheduled-interviews-hr-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="scheduled-interviews-hr-header-left">
          <div className="scheduled-interviews-hr-logo-section">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="scheduled-interviews-hr-logo-image"
            />
          </div>
          <nav className="scheduled-interviews-hr-header-nav">
            <a href="/dashboard/hr" className="scheduled-interviews-hr-nav-link">Home</a>
            <a href="/view-applicants/hr" className="scheduled-interviews-hr-nav-link">View applicants</a>
            <a href="/scheduled-interviews/hr" className="scheduled-interviews-hr-nav-link active">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="scheduled-interviews-hr-nav-link">Add New Job</a>
            <a href="/my-jobs/hr" className="scheduled-interviews-hr-nav-link">My Jobs</a>
          </nav>
        </div>

        <div className="scheduled-interviews-hr-header-right">
          <div className="scheduled-interviews-hr-search-container-header">
            <input 
              type="text" 
              placeholder="Search" 
              className="scheduled-interviews-hr-search-input-header"
            />
            <button className="scheduled-interviews-hr-search-button-header" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <HRNotificationsBell buttonClassName="scheduled-interviews-hr-notification-button" />
          <div className="scheduled-interviews-hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img 
              src={hrData?.profileImage || '/imges/profile-placeholder.png'} 
              alt={hrData?.name || 'HR User'}
              className="scheduled-interviews-hr-profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <div className="scheduled-interviews-hr-profile-info">
              <div className="scheduled-interviews-hr-profile-name">{hrData?.name || 'HR User'}</div>
            </div>
            <button className="scheduled-interviews-hr-profile-dropdown">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* HR Dropdown Menu - Log Out only */}
            {isDropdownOpen && (
              <div className="scheduled-interviews-hr-profile-dropdown-menu">
                {/* MY PROFILE */}
                <button
                  className="scheduled-interviews-hr-dropdown-item"
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
                  className="scheduled-interviews-hr-dropdown-item"
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
      <section className="scheduled-interviews-hr-hero">
        <div className="scheduled-interviews-hr-hero-content-wrapper">
          <div className="scheduled-interviews-hr-hero-text-content">
            <h1 className="scheduled-interviews-hr-hero-title">
              Here you can view all your Interview and edit.
            </h1>
            <p className="scheduled-interviews-hr-hero-description">
              If you need to view and edit, simply click <a href="#" className="scheduled-interviews-hr-go-to-link">Go to Scheduled Interviews</a>
            </p>
          </div>
          <div className="scheduled-interviews-hr-hero-robot">
            <img 
              src="/imges/phone ropot .gif" 
              alt="Phone Robot" 
              className="scheduled-interviews-hr-robot-gif"
            />
          </div>
        </div>
      </section>

      {/* Quick Search Section */}
      <section className="scheduled-interviews-hr-quick-schedule-section">
        <div className="scheduled-interviews-hr-quick-schedule-card">
          <h2 className="scheduled-interviews-hr-quick-schedule-title">Quick Search</h2>
          <form className="scheduled-interviews-hr-quick-schedule-form" onSubmit={handleSearch}>
            {searchError && <div style={{ color: '#b91c1c', padding: '8px 4px', marginBottom: '12px' }}>{searchError}</div>}
            <div className="scheduled-interviews-hr-form-row">
              <div className="scheduled-interviews-hr-form-group">
                <label className="scheduled-interviews-hr-form-label">Candidate</label>
                <div className="scheduled-interviews-hr-select-wrapper">
                  <select 
                    className="scheduled-interviews-hr-form-select"
                    value={selectedCandidate}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                    disabled={isSearching}
                  >
                    <option value="">All candidates</option>
                    {allInterviews.length === 0 ? (
                      <option value="" disabled>No interviews found</option>
                    ) : (
                      allInterviews.map((interview, index) => (
                        <option key={index} value={interview.applicationId}>
                          {interview.candidateName} - {interview.jobTitle}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="scheduled-interviews-hr-form-group">
                <label className="scheduled-interviews-hr-form-label">Date</label>
                <input 
                  type="date"
                  className="scheduled-interviews-hr-form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Enter date"
                />
              </div>
              <div className="scheduled-interviews-hr-form-group">
                <label className="scheduled-interviews-hr-form-label">Time</label>
                <input 
                  type="time"
                  className="scheduled-interviews-hr-form-input"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="Enter time"
                />
              </div>
              <button type="submit" className="scheduled-interviews-hr-schedule-button" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Scheduled Interviews List */}
      <section className="scheduled-interviews-hr-list-section">
        <div className="scheduled-interviews-hr-list-container">
          <h2 className="scheduled-interviews-hr-list-title">Scheduled Interviews</h2>
          {error && <div style={{ color: '#b91c1c', padding: '8px 4px' }}>{error}</div>}
          {isLoading && <div style={{ color: '#475569', padding: '8px 4px' }}>Loading...</div>}
          <div className="scheduled-interviews-hr-interviews-list">
            {scheduledInterviews.map((interview) => (
              <div key={interview.id} className="scheduled-interviews-hr-interview-card">
                <div className="scheduled-interviews-hr-interview-header">
                  <div className="scheduled-interviews-hr-interview-main-info">
                    <h3 className="scheduled-interviews-hr-interview-candidate-name">{interview.candidateName}</h3>
                    <span className={`scheduled-interviews-hr-interview-status ${interview.status === 'CANCELLED' ? 'scheduled-interviews-hr-status-cancelled' : ''}`}>
                      {interview.status}
                    </span>
                  </div>
                  <div className="scheduled-interviews-hr-interview-actions">
                    <button 
                      className="scheduled-interviews-hr-edit-button"
                      onClick={(e) => handleEdit(interview, e)}
                      title="Edit interview"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49651 12.4167 1.44775 12.6667 1.44775C12.9167 1.44775 13.1607 1.49651 13.3889 1.59128C13.617 1.68605 13.8249 1.8249 14 2.00001C14.1751 2.17512 14.314 2.38305 14.4087 2.61119C14.5035 2.83933 14.5523 3.08336 14.5523 3.33334C14.5523 3.58332 14.5035 3.82735 14.4087 4.05549C14.314 4.28363 14.1751 4.49156 14 4.66667L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button 
                      className="scheduled-interviews-hr-delete-button"
                      onClick={(e) => handleDelete(interview.id, e)}
                      title="Cancel interview"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 4H14M12.6667 4V13.3333C12.6667 13.687 12.5262 14.0261 12.2761 14.2761C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66667C4.31305 14.6667 3.97391 14.5262 3.72386 14.2761C3.47381 14.0261 3.33334 13.687 3.33334 13.3333V4M5.33334 4V2.66667C5.33334 2.31305 5.47381 1.97391 5.72386 1.72386C5.97391 1.47381 6.31305 1.33334 6.66667 1.33334H9.33334C9.68696 1.33334 10.0261 1.47381 10.2761 1.72386C10.5262 1.97391 10.6667 2.31305 10.6667 2.66667V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="scheduled-interviews-hr-interview-job-title">{interview.jobTitle}</p>
                <div className="scheduled-interviews-hr-interview-details">
                  <div className="scheduled-interviews-hr-interview-detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{interview.date}</span>
                  </div>
                  <div className="scheduled-interviews-hr-interview-detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{interview.time}</span>
                  </div>
                  <div className="scheduled-interviews-hr-interview-detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 8.5C9.38071 8.5 10.5 7.38071 10.5 6C10.5 4.61929 9.38071 3.5 8 3.5C6.61929 3.5 5.5 4.61929 5.5 6C5.5 7.38071 6.61929 8.5 8 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.5 13.5C2.5 11.0147 4.51472 9 7 9H9C11.4853 9 13.5 11.0147 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{interview.interviewer}</span>
                  </div>
                  <div className="scheduled-interviews-hr-interview-detail-item scheduled-interviews-hr-video-detail">
                    {/* Video Call icon - headset with person, outline style, matches text color via currentColor */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 11C6 7.68629 8.68629 5 12 5C15.3137 5 18 7.68629 18 11V14C18 15.1046 17.1046 16 16 16H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 14V11C6 7.68629 8.68629 5 12 5C15.3137 5 18 7.68629 18 11V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 14C6 15.1046 6.89543 16 8 16H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 18C9.66667 18.6667 10.6667 19 12 19C13.3333 19 14.3333 18.6667 15 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.5 11C8.5 9.61929 9.61929 8.5 11 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{interview.meetingType}</span>
                  </div>
                </div>
                <div className="scheduled-interviews-hr-interview-link">
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="scheduled-interviews-hr-meeting-link">
                    {interview.meetingLink}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pagination */}
      <section className="scheduled-interviews-hr-pagination-section">
        <div className="scheduled-interviews-hr-pagination-wrapper">
          <div className="scheduled-interviews-hr-pagination-info">
            {totalInterviews === 0 
              ? 'No results found'
              : `Showing 1 to ${scheduledInterviews.length} of ${totalInterviews} result${totalInterviews !== 1 ? 's' : ''}`
            }
          </div>
          <div className="scheduled-interviews-hr-pagination-controls">
            <button className="scheduled-interviews-hr-pagination-button">Previous</button>
            <button className="scheduled-interviews-hr-pagination-button scheduled-interviews-hr-pagination-active">1</button>
            <button className="scheduled-interviews-hr-pagination-button">Next</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ScheduledInterviewsHRPage

