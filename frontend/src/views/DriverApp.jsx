import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Power, MapPin, User, Phone, CheckCircle, Navigation, Play, Eye, ShieldAlert, HeartPulse, Activity, ChevronDown, ChevronUp, Radio, Truck } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Math initial bearing calculator
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Advanced Grid Route Generator: creates L-shaped street grid turns
function generateRoutePoints(startLat, startLng, endLat, endLng, steps = 40) {
  const points = [];
  const midStep = Math.floor(steps / 2);
  
  // Phase 1: Move along Latitude (North/South) to intermediate corner
  for (let i = 0; i <= midStep; i++) {
    const ratio = i / midStep;
    const lat = startLat + (endLat - startLat) * ratio;
    points.push({ lat, lng: startLng });
  }
  
  // Phase 2: Move along Longitude (East/West) to destination
  for (let i = 1; i <= (steps - midStep); i++) {
    const ratio = i / (steps - midStep);
    const lng = startLng + (endLng - startLng) * ratio;
    points.push({ lat: endLat, lng });
  }
  
  return points;
}

export default function DriverApp({ token, currentUser, ambulances, hospitals, requests, triggerFetch }) {
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('');
  const [vitalsExpanded, setVitalsExpanded] = useState(true);

  // Patient Vitals Form State (ePCR telemetry)
  const [heartRate, setHeartRate] = useState(80);
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [spo2, setSpo2] = useState(98);
  const [condition, setCondition] = useState('Stable');
  const [telemetrySuccess, setTelemetrySuccess] = useState(false);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Advanced States
  const [isAutoTelemetry, setIsAutoTelemetry] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);

  const simIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const currentAmbulance = ambulances.find(a => a.id === selectedAmbulanceId);

  // Web Audio Synthesizer for Ambulance Siren Sound (soft 0.02 gain)
  const startSirenSynthesizer = () => {
    try {
      if (audioCtxRef.current) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.02, ctx.currentTime); // Low volume

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      sirenOscRef.current = osc;

      let wobble = false;
      sirenIntervalRef.current = setInterval(() => {
        if (!sirenOscRef.current) return;
        sirenOscRef.current.frequency.linearRampToValueAtTime(
          wobble ? 850 : 550,
          ctx.currentTime + 0.35
        );
        wobble = !wobble;
      }, 400);
    } catch (e) {
      console.warn("Failed to initialize siren synthesizer:", e);
    }
  };

  const stopSirenSynthesizer = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (sirenOscRef.current) {
      try { sirenOscRef.current.stop(); } catch (e) {}
      sirenOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const toggleSiren = () => {
    const nextSiren = !sirenActive;
    setSirenActive(nextSiren);

    // Broadcast siren state to dispatcher and map instantly
    if (socket && isOnline) {
      socket.emit('driver:location-update', {
        ambulanceId: selectedAmbulanceId,
        latitude: currentAmbulance ? currentAmbulance.latitude : 25.1219,
        longitude: currentAmbulance ? currentAmbulance.longitude : 62.3254,
        bearing: currentAmbulance ? currentAmbulance.bearing : 0,
        status: currentAmbulance ? currentAmbulance.status : 'Available',
        siren: nextSiren
      });
    }

    if (nextSiren) {
      startSirenSynthesizer();
    } else {
      stopSirenSynthesizer();
    }
  };

  const sendTelemetryData = async (hr, bp, sp, cond) => {
    if (!activeJob) return;
    try {
      await fetch(`${BACKEND_URL}/api/requests/${activeJob.id}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          heart_rate: hr,
          blood_pressure: bp,
          spo2: sp,
          condition: cond
        })
      });
    } catch (err) {
      console.error('Failed to auto-transmit vitals:', err);
    }
  };

  // Bind vehicle selection and go online automatically based on logged-in driver profile
  useEffect(() => {
    if (currentUser?.ambulance_id) {
      setSelectedAmbulanceId(currentUser.ambulance_id);
      setIsOnline(true);
    }
  }, [currentUser]);

  // Synchronize active job if request list updates
  useEffect(() => {
    if (selectedAmbulanceId && requests.length > 0) {
      const job = requests.find(
        r => r.assigned_ambulance_id === selectedAmbulanceId && r.status !== 'Completed'
      );
      setActiveJob(job || null);
    } else {
      setActiveJob(null);
    }
  }, [requests, selectedAmbulanceId]);

  // Auto-Telemetry generation loop
  useEffect(() => {
    if (!isAutoTelemetry || !activeJob || activeJob.status !== 'Reached Patient') {
      return;
    }

    const telemetryInterval = setInterval(() => {
      const deltaHr = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const deltaSpo2 = Math.floor(Math.random() * 3) - 1; // -1 to +1

      setHeartRate(prev => {
        const next = Math.max(50, Math.min(150, parseInt(prev) + deltaHr));
        setSpo2(s => {
          const nextS = Math.max(70, Math.min(100, parseInt(s) + deltaSpo2));
          const sys = 120 + Math.floor(Math.random() * 9) - 4;
          const dia = 80 + Math.floor(Math.random() * 5) - 2;
          const bp = `${sys}/${dia}`;
          setBloodPressure(bp);

          let nextCond = 'Stable';
          if (nextS < 90 || next > 120) {
            nextCond = 'Critical';
          } else if (nextS < 95 || next > 100) {
            nextCond = 'Guarded';
          }
          setCondition(nextCond);

          sendTelemetryData(next, bp, nextS, nextCond);
          return nextS;
        });
        return next;
      });
    }, 2500);

    return () => {
      clearInterval(telemetryInterval);
    };
  }, [isAutoTelemetry, activeJob?.id, activeJob?.status]);

  // WebSockets setup
  useEffect(() => {
    if (!selectedAmbulanceId || !isOnline) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      stopSirenSynthesizer();
      setSirenActive(false);
      return;
    }

    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Driver socket connected for ambulance ${selectedAmbulanceId}:`, newSocket.id);
      if (currentAmbulance) {
        newSocket.emit('driver:location-update', {
          ambulanceId: selectedAmbulanceId,
          latitude: currentAmbulance.latitude,
          longitude: currentAmbulance.longitude,
          bearing: currentAmbulance.bearing,
          status: 'Available',
          siren: sirenActive
        });
      }
    });

    newSocket.on(`driver:assigned:${selectedAmbulanceId}`, (payload) => {
      setActiveJob(payload.request);
      triggerFetch();
    });

    newSocket.on('system:reset', () => {
      setIsOnline(false);
      setActiveJob(null);
      setSelectedAmbulanceId('');
      stopSirenSynthesizer();
      setSirenActive(false);
      setIsAutoTelemetry(false);
    });

    return () => {
      newSocket.disconnect();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      stopSirenSynthesizer();
    };
  }, [selectedAmbulanceId, isOnline, currentAmbulance]);

  const handleToggleDuty = () => {
    if (!selectedAmbulanceId) return;

    if (isOnline) {
      if (socket && currentAmbulance) {
        socket.emit('driver:location-update', {
          ambulanceId: selectedAmbulanceId,
          latitude: currentAmbulance.latitude,
          longitude: currentAmbulance.longitude,
          status: 'Available',
          siren: false
        });
      }
      setIsOnline(false);
      setActiveJob(null);
      stopSirenSynthesizer();
      setSirenActive(false);
      setIsAutoTelemetry(false);
    } else {
      setIsOnline(true);
    }
    triggerFetch();
  };

  const updateServerLocation = (lat, lng, bearing, status) => {
    if (socket && isOnline) {
      socket.emit('driver:location-update', {
        ambulanceId: selectedAmbulanceId,
        latitude: lat,
        longitude: lng,
        bearing: bearing,
        status: status || currentAmbulance.status,
        siren: sirenActive
      });
    }
  };

  const updateJobStatus = async (status) => {
    if (!activeJob) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${activeJob.id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) triggerFetch();
    } catch (err) {
      console.error('Failed to update job status:', err);
    }
  };

  // Submit ePCR Patient Telemetry vitals to server
  const handleSendTelemetry = async (e) => {
    e.preventDefault();
    if (!activeJob) return;

    setTelemetryLoading(true);
    setTelemetrySuccess(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${activeJob.id}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          heart_rate: heartRate,
          blood_pressure: bloodPressure,
          spo2: spo2,
          condition
        })
      });

      if (response.ok) {
        setTelemetrySuccess(true);
        setTimeout(() => setTelemetrySuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send vitals telemetry:', err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  // ADVANCED GPS SIMULATOR ENGINE (Grid navigation + Turn instructions)
  const startSimulation = (destLat, destLng, targetStatus, onFinished) => {
    if (!currentAmbulance) return;
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    setIsSimulating(true);

    const startLat = currentAmbulance.latitude;
    const startLng = currentAmbulance.longitude;

    const steps = 40; // 40 steps for smoother turns
    const routePoints = generateRoutePoints(startLat, startLng, destLat, destLng, steps);
    const midStep = Math.floor(steps / 2);

    let currentStep = 0;
    const intervalMs = 250; // ~10s total duration

    simIntervalRef.current = setInterval(() => {
      if (currentStep >= routePoints.length) {
        clearInterval(simIntervalRef.current);
        setIsSimulating(false);
        setSimulationStatus('');
        // Snap to destination and update
        updateServerLocation(destLat, destLng, calculateBearing(startLat, startLng, destLat, destLng), targetStatus);
        if (onFinished) onFinished();
        return;
      }

      const currentPt = routePoints[currentStep];
      const nextPt = routePoints[currentStep + 1] || currentPt;
      const bearing = calculateBearing(currentPt.lat, currentPt.lng, nextPt.lat, nextPt.lng);

      // Generate dynamic Turn-by-Turn Instruction based on steps
      let hudMsg = "";
      if (currentStep < midStep - 3) {
        hudMsg = targetStatus === 'Reached Patient' 
          ? "Head North on Airport Link Road towards patient..."
          : "Proceed North towards emergency hospital intake...";
      } else if (currentStep >= midStep - 3 && currentStep <= midStep + 2) {
        hudMsg = "Turn right onto Gwadar Harbour Expressway...";
      } else if (currentStep > midStep + 2 && currentStep < steps - 3) {
        hudMsg = "Drive straight towards destination gate...";
      } else {
        hudMsg = "Approaching destination. Slowing down...";
      }

      setSimulationStatus(hudMsg);
      updateServerLocation(currentPt.lat, currentPt.lng, bearing, currentAmbulance.status);
      currentStep++;
    }, intervalMs);
  };

  const handleStartEnRoute = () => {
    if (!activeJob) return;
    updateJobStatus('En Route');
    startSimulation(activeJob.latitude, activeJob.longitude, 'Reached Patient', () => {
      updateJobStatus('Reached Patient');
    });
  };

  const handleTransportToHospital = () => {
    if (!activeJob || !activeJob.assigned_hospital_id) return;
    const hospital = hospitals.find(h => h.id === activeJob.assigned_hospital_id);
    if (!hospital) return;

    updateJobStatus('At Hospital');
    startSimulation(hospital.latitude, hospital.longitude, 'At Hospital', () => {
      // Finished
    });
  };

  const handleCompleteCase = () => {
    if (!activeJob) return;
    updateJobStatus('Completed');
    setActiveJob(null);
    triggerFetch();
  };

  return (
    <div className="view-container" style={{ padding: '1rem', maxWidth: '100%', margin: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', minHeight: 'calc(100vh - 90px)' }}>
        
        {/* Left Column: Driver Control Panel */}
        <div className="dashboard-sidebar" style={{ gap: '1rem' }}>
          
          {/* 🚨 Driver Terminal Header & Profile */}
          <div className="glass-panel dashboard-panel" style={{ height: 'auto', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="panel-header" style={{ marginBottom: 0, paddingBottom: '0.5rem' }}>
              <h2 className="panel-title" style={{ color: 'var(--primary-orange)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Truck size={20} /> Driver Terminal
              </h2>
              {isOnline ? (
                <span className="badge badge-green pulse-icon" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-green)', display: 'inline-block' }}></span>
                  Online
                </span>
              ) : (
                <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--primary-red)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  Offline
                </span>
              )}
            </div>

            {/* Vehicle locking info */}
            {currentUser?.ambulance_id ? (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(2, 132, 199, 0.02) 100%)', 
                border: '1px solid rgba(2, 132, 199, 0.15)', 
                padding: '0.75rem 1rem', 
                borderRadius: '12px', 
                fontSize: '0.85rem', 
                color: '#0369a1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Vehicle: <span style={{ fontWeight: 800 }}>{currentAmbulance?.vehicle_number || 'AMB-01'}</span></p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>Driver: <b>{currentUser.name}</b></p>
                </div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(2, 132, 199, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-blue)'
                }}>
                  <User size={16} />
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Choose Vehicle</label>
                <select
                  className="form-input"
                  value={selectedAmbulanceId}
                  onChange={e => {
                    setSelectedAmbulanceId(e.target.value);
                    setIsOnline(false);
                    setActiveJob(null);
                  }}
                  disabled={isOnline}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="">Choose vehicle...</option>
                  {ambulances.map(amb => (
                    <option key={amb.id} value={amb.id}>
                      {amb.vehicle_number} - {amb.driver_name} ({amb.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Online/Offline and Siren Quick Toggles */}
            {selectedAmbulanceId && (
              <div style={{ display: 'grid', gridTemplateColumns: isOnline ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                <button
                  onClick={handleToggleDuty}
                  className={`btn ${isOnline ? 'btn-danger' : 'btn-success'}`}
                  style={{ 
                    padding: '0.6rem 1rem', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.4rem',
                    borderRadius: '10px',
                    boxShadow: isOnline ? '0 4px 10px rgba(239, 68, 68, 0.15)' : '0 4px 10px rgba(22, 163, 74, 0.15)'
                  }}
                >
                  <Power size={15} />
                  {isOnline ? 'End Duty' : 'Go Online'}
                </button>

                {isOnline && (
                  <button
                    onClick={toggleSiren}
                    className={`btn ${sirenActive ? 'pulse-red-glow' : 'btn-secondary'}`}
                    style={{ 
                      padding: '0.6rem 1rem', 
                      fontSize: '0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.4rem',
                      borderRadius: '10px',
                      backgroundColor: sirenActive ? 'var(--primary-red)' : '#f8fafc',
                      color: sirenActive ? 'white' : 'var(--text-primary)',
                      border: sirenActive ? 'none' : '1px solid var(--border-color)',
                      fontWeight: 'bold',
                      boxShadow: sirenActive ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none'
                    }}
                  >
                    <span>🚨</span>
                    {sirenActive ? 'Mute Siren' : 'Siren'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Dispatch details */}
          {isOnline && activeJob ? (
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'white', borderLeft: '4px solid var(--primary-orange)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: 'var(--primary-orange)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⚡ Emergency Dispatch
                </h4>
                <span className="badge badge-red" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                  {activeJob.emergency_type}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeJob.citizen_name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <a href={`tel:${activeJob.citizen_phone}`} style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 600 }}>
                      {activeJob.citizen_phone}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.4rem', marginTop: '0.1rem' }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '0.1rem', flexShrink: 0 }} />
                    <span style={{ lineHeight: '1.3' }}>📍 <b>{activeJob.location_name}</b></span>
                  </div>
                </div>
              </div>

              {/* Progress workflow stepper & buttons */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                {activeJob.status === 'Assigned' && (
                  <button
                    onClick={handleStartEnRoute}
                    disabled={isSimulating}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem', borderRadius: '8px', fontWeight: 700 }}
                  >
                    <Navigation size={15} style={{ transform: 'rotate(45deg)' }} /> Start Driving
                  </button>
                )}

                {activeJob.status === 'En Route' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    color: 'var(--primary-orange)', 
                    textAlign: 'center', 
                    fontSize: '0.85rem', 
                    padding: '0.6rem',
                    background: 'rgba(249, 115, 22, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(249, 115, 22, 0.15)',
                    fontWeight: 600
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-orange)' }} className="pulse-icon"></div>
                    En Route (Driving)...
                  </div>
                )}

                {activeJob.status === 'Reached Patient' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      🏥 Hospital: <b>{hospitals.find(h => h.id === activeJob.assigned_hospital_id)?.name || 'None Assigned'}</b>
                    </div>
                    <button
                      onClick={handleTransportToHospital}
                      disabled={isSimulating}
                      className="btn btn-success"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem', borderRadius: '8px', fontWeight: 700 }}
                    >
                      🚑 Transport to Hospital
                    </button>
                  </div>
                )}

                {activeJob.status === 'At Hospital' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'rgba(22, 163, 74, 0.05)', 
                      border: '1px solid rgba(22, 163, 74, 0.15)', 
                      borderRadius: '8px', 
                      color: 'var(--primary-green)', 
                      fontSize: '0.8rem', 
                      fontWeight: 600, 
                      textAlign: 'center' 
                    }}>
                      🏥 Arrived at Hospital Intake
                    </div>
                    <button
                      onClick={handleCompleteCase}
                      className="btn btn-danger"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem', borderRadius: '8px', fontWeight: 700 }}
                    >
                      ✓ Complete Case
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : isOnline ? (
            /* Standby radar style */
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem 1rem', 
              background: 'white', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)', 
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="pulse-ring" style={{ borderColor: 'var(--primary-green)', borderWidth: '2px' }}></div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)' }}>
                  <Activity size={18} className="pulse-icon" />
                </div>
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Standing By...</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', maxWidth: '220px' }}>
                Ready for dispatch.
              </p>
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', borderRadius: '16px', background: 'white' }}>
              Select vehicle and click <b>Go Online</b> to start receiving dispatch jobs.
            </div>
          )}

          {/* 🩺 Patient Vitals ePCR Telemetry Form (Collapsible Accordion) */}
          {isOnline && activeJob && (activeJob.status === 'Reached Patient' || activeJob.status === 'At Hospital') && (
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '16px', background: 'white' }}>
              <button 
                onClick={() => setVitalsExpanded(!vitalsExpanded)}
                style={{ 
                  width: '100%', 
                  background: 'none', 
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <h3 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  color: 'var(--primary-red)',
                  margin: 0
                }}>
                  <HeartPulse size={16} /> Patient Vitals
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isAutoTelemetry && (
                    <span className="badge badge-green pulse-icon" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                      Auto-Streaming
                    </span>
                  )}
                  {vitalsExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </button>

              {vitalsExpanded && (
                <div style={{ marginTop: '0.85rem', animation: 'slideIn 0.2s ease-out' }}>
                  {telemetrySuccess && (
                    <div className="alert-banner alert-banner-success" style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', marginBottom: '0.75rem', borderRadius: '6px' }}>
                      ✓ Vitals successfully transmitted to hospital!
                    </div>
                  )}

                  {/* Auto vital simulator toggle switch */}
                  <div style={{ 
                    marginBottom: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.4rem 0.6rem', 
                    borderRadius: '8px', 
                    background: isAutoTelemetry ? 'rgba(22, 163, 74, 0.05)' : '#f8fafc', 
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ fontWeight: 700, color: isAutoTelemetry ? 'var(--primary-green)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isAutoTelemetry && <Radio size={12} className="pulse-icon" />}
                      {isAutoTelemetry ? 'Live Streaming' : 'Simulate Telemetry'}
                    </span>
                    <input 
                      type="checkbox" 
                      checked={isAutoTelemetry} 
                      onChange={e => setIsAutoTelemetry(e.target.checked)} 
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>

                  <form onSubmit={handleSendTelemetry} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>Heart Rate</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '0.4rem', fontSize: '0.8rem', opacity: isAutoTelemetry ? 0.75 : 1 }} 
                          value={heartRate} 
                          onChange={e => setHeartRate(e.target.value)} 
                          disabled={isAutoTelemetry} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>Blood Pressure</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '0.4rem', fontSize: '0.8rem', opacity: isAutoTelemetry ? 0.75 : 1 }} 
                          value={bloodPressure} 
                          onChange={e => setBloodPressure(e.target.value)} 
                          disabled={isAutoTelemetry} 
                          required 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>Oxygen (SpO2)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ padding: '0.4rem', fontSize: '0.8rem', opacity: isAutoTelemetry ? 0.75 : 1 }} 
                          value={spo2} 
                          onChange={e => setSpo2(e.target.value)} 
                          disabled={isAutoTelemetry} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>Condition</label>
                        <select 
                          className="form-input" 
                          style={{ padding: '0.4rem', fontSize: '0.8rem', opacity: isAutoTelemetry ? 0.75 : 1 }} 
                          value={condition} 
                          onChange={e => setCondition(e.target.value)} 
                          disabled={isAutoTelemetry}
                        >
                          <option value="Stable">Stable</option>
                          <option value="Guarded">Guarded</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        fontSize: '0.8rem', 
                        marginTop: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        borderRadius: '8px'
                      }} 
                      disabled={telemetryLoading || isAutoTelemetry}
                    >
                      <Activity size={12} /> {isAutoTelemetry ? 'Auto-Syncing' : 'Send Vitals'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Driver Map view with Floating GPS HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
          <MapComponent
            ambulances={currentAmbulance ? [currentAmbulance] : []}
            requests={activeJob ? [activeJob] : []}
            hospitals={hospitals}
            selectedRequestId={activeJob?.id}
            showRoutes={true}
          />
          {isSimulating && (
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              right: '15px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              color: 'white',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease-out'
            }}>
              <div style={{
                background: 'rgba(56, 189, 248, 0.1)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                flexShrink: 0
              }}>
                <Navigation size={20} className="pulse-icon" style={{ transform: 'rotate(45deg)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Navigation
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    Live
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#f1f5f9', marginTop: '0.15rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {simulationStatus || "Calculating route..."}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
