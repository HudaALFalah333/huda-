import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginHRPage.css'
import { login } from '../services/authApi'

function LoginHRPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login({ role: 'HR', email, password })
      navigate('/dashboard/hr')
    } catch (err) {
      setError(err?.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-user-page">
      {/* Left Panel - Login Form Section */}
      <div className="login-left-panel">
        <div className="login-container">
          {/* Logo Section */}
          <div className="login-logo-section">
            <img 
              src="/imges/ejo blue logo.png" 
              alt="EJO SUPPORT Logo" 
              className="login-logo"
            />
          </div>

          {/* Sign in Header */}
          <h2 className="signin-header">Sign in HR</h2>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error" style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
            {/* Email/Phone Input */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address or Phone Number
              </label>
              <input
                type="text"
                id="email"
                className="form-input"
                placeholder="Enter your email or phone number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Sign in Button */}
            <button type="submit" className="signin-button" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Sign up Link */}
          <p className="signup-prompt">
            Don't have an account?{' '}
            <span 
              className="signup-link-text" 
              onClick={() => navigate('/signup/user')}
            >
              Sign up now!
            </span>
          </p>
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div className="login-right-panel"></div>
    </div>
  )
}

export default LoginHRPage
