import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Truck, LogOut, Key, User, UserCheck, AlertCircle, Users, Crown } from 'lucide-react';
import CitizenApp from './views/CitizenApp';
import Dispatcher from './views/Dispatcher';
import DriverApp from './views/DriverApp';
import ChairmanDashboard from './views/ChairmanDashboard';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('gasg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('gasg_token') || null);

  // Routing State
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#/login');

  // App Data States
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const triggerFetch = () => setFetchTrigger(prev => prev + 1);

  // 1. Router Guards
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/login';
      if (!token) {
        if (hash !== '#/login') {
          window.location.hash = '#/login';
          setCurrentHash('#/login');
        } else {
          setCurrentHash('#/login');
        }
      } else {
        const role = currentUser?.role;
        const validRoutes = {
          citizen: '#/citizen',
          driver: '#/driver',
          dispatcher: '#/dispatcher',
          chairman: '#/chairman'
        };
        const allowed = validRoutes[role];
        if (allowed && hash !== allowed) {
          window.location.hash = allowed;
          setCurrentHash(allowed);
        } else {
          setCurrentHash(hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token, currentUser]);

  // 2. Fetch data
  useEffect(() => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch(`${BACKEND_URL}/api/ambulances`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAmbulances(Array.isArray(data) ? data : []))
      .catch(() => setAmbulances([]));

    fetch(`${BACKEND_URL}/api/hospitals`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => setHospitals([]));

    fetch(`${BACKEND_URL}/api/requests`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]));
  }, [fetchTrigger, token, currentUser]);

  // 3. Staff Login (Chairman / Driver / Dispatcher)
  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your username and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed.');
      }
      const data = await response.json();
      sessionStorage.setItem('gasg_token', data.token);
      sessionStorage.setItem('gasg_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      const routes = { driver: '#/driver', dispatcher: '#/dispatcher', chairman: '#/chairman' };
      window.location.hash = routes[data.user.role] || '#/login';
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // 4. Citizen Instant Access (no credentials)
  const handleCitizenAccess = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/citizen/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      sessionStorage.setItem('gasg_token', data.token);
      sessionStorage.setItem('gasg_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      window.location.hash = '#/citizen';
    } catch {
      setLoginError('Could not connect to server. Please ensure the backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  // 5. Quick Demo Login
  const handleQuickLogin = async (username, password) => {
    setLoginUsername(username);
    setLoginPassword(password);
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error('Demo login failed');
      const data = await response.json();
      sessionStorage.setItem('gasg_token', data.token);
      sessionStorage.setItem('gasg_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      const routes = { driver: '#/driver', dispatcher: '#/dispatcher', chairman: '#/chairman' };
      window.location.hash = routes[data.user.role] || '#/login';
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // 6. Logout
  const handleLogout = () => {
    sessionStorage.removeItem('gasg_token');
    sessionStorage.removeItem('gasg_user');
    sessionStorage.removeItem('active_emergency_request_id');
    setToken(null);
    setCurrentUser(null);
    setAmbulances([]);
    setRequests([]);
    setHospitals([]);
    setLoginUsername('');
    setLoginPassword('');
    window.location.hash = '#/login';
  };

  // ─── Authenticated App Shell ──────────────────────────────────────────────
  if (token && currentUser) {
    return (
      <div>
        <header className="app-header glass-panel">
          <div className="app-logo">
            <ShieldAlert className="app-logo-icon" size={24} />
            <span>GWADAR AMBULANCE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {currentUser.username ? `@${currentUser.username}` : currentUser.name}
              </span>
              <span className={`badge ${
                currentUser.role === 'dispatcher' ? 'badge-red' :
                currentUser.role === 'driver' ? 'badge-orange' :
                currentUser.role === 'chairman' ? 'badge-green' : 'badge-blue'
              }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.1rem' }}>
                {currentUser.role === 'citizen' ? '👤 CITIZEN' :
                 currentUser.role === 'driver' ? '🚑 DRIVER' :
                 currentUser.role === 'dispatcher' ? '📡 DISPATCHER' : '👑 CHAIRMAN'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <main>
          {currentHash === '#/citizen' && currentUser.role === 'citizen' && (
            <CitizenApp
              token={token}
              currentUser={currentUser}
              hospitals={hospitals}
              ambulances={ambulances}
              requests={requests}
              onNewRequestCreated={triggerFetch}
            />
          )}

          {currentHash === '#/dispatcher' && currentUser.role === 'dispatcher' && (
            <Dispatcher
              token={token}
              currentUser={currentUser}
              hospitals={hospitals}
              ambulances={ambulances}
              requests={requests}
              setHospitals={setHospitals}
              setAmbulances={setAmbulances}
              setRequests={setRequests}
              triggerFetch={triggerFetch}
            />
          )}

          {currentHash === '#/driver' && currentUser.role === 'driver' && (
            <DriverApp
              token={token}
              currentUser={currentUser}
              ambulances={ambulances}
              hospitals={hospitals}
              requests={requests}
              triggerFetch={triggerFetch}
            />
          )}

          {currentHash === '#/chairman' && currentUser.role === 'chairman' && (
            <ChairmanDashboard
              token={token}
              currentUser={currentUser}
              hospitals={hospitals}
              ambulances={ambulances}
              requests={requests}
              triggerFetch={triggerFetch}
            />
          )}
        </main>
      </div>
    );
  }

  // ─── Login Screen ─────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(239,68,68,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* GASG Header Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '2rem', margin: '0 auto 1rem auto',
          boxShadow: '0 8px 32px rgba(239,68,68,0.4)',
          animation: 'pulse 2.5s infinite'
        }}>✚</div>
        <h1 style={{
          fontWeight: 900, fontSize: '1.9rem',
          color: 'white', textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: '0.25rem'
        }}>GWADAR AMBULANCE</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
          GASG · Emergency Dispatch System
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 1
      }}>

        {/* ── CITIZEN EMERGENCY BLOCK ── */}
        <div style={{
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(239,68,68,0.08))',
          borderBottom: '1px solid rgba(239,68,68,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#ef4444', animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 6px #ef4444'
            }} />
            <span style={{ color: '#fca5a5', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Emergency Access
            </span>
          </div>

          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.15rem', marginBottom: '0.4rem' }}>
            🚑 Are you in an emergency?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            No login needed. Tap below for <strong style={{ color: 'white' }}>instant ambulance dispatch</strong>.
            We auto-detect your location.
          </p>

          <button
            id="citizen-emergency-btn"
            onClick={handleCitizenAccess}
            disabled={loginLoading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loginLoading ? '#991b1b' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: loginLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(220,38,38,0.5)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem'
            }}
            onMouseEnter={e => { if (!loginLoading) e.target.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
          >
            {loginLoading ? '⏳ Connecting...' : '🚨 Request Ambulance Now — Free & Instant'}
          </button>

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', textAlign: 'center', marginTop: '0.75rem' }}>
            ⚡ Opens immediately · No account required · GPS auto-detected
          </p>
        </div>

        {/* ── STAFF LOGIN BLOCK ── */}
        <div style={{ padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '28px', height: '1px',
              background: 'rgba(255,255,255,0.15)'
            }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              🔐 Staff Secure Login
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {loginError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '10px', padding: '0.65rem 0.85rem',
              color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem'
            }}>
              <AlertCircle size={14} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Username */}
            <div style={{ position: 'relative' }}>
              <User size={15} style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.35)', pointerEvents: 'none'
              }} />
              <input
                id="staff-username"
                type="text"
                placeholder="Username (e.g. kabeer, saleem)"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                  color: 'white', fontSize: '0.9rem',
                  outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <Key size={15} style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.35)', pointerEvents: 'none'
              }} />
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  color: 'white', fontSize: '0.9rem',
                  outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem'
                }}
              >{showPassword ? '🙈' : '👁'}</button>
            </div>

            <button
              id="staff-login-btn"
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: loginLoading ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.12)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (!loginLoading) e.target.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              {loginLoading ? 'Authenticating...' : '🔒 Sign In Securely'}
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', marginBottom: '0.75rem' }}>
              Quick Demo Access
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: '👑 Chairman', sub: 'chairman', username: 'chairman', password: 'chairman123', color: '#16a34a' },
                { label: '📡 Dispatcher', sub: 'saleem', username: 'saleem', password: 'dispatch123', color: '#2563eb' },
                { label: '🚑 Driver', sub: 'kabeer', username: 'kabeer', password: 'driver123', color: '#d97706' },
                { label: '🚑 Driver 2', sub: 'sajid', username: 'sajid', password: 'driver123', color: '#7c3aed' },
              ].map(item => (
                <button
                  key={item.username}
                  onClick={() => handleQuickLogin(item.username, item.password)}
                  style={{
                    padding: '0.55rem 0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    lineHeight: '1.4'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = item.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  <div>{item.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>@{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', letterSpacing: '0.5px', position: 'relative', zIndex: 1 }}>
        GASG · Role-Based Access Control · Secure Dispatch Network
      </p>
    </div>
  );
}
