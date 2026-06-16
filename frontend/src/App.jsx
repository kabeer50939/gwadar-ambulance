import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Truck, LogOut, Key, User, UserCheck, AlertCircle, Users, Crown } from 'lucide-react';
import { io } from 'socket.io-client';
import CitizenApp from './views/CitizenApp';
import Dispatcher from './views/Dispatcher';
import DriverApp from './views/DriverApp';
import ChairmanDashboard from './views/ChairmanDashboard';
import InstallPrompt from './components/InstallPrompt';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('gasg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('gasg_token') || null);

  // Routing State
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#/citizen');

  // Citizen Autologin/Loading State
  const [citizenLoading, setCitizenLoading] = useState(false);
  const [citizenError, setCitizenError] = useState(null);

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

  // Global WebSockets for real-time state sync across all dashboards
  useEffect(() => {
    if (!token) return;

    const socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Global App socket connected:', socket.id);
    });

    socket.on('request:new', (newReq) => {
      setRequests(prev => {
        if (prev.some(r => r.id === newReq.id)) return prev;
        return [newReq, ...prev];
      });
    });

    socket.on('request:updated', (updatedReq) => {
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
    });

    socket.on('ambulance:updated', (updatedAmb) => {
      setAmbulances(prev => prev.map(a => a.id === updatedAmb.id ? updatedAmb : a));
    });

    socket.on('hospital:updated', (updatedHosp) => {
      setHospitals(prev => prev.map(h => h.id === updatedHosp.id ? updatedHosp : h));
    });

    socket.on('system:reset', () => {
      triggerFetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Dynamic manifest swapping based on current hash
  useEffect(() => {
    const updateManifest = () => {
      const hash = window.location.hash || '#/citizen';
      const isStaff = ['#/login', '#/driver', '#/dispatcher', '#/chairman'].some(route => hash.startsWith(route));
      const link = document.querySelector('link[rel="manifest"]');
      if (link) {
        const target = isStaff ? '/manifest-staff.json' : '/manifest-citizen.json';
        if (link.getAttribute('href') !== target) {
          link.setAttribute('href', target);
        }
      }
    };

    window.addEventListener('hashchange', updateManifest);
    updateManifest(); // Run once initially

    return () => window.removeEventListener('hashchange', updateManifest);
  }, [currentHash]);

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
    if (citizenLoading || token) return;
    setCitizenLoading(true);
    setCitizenError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/citizen/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();
      sessionStorage.setItem('gasg_token', data.token);
      sessionStorage.setItem('gasg_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
      window.location.hash = '#/citizen';
    } catch {
      setCitizenError('Could not connect to Gwadar Ambulance network. Please check your network or verify the backend is running.');
    } finally {
      setCitizenLoading(false);
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

  // 1. Router Guards (handles hash change and logins/redirection)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/citizen';
      
      if (!token) {
        if (hash === '#/citizen' || hash === '#/' || hash === '#') {
          setCurrentHash('#/citizen');
          handleCitizenAccess();
        } else if (hash === '#/login') {
          setCurrentHash('#/login');
        } else {
          window.location.hash = '#/login';
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
        
        // If logged in as citizen and trying to go to login, auto-logout citizen so they can log in as staff
        if (role === 'citizen' && hash === '#/login') {
          handleLogout();
          return;
        }

        // If staff is logged in and trying to access citizen/login, redirect to staff dashboard
        if (role !== 'citizen' && (hash === '#/citizen' || hash === '#/login' || hash === '#/' || hash === '#')) {
          window.location.hash = allowed;
          setCurrentHash(allowed);
          return;
        }

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

  // ─── Authenticated App Shell ──────────────────────────────────────────────
  if (token && currentUser) {
    const isCitizen = currentUser.role === 'citizen';
    return (
      <div>
        {!isCitizen && (
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

              <a 
                href="#/citizen" 
                target="gasg_citizen_portal"
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center', textDecoration: 'none' }}
              >
                🚑 Citizen Portal
              </a>

              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </header>
        )}

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
        <InstallPrompt />
      </div>
    );
  }

  // If no token and route is citizen/root, render beautiful loading / error screen
  if (!token && (currentHash === '#/citizen' || currentHash === '#/' || currentHash === '#')) {
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
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(239,68,68,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: '420px', width: '100%' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem', margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 32px rgba(239,68,68,0.4)',
            animation: 'pulse 2.5s infinite'
          }}>✚</div>

          <h1 style={{
            fontWeight: 900, fontSize: '1.8rem',
            color: 'white', textTransform: 'uppercase',
            letterSpacing: '2px', marginBottom: '0.5rem'
          }}>GWADAR AMBULANCE</h1>

          {citizenError ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              marginTop: '1rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h2 style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                Connection Error
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                {citizenError}
              </p>
              <button
                onClick={handleCitizenAccess}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(220,38,38,0.4)'
                }}
              >
                🔄 Retry Connection
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '2rem',
              marginTop: '1rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Connecting to SOS Network
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                Initializing secure anonymous citizen session...
              </p>
              <div style={{
                width: '32px', height: '32px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTop: '3px solid #ef4444',
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          )}

        </div>
        <InstallPrompt />
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

      {/* Main Card (Staff Login Only) */}
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

        {/* ── STAFF LOGIN BLOCK ── */}
        <div style={{ padding: '2rem 2.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '28px', height: '1px',
              background: 'rgba(255,255,255,0.15)'
            }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
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

          <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
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



        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', letterSpacing: '0.5px', position: 'relative', zIndex: 1 }}>
        GASG · Role-Based Access Control · Secure Dispatch Network
      </p>
      <InstallPrompt />
    </div>
  );
}
