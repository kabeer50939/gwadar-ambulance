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


// Live ECG wave generator for patient vitals telemetry
function ECGMonitor({ heartRate }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear once at start
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 15) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }
    };

    const points = [];
    let phase = 0;
    
    const tick = () => {
      if (!canvasRef.current) return;
      const bpm = parseInt(heartRate) || 80;
      const interval = Math.max(20, Math.floor(3600 / bpm));
      phase++;
      
      let targetY = height / 2;
      const t = phase % interval;
      
      // Generate QRS complex shape
      if (t < 5) {
        // Flat baseline
      } else if (t < 8) {
        // P wave
        targetY -= 5 * Math.sin(((t - 5) / 3) * Math.PI);
      } else if (t < 11) {
        // Flat
      } else if (t === 11) {
        // Q drop
        targetY += 3;
      } else if (t === 12 || t === 13) {
        // R peak
        targetY -= 25;
      } else if (t === 14 || t === 15) {
        // S drop
        targetY += 10;
      } else if (t < 18) {
        // Flat
      } else if (t < 23) {
        // T wave
        targetY -= 7 * Math.sin(((t - 18) / 5) * Math.PI);
      }
      
      points.push({ x, y: targetY });
      if (points.length > width) {
        points.shift();
        points.forEach((p, idx) => p.x = idx);
      } else {
        x++;
      }
      
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);
      drawGrid();
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#10b981';
      ctx.beginPath();
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      animationId = requestAnimationFrame(tick);
    };
    
    tick();
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [heartRate]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={80} 
      style={{ 
        width: '100%', 
        height: '80px', 
        borderRadius: '6px', 
        background: '#090d16',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.8)'
      }} 
    />
  );
}

