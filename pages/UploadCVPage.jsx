import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './UploadCVPage.css'
import UserNotificationsBell from '../components/UserNotificationsBell'
import { getCurrentUser } from '../services/authApi'
import { listMyResumes, uploadResume, deleteResume } from '../services/resumesApi'

function UploadCVPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [resumes, setResumes] = useState([])
  const [filteredResumes, setFilteredResumes] = useState([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
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

  useEffect(() => {
    let cancelled = false
    async function loadUserData() {
      setIsLoading(true)
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
        if (err?.status === 401) {
          navigate('/login/user')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadUserData()
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    async function loadResumes() {
      setIsLoadingResumes(true)
      try {
        const res = await listMyResumes()
        if (cancelled) return
        const allResumes = res?.resumes || []
        setResumes(allResumes)
        
        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          const filtered = allResumes.filter((r) => 
            r.original_filename?.toLowerCase().includes(query)
          )
          setFilteredResumes(filtered)
        } else {
          setFilteredResumes(allResumes)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load resumes:', err)
      } finally {
        if (!cancelled) setIsLoadingResumes(false)
      }
    }
    loadResumes()
    return () => {
      cancelled = true
    }
  }, [searchQuery])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed')
      setSelectedFile(null)
      e.target.value = ''
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      setSelectedFile(null)
      e.target.value = ''
      return
    }

    setUploadError('')
    setUploadSuccess('')
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a PDF file')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      // For now, we'll store the file metadata
      // In a real implementation, you would upload the file to a storage service first
      const fileUrl = `local://${encodeURIComponent(selectedFile.name)}`
      await uploadResume({
        fileName: selectedFile.name,
        fileUrl: fileUrl
      })

      setUploadSuccess('CV uploaded successfully!')
      setSelectedFile(null)
      
      // Reload resumes list
      const res = await listMyResumes()
      setResumes(res?.resumes || [])

      // Clear file input
      const fileInput = document.getElementById('cv-file-input')
      if (fileInput) fileInput.value = ''
    } catch (err) {
      setUploadError(err?.message || 'Failed to upload CV')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (resumeId) => {
    if (!window.confirm('Are you sure you want to delete this CV?')) return

    try {
      await deleteResume(resumeId)
      setUploadSuccess('CV deleted successfully!')
      
      // Reload resumes list
      const res = await listMyResumes()
      setResumes(res?.resumes || [])
    } catch (err) {
      setUploadError(err?.message || 'Failed to delete CV')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="upload-cv-page">
      {/* Header */}
      <header className={`upload-cv-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <div className="logo-section-header">
            <img 
              src="/imges/ejo white logo.png" 
              alt="EJO SUPPORT Logo" 
              className="header-logo-image"
            />
          </div>
          <nav className="header-nav">
            <a href="/dashboard/user" className="nav-link">Home</a>
            <a href="/view-job" className="nav-link">View Job</a>
            <a href="/upload-cv" className="nav-link active">Add CV</a>
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

      {/* Main Content */}
      <main className="upload-cv-content">
        <div className="upload-cv-container">
          <h1 className="upload-cv-title">Upload Your CV</h1>
          <p className="upload-cv-subtitle">Upload your resume in PDF format to apply for jobs</p>

          {/* Upload Section */}
          <div className="upload-cv-section">
            <div className="upload-cv-card">
              <div className="upload-area">
                <input
                  type="file"
                  id="cv-file-input"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="cv-file-input" className="upload-label">
                  <div className="upload-icon">
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="36" cy="36" r="34" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <path d="M26 32C23.7909 32 22 33.7909 22 36C22 36.2652 22.0103 36.5278 22.0305 36.7874C20.1653 37.0408 18.5 38.5213 18.5 40.4C18.5 42.4853 20.2147 44.2 22.3 44.2H31.7" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M46 32C48.2091 32 50 33.7909 50 36C50 36.2652 49.9897 36.5278 49.9695 36.7874C51.8347 37.0408 53.5 38.5213 53.5 40.4C53.5 42.4853 51.7853 44.2 49.7 44.2H40.3" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M36 28V44M36 28L30 34M36 28L42 34" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="upload-text">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="upload-hint">PDF only, up to 10MB</p>
                </label>
              </div>

              {uploadError && (
                <div className="upload-error" style={{ color: '#b91c1c', marginTop: '12px', textAlign: 'center' }}>
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="upload-success" style={{ color: '#10b981', marginTop: '12px', textAlign: 'center' }}>
                  {uploadSuccess}
                </div>
              )}

              <button
                className="upload-button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload CV'}
              </button>
            </div>
          </div>

          {/* Existing Resumes Section */}
          <div className="resumes-list-section">
            <h2 className="resumes-list-title">Your CVs</h2>
            {isLoadingResumes ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#475569' }}>Loading CVs...</div>
            ) : filteredResumes.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                No CVs uploaded yet. Upload your first CV above.
              </div>
            ) : (
              <div className="resumes-list">
                {filteredResumes.map((resume) => (
                  <div key={resume.id} className="resume-item">
                    <div className="resume-info">
                      <div className="resume-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="resume-details">
                        <div className="resume-name">{resume.original_filename}</div>
                        <div className="resume-date">Uploaded: {formatDate(resume.uploaded_at)}</div>
                      </div>
                    </div>
                    <button
                      className="delete-resume-button"
                      onClick={() => handleDelete(resume.id)}
                      title="Delete CV"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default UploadCVPage
