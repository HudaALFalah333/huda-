import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './ViewApplicantDetailsHRPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { getApplicationDetails, updateApplicationStatus } from '../services/hrApplicationsApi'
import { scheduleInterview } from '../services/interviewsApi'
import { getCurrentUser } from '../services/authApi'

function ViewApplicantDetailsHRPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false)
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [interviewForm, setInterviewForm] = useState({
    rolePosition: '',
    department: '',
    hrInterview: '',
    dateTime: ''
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.view-applicant-details-hr-user-profile')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isDropdownOpen])

  useEffect(() => {
    if (!isInterviewModalOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsInterviewModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isInterviewModalOpen])

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

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setIsLoading(true)
      try {
        const res = await getApplicationDetails(id)
        if (cancelled) return
        console.log('Application details loaded:', res)
        console.log('Resume data:', res?.application?.resume)
        setData(res?.application || null)
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Failed to load application')
        setData(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (id) load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Debug: Log data changes
  useEffect(() => {
    if (data) {
      console.log('Current application data:', data)
      console.log('Resume info:', data.resume)
    }
  }, [data])

  const applicant = data
    ? {
        id,
        name: data.candidate?.full_name || 'Candidate',
        role: data.job?.title || '',
        jobTitle: data.job?.title || '',
        location: data.candidate?.location || '-',
        email: data.candidate?.email || '-',
        activeSince: data.candidate?.active_since_year ? String(data.candidate.active_since_year) : '-',
        phone: data.candidate?.phone || '-',
        status: String(data.status || '').replaceAll('_', ' '),
        match: data.match_score ?? 0,
        matchBreakdown: data.match_score_breakdown || null,
        professionalSummary: data.candidate?.professional_summary || '',
        education: (data.education || []).map((e) => ({
          degree: e.degree,
          university: e.university,
          period: e.period_text || [e.start_year, e.end_year].filter(Boolean).join(' - ')
        })),
        workExperience: (data.work_experience_list && data.work_experience_list.length > 0)
          ? data.work_experience_list.map((w) => ({
              title: w.title,
              company: w.company,
              period: w.period_text || [w.start_year, w.end_year].filter(Boolean).join(' - '),
              description: w.description
            }))
          : (data.work_experience ? [{ title: '', company: '', period: '', description: data.work_experience }] : []),
        skills: data.skills || [],
        certifications: (data.certifications || []).map((c) => c.name)
      }
    : {
        id,
        name: isLoading ? 'Loading...' : '',
        role: '',
        jobTitle: '',
        location: '',
        email: '',
        activeSince: '',
        phone: '',
        status: '',
        match: 0,
        professionalSummary: '',
        education: [],
        workExperience: [],
        skills: [],
        certifications: []
      }

  return (
    <div className="view-applicant-details-hr-page">
      {/* Header */}
      <header className={`view-applicant-details-hr-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="view-applicant-details-hr-header-left">
          <div className="view-applicant-details-hr-logo-section">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="view-applicant-details-hr-logo-image"
            />
          </div>
          <nav className="view-applicant-details-hr-header-nav">
            <a href="/dashboard/hr" className="view-applicant-details-hr-nav-link">Home</a>
            <a href="/view-applicants/hr" className="view-applicant-details-hr-nav-link active">View applicants</a>
            <a href="/scheduled-interviews/hr" className="view-applicant-details-hr-nav-link">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="view-applicant-details-hr-nav-link">Add New Job</a>
            <a href="/my-jobs/hr" className="view-applicant-details-hr-nav-link">My Jobs</a>
          </nav>
        </div>

        <div className="view-applicant-details-hr-header-right">
          <div className="view-applicant-details-hr-search-container-header">
            <input 
              type="text" 
              placeholder="Search" 
              className="view-applicant-details-hr-search-input-header"
            />
            <button className="view-applicant-details-hr-search-button-header" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <HRNotificationsBell buttonClassName="view-applicant-details-hr-notification-button" />
          <div className="view-applicant-details-hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img 
              src={hrData?.profileImage || '/imges/profile-placeholder.png'} 
              alt={hrData?.name || 'HR User'}
              className="view-applicant-details-hr-profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <div className="view-applicant-details-hr-profile-info">
              <div className="view-applicant-details-hr-profile-name">{hrData?.name || 'HR User'}</div>
            </div>
            <button className="view-applicant-details-hr-profile-dropdown">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* HR Dropdown Menu - Log Out only */}
            {isDropdownOpen && (
              <div className="view-applicant-details-hr-profile-dropdown-menu">
                {/* MY PROFILE */}
                <button 
                  className="view-applicant-details-hr-dropdown-item"
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
                  className="view-applicant-details-hr-dropdown-item"
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
      <div className="view-applicant-details-hr-content">
        {error && <div style={{ color: '#b91c1c', padding: '8px 4px' }}>{error}</div>}
        {isLoading && <div style={{ color: '#475569', padding: '8px 4px' }}>Loading...</div>}
        {/* Back Link */}
        <div className="view-applicant-details-hr-back-link">
          <button onClick={() => navigate('/view-applicants/hr')} className="view-applicant-details-hr-back-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Applications
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="view-applicant-details-hr-main-layout">
          {/* Left Column - Applicant Details */}
          <div className="view-applicant-details-hr-left-column">
            <div className="view-applicant-details-hr-applicant-card">
              <div className="view-applicant-details-hr-applicant-header">
                <div className="view-applicant-details-hr-avatar-section">
                  <div className="view-applicant-details-hr-avatar">
                    {getInitials(applicant.name)}
                  </div>
                </div>
                <div className="view-applicant-details-hr-header-content">
                  <div className="view-applicant-details-hr-name-role">
                    <h1 className="view-applicant-details-hr-applicant-name">{applicant.name}</h1>
                    <p className="view-applicant-details-hr-applicant-role">{applicant.role}</p>
                  </div>
                  <span className="view-applicant-details-hr-status-pill">{applicant.status}</span>
                </div>
              </div>

              {/* Match Score */}
              <div className="view-applicant-details-hr-match-section">
                <div className="view-applicant-details-hr-match-header">
                  <span className="view-applicant-details-hr-match-label">Match Score</span>
                  <span className="view-applicant-details-hr-match-percentage">{applicant.match}%</span>
                </div>
                <div className="view-applicant-details-hr-match-bar">
                  <div 
                    className="view-applicant-details-hr-match-fill" 
                    style={{ width: `${applicant.match}%` }}
                  ></div>
                </div>
                
                {/* Match Score Breakdown */}
                {applicant.matchBreakdown && (
                  <div className="view-applicant-details-hr-match-breakdown">
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#475569', margin: '16px 0 8px 0' }}>
                      Score Breakdown (How to improve):
                    </p>
                    <div className="view-applicant-details-hr-breakdown-list">
                      {Object.entries(applicant.matchBreakdown.breakdown || {}).map(([key, item]) => {
                        const labels = {
                          resume: 'Resume/CV Uploaded',
                          skills: 'Skills Added',
                          workExperience: 'Work Experience',
                          education: 'Education',
                          location: 'Location',
                          professionalSummary: 'Professional Summary',
                          certifications: 'Certifications',
                          completenessBonus: 'Completeness Bonus'
                        }
                        const isEarned = item.points > 0
                        const showWordCount = item.wordCount !== undefined && item.wordCount > 0
                        return (
                          <div key={key} className="view-applicant-details-hr-breakdown-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', color: isEarned ? '#059669' : '#6b7280' }}>
                                {isEarned ? '✓' : '✗'} {labels[key] || key}
                                {key === 'skills' && item.count !== undefined && ` (${item.count} skill${item.count !== 1 ? 's' : ''})`}
                                {key === 'certifications' && item.count !== undefined && ` (${item.count} cert${item.count !== 1 ? 's' : ''})`}
                                {showWordCount && ` • ${item.wordCount} words`}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: isEarned ? '#059669' : '#9ca3af' }}>
                                {item.points}/{item.max} pts
                              </span>
                            </div>
                            {!isEarned && key !== 'completenessBonus' && (
                              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, marginTop: '2px' }}>
                                {key === 'resume' && 'Upload a resume to get 15 points'}
                                {key === 'skills' && 'Add skills to get points (1 skill = 8pts, 2-3 = 15pts, 4-5 = 25pts, 6+ = 35pts)'}
                                {key === 'workExperience' && 'Add detailed work experience to get 12-17 points (more detail = more points)'}
                                {key === 'education' && 'Add detailed education info to get 8-13 points (more detail = more points)'}
                                {key === 'location' && 'Add your location to get 8 points'}
                                {key === 'professionalSummary' && 'Add a detailed professional summary to get 12-17 points (more detail = more points)'}
                                {key === 'certifications' && 'Add certifications to get points (10 points per certification, max 30 points)'}
                              </p>
                            )}
                            {key === 'completenessBonus' && isEarned && (
                              <p style={{ fontSize: '11px', color: '#059669', margin: 0, marginTop: '2px' }}>
                                Bonus for completing most fields!
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="view-applicant-details-hr-contact-info">
                <div className="view-applicant-details-hr-contact-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{applicant.jobTitle}</span>
                </div>
                <div className="view-applicant-details-hr-contact-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8.5C9.38071 8.5 10.5 7.38071 10.5 6C10.5 4.61929 9.38071 3.5 8 3.5C6.61929 3.5 5.5 4.61929 5.5 6C5.5 7.38071 6.61929 8.5 8 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.5 13.5C2.5 11.0147 4.51472 9 7 9H9C11.4853 9 13.5 11.0147 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{applicant.location}</span>
                </div>
                <div className="view-applicant-details-hr-contact-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.66667 4H13.3333C14.2538 4 15 4.74619 15 5.66667V10.3333C15 11.2538 14.2538 12 13.3333 12H2.66667C1.74619 12 1 11.2538 1 10.3333V5.66667C1 4.74619 1.74619 4 2.66667 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 5.33333L8 9.33333L1 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{applicant.email}</span>
                </div>
                <div className="view-applicant-details-hr-contact-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H14C15.1046 4 16 4.89543 16 6V14C16 15.1046 15.1046 16 14 16H2C0.895431 16 0 15.1046 0 14V6C0 4.89543 0.895431 4 2 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Active since {applicant.activeSince}</span>
                </div>
                <div className="view-applicant-details-hr-contact-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.33333 2.66667C2.59695 2.66667 2 3.26362 2 4V12C2 12.7364 2.59695 13.3333 3.33333 13.3333H5.33333L8 16L10.6667 13.3333H12.6667C13.403 13.3333 14 12.7364 14 12V4C14 3.26362 13.403 2.66667 12.6667 2.66667H3.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 7.33333L7.33333 8.66667L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{applicant.phone}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="view-applicant-details-hr-action-buttons">
                {actionError && <div style={{ color: '#b91c1c', width: '100%' }}>{actionError}</div>}
                {/* Accept and Reject buttons - only show for NEW or UNDER_REVIEW status */}
                {data?.status && ['NEW', 'UNDER_REVIEW'].includes(data.status) && (
                  <>
                    <button
                      className="view-applicant-details-hr-action-btn view-applicant-details-hr-accept-btn"
                      onClick={async () => {
                        setActionError('')
                        try {
                          await updateApplicationStatus(id, 'ACCEPTED')
                          const res = await getApplicationDetails(id)
                          setData(res?.application || null)
                        } catch (e) {
                          setActionError(e?.message || 'Failed to accept')
                        }
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.6667 5L7.5 14.1667L3.33333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Accept Application
                    </button>
                    <button
                      className="view-applicant-details-hr-action-btn view-applicant-details-hr-reject-btn"
                      onClick={async () => {
                        setActionError('')
                        try {
                          await updateApplicationStatus(id, 'REJECTED')
                          const res = await getApplicationDetails(id)
                          setData(res?.application || null)
                        } catch (e) {
                          setActionError(e?.message || 'Failed to reject')
                        }
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Reject Application
                    </button>
                  </>
                )}
                {/* Schedule Interview button - only show for NEW or UNDER_REVIEW status */}
                {data?.status && ['NEW', 'UNDER_REVIEW'].includes(data.status) && (
                  <button
                    className="view-applicant-details-hr-action-btn view-applicant-details-hr-schedule-btn"
                    onClick={() => setIsInterviewModalOpen(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4H18V16H2V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 8H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Schedule Interview
                  </button>
                )}
                <button
                  className="view-applicant-details-hr-action-btn view-applicant-details-hr-download-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    
                    console.log('Download button clicked!')
                    console.log('Current data:', data)
                    console.log('Resume object:', data?.resume)
                    
                    // Function to trigger download with fallback
                    const triggerDownload = (blobOrUrl, downloadFilename) => {
                      try {
                        const link = document.createElement('a')
                        link.download = downloadFilename
                        
                        if (typeof blobOrUrl === 'string') {
                          link.href = blobOrUrl
                        } else {
                          const blobUrl = window.URL.createObjectURL(blobOrUrl)
                          link.href = blobUrl
                          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
                        }
                        
                        link.style.position = 'fixed'
                        link.style.top = '-9999px'
                        link.style.left = '-9999px'
                        document.body.appendChild(link)
                        
                        // Force click
                        const clickEvent = new MouseEvent('click', {
                          view: window,
                          bubbles: true,
                          cancelable: true
                        })
                        link.dispatchEvent(clickEvent)
                        
                        setTimeout(() => {
                          if (link.parentNode) {
                            document.body.removeChild(link)
                          }
                        }, 100)
                        
                        return true
                      } catch (err) {
                        console.error('Download trigger error:', err)
                        return false
                      }
                    }
                    
                    // Check if resume exists
                    if (!data?.resume) {
                      console.error('No resume found in data')
                      // Still try to download a placeholder
                      const placeholderBlob = new Blob(['No resume file is attached to this application.'], { type: 'text/plain' })
                      if (triggerDownload(placeholderBlob, 'no-resume.txt')) {
                        alert('No resume file is attached. A placeholder file has been downloaded.')
                      } else {
                        alert('No resume file is attached to this application.')
                      }
                      return
                    }
                    
                    const url = data.resume.file_url
                    const filename = data.resume.original_filename || 'resume.pdf'
                    
                    console.log('Resume URL:', url)
                    console.log('Resume filename:', filename)
                    
                    if (!url || url.trim() === '') {
                      console.error('URL is missing or empty:', url)
                      // Still try to download a placeholder
                      const placeholderBlob = new Blob(['Resume file URL is missing.'], { type: 'text/plain' })
                      if (triggerDownload(placeholderBlob, 'resume-missing.txt')) {
                        alert('Resume file URL is missing. A placeholder file has been downloaded.')
                      } else {
                        alert('Resume file URL is missing.')
                      }
                      return
                    }
                    
                    console.log('Starting download process:', { url, filename, resume: data.resume })
                    
                    // Handle local:// URLs (placeholders) - download with correct filename
                    if (url.startsWith('local://')) {
                      console.log('Handling local:// URL')
                      try {
                        // Extract filename from URL if it exists
                        const decodedUrl = decodeURIComponent(url.replace('local://', ''))
                        const finalFilename = (decodedUrl && decodedUrl !== 'resume') ? decodedUrl : filename
                        
                        console.log('Final filename for download:', finalFilename)
                        
                        // Create a blob with actual content - empty blobs don't trigger downloads
                        const isPdf = finalFilename.toLowerCase().endsWith('.pdf')
                        
                        // Create minimal valid PDF content (PDF header + minimal structure)
                        let blobContent
                        let blobType
                        
                        if (isPdf) {
                          // Minimal valid PDF structure (prevents empty file issue)
                          blobContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF'
                          blobType = 'application/pdf'
                        } else {
                          blobContent = `Resume file: ${finalFilename}\n\nNote: This is a placeholder file. The actual resume content may need to be uploaded to a file storage service.`
                          blobType = 'text/plain'
                        }
                        
                        const blob = new Blob([blobContent], { type: blobType })
                        console.log('Blob created:', { size: blob.size, type: blob.type })
                        
                        // Trigger download using the helper function
                        if (triggerDownload(blob, finalFilename)) {
                          console.log('Download triggered successfully!')
                        } else {
                          console.error('Failed to trigger download, trying fallback...')
                          // Fallback: create object URL and use location
                          const downloadUrl = window.URL.createObjectURL(blob)
                          window.location.href = downloadUrl
                          setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)
                        }
                      } catch (err) {
                        console.error('Error handling local:// URL:', err)
                        alert('Error downloading resume: ' + err.message)
                      }
                      return
                    }
                    
                    // For valid HTTP/HTTPS URLs, try to download them
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      console.log('Handling HTTP/HTTPS URL')
                      try {
                        // First try direct download
                        if (!triggerDownload(url, filename)) {
                          console.log('Direct download failed, trying fetch approach...')
                          // Fallback: try fetch and blob approach
                          fetch(url, { mode: 'cors' })
                            .then(response => {
                              if (!response.ok) throw new Error(`HTTP ${response.status}`)
                              return response.blob()
                            })
                            .then(blob => {
                              console.log('Fetched blob:', { size: blob.size, type: blob.type })
                              if (triggerDownload(blob, filename)) {
                                console.log('Download triggered via fetch!')
                              } else {
                                // Final fallback: open in new tab
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }
                            })
                            .catch(error => {
                              console.error('Download error:', error)
                              // Final fallback: open in new tab
                              window.open(url, '_blank', 'noopener,noreferrer')
                            })
                        } else {
                          console.log('Direct download triggered successfully!')
                        }
                      } catch (err) {
                        console.error('Error handling HTTP/HTTPS URL:', err)
                        // Final fallback: open in new tab
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }
                    } else {
                      console.error('Invalid URL format:', url)
                      alert(`Invalid resume file URL format: ${url}\nOnly HTTP/HTTPS or local:// URLs are supported.`)
                    }
                  }}
                  title={data?.resume ? `Download: ${data.resume.original_filename || 'resume'}` : 'No resume available'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13V3M10 13L6 9M10 13L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 16H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download Resume
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Professional Details */}
          <div className="view-applicant-details-hr-right-column">
            {/* Professional Summary */}
            <div className="view-applicant-details-hr-info-card">
              <h2 className="view-applicant-details-hr-card-title">Professional Summary</h2>
              <p className="view-applicant-details-hr-card-text">{applicant.professionalSummary}</p>
            </div>

            {/* Education */}
            <div className="view-applicant-details-hr-info-card">
              <h2 className="view-applicant-details-hr-card-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="view-applicant-details-hr-education-icon">
                  <path d="M22 10V6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V10C2 11.1 2.9 12 4 12H20C21.1 12 22 11.1 22 10Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 16V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V16" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 12V16" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 12V16" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 22V12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 22V12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Education
              </h2>
              {applicant.education.map((edu, index) => (
                <div key={index} className="view-applicant-details-hr-education-item">
                  <div className="view-applicant-details-hr-education-line"></div>
                  <div className="view-applicant-details-hr-education-content">
                    <h3 className="view-applicant-details-hr-education-degree">{edu.degree}</h3>
                    <p className="view-applicant-details-hr-education-university">{edu.university}</p>
                    <p className="view-applicant-details-hr-education-period">{edu.period}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Work Experience */}
            <div className="view-applicant-details-hr-info-card">
              <h2 className="view-applicant-details-hr-card-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="view-applicant-details-hr-work-icon">
                  <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Work Experience
              </h2>
              {applicant.workExperience.map((exp, index) => (
                <div key={index} className="view-applicant-details-hr-experience-item">
                  <div className="view-applicant-details-hr-experience-line"></div>
                  <div className="view-applicant-details-hr-experience-content">
                    {exp.title && <h3 className="view-applicant-details-hr-experience-title">{exp.title}</h3>}
                    {exp.company && <p className="view-applicant-details-hr-experience-company">{exp.company}</p>}
                    {exp.period && <p className="view-applicant-details-hr-experience-period">{exp.period}</p>}
                    {exp.description && <p className="view-applicant-details-hr-experience-description">{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="view-applicant-details-hr-info-card">
              <div className="view-applicant-details-hr-skills-section">
                <div className="view-applicant-details-hr-skills-line"></div>
                <div className="view-applicant-details-hr-skills-content">
                  <h2 className="view-applicant-details-hr-card-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="view-applicant-details-hr-skills-icon">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Skills
                  </h2>
                  <div className="view-applicant-details-hr-skills-list">
                    {applicant.skills.map((skill, index) => (
                      <span key={index} className="view-applicant-details-hr-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Certification */}
            <div className="view-applicant-details-hr-info-card">
              <h2 className="view-applicant-details-hr-card-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="view-applicant-details-hr-certification-icon">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Certification
              </h2>
              <div className="view-applicant-details-hr-certifications-list">
                {applicant.certifications.map((cert, index) => (
                  <div key={index} className="view-applicant-details-hr-certification-item">
                    <div className="view-applicant-details-hr-certification-line"></div>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.6667 5L7.5 14.1667L3.33333 10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Interview Modal */}
      {isInterviewModalOpen && (
        <div
          className="view-applicant-details-hr-interview-modal-overlay"
          onMouseDown={() => setIsInterviewModalOpen(false)}
        >
          <div
            className="view-applicant-details-hr-interview-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="New Interview"
          >
            <div className="view-applicant-details-hr-interview-modal-header">
              <div className="view-applicant-details-hr-interview-modal-title">
                <span className="view-applicant-details-hr-interview-plus">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <span>New Interview</span>
              </div>
            </div>

            <form
              className="view-applicant-details-hr-interview-form"
              onSubmit={async (e) => {
                e.preventDefault()
                setActionError('')
                const submitButton = e.target.querySelector('button[type="submit"]')
                if (submitButton) {
                  submitButton.disabled = true
                  submitButton.textContent = 'Scheduling...'
                }
                try {
                  const raw = String(interviewForm.dateTime || '')
                  if (!raw) throw new Error('Please choose date/time')
                  const iso = raw.includes('T') ? new Date(raw).toISOString() : new Date(raw.replace(' ', 'T')).toISOString()
                  await scheduleInterview({ applicationId: id, scheduledAt: iso })
                  setIsInterviewModalOpen(false)
                  setInterviewForm({ rolePosition: '', department: '', hrInterview: '', dateTime: '' })
                  const res = await getApplicationDetails(id)
                  setData(res?.application || null)
                } catch (err) {
                  setActionError(err?.message || 'Failed to schedule interview')
                } finally {
                  if (submitButton) {
                    submitButton.disabled = false
                    submitButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10L17 3L10 17L8.5 11.5L3 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Submit Interview'
                  }
                }
              }}
            >
              <div className="view-applicant-details-hr-interview-grid">
                <div className="view-applicant-details-hr-interview-field">
                  <label className="view-applicant-details-hr-interview-label">Role / Position</label>
                  <input
                    className="view-applicant-details-hr-interview-input"
                    placeholder="e.g., Compliance Role"
                    value={interviewForm.rolePosition}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, rolePosition: e.target.value }))}
                  />
                </div>

                <div className="view-applicant-details-hr-interview-field">
                  <label className="view-applicant-details-hr-interview-label">Department</label>
                  <input
                    className="view-applicant-details-hr-interview-input"
                    placeholder="e.g., Department"
                    value={interviewForm.department}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, department: e.target.value }))}
                  />
                </div>

                <div className="view-applicant-details-hr-interview-field">
                  <label className="view-applicant-details-hr-interview-label">HR Interview</label>
                  <select
                    className="view-applicant-details-hr-interview-select"
                    value={interviewForm.hrInterview}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, hrInterview: e.target.value }))}
                  >
                    <option value="">Chooses HR for interview</option>
                    <option value="Sarah Ali">Sarah Ali</option>
                    <option value="Ahmad Sami">Ahmad Sami</option>
                    <option value="Maya Hasan">Maya Hasan</option>
                  </select>
                </div>

                <div className="view-applicant-details-hr-interview-field">
                  <label className="view-applicant-details-hr-interview-label">Date / Time</label>
                  <select
                    className="view-applicant-details-hr-interview-select"
                    value={interviewForm.dateTime}
                    onChange={(e) => setInterviewForm((p) => ({ ...p, dateTime: e.target.value }))}
                  >
                    <option value="">Chooses date and time for interview</option>
                    <option value="2026-01-20 10:00">2026-01-20 10:00</option>
                    <option value="2026-01-20 13:00">2026-01-20 13:00</option>
                    <option value="2026-01-21 11:30">2026-01-21 11:30</option>
                  </select>
                </div>
              </div>

              <div className="view-applicant-details-hr-interview-actions">
                <button
                  type="button"
                  className="view-applicant-details-hr-interview-cancel"
                  onClick={() => setIsInterviewModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="view-applicant-details-hr-interview-submit">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 10L17 3L10 17L8.5 11.5L3 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Submit Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewApplicantDetailsHRPage

