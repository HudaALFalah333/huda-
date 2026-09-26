import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HRMyProfilePage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { getCurrentUser, updateProfileImage } from '../services/authApi'

function HRMyProfilePage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [hrData, setHrData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageSuccess, setImageSuccess] = useState('')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.hr-my-profile-user-profile')) {
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
      setError('')
      try {
        const account = await getCurrentUser()
        if (cancelled) return
        if (account) {
          setHrData({
            name: account.full_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'HR User',
            email: account.email || '',
            phone: account.phone || '',
            profileImage: account.profile_image_url || '/imges/profile-placeholder.png'
          })
        } else {
          setError('Failed to load user data')
        }
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Failed to load user data')
        // Redirect to login if unauthorized
        if (err?.status === 401) {
          navigate('/login/hr')
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      // Reset input if no file selected
      e.target.value = ''
      return
    }

    // Validate file type - accept jpeg, jpg, png, webp, gif
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setImageError('Please select an image file (JPEG, JPG, PNG, WEBP, or GIF)')
      setImageSuccess('')
      e.target.value = ''
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size must be less than 5MB')
      setImageSuccess('')
      e.target.value = ''
      return
    }

    setIsUploadingImage(true)
    setImageError('')
    setImageSuccess('')

    try {
      // Convert image to base64 data URL for now
      // In production, you would upload to a storage service (S3, Cloudinary, etc.)
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64String = reader.result
          // Update profile image URL
          const updatedAccount = await updateProfileImage(base64String)
          if (updatedAccount && hrData) {
            setHrData({
              ...hrData,
              profileImage: updatedAccount.profile_image_url || '/imges/profile-placeholder.png'
            })
            setImageSuccess('Profile image updated successfully!')
            setImageError('')
            // Clear success message after 3 seconds
            setTimeout(() => setImageSuccess(''), 3000)
          }
        } catch (err) {
          const errorMsg = err?.data?.error || err?.data?.issues?.[0]?.message || err?.message || 'Failed to upload image'
          setImageError(errorMsg)
          setImageSuccess('')
          console.error('Image upload error:', err)
        } finally {
          setIsUploadingImage(false)
          // Reset file input
          e.target.value = ''
        }
      }
      reader.onerror = () => {
        setImageError('Failed to read image file')
        setImageSuccess('')
        setIsUploadingImage(false)
        e.target.value = ''
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setImageError(err?.message || 'Failed to upload image')
      setImageSuccess('')
      setIsUploadingImage(false)
      e.target.value = ''
    }
  }

  return (
    <div className="hr-my-profile-page">
      {/* Header */}
      <header className={`hr-my-profile-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="hr-my-profile-header-left">
          <div className="hr-my-profile-logo-section">
            <img
              src={isScrolled ? '/imges/ejo white logo.png' : '/imges/ejo blue logo.png'}
              alt="EJO SUPPORT Logo"
              className="hr-my-profile-logo-image"
            />
          </div>
          <nav className="hr-my-profile-header-nav">
            <a href="/dashboard/hr" className="hr-my-profile-nav-link">Home</a>
            <a href="/view-applicants/hr" className="hr-my-profile-nav-link">View applicants</a>
            <a href="/scheduled-interviews/hr" className="hr-my-profile-nav-link">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="hr-my-profile-nav-link">Add New Job</a>
            <a href="/my-jobs/hr" className="hr-my-profile-nav-link">My Jobs</a>
          </nav>
        </div>

        <div className="hr-my-profile-header-right">
          <div className="hr-my-profile-search">
            <input className="hr-my-profile-search-input" placeholder="Search" />
            <button className="hr-my-profile-search-button" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <HRNotificationsBell buttonClassName="hr-my-profile-notification" />

          <div className="hr-my-profile-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img
              src={hrData?.profileImage || '/imges/profile-placeholder.png'}
              alt={hrData?.name || 'HR User'}
              className="hr-my-profile-avatar"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <span className="hr-my-profile-name">{hrData?.name || 'HR User'}</span>
            <button className="hr-my-profile-caret" aria-label="Profile menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="hr-my-profile-dropdown">
                <button
                  className="hr-my-profile-dropdown-item"
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
                  className="hr-my-profile-dropdown-item"
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

      {/* Hero */}
      <section className="hr-my-profile-hero">
        <video className="hr-my-profile-video" autoPlay loop muted playsInline>
          <source src="/video/profile.mp4" type="video/mp4" />
        </video>
        <div className="hr-my-profile-hero-overlay" />
        <div className="hr-my-profile-hero-content">
          <div className="hr-my-profile-hero-title">MY PROFILE</div>
          <button className="hr-my-profile-mydata">My Data</button>
        </div>
      </section>

      {/* Cards */}
      <section className="hr-my-profile-cards">
        {isLoading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>}
        {error && <div style={{ padding: '20px', color: '#b91c1c', textAlign: 'center' }}>{error}</div>}
        {!isLoading && !error && hrData && (
          <>
            <div className="hr-my-profile-card hr-my-profile-card-left">
          <div className="hr-my-profile-card-top">
            <img
              src={hrData.profileImage}
              alt={hrData.name}
              className="hr-my-profile-card-avatar"
            />
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="file"
                id="hr-profile-image-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={isUploadingImage}
              />
              <button 
                className="hr-my-profile-upload" 
                type="button"
                disabled={isUploadingImage}
                onClick={() => {
                  const fileInput = document.getElementById('hr-profile-image-upload')
                  if (fileInput && !isUploadingImage) {
                    fileInput.click()
                  }
                }}
                style={{ cursor: isUploadingImage ? 'not-allowed' : 'pointer' }}
              >
                {isUploadingImage ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
            {imageError && (
              <div style={{ color: '#b91c1c', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>
                {imageError}
              </div>
            )}
            {imageSuccess && (
              <div style={{ color: '#10b981', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>
                {imageSuccess}
              </div>
            )}
          </div>

          <div className="hr-my-profile-fields">
            <div className="hr-my-profile-field">
              <div className="hr-my-profile-label">Your Name</div>
              <div className="hr-my-profile-row">
                <div className="hr-my-profile-value">{hrData.name}</div>
                <button className="hr-my-profile-edit">Edit</button>
              </div>
            </div>

            <div className="hr-my-profile-field">
              <div className="hr-my-profile-label">Email</div>
              <div className="hr-my-profile-row">
                <div className="hr-my-profile-value">{hrData.email}</div>
                <button className="hr-my-profile-edit">Edit</button>
              </div>
            </div>

            <div className="hr-my-profile-field">
              <div className="hr-my-profile-label">Phone Number</div>
              <div className="hr-my-profile-row">
                <div className="hr-my-profile-value">{hrData.phone || '-'}</div>
                <button className="hr-my-profile-edit">Edit</button>
              </div>
            </div>

            <div className="hr-my-profile-field">
              <div className="hr-my-profile-label">Password</div>
              <div className="hr-my-profile-row">
                <div className="hr-my-profile-value">***********</div>
                <button className="hr-my-profile-edit">Edit</button>
              </div>
            </div>
          </div>
        </div>

        <div className="hr-my-profile-card hr-my-profile-card-right">
          <div className="hr-my-profile-right-top">
            <div className="hr-my-profile-right-top-text">
              <div className="hr-my-profile-right-title">Professional Details</div>
              <div className="hr-my-profile-right-sub">
                This are the professional details<br />shown to users in the app.
              </div>
            </div>
            <div className="hr-my-profile-star-badge" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="hr-my-profile-section">
            <div className="hr-my-profile-section-label">Expertise In</div>
            <div className="hr-my-profile-chips">
              <span className="hr-my-profile-chip"><span className="hr-my-profile-chip-dot green" />Career</span>
              <span className="hr-my-profile-chip"><span className="hr-my-profile-chip-dot green" />Money</span>
              <span className="hr-my-profile-chip"><span className="hr-my-profile-chip-dot purple" />Stock</span>
              <span className="hr-my-profile-chip"><span className="hr-my-profile-chip-dot purple" />Mortgage</span>
            </div>
          </div>

          <div className="hr-my-profile-section">
            <div className="hr-my-profile-section-label">Total Experience</div>
            <div className="hr-my-profile-experience-card">
              <div>
                <div className="hr-my-profile-exp-years">7 Years</div>
                <div className="hr-my-profile-exp-sub">of total experience</div>
              </div>
              <div className="hr-my-profile-exp-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12L14.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
            </>
        )}
      </section>
    </div>
  )
}

export default HRMyProfilePage


