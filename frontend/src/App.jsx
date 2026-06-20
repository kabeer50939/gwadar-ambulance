import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Truck, LogOut, Key, User, UserCheck, AlertCircle, Users, Crown, HeartPulse, Phone, RefreshCw, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import CitizenApp from './views/CitizenApp';
import Dispatcher from './views/Dispatcher';
import DriverApp from './views/DriverApp';
import ChairmanDashboard from './views/ChairmanDashboard';
import InstallPrompt from './components/InstallPrompt';
import MapComponent from './components/MapComponent';
import brandLogo from './assets/logo.png';

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
  const [showMapModal, setShowMapModal] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCaseManagerModal, setShowCaseManagerModal] = useState(false);
  const [caseManagerSearch, setCaseManagerSearch] = useState('');
  const [lang, setLang] = useState('en');

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

    socket.on('request:deleted', (deletedId) => {
      setRequests(prev => prev.filter(r => r.id !== deletedId));
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

  const deleteCase = async (id) => {
    if (!confirm("Are you sure you want to dismiss/delete this incident? This will release any assigned driver and vehicle immediately.")) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerFetch();
      } else {
        const err = await response.json();
        alert("Error: " + err.error);
      }
    } catch (e) {
      alert("Network error: " + e.message);
    }
  };

  const deleteBulk = async (statusFilter) => {
    const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter);
    if (filtered.length === 0) {
      alert("No cases found with this status.");
      return;
    }
    if (!confirm(`Are you sure you want to delete all ${filtered.length} cases matching "${statusFilter}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/bulk?status=${statusFilter}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerFetch();
        alert("Selected cases deleted successfully.");
      } else {
        const err = await response.json();
        alert("Error during bulk delete: " + err.error);
      }
    } catch (e) {
      alert("Error during bulk delete: " + e.message);
    }
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
        <header 
          className="app-header"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            height: '75px',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            paddingLeft: '1.25rem',
            paddingRight: '1.25rem'
          }}
        >
          <div 
            className="app-logo"
            style={{
              background: 'none',
              WebkitTextFillColor: 'initial',
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginLeft: '-0.75rem'
            }}
          >
            {currentUser.role !== 'citizen' ? (
              <>
                <img src={brandLogo} alt="GASG Logo" style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', background: 'white', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '1.55rem', 
                    fontWeight: 900, 
                    fontStyle: 'italic', 
                    fontFamily: '"Montserrat", "Outfit", "Inter", sans-serif', 
                    letterSpacing: '1.5px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'inline-block'
                  }}>
                    GWADAR AMBULANCE
                  </span>
                  <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    letterSpacing: '2px', 
                    color: 'rgba(255, 255, 255, 0.85)', 
                    textTransform: 'uppercase',
                    fontFamily: '"Inter", sans-serif'
                  }}>
                    {currentUser.role === 'chairman' ? 'CHAIRMAN PORTAL' : currentUser.role === 'dispatcher' ? 'DISPATCH PORTAL' : 'DRIVER PORTAL'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <img src={brandLogo} alt="GASG Logo" style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', background: 'white', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'block' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '1.55rem', 
                    fontWeight: 900, 
                    fontStyle: 'italic', 
                    fontFamily: '"Montserrat", "Outfit", "Inter", sans-serif', 
                    letterSpacing: '1.5px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'inline-block'
                  }}>
                    GWADAR AMBULANCE
                  </span>
                  <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    letterSpacing: '2px', 
                    color: 'rgba(255, 255, 255, 0.85)', 
                    textTransform: 'uppercase',
                    fontFamily: '"Inter", sans-serif'
                  }}>
                    {lang === 'ur' ? 'شہری پورٹل' : 'CITIZEN PORTAL'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="header-controls" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentUser.role === 'citizen' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Language switcher */}
                <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem', borderRadius: '20px' }}>
                  <button 
                    onClick={() => setLang('en')} 
                    className="btn" 
                    style={{ 
                      padding: '0.25rem 0.6rem', 
                      fontSize: '0.7rem', 
                      borderRadius: '15px',
                      background: lang === 'en' ? 'white' : 'transparent',
                      color: lang === 'en' ? 'var(--text-primary)' : 'white',
                      border: 'none',
                      boxShadow: lang === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontWeight: lang === 'en' ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLang('ur')} 
                    className="btn"
                    style={{ 
                      padding: '0.25rem 0.6rem', 
                      fontSize: '0.7rem', 
                      borderRadius: '15px',
                      background: lang === 'ur' ? 'white' : 'transparent',
                      color: lang === 'ur' ? 'var(--primary-red)' : 'white',
                      border: 'none',
                      boxShadow: lang === 'ur' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontWeight: lang === 'ur' ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    اردو
                  </button>
                </div>

                {/* Hotline */}
                <a 
                  href="tel:03350267742" 
                  title={lang === 'ur' ? 'کال کریں: 03350267742' : 'Call 0335-0267742'}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #ffffff',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'background 0.2s, transform 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Phone size={18} />
                </a>
              </div>
            )}

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #ffffff',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                outline: 'none',
                transition: 'background 0.2s, transform 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              {currentUser.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                minWidth: '180px',
                zIndex: 9999
              }}>
                {/* Dropdown Header: Name & Role */}
                <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.25rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', color: 'white' }}>{currentUser.name}</span>
                  <span style={{ 
                    fontSize: '0.62rem', 
                    fontWeight: 800,
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px', 
                    color: currentUser.role === 'chairman' ? '#fbbf24' : currentUser.role === 'dispatcher' ? '#fca5a5' : currentUser.role === 'driver' ? '#fdba74' : '#93c5fd',
                    marginTop: '2px' 
                  }}>
                    {currentUser.role === 'chairman' ? '👑 CHAIRMAN' : currentUser.role === 'dispatcher' ? '📡 DISPATCHER' : currentUser.role === 'driver' ? '🚑 DRIVER' : `👤 ${lang === 'ur' ? 'شہری' : 'CITIZEN'}`}
                  </span>
                </div>

                {(currentUser.role === 'chairman' || currentUser.role === 'dispatcher' || currentUser.role === 'driver' || currentUser.role === 'citizen') && (
                  <button
                    onClick={() => {
                      setShowMapModal(true);
                      setShowUserMenu(false);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      background: 'rgba(59,130,246,0.15)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59,130,246,0.3)',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    {currentUser.role === 'citizen' ? '🗺️ Map Pin Selector' : '🗺️ Live GPS Map'}
                  </button>
                )}

                {currentUser.role === 'citizen' && (
                  <button
                    onClick={() => {
                      setShowHistoryModal(true);
                      setShowUserMenu(false);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      background: 'rgba(22,163,74,0.15)',
                      color: '#86efac',
                      border: '1px solid rgba(22,163,74,0.3)',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    📋 {lang === 'ur' ? 'درخواستوں کی تاریخ' : 'Request History'}
                  </button>
                )}

                {(currentUser.role === 'chairman' || currentUser.role === 'dispatcher') && (
                  <button
                    onClick={() => {
                      setShowCaseManagerModal(true);
                      setShowUserMenu(false);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239,68,68,0.3)',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ Active Case Manager
                  </button>
                )}

                {(currentUser.role === 'chairman' || currentUser.role === 'dispatcher') && (
                  <button
                    onClick={async () => {
                      if (window.confirm("⚠️ WARNING: Are you sure you want to reset the system database? This will clear all request logs and reset ambulance/hospital availability to clean starting states. This cannot be undone!")) {
                        try {
                          const response = await fetch(`${BACKEND_URL}/api/reset`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (response.ok) {
                            alert("Database reset successfully!");
                            triggerFetch();
                            setShowUserMenu(false);
                          } else {
                            const err = await response.json();
                            alert("Error: " + err.error);
                          }
                        } catch (e) {
                          alert("Network error: " + e.message);
                        }
                      }
                    }}
                    className="btn btn-danger"
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      width: '100%',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ⚙️ Reset System Data
                  </button>
                )}

                {currentUser.role !== 'citizen' && (
                  <a 
                    href="#/citizen" 
                    target="gasg_citizen_portal"
                    className="btn btn-secondary"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textDecoration: 'none',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer'
                    }}
                  >
                    🚑 Citizen Portal
                  </a>
                )}



                <button
                  onClick={() => {
                    handleLogout();
                    setShowUserMenu(false);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    display: 'flex',
                    gap: '0.35rem',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239,68,68,0.2)',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            )}
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
              lang={lang}
              setLang={setLang}
              showMapModal={showMapModal}
              setShowMapModal={setShowMapModal}
              showHistoryModal={showHistoryModal}
              setShowHistoryModal={setShowHistoryModal}
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
              showMapModal={showMapModal}
              setShowMapModal={setShowMapModal}
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

        {showMapModal && currentUser?.role !== 'driver' && currentUser?.role !== 'citizen' && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: isMapMaximized ? '#0f172a' : 'rgba(15, 23, 42, 0.75)',
            backdropFilter: isMapMaximized ? 'none' : 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMapMaximized ? 0 : '1.5rem'
          }}>
            <div className="glass-panel" style={{
              background: 'white',
              padding: isMapMaximized ? 0 : '1.5rem',
              borderRadius: isMapMaximized ? 0 : '16px',
              width: '100%',
              maxWidth: isMapMaximized ? '100vw' : '950px',
              height: isMapMaximized ? '100vh' : '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: isMapMaximized ? 0 : '1rem',
              boxShadow: isMapMaximized ? 'none' : 'var(--shadow-2xl)',
              border: isMapMaximized ? 'none' : '1px solid var(--border-color)',
              position: 'relative'
            }}>
              {!isMapMaximized && (
                <>
                  <button
                    onClick={() => setShowMapModal(false)}
                    style={{
                      position: 'absolute', right: '1.25rem', top: '1.25rem',
                      background: '#f1f5f9', border: 'none', borderRadius: '50%',
                      width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                    onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                  >
                    ✕
                  </button>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🗺️ Gwadar Live GPS Map Overview
                  </h3>
                </>
              )}
              <div style={{
                flex: 1,
                borderRadius: isMapMaximized ? 0 : '12px',
                overflow: 'hidden',
                border: isMapMaximized ? 'none' : '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <MapComponent
                  ambulances={ambulances}
                  requests={requests}
                  hospitals={hospitals}
                  showRoutes={true}
                  onMaximizeChange={setIsMapMaximized}
                />
              </div>
            </div>
          </div>
        )}


        {/* Case Manager Modal */}
        {showCaseManagerModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              background: 'white', padding: '1.5rem', borderRadius: '16px',
              width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex',
              flexDirection: 'column', gap: '1rem', boxShadow: 'var(--shadow-2xl)',
              border: '1px solid var(--border-color)', position: 'relative',
              overflowY: 'auto'
            }}>
              <button
                onClick={() => setShowCaseManagerModal(false)}
                style={{
                  position: 'absolute', right: '1.25rem', top: '1.25rem',
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                  transition: 'background 0.2s', zIndex: 10
                }}
                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
              >
                ✕
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  ⚙️ Active Case Database Manager
                </h3>
                
                {/* Bulk controls */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { triggerFetch(); }}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'rgba(59, 130, 246, 0.05)',
                      color: 'var(--primary-blue)',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <RefreshCw size={12} /> Refresh Feed
                  </button>
                  <button
                    onClick={() => deleteBulk('Pending')}
                    className="btn btn-danger"
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px'
                    }}
                  >
                    <Trash2 size={12} /> Dismiss All Pending
                  </button>
                  <button
                    onClick={() => deleteBulk('Completed')}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'rgba(100, 116, 139, 0.08)',
                      color: '#64748b',
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      borderRadius: '8px'
                    }}
                  >
                    <Trash2 size={12} /> Clear All Completed
                  </button>
                </div>
              </div>

              {/* Search Control */}
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="🔍 Search cases by patient name, phone, or location..."
                  value={caseManagerSearch}
                  onChange={(e) => setCaseManagerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#f8fafc',
                    color: '#334155',
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-blue)'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Case table container */}
              <div style={{ flex: 1, marginTop: '0.25rem', overflowY: 'auto' }}>
                {(() => {
                  const query = caseManagerSearch.toLowerCase().trim();
                  const filteredRequests = requests.filter(r => {
                    if (!query) return true;
                    return (
                      r.citizen_name?.toLowerCase().includes(query) ||
                      r.citizen_phone?.includes(query) ||
                      r.location_name?.toLowerCase().includes(query) ||
                      r.emergency_type?.toLowerCase().includes(query) ||
                      r.status?.toLowerCase().includes(query)
                    );
                  });

                  if (filteredRequests.length === 0) {
                    return (
                      <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '3rem' }}>
                        No matching incidents found in database.
                      </p>
                    );
                  }

                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 'bold' }}>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Created</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Patient Details</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Emergency</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Location</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Assigned Unit</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Status</th>
                            <th style={{ padding: '0.6rem 0.4rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRequests.map(req => {
                            const dateStr = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                            return (
                              <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.6rem 0.4rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.75rem' }}>
                                  {dateStr}
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem', color: '#334155' }}>
                                  <div style={{ fontWeight: 600 }}>{req.citizen_name}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 {req.citizen_phone}</div>
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem' }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    background: req.emergency_type === 'Cardiac Arrest' ? '#fee2e2' : req.emergency_type === 'Accident' ? '#fff7ed' : '#f1f5f9',
                                    color: req.emergency_type === 'Cardiac Arrest' ? '#ef4444' : req.emergency_type === 'Accident' ? '#ea580c' : '#475569',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap'
                                  }}>{req.emergency_type}</span>
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem', color: '#475569', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  📍 {req.location_name}
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem', color: '#475569' }}>
                                  {req.assigned_ambulance_id ? (
                                    (() => {
                                      const amb = ambulances.find(a => a.id === req.assigned_ambulance_id);
                                      return <span>🚑 {amb?.vehicle_number || 'Unit'}</span>;
                                    })()
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem' }}>
                                  <span style={{
                                    fontSize: '0.68rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    background: req.status === 'Completed' ? '#dcfce7' : req.status === 'Pending' ? '#fffbeb' : '#e0f2fe',
                                    color: req.status === 'Completed' ? '#15803d' : req.status === 'Pending' ? '#b45309' : '#0369a1'
                                  }}>{req.status}</span>
                                </td>
                                <td style={{ padding: '0.6rem 0.4rem', textAlign: 'right' }}>
                                  <button
                                    onClick={() => deleteCase(req.id)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '0.35rem',
                                      borderRadius: '6px',
                                      background: 'rgba(239, 68, 68, 0.05)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.15)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Dismiss/Delete Case"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}
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
            background: 'white',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'pulse 2.5s infinite',
            overflow: 'hidden',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <img src={brandLogo} alt="GASG Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>

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
          background: 'white',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'pulse 2.5s infinite',
          overflow: 'hidden',
          padding: '4px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <img src={brandLogo} alt="GASG Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
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
