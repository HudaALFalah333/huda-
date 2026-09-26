import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <div className="home-breadcrumb">first home</div>
      
      <div className="home-container">
        <div className="logo-section">
          <img 
            src="/imges/ejo white logo.png" 
            alt="EJO SUPPORT Logo" 
            className="logo-image"
          />
        </div>

        <div className="welcome-section">
          <h2 className="welcome-text">
            Welcome to <span className="welcome-highlight">EJO SUPPORT</span>
          </h2>
        </div>

        <div className="buttons-section">
          <button 
            className="btn-signin btn-signin-user"
            onClick={() => navigate('/login/user')}
          >
            Sign in User
          </button>
          <button 
            className="btn-signin btn-signin-hr"
            onClick={() => navigate('/login/hr')}
          >
            Sign in HR
          </button>
        </div>

        <div className="signup-section">
          <p className="signup-text">
            Don't have an account? <span className="signup-link" onClick={() => navigate('/signup/user')}>Sign up now!</span>
          </p>
          <p className="signup-link-standalone" onClick={() => navigate('/signup/user')}>
            Sign up User
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomePage

