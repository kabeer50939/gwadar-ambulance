import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, ShieldCheck, HeartPulse, AlertTriangle } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function Dispatcher({
  token,
  currentUser,
  hospitals,
  ambulances,
  requests,
  setHospitals,
  setAmbulances,
  setRequests,
  triggerFetch
}) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [manualAmbulanceId, setManualAmbulanceId] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);

  // Fetch drivers list
  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/staff`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const driverList = data.filter(s => s.role === 'driver');
        setDrivers(driverList);
      })
      .catch(() => setDrivers([]));
  }, [token]);

  // Call Center Form State (Operator creating request)
  const [showCallCenterForm, setShowCallCenterForm] = useState(false);
  const [ccName, setCcName] = useState('');
  const [ccPhone, setCcPhone] = useState('');
  const [ccEmergencyType, setCcEmergencyType] = useState('Accident');
  const [ccLocationName, setCcLocationName] = useState('');
  const [ccPin, setCcPin] = useState({ latitude: 25.1219, longitude: 62.3254 });
  const [ccSubmitting, setCcSubmitting] = useState(false);
  const [ccError, setCcError] = useState(null);

  // Advanced States
  const [socket, setSocket] = useState(null);
  const [dispChatInput, setDispChatInput] = useState('');
  const [alarmMuted, setAlarmMuted] = useState(false);

  const alarmIntervalRef = useRef(null);
  const alarmAudioCtxRef = useRef(null);

  const isTelemetryCritical = selectedRequest?.telemetry && (
    selectedRequest.telemetry.spo2 < 90 || 
    selectedRequest.telemetry.heart_rate > 120 || 
    selectedRequest.telemetry.heart_rate < 50 || 
    selectedRequest.telemetry.condition === 'Critical'
  );

  const startCriticalAlarm = () => {
    if (alarmIntervalRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      alarmAudioCtxRef.current = ctx;

      alarmIntervalRef.current = setInterval(() => {
        if (!alarmAudioCtxRef.current) return;
        const osc = alarmAudioCtxRef.current.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, alarmAudioCtxRef.current.currentTime);

        const gainNode = alarmAudioCtxRef.current.createGain();
        gainNode.gain.setValueAtTime(0.04, alarmAudioCtxRef.current.currentTime); // keep it safe

        osc.connect(gainNode);
        gainNode.connect(alarmAudioCtxRef.current.destination);
        osc.start();

        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e) {}
        }, 150);
      }, 1000);
    } catch (e) {
      console.warn("Alarm AudioContext failed", e);
    }
  };

  const stopCriticalAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmAudioCtxRef.current) {
      try { alarmAudioCtxRef.current.close(); } catch (e) {}
      alarmAudioCtxRef.current = null;
    }
  };

  // Trigger Critical Vitals alarm sound
  useEffect(() => {
    if (isTelemetryCritical && !alarmMuted) {
      startCriticalAlarm();
    } else {
      stopCriticalAlarm();
    }
    return () => stopCriticalAlarm();
  }, [isTelemetryCritical, alarmMuted]);

  const authHeaders = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };

  // WebSockets setup
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Dispatcher dashboard socket connected:', newSocket.id);
    });

    newSocket.on('request:new', (newReq) => {
      setRequests(prev => [newReq, ...prev]);
    });

    newSocket.on('request:updated', (updatedReq) => {
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
      setSelectedRequest(prev => prev && prev.id === updatedReq.id ? { ...prev, ...updatedReq } : prev);
    });

    newSocket.on('ambulance:updated', (updatedAmb) => {
      setAmbulances(prev => prev.map(a => a.id === updatedAmb.id ? updatedAmb : a));
    });

    newSocket.on('hospital:updated', (updatedHosp) => {
      setHospitals(prev => prev.map(h => h.id === updatedHosp.id ? updatedHosp : h));
    });

    newSocket.on('system:reset', () => {
      triggerFetch();
      setSelectedRequest(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [setRequests, setAmbulances, setHospitals, triggerFetch]);

  // Compute nearest available ambulance for selected request
  const getNearestAvailableAmbulance = (req) => {
    if (!req || req.status !== 'Pending') return null;

    const available = ambulances.filter(a => a.status === 'Available');
    if (available.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    available.forEach(amb => {
      const dist = getDistance(req.latitude, req.longitude, amb.latitude, amb.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { ...amb, distance_km: dist };
      }
    });

    return nearest;
  };

  const isDriverBusy = (driverId) => {
    return requests.some(r => r.assigned_driver_id === driverId && 
      r.status !== 'Completed' && 
      r.status !== 'Completed - Awaiting Verification' && 
      r.id !== (selectedRequest ? selectedRequest.id : ''));
  };

  const isAmbulanceBusy = (ambId) => {
    return requests.some(r => r.assigned_ambulance_id === ambId && r.status !== 'Completed' && r.id !== (selectedRequest ? selectedRequest.id : ''));
  };

  const nearestAmbulance = selectedRequest ? getNearestAvailableAmbulance(selectedRequest) : null;

  // Set default assignments when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      setIsEditingAssignment(false);
      if (selectedRequest.status === 'Pending') {
        const nearest = getNearestAvailableAmbulance(selectedRequest);
        const ambId = nearest ? nearest.id : '';
        setManualAmbulanceId(ambId);
        
        // No pre-fixed linked driver; dispatcher manually selects from available drivers
        setSelectedDriverId('');

        // Auto-select nearest hospital
        if (hospitals.length > 0) {
          let closestHosp = hospitals[0];
          let minHospDist = Infinity;
          const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          };
          hospitals.forEach(h => {
            const dist = getDistance(selectedRequest.latitude, selectedRequest.longitude, h.latitude, h.longitude);
            if (dist < minHospDist && h.available_beds > 0) {
              minHospDist = dist;
              closestHosp = h;
            }
          });
          setSelectedHospitalId(closestHosp.id);
        }
      } else {
        setManualAmbulanceId(selectedRequest.assigned_ambulance_id || '');
        setSelectedDriverId(selectedRequest.assigned_driver_id || '');
        setSelectedHospitalId(selectedRequest.assigned_hospital_id || '');
      }
    }
  }, [selectedRequest, ambulances, hospitals, drivers]);



  const handleAssign = async () => {
    if (!selectedRequest || !manualAmbulanceId) return;
    
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${selectedRequest.id}/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ambulance_id: manualAmbulanceId,
          driver_id: selectedDriverId || null,
          hospital_id: selectedHospitalId || null
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to assign ambulance');
      }

      setAssignSuccess('Ambulance successfully assigned and dispatched.');
      setTimeout(() => setAssignSuccess(null), 3000);
      
      const result = await response.json();
      setSelectedRequest(result.request);
      triggerFetch();
    } catch (err) {
      setAssignError(err.message);
    }
  };

  const handleResolveAndComplete = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${selectedRequest.id}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status: 'Completed' })
      });
      if (response.ok) {
        const result = await response.json();
        setSelectedRequest(result.request);
        triggerFetch();
      }
    } catch (err) {
      console.error("Failed to complete request:", err);
    }
  };

  const handleCallCenterSubmit = async (e) => {
    e.preventDefault();
    if (!ccName.trim() || !ccPhone.trim() || !ccLocationName.trim()) {
      setCcError('All fields are required.');
      return;
    }

    setCcSubmitting(true);
    setCcError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/requests`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          citizen_name: ccName,
          citizen_phone: ccPhone,
          emergency_type: ccEmergencyType,
          latitude: ccPin.latitude,
          longitude: ccPin.longitude,
          location_name: ccLocationName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create request from Call Center');
      }

      const newReq = await response.json();
      setCcName('');
      setCcPhone('');
      setCcLocationName('');
      setShowCallCenterForm(false);
      setSelectedRequest(newReq);
    } catch (err) {
      setCcError(err.message);
    } finally {
      setCcSubmitting(false);
    }
  };

  const handleResetSystem = async () => {
    if (window.confirm("Are you sure you want to reset the database? This deletes all logged requests and resets ambulances to Available.")) {
      try {
        await fetch(`${BACKEND_URL}/api/reset`, { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to reset system", err);
      }
    }
  };

  const sendDispChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!dispChatInput.trim() || !socket || !selectedRequest) return;

    socket.emit('chat:send-message', {
      requestId: selectedRequest.id,
      sender: 'dispatcher',
      text: dispChatInput.trim()
    });

    setDispChatInput('');
  };

  const handleAdjustBeds = async (hospId, change) => {
    const hosp = hospitals.find(h => h.id === hospId);
    if (!hosp) return;
    const newBeds = Math.max(0, hosp.available_beds + change);

    try {
      const response = await fetch(`${BACKEND_URL}/api/hospitals/${hospId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ available_beds: newBeds })
      });
      if (response.ok) {
        const updatedHosp = await response.json();
        setHospitals(prev => prev.map(h => h.id === hospId ? updatedHosp : h));
      }
    } catch (err) {
      console.error("Failed to adjust hospital beds:", err);
    }
  };

  const activeIncidentCount = requests.filter(r => r.status !== 'Completed').length;
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const ongoingRequests = requests.filter(r => r.status !== 'Pending' && r.status !== 'Completed');

  return (
    <div className="view-container" style={{ maxWidth: '100%', padding: '1rem' }}>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '310px 1fr 310px', gap: '1.25rem', height: 'calc(100vh - 100px)' }}>
        
        {/* Left Column: Incidents List */}
        <div className="dashboard-sidebar glass-panel dashboard-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
            <h2 className="panel-title" style={{ color: 'var(--primary-red)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity className="app-logo-icon pulse-icon" size={16} /> Incident Control
            </h2>
          </div>

          {/* Stats Bar */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div className="stat-widget" style={{ padding: '0.4rem', borderRadius: '6px' }}>
              <div className="stat-label" style={{ fontSize: '0.6rem' }}>Active Cases</div>
              <div className="stat-val" style={{ color: 'var(--primary-red)', fontSize: '1.1rem', marginTop: '0.1rem' }}>{activeIncidentCount}</div>
            </div>
            <div className="stat-widget" style={{ padding: '0.4rem', borderRadius: '6px' }}>
              <div className="stat-label" style={{ fontSize: '0.6rem' }}>Unassigned</div>
              <div className="stat-val" style={{ color: 'var(--primary-orange)', fontSize: '1.1rem', marginTop: '0.1rem' }}>{pendingRequests.length}</div>
            </div>
          </div>

          {/* Collapsible Call Center (Manual Request Logger) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={() => setShowCallCenterForm(!showCallCenterForm)}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                justifyContent: 'space-between', 
                padding: '0.4rem 0.75rem', 
                fontSize: '0.75rem',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}
            >
              <span>☎️ {showCallCenterForm ? 'Close Form' : 'Log Emergency'}</span>
              <span style={{ fontSize: '0.65rem' }}>{showCallCenterForm ? '▲' : '▼'}</span>
            </button>
            
            {showCallCenterForm && (
              <form 
                onSubmit={handleCallCenterSubmit} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem', 
                  background: '#f8fafc', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  marginTop: '0.5rem' 
                }}
              >
                {ccError && <div className="alert-banner alert-banner-danger" style={{ padding: '0.4rem', fontSize: '0.75rem', marginBottom: 0, borderRadius: '4px' }}>{ccError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Patient</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} 
                      value={ccName} 
                      onChange={e => setCcName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} 
                      value={ccPhone} 
                      onChange={e => setCcPhone(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Emergency</label>
                    <select 
                      className="form-input" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} 
                      value={ccEmergencyType} 
                      onChange={e => setCcEmergencyType(e.target.value)}
                    >
                      <option value="Accident">Accident</option>
                      <option value="Cardiac Arrest">Cardiac</option>
                      <option value="Maternal">Maternal</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Landmark</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} 
                      placeholder="e.g. Fish Harbour" 
                      value={ccLocationName} 
                      onChange={e => setCcLocationName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ background: 'white', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>📍 Location coordinates</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                    {ccPin.latitude.toFixed(4)}, {ccPin.longitude.toFixed(4)}
                  </span>
                </div>

                <button type="submit" className="btn btn-danger" style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', fontWeight: 'bold' }} disabled={ccSubmitting}>
                  {ccSubmitting ? 'Logging...' : '🚨 Save & Dispatch'}
                </button>
              </form>
            )}
          </div>

          {/* Incidents List Container */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.1rem' }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No emergency incidents logged.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {pendingRequests.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary-orange)', letterSpacing: '0.5px' }}>🚨 Pending ({pendingRequests.length})</span>
                    {pendingRequests.map(req => (
                      <div
                        key={req.id}
                        className={`item-card ${selectedRequest?.id === req.id ? 'selected' : ''}`}
                        style={{ padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <strong style={{ fontSize: '0.8rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.citizen_name}</strong>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {req.location_name}</p>
                          </div>
                          <span className="badge badge-red" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{req.emergency_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ongoingRequests.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary-blue)', letterSpacing: '0.5px' }}>⚡ In Progress ({ongoingRequests.length})</span>
                    {ongoingRequests.map(req => (
                      <div
                        key={req.id}
                        className={`item-card ${selectedRequest?.id === req.id ? 'selected' : ''}`}
                        style={{ padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                        onClick={() => setSelectedRequest(req)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <strong style={{ fontSize: '0.8rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.citizen_name}</strong>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {req.location_name}</p>
                          </div>
                          <span className="badge badge-blue" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{req.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Middle Column: Map & Selected Request Console */}
        <div className="dashboard-map-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
          
          <div style={{ flex: 1, display: 'flex', minHeight: '300px' }}>
            <MapComponent
              ambulances={ambulances}
              requests={requests}
              hospitals={hospitals}
              selectedRequestId={selectedRequest?.id}
              onMapClick={(coords) => {
                if (showCallCenterForm) setCcPin(coords);
              }}
              showRoutes={true}
            />
          </div>

          {/* Selected Incident Console Panel */}
          {!selectedRequest ? (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', minHeight: '160px', textAlign: 'center' }}>
              <Activity size={28} style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }} className="pulse-icon" />
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.15rem' }}>No Incident Selected</strong>
              <span style={{ fontSize: '0.75rem', maxWidth: '320px' }}>Select an active emergency card from the left sidebar to view telemetry, dispatch responders, and message the citizen.</span>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Incident Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{selectedRequest.citizen_name}</span>
                    <span className="badge badge-red" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', textTransform: 'uppercase' }}>{selectedRequest.emergency_type}</span>
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                    📞 <b>{selectedRequest.citizen_phone}</b> | 📍 <b>{selectedRequest.location_name}</b>
                  </span>
                </div>
                <span className={`badge ${selectedRequest.status === 'Pending' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                  {selectedRequest.status}
                </span>
              </div>

              {assignError && <div className="alert-banner alert-banner-danger" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', margin: 0 }}>{assignError}</div>}
              {assignSuccess && <div className="alert-banner alert-banner-success" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', margin: 0 }}>{assignSuccess}</div>}

              {/* Patient Telemetry Vitals */}
              {selectedRequest.telemetry ? (
                <div 
                  className={isTelemetryCritical ? "pulse-red-glow" : ""} 
                  style={{ 
                    border: '1px solid',
                    borderColor: isTelemetryCritical ? 'var(--primary-red)' : 'var(--border-color)',
                    background: isTelemetryCritical ? 'rgba(239, 68, 68, 0.04)' : '#fafafa',
                    borderRadius: '8px', 
                    padding: '0.6rem', 
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: isTelemetryCritical ? 'var(--primary-red)' : 'var(--primary-blue)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <HeartPulse size={14} className="pulse-icon" /> 
                      {isTelemetryCritical ? "⚠️ Critical Patient Vitals" : "Live Patient Vitals"}
                    </div>

                    {isTelemetryCritical && (
                      <button 
                        onClick={() => setAlarmMuted(!alarmMuted)} 
                        className="btn" 
                        style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', height: 'auto', border: '1px solid red', color: 'red', borderRadius: '4px', background: 'white', fontWeight: 'bold' }}
                      >
                        {alarmMuted ? "🔇 Unmute" : "🔊 Mute Alarm"}
                      </button>
                    )}
                  </div>

                  {/* animated ECG waveform */}
                  <div className="ecg-monitor" style={{ height: '45px', marginBottom: '0.5rem', borderRadius: '6px' }}>
                    <svg viewBox="0 0 300 60" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <path 
                        className="ecg-wave-path" 
                        d="M 0 30 L 40 30 L 50 30 L 55 26 L 60 30 L 65 30 L 70 10 L 75 55 L 80 30 L 85 30 L 90 34 L 95 30 L 140 30 L 150 30 L 155 26 L 160 30 L 165 30 L 170 10 L 175 55 L 180 30 L 185 30 L 190 34 L 195 30 L 240 30 L 250 30 L 255 26 L 260 30 L 265 30 L 270 10 L 275 55 L 280 30 L 285 30 L 290 34 L 295 30 L 300 30"
                      />
                    </svg>
                    <div 
                      className="ecg-sweep-bar" 
                      style={{ 
                        animationDuration: `${(60 / (selectedRequest.telemetry.heart_rate || 80)) * 3.5}s` 
                      }} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '0.4rem', textAlign: 'center' }}>
                    <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>Heart Rate</span>
                      <strong style={{ fontSize: '0.8rem', color: selectedRequest.telemetry.heart_rate > 120 ? 'var(--primary-red)' : 'var(--text-primary)' }}>
                        {selectedRequest.telemetry.heart_rate} BPM
                      </strong>
                    </div>
                    <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>Blood Pressure</span>
                      <strong style={{ fontSize: '0.8rem' }}>{selectedRequest.telemetry.blood_pressure}</strong>
                    </div>
                    <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>Oxygen (SpO2)</span>
                      <strong style={{ fontSize: '0.8rem', color: selectedRequest.telemetry.spo2 < 90 ? 'var(--primary-red)' : 'var(--primary-green)' }}>
                        {selectedRequest.telemetry.spo2}%
                      </strong>
                    </div>
                    <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block' }}>Condition</span>
                      <strong style={{ fontSize: '0.8rem', color: selectedRequest.telemetry.condition === 'Critical' ? 'var(--primary-red)' : 'var(--text-primary)' }}>
                        {selectedRequest.telemetry.condition}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : selectedRequest.status !== 'Pending' && selectedRequest.status !== 'Completed' && (
                <div style={{ background: '#fafafa', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center' }}>
                  ⏳ Paramedics en route. Telemetry vitals pending.
                </div>
              )}

              {/* Operator Dispatch Assign Console */}
              {selectedRequest.status === 'Pending' || isEditingAssignment ? (
                <div style={{ background: 'rgba(0,0,0,0.01)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  
                  {selectedRequest.status === 'Pending' && (
                    nearestAmbulance ? (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.15)', padding: '0.4rem', borderRadius: '6px', color: '#15803d', fontSize: '0.75rem' }}>
                        <ShieldCheck size={14} />
                        <span>
                          Nearest unit: <b>{nearestAmbulance.vehicle_number}</b> ({nearestAmbulance.driver_name}) is <b>{nearestAmbulance.distance_km.toFixed(2)} km</b> away.
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', padding: '0.4rem', borderRadius: '6px', color: '#c2410c', fontSize: '0.75rem' }}>
                        <AlertTriangle size={14} />
                        <span>No available ambulances in Gwadar online.</span>
                      </div>
                    )
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Ambulance Unit</label>
                      <select
                        className="form-input"
                        style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        value={manualAmbulanceId}
                        onChange={e => setManualAmbulanceId(e.target.value)}
                      >
                        <option value="">Select unit...</option>
                        {ambulances.map(amb => {
                          const busy = isAmbulanceBusy(amb.id);
                          const isDisabled = (amb.status !== 'Available' || busy) && amb.id !== selectedRequest?.assigned_ambulance_id;
                          return (
                            <option key={amb.id} value={amb.id} disabled={isDisabled}>
                              {amb.vehicle_number} ({amb.model || 'No Model'}){busy ? ' (On Trip)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Assigned Driver</label>
                      <select
                        className="form-input"
                        style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        value={selectedDriverId}
                        onChange={e => setSelectedDriverId(e.target.value)}
                      >
                        <option value="">Select driver...</option>
                        {drivers.map(drv => {
                          const busy = isDriverBusy(drv.id);
                          const isDisabled = busy && drv.id !== selectedRequest?.assigned_driver_id;
                          return (
                            <option key={drv.id} value={drv.id} disabled={isDisabled}>
                              {drv.name}{busy ? ' (On Trip)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Target Hospital</label>
                      <select
                        className="form-input"
                        style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        value={selectedHospitalId}
                        onChange={e => setSelectedHospitalId(e.target.value)}
                      >
                        <option value="">Select hospital...</option>
                        {hospitals.map(hosp => (
                          <option key={hosp.id} value={hosp.id} disabled={hosp.available_beds === 0 && hosp.id !== selectedRequest.assigned_hospital_id}>
                            {hosp.name} (Beds: {hosp.available_beds})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isEditingAssignment ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setIsEditingAssignment(false)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await handleAssign();
                          setIsEditingAssignment(false);
                        }}
                        className="btn btn-danger"
                        style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                        disabled={!manualAmbulanceId}
                      >
                        🔄 Update Assignment
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAssign}
                      className="btn btn-danger"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                      disabled={!manualAmbulanceId}
                    >
                      🚀 Confirm Dispatch
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  
                  {/* Allocation Summary Card */}
                  <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>AMBULANCE</span>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ambulances.find(a => a.id === selectedRequest.assigned_ambulance_id)?.vehicle_number || 'N/A'}
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>DRIVER</span>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {drivers.find(d => d.id === selectedRequest.assigned_driver_id)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>HOSPITAL</span>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hospitals.find(h => h.id === selectedRequest.assigned_hospital_id)?.name || 'None'}
                      </strong>
                    </div>
                  </div>

                  {/* Reassignment Trigger */}
                  <button
                    onClick={() => {
                      setManualAmbulanceId(selectedRequest.assigned_ambulance_id || '');
                      setSelectedDriverId(selectedRequest.assigned_driver_id || '');
                      setSelectedHospitalId(selectedRequest.assigned_hospital_id || '');
                      setIsEditingAssignment(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '-0.2rem' }}
                  >
                    ✏️ Edit Assignment (Driver / Ambulance Swap)
                  </button>

                  {/* Citizen Verification & Resolve Console */}
                  {selectedRequest.status === 'Completed - Awaiting Verification' && (
                    <div style={{ 
                      background: 'rgba(239, 68, 68, 0.02)', 
                      border: '1px dashed var(--primary-red)', 
                      borderRadius: '8px', 
                      padding: '0.75rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem',
                      marginTop: '0.25rem' 
                    }}>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Citizen Agreement Status:</span>
                        {selectedRequest.citizen_agreement === 'Agreed' ? (
                          <span style={{ color: 'var(--primary-green)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            ✅ Agreed
                          </span>
                        ) : selectedRequest.citizen_agreement === 'Disputed' ? (
                          <span style={{ color: 'var(--primary-red)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            ⚠️ DISPUTED / Disagreed
                          </span>
                        ) : (
                          <span style={{ color: 'var(--primary-orange)', fontWeight: 'bold' }}>
                            ⏳ Awaiting Response
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleResolveAndComplete}
                        className="btn btn-danger"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.82rem', fontWeight: 'bold', borderRadius: '6px' }}
                      >
                        ✓ Resolve & Complete Case
                      </button>
                    </div>
                  )}

                  {/* voice note player */}
                  {selectedRequest.voice_recordings && selectedRequest.voice_recordings.length > 0 && (
                    <div style={{ padding: '0.5rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#0369a1', display: 'block', marginBottom: '0.25rem' }}>
                        🎙 Citizen Voice Message:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {selectedRequest.voice_recordings.map((rec, idx) => (
                          <audio key={rec.id || idx} src={rec.audioData} controls style={{ width: '100%', height: '28px' }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Reassurance Chat Box */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', height: '160px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-blue)', display: 'block', marginBottom: '0.3rem' }}>
                      💬 Chat Timeline
                    </span>
                    
                    <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.4rem' }}>
                      {selectedRequest.chat_history && selectedRequest.chat_history.length > 0 ? (
                        selectedRequest.chat_history.map(msg => (
                          <div key={msg.id} style={{ alignSelf: msg.sender === 'dispatcher' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                            <div style={{ 
                              background: msg.sender === 'dispatcher' ? 'var(--primary-blue)' : '#e2e8f0',
                              color: msg.sender === 'dispatcher' ? 'white' : 'var(--text-primary)',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              lineHeight: '1.2'
                            }}>
                              {msg.text}
                            </div>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.05rem', textAlign: msg.sender === 'dispatcher' ? 'right' : 'left' }}>
                              {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', margin: 'auto' }}>
                          No chat history yet.
                        </div>
                      )}
                    </div>

                    <form onSubmit={sendDispChatMessage} style={{ display: 'flex', gap: '0.3rem' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginBottom: 0, flex: 1 }} 
                        placeholder="Type a message..." 
                        value={dispChatInput} 
                        onChange={e => setDispChatInput(e.target.value)} 
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} disabled={!dispChatInput.trim()}>
                        Send
                      </button>
                    </form>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Fleet Status & Hospitals Capacity */}
        <div className="dashboard-sidebar glass-panel dashboard-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: '0.75rem' }}>
          
          {/* Fleet Status Card */}
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '50%' }}>
            <div className="panel-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.25rem' }}>
              <h2 className="panel-title" style={{ color: 'var(--primary-green)', fontSize: '0.95rem' }}>
                🚑 Fleet Status
              </h2>
              <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                {ambulances.filter(a => a.status === 'Available').length} Available
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, paddingRight: '0.1rem' }}>
              {ambulances.map(amb => {
                let badgeClass = 'badge-green';
                if (amb.status === 'On Duty' || amb.status === 'En Route') badgeClass = 'badge-orange';
                if (amb.status === 'Reached Patient') badgeClass = 'badge-red';
                if (amb.status === 'At Hospital') badgeClass = 'badge-blue';
                
                return (
                  <div key={amb.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: '0.25rem' }}>
                      <strong style={{ fontSize: '0.8rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{amb.vehicle_number}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{amb.driver_name}</span>
                    </div>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}>{amb.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hospitals capacity overview */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="panel-header" style={{ marginBottom: '0.4rem', paddingBottom: '0.25rem' }}>
              <h2 className="panel-title" style={{ color: 'var(--primary-blue)', fontSize: '0.95rem' }}>
                🏥 Gwadar Hospitals
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, paddingRight: '0.1rem' }}>
              {hospitals.map(hosp => (
                <div key={hosp.id} style={{ padding: '0.45rem 0.5rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', position: 'relative' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#0284c7', display: 'block', lineHeight: '1.2', paddingRight: '42px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hosp.name}</strong>

                  {/* Bed Capacity Quick Adjustments */}
                  <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}>
                    <button 
                      onClick={() => handleAdjustBeds(hosp.id, 1)} 
                      style={{ width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', fontWeight: 'bold' }}
                      title="Add Available Bed"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => handleAdjustBeds(hosp.id, -1)} 
                      style={{ width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', fontWeight: 'bold' }}
                      disabled={hosp.available_beds === 0}
                      title="Remove Available Bed"
                    >
                      -
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                    <span style={{ color: hosp.available_beds > 2 ? 'var(--text-secondary)' : 'var(--primary-orange)' }}>
                      🛏️ Beds: <b>{hosp.available_beds}</b> / {hosp.total_beds}
                    </span>
                    <span style={{ color: hosp.icu_ventilators > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>
                      💨 ICU: <b>{hosp.icu_ventilators}</b>
                    </span>
                  </div>

                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📞 {hosp.contact_number}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
