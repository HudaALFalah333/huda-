import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './MyProfilePage.css'
import UserNotificationsBell from '../components/UserNotificationsBell'
import { getCurrentUser, updateProfileImage } from '../services/authApi'

function MyProfilePage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageSuccess, setImageSuccess] = useState('')

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
      setError('')
      try {
        const account = await getCurrentUser()
        if (cancelled) return
        if (account) {
          setUserData({
            name: account.full_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'User',
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

  const [editing, setEditing] = useState({
    name: false,
    email: false,
    password: false
  })

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '**********'
  })
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '**********'
      })
    }
  }, [userData])

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEdit = (field) => {
    setEditing({ ...editing, [field]: true })
    if (field === 'email') {
      setEmailError('')
    }
  }

  const handleSave = (field) => {
    if (field === 'email') {
      const email = formData.email.trim()
      if (!email) {
        setEmailError('Email is required')
        return
      }
      if (!validateEmail(email)) {
        setEmailError('Please enter a valid email address')
        return
      }
      setEmailError('')
    }
    setEditing({ ...editing, [field]: false })
    // Here you would save the data to the backend
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    if (field === 'email' && emailError) {
      setEmailError('')
    }
  }

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
          if (updatedAccount && userData) {
            setUserData({
              ...userData,
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
    <div className="my-profile-page">
      {/* Header */}
      <header className={`my-profile-header ${isScrolled ? 'scrolled' : ''}`}>
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
                    // Add logout logic here
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

      {/* Hero Section with Video Background */}
      <section className="profile-hero">
        <video 
          className="profile-video" 
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source src="/video/profile.mp4" type="video/mp4" />
        </video>
        <div className="profile-hero-overlay"></div>
        
        <div className="profile-hero-content">
          <h1 className="profile-hero-title">MY PROFILE</h1>
          <button className="my-data-button">My Data</button>
        </div>
      </section>

      {/* Profile Card */}
      <div className="profile-content">
        {isLoading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>}
        {error && <div style={{ padding: '20px', color: '#b91c1c', textAlign: 'center' }}>{error}</div>}
        {!isLoading && !error && userData && (
        <div className="profile-card">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <img 
              src={userData.profileImage} 
              alt={userData.name}
              className="profile-card-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="file"
                id="profile-image-upload"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={isUploadingImage}
              />
              <button 
                className="upload-photo-button" 
                type="button"
                disabled={isUploadingImage}
                onClick={() => {
                  const fileInput = document.getElementById('profile-image-upload')
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

          {/* User Information Fields */}
          <div className="profile-fields">
            {/* Your Name */}
            <div className="profile-field">
              <label className="field-label">Your Name</label>
              <div className="field-value-wrapper">
                {editing.name ? (
                  <input
                    type="text"
                    className="field-input"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span className="field-value">{formData.name}</span>
                )}
                <button
                  className="edit-button"
                  onClick={() => editing.name ? handleSave('name') : handleEdit('name')}
                >
                  {editing.name ? 'Save' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="profile-field">
              <label className="field-label">Email</label>
              <div className="field-value-wrapper">
                {editing.email ? (
                  <>
                    <input
                      type="email"
                      className="field-input"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      autoFocus
                    />
                    {emailError && (
                      <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '4px' }}>
                        {emailError}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="field-value">{formData.email}</span>
                )}
                <button
                  className="edit-button"
                  onClick={() => editing.email ? handleSave('email') : handleEdit('email')}
                >
                  {editing.email ? 'Save' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div className="profile-field">
              <label className="field-label">Phone Number</label>
              <div className="field-value-wrapper">
                <span className="field-value">{userData?.phone || '-'}</span>
              </div>
            </div>

            {/* Password */}
            <div className="profile-field">
              <label className="field-label">Password</label>
              <div className="field-value-wrapper">
                {editing.password ? (
                  <input
                    type="password"
                    className="field-input"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span className="field-value">{formData.password}</span>
                )}
                <button
                  className="edit-button"
                  onClick={() => editing.password ? handleSave('password') : handleEdit('password')}
                >
                  {editing.password ? 'Save' : 'Edit'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default MyProfilePage

