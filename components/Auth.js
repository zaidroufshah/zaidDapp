import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiWallet } from 'react-icons/fi';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      let result;
      
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
      } else {
        if (!formData.fullName.trim()) {
          setStatus({ type: 'error', message: 'Please enter your full name' });
          setLoading(false);
          return;
        }
        result = await signUp(formData.email, formData.password, formData.fullName);
      }

      if (result.error) {
        setStatus({ 
          type: 'error', 
          message: result.error.message || 'Authentication failed' 
        });
      } else {
        if (!isLogin) {
          setStatus({
            type: 'success',
            message: 'Registration successful! Please check your email to confirm your account.'
          });
        }
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: 'An unexpected error occurred' 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', fullName: '' });
    setStatus({ type: '', message: '' });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-card">
          {/* Logo/Brand Section */}
          <div className="auth-header">
            <h1 className="auth-title">MicroLoan DApp</h1>
            <p className="auth-subtitle">
              Decentralized Group Microloans
            </p>
          </div>

          {/* Status Messages */}
          {status.message && (
            <div className={`auth-status ${status.type}`}>
              {status.message}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </div>

            <div className="form-fields">
              {!isLogin && (
                <div className="input-group">
                  <div className="input-wrapper">
                    <FiUser className="input-icon" />
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="auth-input"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="input-group">
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="auth-input"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <div className="auth-spinner" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                className="auth-switch"
                onClick={toggleMode}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}