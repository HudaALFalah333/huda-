import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './UserDashboardPage.css'
import UserNotificationsBell from '../components/UserNotificationsBell'
import { listMyApplications, deleteApplication, updateApplication, getApplication } from '../services/myApplicationsApi'
import { getCurrentUser } from '../services/authApi'
import { listMyResumes } from '../services/resumesApi'

// Certifications Multi-Input Component
function CertificationsMultiInput({ certifications = [], onChange }) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const newCert = inputValue.trim()
      if (!certifications.includes(newCert)) {
        onChange([...certifications, newCert])
      }
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && certifications.length > 0) {
      onChange(certifications.slice(0, -1))
    }
  }

  const removeCert = (index) => {
    onChange(certifications.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '10px', 
        padding: '8px 8px 8px 32px', 
        minHeight: '36px', 
        display: 'flex', 
        alignItems: 'center',
        background: '#ffffff',
        fontSize: '13px',
        position: 'relative'
      }}>
        <div style={{ 
          position: 'absolute', 
          left: '8px', 
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 3H4C3.44772 3 3 3.44772 3 4V14C3 14.5523 3.44772 15 4 15H14C14.5523 15 15 14.5523 15 14V4C15 3.44772 14.5523 3 14 3Z" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6H10M6 9H10M6 12H8" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type certification and press Enter"
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: '13px',
            padding: '4px',
            color: '#111827'
          }}
        />
      </div>
      {certifications.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
          {certifications.map((cert, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{
                width: '2px',
                height: '20px',
                background: '#9333ea',
                flexShrink: 0
              }} />
              <span style={{ fontSize: '13px', color: '#9ca3af', flex: 1 }}>{cert}</span>
              <button
                type="button"
                onClick={() => removeCert(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '2px 4px',
                  fontSize: '16px',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Skills Multi-Input Component
function SkillsMultiInput({ skills = [], onChange }) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const newSkill = inputValue.trim()
      if (!skills.includes(newSkill)) {
        onChange([...skills, newSkill])
      }
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      onChange(skills.slice(0, -1))
    }
  }

  const removeSkill = (index) => {
    onChange(skills.filter((_, i) => i !== index))
  }

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '10px', 
      padding: '8px', 
      minHeight: '36px', 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '8px', 
      alignItems: 'center',
      background: '#ffffff',
      fontSize: '13px'
    }}>
      {skills.map((skill, index) => (
        <span
          key={index}
          style={{
            background: '#f3f4f6',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#111827'
          }}
        >
          {skill}
          <button
            type="button"
            onClick={() => removeSkill(index)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px',
              lineHeight: '1',
              marginLeft: '4px'
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={skills.length === 0 ? 'Type skill and press Enter' : 'Add another skill...'}
        style={{
          border: 'none',
          outline: 'none',
          flex: 1,
          minWidth: '150px',
          fontSize: '13px',
          padding: '4px',
          color: '#111827'
        }}
      />
    </div>
  )
}

function statusToColor(status) {
  if (status === 'ACCEPTED') return 'green'
  if (status === 'REJECTED') return 'red'
  if (status === 'UNDER_REVIEW') return 'yellow'
  if (status === 'INTERVIEW_SCHEDULED') return 'blue'
  if (status === 'OFFERED') return 'blue'
  return 'blue'
}

function UserDashboardPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [applications, setApplications] = useState([])
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [appsError, setAppsError] = useState('')
  const [deletingAppId, setDeletingAppId] = useState(null)
  const [editingAppId, setEditingAppId] = useState(null)
  const [editForm, setEditForm] = useState({ skills: [], certifications: [], cvFileName: '', selectedResumeId: null, workExperience: '' })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [availableResumes, setAvailableResumes] = useState([])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest('[data-menu-container]')) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  useEffect(() => {
    const handleScroll = () => {
      const videoContainer = document.querySelector('.video-background-container')
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
      setAppsError('')
      setIsLoadingApps(true)
      try {
        const res = await listMyApplications()
        if (cancelled) return
        let rows = (res?.applications || []).map((a) => {
          const appliedDate = a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '-'
          const interviewTime =
            a.interview_scheduled_at && a.interview_duration_minutes
              ? `${new Date(a.interview_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${a.interview_duration_minutes} min)`
              : null
          const interviewDate = a.interview_scheduled_at 
            ? new Date(a.interview_scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null
          return {
            id: a.id,
            jobId: a.job_id,
            jobTitle: a.job_title,
            company: a.company_name,
            appliedDate,
            status: String(a.status || '').replaceAll('_', ' '),
            statusRaw: a.status || '',
            statusColor: statusToColor(a.status),
            interviewTime,
            interviewDate,
            interviewer: a.hr_interviewer_name || '',
            interviewType: a.interview_meeting_type || '',
            interviewDuration: a.interview_duration_minutes || null,
            skills: a.skills || []
          }
        })
        
        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          rows = rows.filter((app) => 
            app.jobTitle?.toLowerCase().includes(query) ||
            app.company?.toLowerCase().includes(query) ||
            app.status?.toLowerCase().includes(query)
          )
        }
        
        setApplications(rows)
      } catch (e) {
        if (cancelled) return
        setAppsError(e?.message || 'Failed to load applications')
        setApplications([])
      } finally {
        if (!cancelled) setIsLoadingApps(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [searchQuery])

  const stats = {
    totalApplicants: applications.length,
    underReview: applications.filter((a) => a.statusColor === 'yellow').length,
    interviews: applications.filter((a) => a.statusColor === 'blue' && a.interviewTime).length,
    offers: applications.filter((a) => String(a.status).toLowerCase().includes('offer')).length
  }

  return (
    <div className="user-dashboard-page">
      {/* Video Background Container with Header and Hero */}
      <div className="video-background-container">
        <video 
          className="dashboard-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video/video-dashboard-user.mp4" type="video/mp4" />
        </video>
        <div className="dashboard-video-overlay"></div>
        
        {/* Header */}
        <header className={`dashboard-header ${isScrolled ? 'scrolled' : ''}`}>
          <div className="header-left">
            <div className="logo-section-header">
              <img 
                src="/imges/ejo white logo.png" 
                alt="EJO SUPPORT Logo" 
                className="header-logo-image"
              />
            </div>
            <nav className="header-nav">
              <a href="/dashboard/user" className="nav-link active">Home</a>
              <a href="/view-job" className="nav-link">View Job</a>
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
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome back, {userData?.name || 'User'} for EJO Support Company!
            </h1>
            <p className="hero-description">
              Manage your complaints and requests in one place. Create add job and new interviews progress, and view support responses quickly and easily.
            </p>
          </div>
        </section>
      </div>

      {/* Statistics Cards */}
      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{stats.totalApplicants}</div>
          <div className="stat-label">Total Applicants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.underReview}</div>
          <div className="stat-label">Under Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.interviews}</div>
          <div className="stat-label">Interviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.offers}</div>
          <div className="stat-label">Offers</div>
        </div>
      </section>

      {/* My Applications Section */}
      <section className="applications-section">
        <div className="applications-header">
          <h2 className="applications-title">My Applications</h2>
          <a
            href="/view-job"
            className="browse-jobs-link"
            onClick={(e) => {
              e.preventDefault()
              navigate('/view-job')
            }}
          >
            Browse More Job
          </a>
        </div>

        <div className="applications-list">
          {appsError && <div style={{ color: '#b91c1c', padding: '8px 4px' }}>{appsError}</div>}
          {isLoadingApps && <div style={{ color: '#475569', padding: '8px 4px' }}>Loading applications...</div>}
          {applications.map((app) => (
            <div 
              key={app.id} 
              className={`application-card ${app.statusRaw === 'INTERVIEW_SCHEDULED' ? 'application-card-interview' : ''}`}
              style={{
                border: app.statusRaw === 'INTERVIEW_SCHEDULED' ? '2px solid #2563eb' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '16px' }}>
                <div className="application-content" style={{ flex: 1 }}>
                  <h3 className="application-job-title">{app.jobTitle}</h3>
                  <p className="application-company">{app.company}</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge status-${app.statusColor} ${app.statusRaw === 'INTERVIEW_SCHEDULED' ? 'status-badge-interview' : ''}`}>
                    {app.status}
                  </span>
                  
                  <div style={{ position: 'relative' }} data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === app.id ? null : app.id)
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        color: '#64748b',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f1f5f9'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                        <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
                      </svg>
                    </button>
                    
                    {openMenuId === app.id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '140px',
                        zIndex: 1000,
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={async () => {
                            setEditError('')
                            setOpenMenuId(null)
                            setEditingAppId(app.id)
                            
                            // Load full application data including certifications and resume
                            try {
                              const [appRes, resumesRes] = await Promise.all([
                                getApplication(app.id),
                                listMyResumes()
                              ])
                              
                              const appData = appRes?.application || {}
                              const certifications = (appData.certifications || []).map(c => c.name || c)
                              
                              // Find matching resume ID if application has a resume
                              let selectedResumeId = null
                              if (appData.resume?.id) {
                                const matchingResume = resumesRes?.resumes?.find(r => r.id === appData.resume.id)
                                if (matchingResume) {
                                  selectedResumeId = String(appData.resume.id)
                                }
                              }
                              
                              setEditForm({ 
                                skills: app.skills || [], 
                                certifications: certifications,
                                cvFileName: appData.resume?.original_filename || '',
                                selectedResumeId: selectedResumeId,
                                workExperience: appData.work_experience || ''
                              })
                              setAvailableResumes(resumesRes?.resumes || [])
                            } catch (e) {
                              console.error('Failed to load application data:', e)
                              // Fallback to basic data
                              setEditForm({ 
                                skills: app.skills || [], 
                                certifications: [],
                                cvFileName: '',
                                selectedResumeId: null,
                                workExperience: ''
                              })
                              try {
                                const res = await listMyResumes()
                                setAvailableResumes(res?.resumes || [])
                              } catch (e2) {
                                console.error('Failed to load resumes:', e2)
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: '#1e293b',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s ease',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                            <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49651 12.4167 1.44775 12.6667 1.44775C12.9167 1.44775 13.1607 1.49651 13.3889 1.59128C13.617 1.68605 13.8249 1.8249 14 2.00001C14.1751 2.17512 14.314 2.38305 14.4087 2.61119C14.5035 2.83933 14.5523 3.08336 14.5523 3.33334C14.5523 3.58332 14.5035 3.82735 14.4087 4.05549C14.314 4.28363 14.1751 4.49156 14 4.66667L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00001Z" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to delete this application?')) {
                              setOpenMenuId(null)
                              return
                            }
                            setDeletingAppId(app.id)
                            setOpenMenuId(null)
                            try {
                              await deleteApplication(app.id)
                              // Reload applications
                              const res = await listMyApplications({ limit: 1000, offset: 0 })
                              const rows = (res?.applications || []).map((a) => {
                                const appliedDate = a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '-'
                                const interviewTime =
                                  a.interview_scheduled_at && a.interview_duration_minutes
                                    ? `${new Date(a.interview_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${a.interview_duration_minutes} min)`
                                    : null
                                const interviewDate = a.interview_scheduled_at 
                                  ? new Date(a.interview_scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : null
                                return {
                                  id: a.id,
                                  jobId: a.job_id,
                                  jobTitle: a.job_title,
                                  company: a.company_name,
                                  appliedDate,
                                  status: String(a.status || '').replaceAll('_', ' '),
                                  statusRaw: a.status || '',
                                  statusColor: statusToColor(a.status),
                                  interviewTime,
                                  interviewDate,
                                  interviewer: a.hr_interviewer_name || '',
                                  interviewType: a.interview_meeting_type || '',
                                  interviewDuration: a.interview_duration_minutes || null,
                                  skills: a.skills || []
                                }
                              })
                              setApplications(rows)
                            } catch (e) {
                              alert(e?.message || 'Failed to delete application')
                            } finally {
                              setDeletingAppId(null)
                            }
                          }}
                          disabled={deletingAppId === app.id}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: deletingAppId === app.id ? '#9ca3af' : '#dc2626',
                            fontSize: '14px',
                            cursor: deletingAppId === app.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s ease',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            if (deletingAppId !== app.id) e.target.style.background = '#fee2e2'
                          }}
                          onMouseLeave={(e) => {
                            if (deletingAppId !== app.id) e.target.style.background = 'transparent'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                            <path d="M3.33334 5.33333H14.6667M7.33334 8V12.6667M10.6667 8V12.6667M4.66667 5.33333L5.33334 14.6667C5.33334 15.1971 5.54405 15.7058 5.91912 16.0809C6.29419 16.456 6.80291 16.6667 7.33334 16.6667H10.6667C11.1971 16.6667 11.7058 16.456 12.0809 16.0809C12.456 15.7058 12.6667 15.1971 12.6667 14.6667L13.3333 5.33333M6.66667 5.33333V3.33333C6.66667 2.8029 6.87738 2.29419 7.25245 1.91912C7.62752 1.54405 8.13623 1.33333 8.66667 1.33333H9.33334C9.86377 1.33333 10.3725 1.54405 10.7475 1.91912C11.1226 2.29419 11.3333 2.8029 11.3333 3.33333V5.33333" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {app.statusRaw === 'INTERVIEW_SCHEDULED' && app.interviewDate && (
                <div className="application-details" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '12px' }}>
                  <div className="detail-item" style={{ color: '#2563eb' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#2563eb' }}>
                      <path d="M12 2.66667H3.99998C3.2636 2.66667 2.66665 3.26362 2.66665 4V12C2.66665 12.7364 3.2636 13.3333 3.99998 13.3333H12C12.7364 13.3333 13.3333 12.7364 13.3333 12V4C13.3333 3.26362 12.7364 2.66667 12 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.6667 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.33331 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.66665 6.66667H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{app.interviewDate}</span>
                  </div>
                  
                  {app.interviewTime && (
                    <div className="detail-item" style={{ color: '#ca8a04' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#ca8a04' }}>
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{app.interviewTime}</span>
                    </div>
                  )}
                  
                  {app.interviewer && (
                    <div className="detail-item" style={{ color: '#1e40af' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#1e40af' }}>
                        <path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 13.3333C4 11.1242 5.79086 9.33333 8 9.33333C10.2091 9.33333 12 11.1242 12 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{app.interviewer}</span>
                    </div>
                  )}
                  
                  {app.interviewType && (
                    <div className="detail-item" style={{ color: '#16a34a' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#16a34a' }}>
                        <path d="M8 4C8.73638 4 9.33333 4.59695 9.33333 5.33333C9.33333 6.06971 8.73638 6.66667 8 6.66667C7.26362 6.66667 6.66667 6.06971 6.66667 5.33333C6.66667 4.59695 7.26362 4 8 4Z" fill="currentColor"/>
                        <path d="M4 12C4 10.5272 5.19391 9.33333 6.66667 9.33333H9.33333C10.8061 9.33333 12 10.5272 12 12V13.3333H4V12Z" fill="currentColor"/>
                        <path d="M13.3333 8C13.7015 8 14 7.70152 14 7.33333C14 6.96514 13.7015 6.66667 13.3333 6.66667C12.9651 6.66667 12.6667 6.96514 12.6667 7.33333C12.6667 7.70152 12.9651 8 13.3333 8Z" fill="currentColor"/>
                        <path d="M14 10.6667H12.6667V12H14V10.6667Z" fill="currentColor"/>
                      </svg>
                      <span>{app.interviewType}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="application-details">
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.66667H3.99998C3.2636 2.66667 2.66665 3.26362 2.66665 4V12C2.66665 12.7364 3.2636 13.3333 3.99998 13.3333H12C12.7364 13.3333 13.3333 12.7364 13.3333 12V4C13.3333 3.26362 12.7364 2.66667 12 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.6667 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.33331 1.33333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.66665 6.66667H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Applied: {app.appliedDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit Application Modal */}
      {editingAppId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setEditingAppId(null)
            setEditForm({ skills: [], certifications: [], cvFileName: '', selectedResumeId: null, workExperience: '' })
            setEditError('')
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Edit Application</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingAppId(null)
                  setEditForm({ skills: [], cvFileName: '' })
                  setEditError('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {editError && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{editError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Skills (Optional)
                </label>
                <SkillsMultiInput
                  skills={editForm.skills || []}
                  onChange={(skills) => setEditForm({ ...editForm, skills })}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Type a skill and press Enter to add it. Press Backspace on empty input to remove the last skill.
                </p>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Certification (Optional)
                </label>
                <CertificationsMultiInput
                  certifications={editForm.certifications || []}
                  onChange={(certifications) => setEditForm({ ...editForm, certifications })}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'block', marginBottom: '8px' }}>
                  Work Experience (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.workExperience || ''}
                  onChange={(e) => setEditForm({ ...editForm, workExperience: e.target.value })}
                  placeholder="e.g., 5 years of experience in software development"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', display: 'block', marginBottom: '8px' }}>
                  Choose CV (Optional)
                </label>
                {availableResumes.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <select
                      value={editForm.selectedResumeId || ''}
                      onChange={(e) => {
                        setEditForm({ ...editForm, selectedResumeId: e.target.value || null, cvFileName: '' })
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#111827',
                        background: 'white',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select from uploaded CVs</option>
                      {availableResumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.original_filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label
                  style={{
                    marginTop: '8px',
                    borderRadius: '14px',
                    border: '1.5px dashed #cbd5f5',
                    background: '#f8fafc',
                    padding: '20px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, background 0.2s ease'
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    disabled={!!editForm.selectedResumeId}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      setEditForm({ ...editForm, cvFileName: file ? file.name : '', selectedResumeId: null })
                    }}
                  />
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '999px',
                      background: '#e0ebff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      fontSize: '18px'
                    }}
                  >
                    ⬆
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                      {availableResumes.length > 0 ? 'Or upload new CV' : 'Click to upload or drag and drop'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      PDF, DOC, DOCX, up to 10MB
                    </span>
                    {editForm.cvFileName && (
                      <span style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                        Selected file: {editForm.cvFileName}
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingAppId(null)
                  setEditForm({ skills: [], certifications: [], cvFileName: '', selectedResumeId: null, workExperience: '' })
                  setEditError('')
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setEditError('')
                  setIsSavingEdit(true)
                  try {
                    const payload = {}
                    if (editForm.skills && editForm.skills.length > 0) {
                      payload.skills = editForm.skills
                    }
                    if (editForm.certifications && editForm.certifications.length > 0) {
                      payload.certifications = editForm.certifications
                    }
                    if (editForm.workExperience !== undefined) {
                      payload.work_experience = editForm.workExperience || null
                    }
                    // Handle CV - use selected resume if available, otherwise use uploaded file
                    if (editForm.selectedResumeId) {
                      // Use existing resume by ID
                      payload.resume_id = Number(editForm.selectedResumeId)
                    } else if (editForm.cvFileName) {
                      // When uploading a new file, create a resume object with filename (similar to apply flow)
                      payload.resume = {
                        original_filename: editForm.cvFileName,
                        file_url: `local://${encodeURIComponent(editForm.cvFileName)}`
                      }
                    }
                    await updateApplication(editingAppId, payload)
                    
                    // Reload applications
                    const res = await listMyApplications({ limit: 1000, offset: 0 })
                    const rows = (res?.applications || []).map((a) => {
                      const appliedDate = a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '-'
                      const interviewTime =
                        a.interview_scheduled_at && a.interview_duration_minutes
                          ? `${new Date(a.interview_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${a.interview_duration_minutes} min)`
                          : null
                      const interviewDate = a.interview_scheduled_at 
                        ? new Date(a.interview_scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : null
                      return {
                        id: a.id,
                        jobId: a.job_id,
                        jobTitle: a.job_title,
                        company: a.company_name,
                        appliedDate,
                        status: String(a.status || '').replaceAll('_', ' '),
                        statusRaw: a.status || '',
                        statusColor: statusToColor(a.status),
                        interviewTime,
                        interviewDate,
                        interviewer: a.hr_interviewer_name || '',
                        interviewType: a.interview_meeting_type || '',
                        interviewDuration: a.interview_duration_minutes || null,
                        skills: a.skills || []
                      }
                    })
                    setApplications(rows)
                    
                    setEditingAppId(null)
                    setEditForm({ skills: [], certifications: [], cvFileName: '', selectedResumeId: null, workExperience: '' })
                  } catch (e) {
                    setEditError(e?.message || 'Failed to update application')
                  } finally {
                    setIsSavingEdit(false)
                  }
                }}
                disabled={isSavingEdit}
                style={{
                  padding: '10px 20px',
                  background: isSavingEdit ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboardPage

