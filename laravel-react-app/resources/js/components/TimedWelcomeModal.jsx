import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiGift, FiLock, FiMail, FiUser, FiPhone, FiCheckCircle, FiTag } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import logo from '../assets/logo-cropped.png';

const TimedWelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'login'
  const [isSuccess, setIsSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });

  const { isAuthenticated, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Suppress if already authenticated
    if (isAuthenticated) return;

    // Suppress if already dismissed or logged in during this session
    const isDismissed = sessionStorage.getItem('nn_dismissed_welcome_modal');
    if (isDismissed) return;

    // Suppress on auth and checkout pages
    const sensitivePages = ['/login', '/register', '/checkout'];
    if (sensitivePages.includes(location.pathname)) return;

    // 15 seconds timer (within requested 10-20 seconds range)
    const timer = setTimeout(() => {
      // Re-verify conditions right before opening
      if (!sessionStorage.getItem('nn_dismissed_welcome_modal')) {
        setIsOpen(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, location.pathname]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('nn_dismissed_welcome_modal', 'true');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(loginEmail, loginPassword);
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setSuccessUser(loginEmail);
      sessionStorage.setItem('nn_dismissed_welcome_modal', 'true');
    } else {
      setError(res.error || 'Invalid credentials. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!regData.name || !regData.email || !regData.mobile || !regData.password) {
      setError('Please fill in all fields.');
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

    if (regData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const res = await register({
      name: regData.name,
      email: regData.email,
      mobile: coreMobile,
      password: regData.password,
      password_confirmation: regData.password
    });
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setSuccessUser(regData.name);
      sessionStorage.setItem('nn_dismissed_welcome_modal', 'true');
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="Close welcome offer"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              zIndex: 10,
              transition: 'background 0.2s'
            }}
          >
            <FiX size={18} />
          </button>

          {/* Top Banner Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1b4d24 0%, #2a5d2c 100%)',
            color: '#ffffff',
            padding: '2rem 1.5rem 1.5rem',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '0.3rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem'
            }}>
              <FiGift size={14} color="#fde047" /> Special Welcome Offer
            </div>

            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.45rem', fontWeight: 700, color: '#ffffff' }}>
              Enjoy 10% OFF Your First Order!
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.88)' }}>
              Join the Nuts & Nutrition family for wholesome dry fruits, superfoods, and healthy snacks.
            </p>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '1.5rem' }}>
            {isSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <FiCheckCircle size={60} color="#16a34a" style={{ marginBottom: '1rem' }} />
                <h4 style={{ fontSize: '1.3rem', color: '#1b4d24', marginBottom: '0.5rem' }}>
                  Welcome aboard, {successUser || 'healthy snacker'}!
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Your account is active. Use promo code at checkout:
                </p>

                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '2px dashed #22c55e',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <FiTag color="#16a34a" size={18} />
                  <strong style={{ fontSize: '1.25rem', color: '#15803d', letterSpacing: '0.05em' }}>
                    WELCOME10
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    size="lg"
                    onClick={() => {
                      handleDismiss();
                      navigate('/shop');
                    }}
                  >
                    START SHOPPING NOW
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Tab Switcher */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.5rem',
                  padding: '0.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('register'); setError(''); }}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                      color: activeTab === 'register' ? '#1b4d24' : '#64748b',
                      boxShadow: activeTab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setError(''); }}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: activeTab === 'login' ? '#ffffff' : 'transparent',
                      color: activeTab === 'login' ? '#1b4d24' : '#64748b',
                      boxShadow: activeTab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    Sign In
                  </button>
                </div>

                {error && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    {error}
                  </div>
                )}

                {activeTab === 'register' ? (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={regData.name}
                        onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                        required
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={regData.email}
                        onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                        required
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="10-digit Mobile Number"
                        value={regData.mobile}
                        onChange={(e) => setRegData({ ...regData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        required
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Create Password (min 6 chars)"
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        required
                        style={inputStyle}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      fullWidth 
                      size="lg"
                      disabled={isLoading}
                      style={{ marginTop: '0.5rem' }}
                    >
                      {isLoading ? 'Creating Account...' : 'CLAIM 10% OFF & REGISTER'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <input
                        type="email"
                        placeholder="Registered Email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        style={inputStyle}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      fullWidth 
                      size="lg"
                      disabled={isLoading}
                      style={{ marginTop: '0.5rem' }}
                    >
                      {isLoading ? 'Signing In...' : 'SIGN IN & UNLOCK OFFER'}
                    </Button>
                  </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    No thanks, I prefer paying full price
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.92rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

export default TimedWelcomeModal;
