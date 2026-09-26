import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SignupUserPage.css'
import { signupUser } from '../services/authApi'

function SignupUserPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+962 ',
    password: '',
    confirmPassword: '',
    resume: null
  })
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword
  const passwordTooShort = (formData.password || '').length > 0 && (formData.password || '').length < 6
  const canSubmit =
    Boolean(formData.firstName?.trim()) &&
    Boolean(formData.lastName?.trim()) &&
    Boolean(formData.email?.trim()) &&
    Boolean(formData.phone?.trim()) &&
    Boolean(formData.password) &&
    Boolean(formData.confirmPassword) &&
    Boolean(passwordsMatch) &&
    !passwordTooShort &&
    Boolean(agreeToTerms) &&
    !isSubmitting

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        resume: file
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }
    if ((formData.password || '').length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      await signupUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        resumeFileName: formData.resume?.name || ''
      })
      navigate('/dashboard/user')
    } catch (err) {
      const issues = err?.data?.issues
      if (Array.isArray(issues) && issues.length) {
        const pretty = issues
          .map((i) => {
            const field = Array.isArray(i?.path) && i.path.length ? i.path.join('.') : 'field'
            return `${field}: ${i?.message || 'invalid'}`
          })
          .join(' | ')
        setError(pretty)
      } else {
        setError(err?.message || 'Signup failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-user-page">
      {/* Left Panel - Background Image */}
      <div className="signup-left-panel-image"></div>

      {/* Right Panel - Sign Up Form */}
      <div className="signup-right-panel-form">
        <div className="signup-container">
          {/* Back Button */}
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
            type="button"
          >
            ←
          </button>

          {/* Logo Section */}
          <div className="signup-logo-section">
            <img 
              src="/imges/ejo white logo.png" 
              alt="EJO SUPPORT Logo" 
              className="signup-logo"
            />
          </div>

          {/* Sign Up Header */}
          <h2 className="signup-header">Sign Up User</h2>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="signup-form">
            {error && <div className="signup-error" style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
            {/* First Name and Last Name - Side by Side */}
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  placeholder="Enter your name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group form-group-half">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  placeholder="Enter your name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-input"
                placeholder="+962 79293093"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password and Confirm Password - Side by Side */}
            <div className="form-row">
              <div className="form-group form-group-half">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className="form-input"
                    placeholder="*****"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {passwordTooShort && (
                  <div className="signup-field-hint signup-field-hint-error">
                    Password must be at least 6 characters
                  </div>
                )}
              </div>

              <div className="form-group form-group-half">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-input"
                    placeholder="*****"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Resume */}
            <div className="form-group">
              <label className="form-label">Upload Resume</label>
              <div className="upload-area">
                <input
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="resume" className="upload-label">
                  <div className="upload-icon">
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="36" cy="36" r="34" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <path d="M26 32C23.7909 32 22 33.7909 22 36C22 36.2652 22.0103 36.5278 22.0305 36.7874C20.1653 37.0408 18.5 38.5213 18.5 40.4C18.5 42.4853 20.2147 44.2 22.3 44.2H31.7" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M46 32C48.2091 32 50 33.7909 50 36C50 36.2652 49.9897 36.5278 49.9695 36.7874C51.8347 37.0408 53.5 38.5213 53.5 40.4C53.5 42.4853 51.7853 44.2 49.7 44.2H40.3" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M36 28V44M36 28L30 34M36 28L42 34" stroke="#080066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="upload-text">
                    Click to upload or drag and drop
                  </p>
                  <p className="upload-hint">PDF, DOC, DOCX, up to 10MB</p>
                  {formData.resume && (
                    <p className="upload-file-name">{formData.resume.name}</p>
                  )}
                </label>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="terms-link">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="terms-link">Privacy Policy</a>
                </span>
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className="signup-button"
              disabled={!canSubmit}
              title={!agreeToTerms ? 'Please agree to the Terms to continue' : undefined}
            >
              {isSubmitting ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          {/* Sign in Link */}
          <p className="signin-prompt">
            Already have an account?{' '}
            <span 
              className="signin-link-text" 
              onClick={() => navigate('/login/user')}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupUserPage
