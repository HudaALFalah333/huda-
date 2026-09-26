import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './JobDetailsPage.css'
import UserNotificationsBell from '../components/UserNotificationsBell'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { getJob, updateJob, deleteJob } from '../services/jobsApi'
import { applyToJob } from '../services/applicationsApi'
import { getCurrentUser } from '../services/authApi'
import { getAuthRole } from '../services/apiClient'
import { listMyResumes } from '../services/resumesApi'

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

// Certifications Multi-Input Component - Similar to SkillsMultiInput
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

// Skills Multi-Input Component - Matching AddNewJobHRPage style
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

function JobDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isCvModalOpen, setIsCvModalOpen] = useState(false)
  const [cvFileName, setCvFileName] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState(null)
  const [workExperience, setWorkExperience] = useState('')
  const [education, setEducation] = useState('')
  const [location, setLocation] = useState('')
  const [professionalSummary, setProfessionalSummary] = useState('')
  const [applicationSkills, setApplicationSkills] = useState([])
  const [certifications, setCertifications] = useState([])
  const [availableResumes, setAvailableResumes] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [job, setJob] = useState(null)
  const [isLoadingJob, setIsLoadingJob] = useState(false)
  const [jobError, setJobError] = useState('')
  const [applyError, setApplyError] = useState('')
  const [isApplying, setIsApplying] = useState(false)

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

  const [userData, setUserData] = useState({
    name: 'User',
    profileImage: '/imges/profile-placeholder.png',
    role: 'USER',
    id: null
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadUserData() {
      try {
        const account = await getCurrentUser()
        const role = getAuthRole()
        if (cancelled) return
        if (account) {
          setUserData({
            name: account.full_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'User',
            profileImage: account.profile_image_url || '/imges/profile-placeholder.png',
            role: role || 'USER',
            id: account.id
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
    async function loadResumes() {
      if (!isCvModalOpen) return
      try {
        const res = await listMyResumes()
        if (cancelled) return
        setAvailableResumes(res?.resumes || [])
      } catch (e) {
        if (cancelled) return
        console.error('Failed to load resumes:', e)
      }
    }
    loadResumes()
    return () => {
      cancelled = true
    }
  }, [isCvModalOpen])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setJobError('')
      setIsLoadingJob(true)
      try {
        const res = await getJob(id)
        if (cancelled) return
        const jobData = res?.job || null
        setJob(jobData)
        if (jobData) {
          // Initialize edit form with job data
          setEditForm({
            title: jobData.title || '',
            company_name: jobData.company?.name || '',
            department: jobData.department || '',
            location: jobData.location || '',
            employment_type: jobData.employment_type || '',
            currency: jobData.currency || 'JOD',
            salary_min: jobData.salary_min || '',
            salary_max: jobData.salary_max || '',
            about_role: jobData.about_role || '',
            requirements_text: jobData.requirements_text || '',
            is_active: jobData.is_active !== false,
            skills: jobData.skills || []
          })
        }
      } catch (e) {
        if (cancelled) return
        setJobError(e?.message || 'Failed to load job')
        setJob(null)
      } finally {
        if (!cancelled) setIsLoadingJob(false)
      }
    }
    if (id) load()
    return () => {
      cancelled = true
    }
  }, [id])

  const isHR = userData.role === 'HR'
  const isJobOwner = isHR && job && Number(job.created_by_hr_id) === Number(userData.id)

  const handleSaveEdit = async () => {
    if (!job?.id) return
    setIsSaving(true)
    setEditError('')
    try {
      // Parse salary - handle both number and string inputs
      let salaryMin = null
      let salaryMax = null
      
      if (editForm.salary_min !== undefined && editForm.salary_min !== null && editForm.salary_min !== '') {
        if (typeof editForm.salary_min === 'string') {
          // Check if it's a range string like "800 - 1200 JOD"
          const rangeMatch = editForm.salary_min.match(/(\d+)\s*[–-]\s*(\d+)/)
          if (rangeMatch) {
            salaryMin = Number(rangeMatch[1])
            salaryMax = Number(rangeMatch[2])
          } else {
            // Single number string
            const num = Number(editForm.salary_min.replace(/[^0-9.]/g, ''))
            if (!isNaN(num)) salaryMin = num
          }
        } else if (typeof editForm.salary_min === 'number') {
          salaryMin = editForm.salary_min
        }
      }
      
      if (editForm.salary_max !== undefined && editForm.salary_max !== null && editForm.salary_max !== '') {
        if (typeof editForm.salary_max === 'string') {
          const num = Number(editForm.salary_max.replace(/[^0-9.]/g, ''))
          if (!isNaN(num)) salaryMax = num
        } else if (typeof editForm.salary_max === 'number') {
          salaryMax = editForm.salary_max
        }
      }

      // Ensure skills is an array of strings
      const skillsArray = Array.isArray(editForm.skills) 
        ? editForm.skills.filter(s => s && typeof s === 'string' && s.trim().length > 0)
        : []

      // Build payload - only include fields that are defined and valid
      const payload = {}
      
      // Title is required
      if (editForm.title && editForm.title.trim()) {
        payload.title = editForm.title.trim()
      }
      
      if (editForm.company_name && editForm.company_name.trim()) {
        payload.company_name = editForm.company_name.trim()
      }
      
      // For optional string fields, send null if empty string, or the value if not empty
      if (editForm.department !== undefined) {
        payload.department = editForm.department && editForm.department.trim() ? editForm.department.trim() : null
      }
      if (editForm.location !== undefined) {
        payload.location = editForm.location && editForm.location.trim() ? editForm.location.trim() : null
      }
      if (editForm.employment_type !== undefined) {
        payload.employment_type = editForm.employment_type && editForm.employment_type.trim() ? editForm.employment_type.trim() : null
      }
      
      if (editForm.currency) {
        payload.currency = editForm.currency
      }
      
      // Salary fields - only send if valid numbers, or null to clear
      if (salaryMin !== null && !isNaN(salaryMin) && salaryMin >= 0) {
        payload.salary_min = salaryMin
      } else if (editForm.salary_min === '' || editForm.salary_min === null || editForm.salary_min === undefined) {
        payload.salary_min = null
      }
      
      if (salaryMax !== null && !isNaN(salaryMax) && salaryMax >= 0) {
        payload.salary_max = salaryMax
      } else if (editForm.salary_max === '' || editForm.salary_max === null || editForm.salary_max === undefined) {
        payload.salary_max = null
      }
      
      if (editForm.about_role !== undefined) {
        payload.about_role = editForm.about_role && editForm.about_role.trim() ? editForm.about_role.trim() : null
      }
      if (editForm.requirements_text !== undefined) {
        payload.requirements_text = editForm.requirements_text && editForm.requirements_text.trim() ? editForm.requirements_text.trim() : null
      }
      
      if (editForm.is_active !== undefined) {
        payload.is_active = editForm.is_active
      }
      
      // Always include skills array (even if empty) to allow clearing skills
      payload.skills = skillsArray

      console.log('Sending update payload:', JSON.stringify(payload, null, 2))
      const res = await updateJob(job.id, payload)
      setJob(res?.job || job)
      setIsEditing(false)
    } catch (e) {
      console.error('Update job error:', e)
      console.error('Error data:', e?.data)
      if (e?.data?.issues) {
        const errorMessages = e.data.issues.map(i => {
          const field = i.path.join('.') || 'unknown'
          return `${field}: ${i.message}`
        })
        setEditError(`Validation errors: ${errorMessages.join('; ')}`)
      } else {
        setEditError(e?.message || 'Failed to update job')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!job?.id) return
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) return
    
    setIsDeleting(true)
    try {
      await deleteJob(job.id)
      navigate('/my-jobs/hr')
    } catch (e) {
      alert(e?.message || 'Failed to delete job')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`job-details-page ${isEditing && isJobOwner ? 'edit-mode' : ''}`}>
      {/* Header */}
      <header className={`job-details-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-left">
          <div className="logo-section-header">
            <img 
              src={isScrolled ? "/imges/ejo white logo.png" : "/imges/ejo blue logo.png"} 
              alt="EJO SUPPORT Logo" 
              className="header-logo-image"
            />
          </div>
          <nav className="header-nav">
            {isHR ? (
              <>
                <a href="/dashboard/hr" className="nav-link">Home</a>
                <a href="/view-applicants/hr" className="nav-link">View Applicants</a>
                <a href="/scheduled-interviews/hr" className="nav-link">Scheduled Interviews</a>
                <a href="/add-new-job/hr" className="nav-link">Add New Job</a>
                <a href="/my-jobs/hr" className="nav-link">My Jobs</a>
              </>
            ) : (
              <>
                <a href="/dashboard/user" className="nav-link">Home</a>
                <a href="/view-job" className="nav-link active">View Job</a>
                <a href="/upload-cv" className="nav-link">Add CV</a>
              </>
            )}
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
          {isHR ? <HRNotificationsBell /> : <UserNotificationsBell />}
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
                    navigate(isHR ? '/profile/hr' : '/profile')
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

      {/* Job Details Content */}
      <div className="job-details-content">
        {isEditing && isJobOwner ? (
          // Edit Mode - Same design as AddNewJobHRPage
          <main className="add-new-job-hr-content" style={{ paddingTop: '120px' }}>
            <div className="add-new-job-hr-layout">
              <div className="add-new-job-hr-left-illustration">
                <img
                  src="/imges/add%20new%20job.gif"
                  alt="Edit job"
                  className="add-new-job-hr-gif"
                />
              </div>

              <div className="add-new-job-hr-right">
                <div className="add-new-job-hr-top">
                  <h1 className="add-new-job-hr-title">Edit Job</h1>
                  <p className="add-new-job-hr-subtitle">
                    Update the job details by modifying the
                    <br />
                    information below.
                  </p>
                  <div className="add-new-job-hr-divider" />
                </div>

                <div className="add-new-job-hr-form-card">
                  <div className="add-new-job-hr-form-header">
                    <span className="add-new-job-hr-form-plus">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span>Edit Job</span>
                  </div>

                  <form
                    className="add-new-job-hr-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveEdit()
                    }}
                  >
                    {editError && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{editError}</div>}
                    <div className="add-new-job-hr-grid">
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Job Title</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., Senior Software Engineer"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Company Name</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., EJO SUPPORT"
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Department</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., Engineering / HR / Marketing"
                          value={editForm.department || ''}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Location</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., Amman, Jordan"
                          value={editForm.location || ''}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Amount</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., 800 – 1200 JOD"
                          value={editForm.salary_min && editForm.salary_max ? `${editForm.salary_min} – ${editForm.salary_max} ${editForm.currency || 'JOD'}` : (editForm.salary_min || editForm.salary_max || '')}
                          onChange={(e) => {
                            const val = e.target.value
                            const match = val.match(/(\d+)\s*[–-]\s*(\d+)\s*(\w+)?/)
                            if (match) {
                              setEditForm({
                                ...editForm,
                                salary_min: Number(match[1]),
                                salary_max: Number(match[2]),
                                currency: match[3] || 'JOD'
                              })
                            } else {
                              const num = Number(val.replace(/[^0-9.]/g, ''))
                              if (!isNaN(num)) {
                                setEditForm({ ...editForm, salary_min: num, salary_max: null })
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Job Requirements</label>
                        <input
                          className="add-new-job-hr-input"
                          placeholder="e.g., 3+ years experience"
                          value={editForm.requirements_text || ''}
                          onChange={(e) => setEditForm({ ...editForm, requirements_text: e.target.value })}
                        />
                      </div>
                      <div className="add-new-job-hr-field">
                        <label className="add-new-job-hr-label">Type</label>
                        <select
                          className="add-new-job-hr-select"
                          value={editForm.employment_type || ''}
                          onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                        >
                          <option value="">Select type</option>
                          <option value="Shift part job">Shift part job</option>
                          <option value="Full time">Full time</option>
                          <option value="Contract">Contract</option>
                        </select>
                      </div>
                    </div>

                    <div className="add-new-job-hr-field add-new-job-hr-field-full">
                      <label className="add-new-job-hr-label">About The Role</label>
                      <textarea
                        className="add-new-job-hr-textarea"
                        placeholder="Write a brief summary about the responsibilities and expectations"
                        rows={3}
                        value={editForm.about_role || ''}
                        onChange={(e) => setEditForm({ ...editForm, about_role: e.target.value })}
                      />
                    </div>

                    <div className="add-new-job-hr-field add-new-job-hr-field-full">
                      <label className="add-new-job-hr-label">Skills (Optional)</label>
                      <SkillsMultiInput
                        skills={editForm.skills || []}
                        onChange={(skills) => setEditForm({ ...editForm, skills })}
                      />
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                        Type a skill and press Enter to add it. Press Backspace on empty input to remove the last skill.
                      </p>
                    </div>

                    <div className="add-new-job-hr-form-footer">
                      <button
                        type="button"
                        className="add-new-job-hr-cancel-btn"
                        onClick={() => {
                          setIsEditing(false)
                          setEditError('')
                          if (job) {
                            setEditForm({
                              title: job.title || '',
                              company_name: job.company?.name || '',
                              department: job.department || '',
                              location: job.location || '',
                              employment_type: job.employment_type || '',
                              currency: job.currency || 'JOD',
                              salary_min: job.salary_min || '',
                              salary_max: job.salary_max || '',
                              about_role: job.about_role || '',
                              requirements_text: job.requirements_text || '',
                              is_active: job.is_active !== false,
                              skills: job.skills || []
                            })
                          }
                        }}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="add-new-job-hr-submit-btn"
                        disabled={isSaving}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 10L17 3L10 17L8.5 11.5L3 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </main>
        ) : (
          // View Mode - Original design
          <div>
            {/* Back Link */}
            <a 
              href={isHR ? "/my-jobs/hr" : "/view-job"}
              className="back-link"
              onClick={(e) => {
                e.preventDefault()
                navigate(isHR ? '/my-jobs/hr' : '/view-job')
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isHR ? 'Back To My Jobs' : 'Back To Job Listings'}
            </a>

            <div className="job-details-container">

          {/* Job Header */}
          <div className="job-details-header-section">
            <div className="job-header-info">
              {isEditing && isJobOwner ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="job-details-title-input"
                  style={{ fontSize: '32px', fontWeight: '700', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', width: '100%', marginBottom: '8px' }}
                />
              ) : (
                <h1 className="job-details-title">{job?.title || (isLoadingJob ? 'Loading...' : '')}</h1>
              )}
              
              {isEditing && isJobOwner ? (
                <input
                  type="text"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  className="job-details-company-input"
                  style={{ fontSize: '18px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', width: '100%', marginBottom: '16px' }}
                />
              ) : (
                <p className="job-details-company">{job?.company?.name || '-'}</p>
              )}
              
              <div className="job-details-meta">
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8.66667C9.47276 8.66667 10.6667 7.47276 10.6667 6C10.6667 4.52724 9.47276 3.33333 8 3.33333C6.52724 3.33333 5.33333 4.52724 5.33333 6C5.33333 7.47276 6.52724 8.66667 8 8.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 14.6667C11.3333 12 14 9.33333 14 6C14 3.52724 11.4728 1.33333 8 1.33333C4.52724 1.33333 2 3.52724 2 6C2 9.33333 4.66667 12 8 14.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isEditing && isJobOwner ? (
                    <input
                      type="text"
                      value={editForm.location || ''}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Location"
                      style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', width: '150px' }}
                    />
                  ) : (
                    <span>{job?.location || '-'}</span>
                  )}
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.33333 2.66667H10.6667C11.403 2.66667 12 3.26362 12 4V12C12 12.7364 11.403 13.3333 10.6667 13.3333H5.33333C4.59695 13.3333 4 12.7364 4 12V4C4 3.26362 4.59695 2.66667 5.33333 2.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 2.66667V1.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 2.66667V1.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 6.66667H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isEditing && isJobOwner ? (
                    <select
                      value={editForm.employment_type || ''}
                      onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                      style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    >
                      <option value="">Select type</option>
                      <option value="Full time">Full time</option>
                      <option value="Part time">Part time</option>
                      <option value="Contract">Contract</option>
                      <option value="Shift part job">Shift part job</option>
                    </select>
                  ) : (
                    <span>{job?.employment_type || '-'}</span>
                  )}
                </div>
                <div className="detail-item">
                  {isEditing && isJobOwner ? (
                    <input
                      type="text"
                      value={editForm.salary_min && editForm.salary_max ? `${editForm.salary_min}-${editForm.salary_max} ${editForm.currency || 'JOD'}` : (editForm.salary_min || editForm.salary_max || '')}
                      onChange={(e) => {
                        const val = e.target.value
                        const match = val.match(/(\d+)\s*-\s*(\d+)\s*(\w+)?/)
                        if (match) {
                          setEditForm({
                            ...editForm,
                            salary_min: Number(match[1]),
                            salary_max: Number(match[2]),
                            currency: match[3] || 'JOD'
                          })
                        } else {
                          const num = Number(val.replace(/[^0-9.]/g, ''))
                          if (!isNaN(num)) {
                            setEditForm({ ...editForm, salary_min: num, salary_max: null })
                          }
                        }
                      }}
                      placeholder="Salary (e.g., 800-1200 JOD)"
                      style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', width: '180px' }}
                    />
                  ) : (
                    <span>{formatSalary(job) || '-'}</span>
                  )}
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{job?.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            </div>

            {/* HR Action Buttons */}
            {isJobOwner && !isEditing && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '10px 20px',
                    background: '#080066',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Edit Job
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Job'}
                </button>
              </div>
            )}

            {/* HR Edit Mode Actions */}
            {isEditing && isJobOwner && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditError('')
                    // Reset form to original job data
                    if (job) {
                      setEditForm({
                        title: job.title || '',
                        company_name: job.company?.name || '',
                        department: job.department || '',
                        location: job.location || '',
                        employment_type: job.employment_type || '',
                        currency: job.currency || 'JOD',
                        salary_min: job.salary_min || '',
                        salary_max: job.salary_max || '',
                        about_role: job.about_role || '',
                        requirements_text: job.requirements_text || '',
                        is_active: job.is_active !== false,
                        skills: job.skills || []
                      })
                    }
                  }}
                  disabled={isSaving}
                  style={{
                    padding: '10px 20px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Job Skills */}
          <div className="job-skills-section">
            <div className="job-skills">
              {(job?.skills || []).map((skill, index) => (
                <span key={index} className="skill-tag">{skill}</span>
              ))}
            </div>
          </div>

          {/* About The Role */}
          <div className="job-section">
            <h3 className="section-title">About The Role</h3>
            {isEditing && isJobOwner ? (
              <textarea
                value={editForm.about_role || ''}
                onChange={(e) => setEditForm({ ...editForm, about_role: e.target.value })}
                rows={5}
                style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
              />
            ) : (
              <p className="section-text">{job?.about_role || '-'}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="job-section">
            <h3 className="section-title">Requirements</h3>
            {isEditing && isJobOwner ? (
              <textarea
                value={editForm.requirements_text || ''}
                onChange={(e) => setEditForm({ ...editForm, requirements_text: e.target.value })}
                rows={5}
                style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
              />
            ) : (
              <p className="section-text">{job?.requirements_text || '-'}</p>
            )}
          </div>

          {/* Skills Section - Editable for HR */}
          {isEditing && isJobOwner && (
            <div className="job-section">
              <h3 className="section-title">Skills</h3>
              <SkillsMultiInput
                skills={editForm.skills || []}
                onChange={(skills) => setEditForm({ ...editForm, skills })}
              />
            </div>
          )}

          {jobError && <div style={{ color: '#b91c1c', marginTop: 8 }}>{jobError}</div>}
          {editError && <div style={{ color: '#b91c1c', marginTop: 8 }}>{editError}</div>}

          {/* Apply Button Bottom - Only for normal users */}
          {!isHR && (
            <div className="apply-button-bottom">
              <button
                className="apply-button-large"
                type="button"
                onClick={() => setIsCvModalOpen(true)}
              >
                Apply For This Position
              </button>
            </div>
          )}
        </div>
      </div>
        )}
      </div>

      {isCvModalOpen && (
        <div
          className="cv-modal-overlay"
          onClick={() => setIsCvModalOpen(false)}
        >
          <div
            className="cv-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cv-modal-header">
              <div className="cv-modal-title-row">
                <span className="cv-modal-dot" />
                <h2 className="cv-modal-title">Add your CV</h2>
              </div>
              <button
                type="button"
                className="cv-modal-close"
                onClick={() => setIsCvModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="cv-modal-body">
              {applyError && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{applyError}</div>}
              <div className="cv-modal-grid">
                <div className="cv-field">
                  <label className="cv-label">Role / Position</label>
                  <input
                    type="text"
                    className="cv-input"
                    placeholder="e.g., Compliance Role"
                  />
                </div>
                <div className="cv-field">
                  <label className="cv-label">Location</label>
                  <input
                    type="text"
                    className="cv-input"
                    placeholder="e.g., Amman, Jordan"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="cv-field" style={{ gridColumn: 'span 2' }}>
                  <label className="cv-label">Skills (Optional)</label>
                  <SkillsMultiInput
                    skills={applicationSkills}
                    onChange={(skills) => setApplicationSkills(skills)}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    Type a skill and press Enter to add it. Press Backspace on empty input to remove the last skill.
                  </p>
                </div>
                <div className="cv-field">
                  <label className="cv-label">Education</label>
                  <input
                    type="text"
                    className="cv-input"
                    placeholder="e.g., Education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  />
                </div>
              </div>

              <div className="cv-field" style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                <label className="cv-label">Certification</label>
                <CertificationsMultiInput
                  certifications={certifications}
                  onChange={(certs) => setCertifications(certs)}
                />
              </div>

              <div className="cv-upload-section">
                <label className="cv-label">Choose CV</label>
                {availableResumes.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <select
                      className="cv-input"
                      value={selectedResumeId || ''}
                      onChange={(e) => {
                        setSelectedResumeId(e.target.value || null)
                        setCvFileName('')
                      }}
                      style={{ width: '100%' }}
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
                <div style={{ marginTop: availableResumes.length > 0 ? '8px' : '0' }}>
                  <label className="cv-label" style={{ marginBottom: '8px' }}>Or Upload New CV</label>
                  <label className="cv-upload-area">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="cv-upload-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        setCvFileName(file ? file.name : '')
                        if (file) setSelectedResumeId(null)
                      }}
                      disabled={!!selectedResumeId}
                    />
                    <div className="cv-upload-icon-circle">
                      <span className="cv-upload-icon">⬆</span>
                    </div>
                    <div className="cv-upload-text-group">
                      <span className="cv-upload-main-text">
                        Click to upload or drag and drop
                      </span>
                      <span className="cv-upload-sub-text">
                        PDF, DOC, DOCX, up to 10MB
                      </span>
                      {cvFileName && (
                        <span className="cv-upload-file-name">
                          Selected file: {cvFileName}
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="cv-field" style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                <label className="cv-label">Work Experience (Optional)</label>
                <input
                  type="text"
                  className="cv-input"
                  placeholder="e.g., 5 years of experience in software development"
                  value={workExperience}
                  onChange={(e) => setWorkExperience(e.target.value)}
                />
              </div>
            </div>

            <div className="cv-modal-footer">
              <button
                type="button"
                className="cv-button cv-button-secondary"
                onClick={() => setIsCvModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cv-button cv-button-primary"
                disabled={isApplying || !job?.id}
                onClick={async () => {
                  setApplyError('')
                  setIsApplying(true)
                  try {
                    // If an existing resume is selected, use its ID. Otherwise, use uploaded file name
                    // Use selectedResumeId directly since it's already the ID value from the dropdown
                    const resumeIdToSend = selectedResumeId ? Number(selectedResumeId) : undefined
                    
                    await applyToJob({ 
                      jobId: job.id, 
                      resumeId: resumeIdToSend,
                      resumeFileName: resumeIdToSend ? undefined : (cvFileName || undefined),
                      skills: applicationSkills,
                      certifications: certifications,
                      workExperience: workExperience || undefined,
                      education: education || undefined,
                      location: location || undefined,
                      professionalSummary: professionalSummary || undefined
                    })
                    setApplicationSkills([])
                    setCertifications([])
                    setCvFileName('')
                    setSelectedResumeId(null)
                    setWorkExperience('')
                    setEducation('')
                    setLocation('')
                    setProfessionalSummary('')
                    setIsCvModalOpen(false)
                    navigate('/dashboard/user')
                  } catch (e) {
                    setApplyError(e?.message || 'Apply failed')
                  } finally {
                    setIsApplying(false)
                  }
                }}
              >
                Submit Your CV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobDetailsPage

