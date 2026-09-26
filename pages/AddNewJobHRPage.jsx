import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AddNewJobHRPage.css'
import HRNotificationsBell from '../components/HRNotificationsBell'
import { createJob } from '../services/jobsApi'
import { getCurrentUser } from '../services/authApi'

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

function AddNewJobHRPage() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    amount: '',
    requirements: '',
    type: 'Shift part job',
    aboutRole: '',
    companyName: '',
    skills: []
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.add-new-job-hr-user-profile')) {
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

  function parseAmountRange(amount) {
    // Accept formats like: "800 – 1200 JOD" or "800-1200" or "800"
    const nums = String(amount || '')
      .replace(/,/g, '')
      .match(/\d+(\.\d+)?/g)
    if (!nums || nums.length === 0) return { salary_min: undefined, salary_max: undefined }
    const a = Number(nums[0])
    const b = nums.length > 1 ? Number(nums[1]) : undefined
    return {
      salary_min: Number.isFinite(a) ? a : undefined,
      salary_max: Number.isFinite(b) ? b : undefined
    }
  }

  return (
    <div className="add-new-job-hr-page">
      {/* Header */}
      <header className={`add-new-job-hr-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="add-new-job-hr-header-left">
          <div className="add-new-job-hr-logo-section">
            <img
              src={isScrolled ? '/imges/ejo white logo.png' : '/imges/ejo blue logo.png'}
              alt="EJO SUPPORT Logo"
              className="add-new-job-hr-logo-image"
            />
          </div>
          <nav className="add-new-job-hr-header-nav">
            <a href="/dashboard/hr" className="add-new-job-hr-nav-link">Home</a>
            <a href="/view-applicants/hr" className="add-new-job-hr-nav-link">View applicants</a>
            <a href="/scheduled-interviews/hr" className="add-new-job-hr-nav-link">Scheduled Interviews</a>
            <a href="/add-new-job/hr" className="add-new-job-hr-nav-link active">Add New Job</a>
            <a href="/my-jobs/hr" className="add-new-job-hr-nav-link">My Jobs</a>
          </nav>
        </div>

        <div className="add-new-job-hr-header-right">
          <div className="add-new-job-hr-search-container">
            <input
              type="text"
              placeholder="Search"
              className="add-new-job-hr-search-input"
            />
            <button className="add-new-job-hr-search-button" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <HRNotificationsBell buttonClassName="add-new-job-hr-notification-button" />

          <div className="add-new-job-hr-user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img
              src={hrData?.profileImage || '/imges/profile-placeholder.png'}
              alt={hrData?.name || 'HR User'}
              className="add-new-job-hr-profile-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTIwIDEyQzIyLjIwOTEgMTIgMjQgMTMuNzkwOSAyNCAxNkMyNCAxOC4yMDkxIDIyLjIwOTEgMjAgMjAgMjBDMTcuNzkwOSAyMCAxNiAxOC4yMDkxIDE2IDE2QzE2IDEzLjc5MDkgMTcuNzkwOSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwIDIyQzE0LjQ3NzEgMjIgMTAgMjMuNDc3MSAxMCAyOFYzMEgzMFYyOEMzMCAyMy40NzcxIDI1LjUyMjkgMjIgMjAgMjJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='
              }}
            />
            <span className="add-new-job-hr-profile-name">{hrData?.name || 'HR User'}</span>
            <button className="add-new-job-hr-profile-dropdown" aria-label="Profile menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="add-new-job-hr-profile-dropdown-menu">
                <button
                  className="add-new-job-hr-dropdown-item"
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
                  className="add-new-job-hr-dropdown-item"
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

      {/* Main */}
      <main className="add-new-job-hr-content">
        <div className="add-new-job-hr-layout">
          <div className="add-new-job-hr-left-illustration">
            {/* Put file in: frontend/public/imges/add new job.gif */}
            <img
              src="/imges/add%20new%20job.gif"
              alt="Add new job"
              className="add-new-job-hr-gif"
            />
          </div>

          <div className="add-new-job-hr-right">
            <div className="add-new-job-hr-top">
              <h1 className="add-new-job-hr-title">Add New Job</h1>
              <p className="add-new-job-hr-subtitle">
                Create and publish a new job opening by filling in the
                <br />
                details below.
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
                <span>Add New Job</span>
              </div>

              <form
                className="add-new-job-hr-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setError('')
                  setIsSubmitting(true)
                  try {
                    const { salary_min, salary_max } = parseAmountRange(form.amount)
                    await createJob({
                      title: form.title,
                      company_name: form.companyName || 'EJO SUPPORT',
                      department: form.department || undefined,
                      location: form.location || undefined,
                      employment_type: form.type || undefined,
                      salary_min,
                      salary_max,
                      currency: 'JOD',
                      requirements_text: form.requirements || undefined,
                      about_role: form.aboutRole || undefined,
                      skills: form.skills || []
                    })
                    navigate('/dashboard/hr')
                  } catch (err) {
                    setError(err?.message || 'Failed to create job')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              >
                {error && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
                <div className="add-new-job-hr-grid">
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Job Title</label>
                    <input
                      className="add-new-job-hr-input"
                      placeholder="e.g., Senior Software Engineer"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Company Name</label>
                    <input
                      className="add-new-job-hr-input"
                      placeholder="e.g., EJO SUPPORT"
                      value={form.companyName}
                      onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Department</label>
                    <input
                      className="add-new-job-hr-input"
                      placeholder="e.g., Engineering / HR / Marketing"
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Location</label>
                    <input
                      className="add-new-job-hr-input"
                      placeholder="e.g., Amman, Jordan"
                      value={form.location}
                      onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    />
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Amount</label>
                    <input
                      className="add-new-job-hr-input"
                      placeholder="e.g., 800 – 1200 JOD"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Job Requirements</label>
                    <select
                      className="add-new-job-hr-select"
                      value={form.requirements}
                      onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
                    >
                      <option value="" disabled>e.g., 3+ years experience</option>
                      <option value="1+ years">1+ years experience</option>
                      <option value="3+ years">3+ years experience</option>
                      <option value="5+ years">5+ years experience</option>
                    </select>
                  </div>
                  <div className="add-new-job-hr-field">
                    <label className="add-new-job-hr-label">Type</label>
                    <select
                      className="add-new-job-hr-select"
                      value={form.type}
                      onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    >
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
                    value={form.aboutRole}
                    onChange={(e) => setForm((p) => ({ ...p, aboutRole: e.target.value }))}
                  />
                </div>

                <div className="add-new-job-hr-field add-new-job-hr-field-full">
                  <label className="add-new-job-hr-label">Skills (Optional)</label>
                  <SkillsMultiInput
                    skills={form.skills}
                    onChange={(skills) => setForm((p) => ({ ...p, skills }))}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    Type a skill and press Enter to add it. Press Backspace on empty input to remove the last skill.
                  </p>
                </div>

                <label className="add-new-job-hr-checkbox-row">
                  <input type="checkbox" defaultChecked />
                  <span>
                    I confirm that I have a legitimate hiring purpose and, where required,
                    candidate consent for this check.
                  </span>
                </label>

                <div className="add-new-job-hr-form-footer">
                  <button type="button" className="add-new-job-hr-cancel-btn" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                  <button type="submit" className="add-new-job-hr-submit-btn" disabled={isSubmitting}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 10L17 3L10 17L8.5 11.5L3 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isSubmitting ? 'Submitting...' : 'Submit Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AddNewJobHRPage


