import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLock, FiMail, FiUser, FiPhone, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import logo from '../assets/logo-cropped.png';

const AuthModal = ({ isOpen, onClose, onSuccess, initialMode = 'login', title = 'Sign in to complete your order' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    terms: true
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    const res = await login(loginEmail, loginPassword);
    setIsLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(res.error || 'Invalid credentials. Please try again.');
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regData.name || !regData.email || !regData.mobile || !regData.password || !regData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const digitsOnly = regData.mobile.replace(/\D/g, '');
    let coreMobile = digitsOnly;
    if (digitsOnly.length > 10 && digitsOnly.startsWith('91')) {
      coreMobile = digitsOnly.substring(2);
    }
    if (coreMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    const res = await register({
      name: regData.name,
      email: regData.email,
      mobile: coreMobile,
      password: regData.password,
      password_confirmation: regData.confirmPassword
    });
    setIsLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-primary)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--dark-text)',
    marginBottom: '0.35rem'
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--secondary-text)',
              padding: '4px'
            }}
          >
            <FiX size={22} />
          </button>

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src={logo} alt="Nuts & Nutrition" style={{ height: '55px', objectFit: 'contain', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.25rem', color: 'var(--dark-text)', fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h3>
            <p style={{ margin: 0, color: 'var(--secondary-text)', fontSize: '0.875rem' }}>
              {title}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{ 
            display: 'flex', 
            backgroundColor: 'var(--soft-green)', 
            borderRadius: 'var(--radius-md)', 
            padding: '4px',
            marginBottom: '1.5rem' 
          }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'login' ? 'var(--white)' : 'transparent',
                color: mode === 'login' ? 'var(--dark-green)' : 'var(--secondary-text)',
                fontWeight: mode === 'login' ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'register' ? 'var(--white)' : 'transparent',
                color: mode === 'register' ? 'var(--dark-green)' : 'var(--secondary-text)',
                fontWeight: mode === 'register' ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: 'var(--light-red)',
              color: 'var(--brand-red)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In & Continue'}
                </Button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--secondary-text)', margin: '0.75rem 0 0' }}>
                New customer?{' '}
                <span 
                  onClick={() => switchMode('register')}
                  style={{ color: 'var(--primary-green)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Create an account
                </span>
              </p>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>10-Digit Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={regData.mobile}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setRegData({ ...regData, mobile: digits });
                  }}
                  placeholder="9876543210"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Password"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm</label>
                  <input
                    type="password"
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    placeholder="Confirm"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Register & Continue'}
                </Button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--secondary-text)', margin: '0.75rem 0 0' }}>
                Already have an account?{' '}
                <span 
                  onClick={() => switchMode('login')}
                  style={{ color: 'var(--primary-green)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Sign in
                </span>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
