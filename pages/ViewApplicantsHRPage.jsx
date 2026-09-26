import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './ViewApplicantsHRPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { listApplicationsHR, getApplicationDetails } from '../services/hrApplicationsApi'
import { getCurrentUser } from '../services/authApi'

function statusToColor(status) {
  if (status === 'ACCEPTED') return 'green'
  if (status === 'REJECTED') return 'red'
  if (status === 'UNDER_REVIEW') return 'yellow'
  if (status === 'INTERVIEW_SCHEDULED') return 'purple'
  return 'blue'
}

function ViewApplicantsHRPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('job_id') ? Number(searchParams.get('job_id')) : null
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [applicants, setApplicants] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentLimit] = useState(20)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.view-applicants-hr-user-profile')) {
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

  // Reset offset when search query changes
  useEffect(() => {
    setCurrentOffset(0)
    setTotalCount(0)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setIsLoading(true)
      try {
        const res = await listApplicationsHR({ 
          q: searchQuery, 
          jobId: jobIdFromUrl || undefined,
          limit: currentLimit, 
          offset: currentOffset 
        })
        if (cancelled) return
        const rows = (res?.applications || []).map((a) => ({
          id: a.id, // application id
          name: a.full_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Candidate',
          title: a.job_title,
          role: a.job_title,
          location: a.location || '-',
          email: a.email || '-',
          activeSince: a.active_since_year ? String(a.active_since_year) : '-',
          phone: a.phone || '-',
          skills: [],
          appliedDate: a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '-',
          status: String(a.status || '').replaceAll('_', ' '),
          statusColor: statusToColor(a.status),
          match: a.match_score ?? 0
        }))
        setApplicants(rows)
        
        // Update pagination info
        const apiLimit = res?.limit || currentLimit
        const apiOffset = res?.offset || currentOffset
        const currentCount = rows.length
        
        // If we got fewer items than the limit, we're on the last page
        // So total = offset + currentCount
        // Otherwise, we show at least offset + currentCount (might be more)
        const calculatedTotal = currentCount < apiLimit 
          ? apiOffset + currentCount 
          : Math.max(totalCount, apiOffset + currentCount)
        
        setTotalCount(calculatedTotal)
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Failed to load applicants')
        setApplicants([])
        setTotalCount(0)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [searchQuery, currentLimit, currentOffset, jobIdFromUrl])

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const handleDownloadResume = async (applicationId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      // Fetch application details to get resume data
      const res = await getApplicationDetails(applicationId)
      const data = res?.application
      
      if (!data) {
        alert('Failed to load application details.')
        return
      }
      
      console.log('Download button clicked!')
      console.log('Application ID:', applicationId)
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
          requestAnimationFrame(() => {
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
            }, 200)
          })
          
          return true
        } catch (err) {
          console.error('Download trigger error:', err)
          return false
        }
      }
      
      // Check if resume exists
      if (!data?.resume) {
        console.error('No resume found in data')
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
        const placeholderBlob = new Blob(['Resume file URL is missing.'], { type: 'text/plain' })
        if (triggerDownload(placeholderBlob, 'resume-missing.txt')) {
          alert('Resume file URL is missing. A placeholder file has been downloaded.')
        } else {
          alert('Resume file URL is missing.')
        }
        return
      }
      
      console.log('Starting download process:', { url, filename, resume: data.resume })
      
      // Handle local:// URLs (placeholders)
      if (url.startsWith('local://')) {
        console.log('Handling local:// URL')
        try {
          const decodedUrl = decodeURIComponent(url.replace('local://', ''))
          const finalFilename = (decodedUrl && decodedUrl !== 'resume') ? decodedUrl : filename
          
          console.log('Final filename for download:', finalFilename)
          
          const isPdf = finalFilename.toLowerCase().endsWith('.pdf')
          
          let blobContent
          let blobType
          
          if (isPdf) {
            // Minimal valid PDF structure
            blobContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF'
            blobType = 'application/pdf'
          } else {
            blobContent = `Resume file: ${finalFilename}\n\nNote: This is a placeholder file. The actual resume content may need to be uploaded to a file storage service.`
            blobType = 'text/plain'
          }
          
          const blob = new Blob([blobContent], { type: blobType })
          console.log('Blob created:', { size: blob.size, type: blob.type })
          
          if (triggerDownload(blob, finalFilename)) {
            console.log('Download triggered successfully!')
          } else {
            console.error('Failed to trigger download, trying fallback...')
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
      
      // For valid HTTP/HTTPS URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('Handling HTTP/HTTPS URL')
        try {
          if (!triggerDownload(url, filename)) {
            console.log('Direct download failed, trying fetch approach...')
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
                  window.open(url, '_blank', 'noopener,noreferrer')
                }
              })
              .catch(error => {
                console.error('Download error:', error)
                window.open(url, '_blank', 'noopener,noreferrer')
              })
          } else {
            console.log('Direct download triggered successfully!')
          }
        } catch (err) {
          console.error('Error handling HTTP/HTTPS URL:', err)
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      } else {
        console.error('Invalid URL format:', url)
        alert(`Invalid resume file URL format: ${url}\nOnly HTTP/HTTPS or local:// URLs are supported.`)
      }
    } catch (err) {
      console.error('Error fetching application details:', err)
      alert('Failed to download resume: ' + (err?.message || 'Unknown error'))
    }
  }

  return (
    <div className="view-applicants-hr-page">
      {/* Header */}
      <header className={`view-applicants-hr-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="view-applicants-hr-header-left">
          <div className="view-applicants-hr-logo-section">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="view-applicants-hr-logo-image"
            />
          </div>
          <nav className="view-applicants-hr-header-nav">
            <a href="/dashboard/hr" className="view-applicants-hr-nav-link">Home</a>
            <a href="/view-applicants/hr" className="view-applicants-hr-nav-link active">View applicants</a>
            <a href="/scheduled-interviews/hr" className="view-applicants-hr-nav-link">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="view-applicants-hr-nav-link">Add New Job</a>
            <a href="/my-jobs/hr" className="view-applicants-hr-nav-link">My Jobs</a>
          </nav>
        </div>

        <div className="view-applicants-hr-header-right">
          <div className="view-applicants-hr-search-container-header">
            <input 
              type="text" 
              placeholder="Search" 
              className="view-applicants-hr-search-input-header"
            />
            <button className="view-applicants-hr-search-button-header" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <HRNotificationsBell buttonClassName="view-applicants-hr-notification-button" />
          <div className="view-applicants-hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img 
              src={hrData?.profileImage || '/imges/profile-placeholder.png'} 
              alt={hrData?.name || 'HR User'}
              className="view-applicants-hr-profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <div className="view-applicants-hr-profile-info">
              <div className="view-applicants-hr-profile-name">{hrData?.name || 'HR User'}</div>
            </div>
            <button className="view-applicants-hr-profile-dropdown">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* HR Dropdown Menu - Log Out only */}
            {isDropdownOpen && (
              <div className="view-applicants-hr-profile-dropdown-menu">
                {/* MY PROFILE */}
                <button
                  className="view-applicants-hr-dropdown-item"
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
                  className="view-applicants-hr-dropdown-item"
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
      <section className="view-applicants-hr-hero">
        <div className="view-applicants-hr-hero-content-wrapper">
          <div className="view-applicants-hr-hero-text-content">
            <h1 className="view-applicants-hr-hero-title">
              Here you can view all your recent applicants all job applicants.
            </h1>
            <p className="view-applicants-hr-hero-description">
              If you need to view and recent, simply click <a href="#" className="view-applicants-hr-go-to-recent-link">Go to Recent Applicants</a>
            </p>
          </div>
          <div className="view-applicants-hr-hero-robot">
            <img 
              src="/imges/hi robot.gif" 
              alt="Robot" 
              className="view-applicants-hr-robot-gif"
            />
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="view-applicants-hr-search-section">
        <div className="view-applicants-hr-search-wrapper">
          <div className="view-applicants-hr-search-bar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search profiles, keywords, identifiers" 
              className="view-applicants-hr-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Applicants List */}
      <section className="view-applicants-hr-applicants-section">
        <div className="view-applicants-hr-applicants-list">
          {error && <div style={{ color: '#b91c1c', padding: '8px 4px' }}>{error}</div>}
          {isLoading && <div style={{ color: '#475569', padding: '8px 4px' }}>Loading...</div>}
          {applicants.map((applicant) => (
            <div key={applicant.id} className="view-applicants-hr-applicant-card">
              {/* Left Column - Avatar only */}
              <div className="va-left">
                <div className="va-avatar">
                  {getInitials(applicant.name)}
                </div>
              </div>

              {/* Middle Column - Name/Title, Details, Skills, Applied Date */}
              <div className="va-mid">
                <div className="va-head">
                  <h3 className="va-name">{applicant.name}</h3>
                  <p className="va-title">{applicant.title}</p>
                </div>
                <div className="va-details">
                  <div className="va-detail-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{applicant.role}</span>
                  </div>
                  <div className="va-detail-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 8.5C9.38071 8.5 10.5 7.38071 10.5 6C10.5 4.61929 9.38071 3.5 8 3.5C6.61929 3.5 5.5 4.61929 5.5 6C5.5 7.38071 6.61929 8.5 8 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.5 13.5C2.5 11.0147 4.51472 9 7 9H9C11.4853 9 13.5 11.0147 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{applicant.location}</span>
                  </div>
                  <div className="va-detail-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.66667 4H13.3333C14.2538 4 15 4.74619 15 5.66667V10.3333C15 11.2538 14.2538 12 13.3333 12H2.66667C1.74619 12 1 11.2538 1 10.3333V5.66667C1 4.74619 1.74619 4 2.66667 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 5.33333L8 9.33333L1 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{applicant.email}</span>
                  </div>
                  <div className="va-detail-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4H14C15.1046 4 16 4.89543 16 6V14C16 15.1046 15.1046 16 14 16H2C0.895431 16 0 15.1046 0 14V6C0 4.89543 0.895431 4 2 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M0 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Active since {applicant.activeSince}</span>
                  </div>
                  <div className="va-detail-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.33333 2.66667C2.59695 2.66667 2 3.26362 2 4V12C2 12.7364 2.59695 13.3333 3.33333 13.3333H5.33333L8 16L10.6667 13.3333H12.6667C13.403 13.3333 14 12.7364 14 12V4C14 3.26362 13.403 2.66667 12.6667 2.66667H3.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 7.33333L7.33333 8.66667L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{applicant.phone}</span>
                  </div>
                </div>
                <div className="va-skills">
                  {applicant.skills.map((skill, index) => (
                    <span key={index} className="va-skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Subtle divider between skills and applied date */}
                <div className="va-divider" />

                <div className="va-applied">
                  Applied: {applicant.appliedDate}
                </div>
              </div>

              {/* Right Column - Status Pills at Top, Buttons at Bottom in ONE ROW */}
              <div className="va-right">
                <div className="va-badges">
                  <span className={`va-status-pill va-status-${applicant.statusColor}`}>
                    {applicant.status}
                  </span>
                  <span className={`va-match-pill va-match-${applicant.match >= 80 ? 'high' : applicant.match >= 50 ? 'medium' : 'low'}`}>
                    Match: {applicant.match}%
                  </span>
                </div>
                <div className="va-actions">
                  <button 
                    className="va-btn-download"
                    onClick={(e) => handleDownloadResume(applicant.id, e)}
                  >
                    Download Resume
                  </button>
                  <button 
                    className="va-btn-view"
                    onClick={() => navigate(`/view-applicant-details/hr/${applicant.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pagination */}
      <section className="view-applicants-hr-pagination-section">
        <div className="view-applicants-hr-pagination-wrapper">
          <div className="view-applicants-hr-pagination-info">
            {applicants.length > 0 ? (
              `Showing ${currentOffset + 1} to ${currentOffset + applicants.length} of ${totalCount} results`
            ) : (
              'Showing 0 to 0 of 0 results'
            )}
          </div>
          <div className="view-applicants-hr-pagination-controls">
            <button className="view-applicants-hr-pagination-button">Previous</button>
            <button className="view-applicants-hr-pagination-button view-applicants-hr-pagination-active">1</button>
            <button className="view-applicants-hr-pagination-button">Next</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ViewApplicantsHRPage