// Standby Radar Component
function RadarScan() {
  return (
    <div style={{
      position: 'relative',
      width: '180px',
      height: '180px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #0b1329 0%, #050814 100%)',
      border: '2px solid rgba(16, 185, 129, 0.25)',
      boxShadow: '0 0 20px rgba(16, 185, 129, 0.1), inset 0 0 15px rgba(16, 185, 129, 0.05)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto'
    }}>
      <div style={{
        position: 'absolute',
        width: '50%',
        height: '50%',
        background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.35) 0%, transparent 100%)',
        top: 0,
        left: 0,
        transformOrigin: 'bottom right',
        animation: 'radar-sweep-anim 4s linear infinite',
        borderRight: '1px solid rgba(16, 185, 129, 0.5)'
      }} />
      
      <div style={{ position: 'absolute', width: '80%', height: '80%', borderRadius: '50%', border: '1px dashed rgba(16, 185, 129, 0.12)' }} />
      <div style={{ position: 'absolute', width: '55%', height: '55%', borderRadius: '50%', border: '1px dashed rgba(16, 185, 129, 0.12)' }} />
      <div style={{ position: 'absolute', width: '30%', height: '30%', borderRadius: '50%', border: '1px dashed rgba(16, 185, 129, 0.12)' }} />
      
      <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(16, 185, 129, 0.08)' }} />
      <div style={{ position: 'absolute', width: '1px', height: '100%', background: 'rgba(16, 185, 129, 0.08)' }} />
      
      <div style={{
        position: 'absolute',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#10b981',
        top: '25%',
        left: '42%',
        boxShadow: '0 0 8px #10b981',
        animation: 'radar-blip-anim 3s ease-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        backgroundColor: '#0284c7',
        top: '70%',
        left: '68%',
        boxShadow: '0 0 8px #0284c7',
        animation: 'radar-blip-anim 3s ease-out infinite',
        animationDelay: '1.2s'
      }} />
      <div style={{
        position: 'absolute',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        backgroundColor: '#f97316',
        top: '60%',
        left: '20%',
        boxShadow: '0 0 8px #f97316',
        animation: 'radar-blip-anim 3s ease-out infinite',
        animationDelay: '2.1s'
      }} />

      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        zIndex: 2,
        boxShadow: '0 0 10px #ef4444'
      }} />

      <style>{`
        @keyframes radar-sweep-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-blip-anim {
          0% { opacity: 0; }
          12% { opacity: 1; }
          85% { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}


export default function DriverApp({ token, currentUser, ambulances, hospitals, requests, triggerFetch, showMapModal, setShowMapModal }) {
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(currentUser?.ambulance_id || '');
  const lastCoordsRef = useRef({ lat: 0, lng: 0, status: '' });
  const [isOnline, setIsOnline] = useState(true);
  const [gpsError, setGpsError] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [socket, setSocket] = useState(null);
  const [vitalsExpanded, setVitalsExpanded] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Patient Vitals Form State (ePCR telemetry)
  const [heartRate, setHeartRate] = useState(80);
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [spo2, setSpo2] = useState(98);
  const [condition, setCondition] = useState('Stable');
  const [telemetrySuccess, setTelemetrySuccess] = useState(false);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Advanced States
  const [sirenActive, setSirenActive] = useState(false);

  const simIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const currentAmbulance = ambulances.find(a => 
    a.id === selectedAmbulanceId || 
    (a.vehicle_number && selectedAmbulanceId && a.vehicle_number.trim().toLowerCase() === selectedAmbulanceId.trim().toLowerCase())
  );

  const currentAmbulanceRef = useRef(currentAmbulance);
  useEffect(() => {
    currentAmbulanceRef.current = currentAmbulance;
  }, [currentAmbulance]);

  // Auto-Siren based on active job status progression
  useEffect(() => {
    if (!activeJob) {
      if (sirenActive) {
        setSirenActive(false);
        stopSirenSynthesizer();
      }
      return;
    }
    
    const shouldSirenBeActive = activeJob.status === 'En Route' || activeJob.status === 'At Hospital';
    if (shouldSirenBeActive !== sirenActive) {
      setSirenActive(shouldSirenBeActive);
      if (shouldSirenBeActive) {
        startSirenSynthesizer();
        if (socket && isOnline) {
          socket.emit('driver:location-update', {
            ambulanceId: selectedAmbulanceId,
            latitude: currentAmbulance ? currentAmbulance.latitude : 25.1219,
            longitude: currentAmbulance ? currentAmbulance.longitude : 62.3254,
            bearing: currentAmbulance ? currentAmbulance.bearing : 0,
            status: activeJob.status,
            siren: true
          });
        }
      } else {
        stopSirenSynthesizer();
        if (socket && isOnline) {
          socket.emit('driver:location-update', {
            ambulanceId: selectedAmbulanceId,
            latitude: currentAmbulance ? currentAmbulance.latitude : 25.1219,
            longitude: currentAmbulance ? currentAmbulance.longitude : 62.3254,
            bearing: currentAmbulance ? currentAmbulance.bearing : 0,
            status: activeJob.status,
            siren: false
          });
        }
      }
    }
  }, [activeJob?.status, isOnline]);

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

  // Synchronize active job if request list updates
  useEffect(() => {
    const job = requests.find(
      r => r.assigned_driver_id === currentUser.id && 
      r.status !== 'Completed'
    );
    setActiveJob(job || null);
    if (job && job.assigned_ambulance_id) {
      setSelectedAmbulanceId(job.assigned_ambulance_id);
    } else if (isOnline) {
      setSelectedAmbulanceId(currentUser.ambulance_id || '');
    } else {
      setSelectedAmbulanceId('');
    }
  }, [requests, currentUser.id, currentUser.ambulance_id, isOnline]);


  // Sync ambulance location on mount / socket connect / ambulances load
  useEffect(() => {
    if (!socket || !selectedAmbulanceId || !currentAmbulance) return;
    
    const status = activeJob ? activeJob.status : (currentAmbulance.status || 'Available');
    console.log("Syncing driver location on socket connection/load:", currentAmbulance.latitude, currentAmbulance.longitude, "Status:", status);
    
    socket.emit('driver:location-update', {
      ambulanceId: selectedAmbulanceId,
      driverId: currentUser.id,
      latitude: parseFloat(currentAmbulance.latitude) || 25.1225,
      longitude: parseFloat(currentAmbulance.longitude) || 62.3210,
      bearing: currentAmbulance.bearing || 0,
      status: status,
      siren: sirenActive
    });
  }, [socket, selectedAmbulanceId, !!currentAmbulance, activeJob?.status]);



  // Continuous driver GPS watch when driver is online
  useEffect(() => {
    if (!isOnline || !selectedAmbulanceId) {
      return;
    }

    if (!navigator.geolocation) {
      console.warn("Geolocation not supported for driver tracking");
      setGpsError(true);
      return;
    }

    console.log("Starting continuous GPS watch for driver...");
    let activeWatchId = null;

    const startWatch = (highAccuracy) => {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setGpsError(false);
          const { latitude, longitude } = position.coords;
          const status = activeJob?.status || 'Available';
          
          const latDiff = Math.abs(latitude - lastCoordsRef.current.lat);
          const lngDiff = Math.abs(longitude - lastCoordsRef.current.lng);
          const statusChanged = status !== lastCoordsRef.current.status;

          // Only stream to server if coordinates changed by a minimal threshold or status changed
          if (latDiff > 0.00002 || lngDiff > 0.00002 || statusChanged) {
            lastCoordsRef.current = { lat: latitude, lng: longitude, status };
            console.log("Driver moved. Streaming coordinates:", latitude, longitude);
            updateServerLocation(latitude, longitude, undefined, status);
          }
        },
        (err) => {
          console.warn("Driver watchPosition error, retrying with low accuracy...", err);
          setGpsError(true);
          if (highAccuracy) {
            navigator.geolocation.clearWatch(id);
            activeWatchId = startWatch(false);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 3000 : 10000, maximumAge: 0 }
      );
      return id;
    };

    activeWatchId = startWatch(true);

    return () => {
      console.log("Stopping driver GPS watch...");
      if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
      }
    };
  }, [isOnline, selectedAmbulanceId, activeJob?.status]);


  // WebSockets setup
  useEffect(() => {
    if (!isOnline) {
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
      console.log(`Driver socket connected for driver ${currentUser.id}:`, newSocket.id);
    });

    newSocket.on(`driver:assigned:${currentUser.id}`, (payload) => {
      setActiveJob(payload.request);
      if (payload.request.assigned_ambulance_id) {
        setSelectedAmbulanceId(payload.request.assigned_ambulance_id);
      }
      triggerFetch();
    });

    newSocket.on(`driver:assigned:${selectedAmbulanceId}`, (payload) => {
      setActiveJob(payload.request);
      if (payload.request.assigned_ambulance_id) {
        setSelectedAmbulanceId(payload.request.assigned_ambulance_id);
      }
      triggerFetch();
    });

    newSocket.on('request:updated', (updatedReq) => {
      setActiveJob(prevJob => {
        if (prevJob && prevJob.id === updatedReq.id) {
          const stillAssigned = updatedReq.assigned_driver_id === currentUser.id;
          if (stillAssigned && updatedReq.status !== 'Completed') {
            if (updatedReq.assigned_ambulance_id) {
              setSelectedAmbulanceId(updatedReq.assigned_ambulance_id);
            }
            return updatedReq;
          } else {
            return null;
          }
        } else {
          const assignedToUs = updatedReq.assigned_driver_id === currentUser.id;
          if (assignedToUs && updatedReq.status !== 'Completed') {
            if (updatedReq.assigned_ambulance_id) {
              setSelectedAmbulanceId(updatedReq.assigned_ambulance_id);
            }
            return updatedReq;
          }
        }
        return prevJob;
      });
    });

    newSocket.on('request:deleted', (deletedId) => {
      setActiveJob(prevJob => {
        if (prevJob && prevJob.id === deletedId) {
          return null;
        }
        return prevJob;
      });
      triggerFetch();
    });


    newSocket.on('system:reset', () => {
      setIsOnline(true);
      setActiveJob(null);
      setSelectedAmbulanceId(currentUser?.ambulance_id || '');
      stopSirenSynthesizer();
      setSirenActive(false);
      setIsAutoTelemetry(false);
    });

    return () => {
      newSocket.disconnect();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      stopSirenSynthesizer();
    };
  }, [selectedAmbulanceId, isOnline]);

  const handleToggleDuty = () => {
    if (isOnline) {
      if (socket && selectedAmbulanceId && currentAmbulance) {
        socket.emit('driver:location-update', {
          ambulanceId: selectedAmbulanceId,
          driverId: currentUser.id,
          goOffline: true,
          latitude: currentAmbulance.latitude,
          longitude: currentAmbulance.longitude,
          status: 'Available',
          siren: false
        });
      }
      setIsOnline(false);
      setActiveJob(null);
      setSelectedAmbulanceId('');
      stopSirenSynthesizer();

      setSirenActive(false);
      setIsAutoTelemetry(false);
    } else {
      setIsOnline(true);
      setSelectedAmbulanceId(currentUser.ambulance_id || '');
    }
    triggerFetch();
  };

  function updateServerLocation(lat, lng, bearing, status) {
    if (socket) {
      socket.emit('driver:location-update', {
        ambulanceId: selectedAmbulanceId,
        driverId: currentUser.id,
        latitude: lat,
        longitude: lng,
        bearing: bearing,
        status: status || currentAmbulance?.status || 'Available',
        siren: sirenActive
      });
    }
  }

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

  const STATUS_STEPS = [
    {
      from: 'Assigned',
      to: 'En Route',
      label: '🚀 Start Driving',
      color: 'btn-primary',
      description: 'Mark yourself as en route to the patient'
    },
    {
      from: 'En Route',
      to: 'Reached Patient',
      label: '🏠 Paramedics Reached Patient',
      color: 'btn-success',
      description: 'Confirm you have arrived at the patient location'
    },
    {
      from: 'Reached Patient',
      to: 'At Hospital',
      label: '🚑 Transporting to Hospital',
      color: 'btn-primary',
      description: 'Begin patient transport to the assigned hospital'
    },
    {
      from: 'At Hospital',
      to: 'Completed - Awaiting Verification',
      label: '✅ Transport Complete',
      color: 'btn-danger',
      description: 'Finalize and claim delivery — awaits citizen & dispatcher confirmation'
    }
  ];

  const handleProgressStatus = async () => {
    if (!activeJob || isUpdatingStatus) return;
    const step = STATUS_STEPS.find(s => s.from === activeJob.status);
    if (!step) return;

    setIsUpdatingStatus(true);
    await updateJobStatus(step.to);
    setIsUpdatingStatus(false);

    // Control siren and trigger fetch
    if (step.to === 'En Route') {
      startSirenSynthesizer();
      setSirenActive(true);
    } else if (step.to === 'Completed - Awaiting Verification') {
      stopSirenSynthesizer();
      setSirenActive(false);
    }
    triggerFetch();
  };


  return (
    <div className="driver-console-wrapper">
      <style>{`
        .driver-console-wrapper {
          background-color: #0b0f19;
          color: #f8fafc;
          min-height: calc(100vh - 90px);
          font-family: 'Outfit', sans-serif;
          padding: 1.25rem;
          box-sizing: border-box;
          width: 100%;
        }
        .driver-panel-dark {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(51, 65, 85, 0.45);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .driver-panel-header {
          border-bottom: 1px solid rgba(51, 65, 85, 0.4);
          padding-bottom: 0.75rem;
          margin-bottom: 0.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .driver-panel-title {
          font-size: 0.95rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.75px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .driver-badge-neon {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .driver-badge-green {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .driver-badge-blue {
          background: rgba(2, 132, 199, 0.1);
          color: #38bdf8;
          border: 1px solid rgba(2, 132, 199, 0.3);
        }
        .driver-badge-red {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .driver-badge-orange {
          background: rgba(249, 115, 22, 0.1);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.3);
        }
        .driver-btn-tactical {
          padding: 0.65rem 1rem;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .driver-btn-primary {
          background: #0284c7;
          color: white;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        }
        .driver-btn-primary:hover {
          background: #0369a1;
          transform: translateY(-1px);
        }
        .driver-btn-success {
          background: #16a34a;
          color: white;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
        }
        .driver-btn-success:hover {
          background: #15803d;
          transform: translateY(-1px);
        }
        .driver-btn-danger {
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .driver-btn-danger:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
        .driver-btn-secondary {
          background: rgba(51, 65, 85, 0.4);
          color: #f8fafc;
          border: 1px solid rgba(71, 85, 105, 0.4);
        }
        .driver-btn-secondary:hover {
          background: rgba(71, 85, 105, 0.5);
        }
        .vitals-readout-card {
          background: #090d16;
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 10px;
          padding: 0.65rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .vitals-readout-label {
          font-size: 0.6rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vitals-readout-value {
          font-size: 1.35rem;
          font-weight: 800;
          font-family: monospace;
        }
        .mission-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.25rem;
          width: 100%;
        }
        @media (max-width: 992px) {
          .mission-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {activeJob ? (
        /* Emergency dispatch assigned split-layout grid */
        <div className="mission-grid">
          
          {/* Left Column: Mission Control */}
          <div className="driver-panel-dark" style={{ borderLeft: '4px solid #f97316' }}>
            <div className="driver-panel-header">
              <h4 className="driver-panel-title" style={{ color: '#f97316' }}>
                ⚡ EMERGENCY MISSION CONTROL
              </h4>
              <span className="driver-badge-neon driver-badge-red" style={{ fontWeight: 800 }}>
                {activeJob.emergency_type}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Citizen information card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.4)' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>REPORTING CITIZEN</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{activeJob.citizen_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#38bdf8' }}>
                  <Phone size={13} />
                  <a href={`tel:${activeJob.citizen_phone}`} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }}>
                    {activeJob.citizen_phone}
                  </a>
                </div>
              </div>

              {/* Pickup location card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(51, 65, 85, 0.4)' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>PICKUP PATIENT LOCATION</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                  📍 {activeJob.location_name}
                </div>
              </div>
            </div>

            {/* Stepper progression */}
            <div style={{ borderTop: '1px solid rgba(51, 65, 85, 0.4)', paddingTop: '1rem', marginTop: '0.25rem' }}>
              {(() => {
                const stepIndex = STATUS_STEPS.findIndex(s => s.from === activeJob.status);
                const totalSteps = STATUS_STEPS.length;
                return stepIndex >= 0 ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                      <span>MISSION STAGE PROGRESSION</span>
                      <span>STEP {stepIndex + 1} OF {totalSteps}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {STATUS_STEPS.map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: '6px', borderRadius: '3px',
                          background: i <= stepIndex ? '#16a34a' : 'rgba(255,255,255,0.08)',
                          boxShadow: i <= stepIndex ? '0 0 8px rgba(22, 163, 74, 0.4)' : 'none',
                          transition: 'all 0.3s'
                        }} />
                      ))}
                    </div>
                    {STATUS_STEPS[stepIndex] && (
                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
                        ℹ️ {STATUS_STEPS[stepIndex].description}
                      </p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Status Action Button */}
              {STATUS_STEPS.find(s => s.from === activeJob.status) ? (
                <button
                  onClick={handleProgressStatus}
                  disabled={isUpdatingStatus}
                  className={`driver-btn-tactical ${
                    STATUS_STEPS.find(s => s.from === activeJob.status)?.color === 'btn-success' 
                    ? 'driver-btn-success' 
                    : STATUS_STEPS.find(s => s.from === activeJob.status)?.color === 'btn-danger'
                    ? 'driver-btn-danger'
                    : 'driver-btn-primary'
                  }`}
                  style={{ width: '100%', fontSize: '0.9rem', padding: '0.85rem', fontWeight: 'bold' }}
                >
                  {isUpdatingStatus ? (
                    'UPDATING CENTRAL MISSION FILE...'
                  ) : (
                    STATUS_STEPS.find(s => s.from === activeJob.status)?.label
                  )}
                </button>

              ) : activeJob.status === 'Completed - Awaiting Verification' ? (
                <div style={{ 
                  padding: '0.85rem', 
                  background: 'rgba(249, 115, 22, 0.1)', 
                  border: '1px solid rgba(249, 115, 22, 0.3)', 
                  borderRadius: '10px', 
                  color: '#f97316', 
                  fontSize: '0.85rem', 
                  fontWeight: 'bold', 
                  textAlign: 'center',
                  lineHeight: '1.5'
                }}>
                  ⏳ MISSION TERMINATED. AWAITING CITIZEN / DISPATCHER VALIDATION CLOSEOUT.
                </div>
              ) : null}

              {/* Target Hospital info */}
              {(activeJob.status === 'Reached Patient' || activeJob.status === 'At Hospital') && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(15, 23, 42, 0.8)', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)' }}>
                  🏥 DESTINATION HOSPITAL INTAKE: <b>{hospitals.find(h => h.id === activeJob.assigned_hospital_id)?.name || 'NONE ASSIGNED'}</b>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Patient Vitals Telemetry Console */}
          {(activeJob.status === 'Reached Patient' || activeJob.status === 'At Hospital') && (
            <div className="driver-panel-dark" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="driver-panel-header">
                <h3 className="driver-panel-title" style={{ color: '#ef4444' }}>
                  🩺 PATIENT TELEMETRY CONSOLE
                </h3>
              </div>

              {telemetrySuccess && (
                <div style={{ padding: '0.55rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  ✓ Telemetry link secure. Vitals transmitted to central intake in real-time.
                </div>
              )}

              {/* ECG monitor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>LIVE CARDIO-TELEMETRY (ECG)</div>
                <ECGMonitor heartRate={heartRate} />
              </div>

              {/* Vitals neon reading values grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', margin: '0.25rem 0' }}>
                <div className="vitals-readout-card">
                  <span className="vitals-readout-label">HEART RATE</span>
                  <span className="vitals-readout-value driver-value-neon-green">{heartRate} <span style={{ fontSize: '0.65rem' }}>BPM</span></span>
                </div>
                <div className="vitals-readout-card">
                  <span className="vitals-readout-label">BLOOD PRESS.</span>
                  <span className="vitals-readout-value driver-value-neon-yellow" style={{ fontSize: '1.15rem', paddingTop: '0.15rem' }}>{bloodPressure}</span>
                </div>
                <div className="vitals-readout-card">
                  <span className="vitals-readout-label">OXYGEN SAT.</span>
                  <span className="vitals-readout-value driver-value-neon-blue">{spo2}<span style={{ fontSize: '0.65rem' }}>%</span></span>
                </div>
                <div className="vitals-readout-card">
                  <span className="vitals-readout-label">STATUS</span>
                  <span className={`vitals-readout-value ${condition === 'Critical' ? 'driver-badge-neon driver-badge-red' : condition === 'Guarded' ? 'driver-badge-neon driver-badge-orange' : 'driver-badge-neon driver-badge-green'}`} style={{ fontSize: '0.75rem', paddingTop: '0.5rem', border: 'none', background: 'none', fontWeight: 800 }}>
                    {condition.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Vital entry form */}
              <form onSubmit={handleSendTelemetry} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', color: '#94a3b8', fontWeight: 800 }}>Heart Rate (BPM)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ padding: '0.45rem', fontSize: '0.85rem', background: '#090d16', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.5)' }} 
                      value={heartRate} 
                      onChange={e => setHeartRate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', color: '#94a3b8', fontWeight: 800 }}>Blood Pressure</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '0.45rem', fontSize: '0.85rem', background: '#090d16', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.5)' }} 
                      value={bloodPressure} 
                      onChange={e => setBloodPressure(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', color: '#94a3b8', fontWeight: 800 }}>SpO2 (%)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ padding: '0.45rem', fontSize: '0.85rem', background: '#090d16', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.5)' }} 
                      value={spo2} 
                      onChange={e => setSpo2(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', color: '#94a3b8', fontWeight: 800 }}>Patient Condition Classification</label>
                    <select 
                      className="form-input" 
                      style={{ padding: '0.45rem', fontSize: '0.85rem', background: '#090d16', color: '#f8fafc', border: '1px solid rgba(51, 65, 85, 0.5)' }} 
                      value={condition} 
                      onChange={e => setCondition(e.target.value)} 
                    >
                      <option value="Stable">Stable</option>
                      <option value="Guarded">Guarded</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    className="driver-btn-tactical driver-btn-primary" 
                    style={{ alignSelf: 'end', height: '36px', fontSize: '0.75rem' }} 
                    disabled={telemetryLoading}
                  >
                    <Activity size={12} /> TRANSMIT
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>
      ) : (
        /* Standby console with Radar Widget */
        <div className="driver-panel-dark" style={{ borderLeft: '4px solid #10b981', justifyContent: 'center', minHeight: '450px' }}>
          <div className="driver-panel-header">
            <h4 className="driver-panel-title" style={{ color: '#10b981' }}>
              📡 CENTRAL DISPATCH STANDBY CONSOLE
            </h4>
            {gpsError ? (
              <span className="driver-badge-neon" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', animation: 'none', boxShadow: 'none' }} title="Secure context (HTTPS or localhost) and location permission required.">
                ⚠️ GPS Offline
              </span>
            ) : (
              <span className="driver-badge-neon driver-badge-green">
                Broadcasting GPS
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '2rem 0' }}>
            <RadarScan />
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px', margin: '0 auto', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Broadcasting Terminal Signal</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                Telemetry link fully synced with Gwadar Central Dispatch Gateway. Standing by for emergency assignment alerts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal — always mounted (CSS visibility) so Leaflet state is preserved across open/close */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: isMapMaximized ? '#0f172a' : 'rgba(11, 15, 25, 0.88)',
        backdropFilter: isMapMaximized ? 'none' : 'blur(8px)',
        display: showMapModal ? 'flex' : 'none',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: isMapMaximized ? 0 : '1.5rem',
        transition: 'opacity 0.2s'
      }}>
        <div className="driver-panel-dark" style={{
          background: '#0f172a',
          padding: isMapMaximized ? 0 : '1rem 1.25rem 1.25rem',
          borderRadius: isMapMaximized ? 0 : '16px',
          width: '100%',
          maxWidth: isMapMaximized ? '100vw' : '1000px',
          height: isMapMaximized ? '100vh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: isMapMaximized ? 0 : '0.75rem',
          position: 'relative',
          border: isMapMaximized ? 'none' : '1px solid rgba(251,191,36,0.15)',
          boxShadow: isMapMaximized ? 'none' : '0 24px 64px rgba(0,0,0,0.6)'
        }}>
          {/* Header */}
          {!isMapMaximized && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
                🗺️ Route Map Overview
                {selectedAmbulanceId && (
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                    ● LIVE
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '50%',
                  width: '34px', height: '34px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', fontWeight: 800, fontSize: '1rem',
                  color: '#ef4444', transition: 'background 0.18s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                title="Close map"
              >
                ✕
              </button>
            </div>
          )}

          {/* Map — always rendered, never unmounted */}
          <div style={{
            flex: 1,
            borderRadius: isMapMaximized ? 0 : '12px',
            overflow: 'hidden',
            border: isMapMaximized ? 'none' : '1px solid rgba(51, 65, 85, 0.5)',
            display: 'flex',
            position: 'relative'
          }}>
            <MapComponent
              ambulances={ambulances}
              requests={activeJob ? [activeJob] : requests}
              hospitals={hospitals}
              selectedRequestId={activeJob?.id}
              ownAmbulanceId={selectedAmbulanceId}
              showRoutes={true}
              visible={showMapModal}
              onMaximizeChange={setIsMapMaximized}
              onMapClick={(coords) => {
                console.log("Driver clicked map, updating location manually:", coords);
                updateServerLocation(coords.latitude, coords.longitude, undefined, activeJob?.status || 'Available');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

