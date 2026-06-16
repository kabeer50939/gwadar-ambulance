import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Truck, Users, Navigation, Calendar, Award, Hospital, RefreshCw, UserPlus, Trash2, Eye, EyeOff, CheckCircle, XCircle, Search, Wrench } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function ChairmanDashboard({ token, currentUser, hospitals, ambulances, requests, triggerFetch }) {
  const [activeTab, setActiveTab] = useState('analytics');

  // Staff management state
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null);
  const [staffSuccess, setStaffSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '', username: '', password: '', role: 'driver',
    phone: '', cnic: '', photo: ''
  });

  // Fleet management state
  const [showCreateFleetForm, setShowCreateFleetForm] = useState(false);
  const [newAmbulance, setNewAmbulance] = useState({ vehicle_number: '', model: '', photo: '' });
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState(null);
  const [fleetSuccess, setFleetSuccess] = useState(null);

  // Search filter states
  const [staffSearch, setStaffSearch] = useState('');
  const [fleetSearch, setFleetSearch] = useState('');

  // Helper for advanced client-side image compression and center-cropping
  const processImageFile = (file, targetWidth, targetHeight, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = sourceWidth / sourceHeight;

        let sX = 0, sY = 0, sWidth = sourceWidth, sHeight = sourceHeight;

        if (sourceRatio > targetRatio) {
          sWidth = sourceHeight * targetRatio;
          sX = (sourceWidth - sWidth) / 2;
        } else {
          sHeight = sourceWidth / targetRatio;
          sY = (sourceHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFleetPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file, 400, 300, (base64) => {
        setNewAmbulance(p => ({ ...p, photo: base64 }));
      });
    }
  };

  const handleStaffPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file, 200, 200, (base64) => {
        setNewStaff(p => ({ ...p, photo: base64 }));
      });
    }
  };

  const handleCreateAmbulance = async (e) => {
    e.preventDefault();
    setFleetLoading(true);
    setFleetError(null);
    setFleetSuccess(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ambulances`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newAmbulance)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register ambulance');
      setFleetSuccess(`✅ Ambulance ${data.vehicle_number} registered successfully!`);
      setNewAmbulance({ vehicle_number: '', model: '', photo: '' });
      setShowCreateFleetForm(false);
      triggerFetch();
    } catch (err) {
      setFleetError(err.message);
    } finally {
      setFleetLoading(false);
    }
  };

  const handleDeleteAmbulance = async (id, vehicleNumber) => {
    if (!window.confirm(`Are you sure you want to remove ambulance ${vehicleNumber} from the system?`)) return;
    setFleetLoading(true);
    setFleetError(null);
    setFleetSuccess(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ambulances/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete ambulance');
      setFleetSuccess(`🗑 Ambulance ${vehicleNumber} removed.`);
      triggerFetch();
    } catch (err) {
      setFleetError(err.message);
    } finally {
      setFleetLoading(false);
    }
  };

  // Staff password reset state
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showNewStaffPasswordToggle, setShowNewStaffPasswordToggle] = useState(false);

  // Chairman password state
  const [chairmanPassword, setChairmanPassword] = useState('');
  const [chairmanLoading, setChairmanLoading] = useState(false);
  const [chairmanSuccess, setChairmanSuccess] = useState(null);
  const [chairmanError, setChairmanError] = useState(null);
  const [showChairmanPassword, setShowChairmanPassword] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Auto-refresh analytics every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => triggerFetch(), 8000);
    return () => clearInterval(timer);
  }, [triggerFetch]);

  // Load staff on tab change
  useEffect(() => {
    if (activeTab === 'staff') loadStaff();
  }, [activeTab]);

  const loadStaff = async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/staff`, { headers });
      if (!res.ok) throw new Error('Failed to load staff');
      setStaff(await res.json());
    } catch (e) {
      setStaffError(e.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffLoading(true);
    setStaffError(null);
    setStaffSuccess(null);
    
    // CNIC Regex Format Verification (PK format: 12345-1234567-1)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(newStaff.cnic.trim())) {
      setStaffError("Invalid CNIC format. It must be in the format XXXXX-XXXXXXX-X");
      setStaffLoading(false);
      return;
    }

    try {
      const payload = { ...newStaff };
      const res = await fetch(`${BACKEND_URL}/api/staff`, {
        method: 'POST', headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      setStaff(prev => [...prev, data]);
      setStaffSuccess(`✅ Account created: @${data.username} (${data.role})`);
      setNewStaff({ name: '', username: '', password: '', role: 'driver', phone: '', cnic: '', photo: '' });
      setShowCreateForm(false);
    } catch (e) {
      setStaffError(e.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/staff/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Failed to delete');
      setStaff(prev => prev.filter(s => s.id !== id));
      setStaffSuccess(`🗑 ${name}'s account removed.`);
    } catch (e) {
      setStaffError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStaffPassword = async (e) => {
    e.preventDefault();
    if (!newStaffPassword || newStaffPassword.trim().length < 4) {
      setStaffError("Password must be at least 4 characters long.");
      return;
    }
    setStaffLoading(true);
    setStaffError(null);
    setStaffSuccess(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/staff/${resetPasswordStaff.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newStaffPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setStaffSuccess(`✅ Password for @${resetPasswordStaff.username} updated successfully!`);
      setResetPasswordStaff(null);
      setNewStaffPassword('');
    } catch (err) {
      setStaffError(err.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleUpdateChairmanPassword = async (e) => {
    e.preventDefault();
    if (!chairmanPassword || chairmanPassword.trim().length < 4) {
      setChairmanError("Password must be at least 4 characters long.");
      return;
    }
    setChairmanLoading(true);
    setChairmanError(null);
    setChairmanSuccess(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chairman/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: chairmanPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setChairmanSuccess("👑 Chairman password updated successfully!");
      setChairmanPassword('');
    } catch (err) {
      setChairmanError(err.message);
    } finally {
      setChairmanLoading(false);
    }
  };

  // ── Analytics Stats ──────────────────────────────────────────────
  const completedRequests = requests.filter(r => r.status === 'Completed');
  const activeRequests = requests.filter(r => r.status !== 'Completed');
  const patientsDelivered = completedRequests.length;

  const totalKmRun = completedRequests.reduce((acc, req) => {
    if (req.latitude && req.longitude && req.assigned_hospital_id) {
      const hosp = hospitals.find(h => h.id === req.assigned_hospital_id);
      if (hosp) return acc + parseFloat((getDistance(req.latitude, req.longitude, hosp.latitude, hosp.longitude) * 1.6).toFixed(2));
    }
    return acc + 12.5;
  }, 0);

  const uniqueCallers = new Set(requests.filter(r => r.citizen_phone).map(r => r.citizen_phone));
  const totalCitizens = uniqueCallers.size;
  const onDutyDrivers = ambulances.filter(a => a.status !== 'Available').length;
  const totalDrivers = ambulances.length;

  const getEmergencyCount = (type) => requests.filter(r => r.emergency_type === type).length;

  const TABS = [
    { key: 'analytics', label: '📊 Analytics Dashboard' },
    { key: 'staff', label: '👥 Manage Staff' },
    { key: 'fleet', label: '🚑 Manage Fleet' },
  ];

  return (
    <div className="view-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-red)' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab.key ? 'var(--primary-red)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ANALYTICS ── */}
      {activeTab === 'analytics' && (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {[
              { label: 'Patients Delivered', value: patientsDelivered, sub: '✓ Completed Transports', icon: <Award size={24}/>, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
              { label: 'Ambulance Distance', value: `${totalKmRun.toFixed(1)} km`, sub: '⚡ Estimated Total Run', icon: <Navigation size={24}/>, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
              { label: 'Unique Callers', value: totalCitizens, sub: '👥 Citizens Who Called', icon: <Users size={24}/>, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
              { label: 'Active Responders', value: `${onDutyDrivers}/${totalDrivers}`, sub: '🚑 On Duty Fleet', icon: <Truck size={24}/>, color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
            ].map(kpi => (
              <div key={kpi.label} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
                  {kpi.icon}
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{kpi.label}</span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0.1rem 0', color: 'var(--text-primary)' }}>{kpi.value}</h2>
                  <span style={{ fontSize: '0.65rem', color: kpi.color, fontWeight: 600 }}>{kpi.sub}</span>
                </div>
              </div>
            ))}
          </div>



          {/* Two-column breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>

            {/* Left: Hospital Monitor + Emergency Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Hospital Bed Capacity Monitor */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  <Hospital size={16} style={{ color: 'var(--primary-blue)' }} /> Hospital Bed Capacity Monitor
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>Hospital</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Beds</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>ICU</th>
                        <th style={{ padding: '0.5rem' }}>Hotline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map(hosp => (
                        <tr key={hosp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.7rem' }}>{hosp.name}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <span className={`badge ${hosp.available_beds > 5 ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                              {hosp.available_beds}/{hosp.total_beds}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>💨 {hosp.icu_ventilators}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <a href={`tel:${hosp.contact_number}`} style={{ color: 'var(--primary-blue)', fontWeight: 500, fontSize: '0.7rem', textDecoration: 'none' }}>{hosp.contact_number}</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Emergency Type Breakdown */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  <Activity size={16} style={{ color: 'var(--primary-red)' }} /> Emergency Type Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {[
                    { name: 'Accident / Trauma', count: getEmergencyCount('Accident'), color: '#ef4444' },
                    { name: 'Cardiac Arrest', count: getEmergencyCount('Cardiac Arrest'), color: '#dc2626' },
                    { name: 'Pregnancy / Maternal', count: getEmergencyCount('Maternal'), color: '#ec4899' },
                    { name: 'Respiratory Distress', count: getEmergencyCount('Respiratory'), color: '#3b82f6' },
                    { name: 'Other Critical', count: getEmergencyCount('Other'), color: '#64748b' },
                  ].map(item => {
                    const pct = requests.length > 0 ? (item.count / requests.length) * 100 : 0;
                    return (
                      <div key={item.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem', fontWeight: 500 }}>
                          <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}><b>{item.count}</b> ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: '7px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Active Incidents + Fleet Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Active Incidents */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)', flex: 1 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  <Activity size={16} style={{ color: 'var(--primary-orange)' }} /> Active Emergencies
                  {activeRequests.length > 0 && <span className="badge badge-red" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.25rem' }}>{activeRequests.length}</span>}
                </h3>
                {activeRequests.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🟢</span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', margin: 0 }}>All Clear</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>No active emergencies in Gwadar.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '300px' }}>
                    {activeRequests.map(req => {
                      const amb = ambulances.find(a => a.id === req.assigned_ambulance_id);
                      const hosp = hospitals.find(h => h.id === req.assigned_hospital_id);
                      return (
                        <div key={req.id} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{req.citizen_name}</span>
                            <span className={`badge ${req.status === 'Pending' ? 'badge-red' : req.status === 'Assigned' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{req.status}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span>Type: <b style={{ color: 'var(--primary-red)' }}>{req.emergency_type}</b></span>
                            <span>📍 {req.location_name}</span>
                            {amb && <span>🚑 {amb.vehicle_number} — {amb.driver_name}</span>}
                            {hosp && <span>🏥 {hosp.name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fleet Status */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  <Truck size={16} style={{ color: 'var(--primary-blue)' }} /> Ambulance Fleet Status
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                  {ambulances.map(amb => (
                    <div key={amb.id} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: amb.status === 'Available' ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🚑 {amb.vehicle_number}</span>
                        <span className={`badge ${amb.status === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>{amb.status}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'block' }}>{amb.driver_name}</span>
                        <span style={{ display: 'block', fontFamily: 'monospace' }}>{amb.latitude?.toFixed(4)}, {amb.longitude?.toFixed(4)}</span>
                        {amb.siren && <span style={{ color: 'var(--primary-red)', fontWeight: 'bold' }}>🚨 Siren</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <Award size={18} style={{ color: 'var(--primary-blue)' }} /> Completed Incident Audit Logs
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 400 }}>{completedRequests.length} records</span>
            </h3>
            {completedRequests.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No completed incidents logged yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      <th style={{ padding: '0.6rem' }}>Date / Time</th>
                      <th style={{ padding: '0.6rem' }}>Patient</th>
                      <th style={{ padding: '0.6rem' }}>Emergency</th>
                      <th style={{ padding: '0.6rem' }}>Location</th>
                      <th style={{ padding: '0.6rem' }}>Responder</th>
                      <th style={{ padding: '0.6rem' }}>Hospital</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRequests.map(req => {
                      const amb = ambulances.find(a => a.id === req.assigned_ambulance_id);
                      const hosp = hospitals.find(h => h.id === req.assigned_hospital_id);
                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                          <td style={{ padding: '0.6rem', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'block', fontWeight: 'bold' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span style={{ display: 'block', fontWeight: 'bold' }}>{req.citizen_name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{req.citizen_phone}</span>
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span className="badge badge-red" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>{req.emergency_type}</span>
                          </td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{req.location_name}</td>
                          <td style={{ padding: '0.6rem' }}>
                            {amb ? (
                              <div>
                                <span style={{ display: 'block', fontWeight: 'bold' }}>{amb.vehicle_number}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{amb.driver_name}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{hosp?.name || '—'}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <span className="badge badge-green" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>Delivered ✓</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* System Maintenance & Database Control */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <Wrench size={16} /> System Maintenance & Database Controls
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Perform administrative system actions. Wiping request logs clears out active case files and resets ambulance availability, returning the database to a clean starting state.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to reset the system database? This deletes all logged requests, emergency chats, and resets ambulances to Available.")) {
                      try {
                        const res = await fetch(`${BACKEND_URL}/api/reset`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                          alert("Database reset successfully!");
                          triggerFetch();
                        } else {
                          const data = await res.json();
                          alert("Failed to reset database: " + (data.error || res.statusText));
                        }
                      } catch (err) {
                        console.error("Failed to reset system", err);
                        alert("Error contacting the server.");
                      }
                    }
                  }}
                >
                  ⚙️ Reset System Data
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: MANAGE STAFF ── */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Staff Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>👥 Staff Account Management</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Only Chairman can create or remove Driver and Dispatcher accounts.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={loadStaff}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={() => { setShowCreateForm(v => !v); setStaffError(null); setStaffSuccess(null); }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
              >
                <UserPlus size={14} /> {showCreateForm ? 'Cancel' : 'Create Account'}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {staffSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#15803d', fontSize: '0.82rem' }}>
              <CheckCircle size={15} /> {staffSuccess}
            </div>
          )}
          {staffError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#b91c1c', fontSize: '0.82rem' }}>
              <XCircle size={15} /> {staffError}
            </div>
          )}

          {/* Create Staff Form */}
          {showCreateForm && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)', border: '2px solid rgba(239,68,68,0.15)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserPlus size={16} style={{ color: 'var(--primary-red)' }} /> Create New Staff Account
              </h3>
              <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" type="text" placeholder="e.g. Ahmed Khan" required
                    value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Username *</label>
                  <input className="form-input" type="text" placeholder="e.g. ahmed" required
                    value={newStaff.username} onChange={e => setNewStaff(p => ({ ...p, username: e.target.value.replace(/\s/g, '').toLowerCase() }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC Number *</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="54400-XXXXXXX-X" 
                    required
                    pattern="^\d{5}-\d{7}-\d{1}$"
                    title="CNIC must match format XXXXX-XXXXXXX-X (e.g. 54400-1234567-1)"
                    value={newStaff.cnic} 
                    onChange={e => setNewStaff(p => ({ ...p, cnic: e.target.value }))} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={newStaff.role} onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))}>
                    <option value="driver">🚑 Driver</option>
                    <option value="dispatcher">📡 Dispatcher</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone *</label>
                  <input className="form-input" type="text" placeholder="+92 300 0000000" required
                    value={newStaff.phone} onChange={e => setNewStaff(p => ({ ...p, phone: e.target.value }))} />
                </div>



                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password *</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input className="form-input" type={showNewPassword ? 'text' : 'password'}
                        placeholder="Set password" required style={{ paddingRight: '2.5rem' }}
                        value={newStaff.password} onChange={e => setNewStaff(p => ({ ...p, password: e.target.value }))} />
                      <button type="button" onClick={() => setShowNewPassword(v => !v)}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {showNewPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button type="button" className="btn btn-secondary"
                      style={{ padding: '0 0.65rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                      onClick={() => setNewStaff(p => ({ ...p, password: generatePassword() }))}>
                      Auto
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Staff Photo *</label>
                  <input type="file" accept="image/*" required onChange={handleStaffPhotoChange} style={{ fontSize: '0.8rem', width: '100%' }} />
                  {newStaff.photo && (
                    <img src={newStaff.photo} alt="Preview" style={{ marginTop: '0.5rem', width: '60px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                  )}
                </div>

                {/* Submit — spans full width */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem' }}
                    onClick={() => setShowCreateForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={staffLoading}
                    style={{ padding: '0.65rem 1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <UserPlus size={14} /> {staffLoading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff Table */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Users size={16} style={{ color: 'var(--primary-blue)' }} /> Staff Roster
                <span style={{ marginLeft: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 400 }}>({staff.length} accounts)</span>
              </h3>
              
              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, CNIC, or username..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.5rem 0.4rem 2rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    width: '100%',
                    margin: 0,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {staffLoading && staff.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff...</div>
            ) : staff.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No staff accounts found. Click "Create Account" to add drivers or dispatchers.
              </div>
            ) : staff.filter(s => {
              const query = staffSearch.toLowerCase().trim();
              if (!query) return true;
              return (
                (s.name && s.name.toLowerCase().includes(query)) ||
                (s.username && s.username.toLowerCase().includes(query)) ||
                (s.cnic && s.cnic.toLowerCase().includes(query)) ||
                (s.phone && s.phone.toLowerCase().includes(query))
              );
            }).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No staff members match your search criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      <th style={{ padding: '0.6rem' }}>Photo</th>
                      <th style={{ padding: '0.6rem' }}>Name</th>
                      <th style={{ padding: '0.6rem' }}>CNIC</th>
                      <th style={{ padding: '0.6rem' }}>Username</th>
                      <th style={{ padding: '0.6rem' }}>Role</th>
                      <th style={{ padding: '0.6rem' }}>Phone</th>
                      <th style={{ padding: '0.6rem' }}>Ambulance</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Trips ✓</th>
                      <th style={{ padding: '0.6rem' }}>Created</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff
                      .filter(s => {
                        const query = staffSearch.toLowerCase().trim();
                        if (!query) return true;
                        return (
                          (s.name && s.name.toLowerCase().includes(query)) ||
                          (s.username && s.username.toLowerCase().includes(query)) ||
                          (s.cnic && s.cnic.toLowerCase().includes(query)) ||
                          (s.phone && s.phone.toLowerCase().includes(query))
                        );
                      })
                      .map(s => {
                        const amb = s.ambulance_id ? ambulances.find(a => a.id === s.ambulance_id) : null;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                          <td style={{ padding: '0.6rem' }}>
                            {s.photo ? (
                              <img src={s.photo} alt={s.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
                            )}
                          </td>
                          <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{s.name}</td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{s.cnic || '—'}</td>
                          <td style={{ padding: '0.6rem' }}>
                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>@{s.username}</span>
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span className={`badge ${s.role === 'driver' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                              {s.role === 'driver' ? '🚑 Driver' : '📡 Dispatcher'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{amb ? amb.vehicle_number : (s.ambulance_id || '—')}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: s.trips_completed > 0 ? 'rgba(34,197,94,0.1)' : '#f1f5f9', color: s.trips_completed > 0 ? '#15803d' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.78rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: s.trips_completed > 0 ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-color)' }}>
                              🏁 {s.trips_completed ?? 0}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Pre-seeded'}
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => { setResetPasswordStaff(s); setNewStaffPassword(''); }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
                              >
                                🔑 Reset PW
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(s.id, s.name)}
                                disabled={deletingId === s.id}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
                              >
                                <Trash2 size={12} /> {deletingId === s.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chairman Self-Password Management */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              👑 Chairman Password Management
            </h3>

            {chairmanSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#15803d', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                <CheckCircle size={15} /> {chairmanSuccess}
              </div>
            )}
            {chairmanError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                <XCircle size={15} /> {chairmanError}
              </div>
            )}

            <form onSubmit={handleUpdateChairmanPassword} style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '240px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>New Chairman Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showChairmanPassword ? 'text' : 'password'}
                    placeholder="Enter new chairman password"
                    required
                    value={chairmanPassword}
                    onChange={e => setChairmanPassword(e.target.value)}
                    style={{ paddingRight: '2.5rem', marginBottom: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowChairmanPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '0.75rem'
                    }}
                  >
                    {showChairmanPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-danger" disabled={chairmanLoading} style={{ padding: '0.65rem 1.25rem', height: '38px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {chairmanLoading ? 'Saving...' : '🔑 Update Chairman Password'}
              </button>
            </form>
          </div>

          {/* Security Note */}
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '10px', fontSize: '0.78rem', color: '#92400e' }}>
            🔒 <b>Security Notice:</b> Only the Chairman can create or remove Driver and Dispatcher accounts.
            Citizens do not need accounts — they access the system instantly via the emergency portal.
            Always share credentials securely and directly with staff members.
          </div>
        </div>
      )}

      {/* ── TAB: MANAGE FLEET ── */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Fleet Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>🚑 Ambulance Fleet Management</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Register and manage official ambulances for the Gwadar fleet.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setShowCreateFleetForm(v => !v); setFleetError(null); setFleetSuccess(null); }}
                className="btn btn-danger"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
              >
                {showCreateFleetForm ? 'Cancel' : 'Register Ambulance'}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {fleetSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#15803d', fontSize: '0.82rem' }}>
              <CheckCircle size={15} /> {fleetSuccess}
            </div>
          )}
          {fleetError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#b91c1c', fontSize: '0.82rem' }}>
              <XCircle size={15} /> {fleetError}
            </div>
          )}

          {/* Register Ambulance Form */}
          {showCreateFleetForm && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)', border: '2px solid rgba(239,68,68,0.15)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={16} style={{ color: 'var(--primary-red)' }} /> Register New Ambulance
              </h3>
              <form onSubmit={handleCreateAmbulance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vehicle Plate Number *</label>
                  <input className="form-input" type="text" placeholder="e.g. GWD-1234" required
                    value={newAmbulance.vehicle_number} onChange={e => setNewAmbulance(p => ({ ...p, vehicle_number: e.target.value.toUpperCase() }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Model Description *</label>
                  <input className="form-input" type="text" placeholder="e.g. Toyota Hiace 2024" required
                    value={newAmbulance.model} onChange={e => setNewAmbulance(p => ({ ...p, model: e.target.value }))} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ambulance Photo *</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFleetPhotoChange} 
                    style={{ fontSize: '0.8rem', width: '100%' }}
                    required
                  />
                  {newAmbulance.photo && (
                    <img 
                      src={newAmbulance.photo} 
                      alt="Ambulance Preview" 
                      style={{ marginTop: '0.5rem', width: '80px', height: '60px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem' }}
                    onClick={() => setShowCreateFleetForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger" disabled={fleetLoading}
                    style={{ padding: '0.65rem 1.25rem' }}>
                    {fleetLoading ? 'Registering...' : 'Register Ambulance'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Fleet Table */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Truck size={16} style={{ color: 'var(--primary-blue)' }} /> Ambulance Roster
                <span style={{ marginLeft: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 400 }}>({ambulances.length} vehicles)</span>
              </h3>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by plate, model, driver..."
                  value={fleetSearch}
                  onChange={e => setFleetSearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.5rem 0.4rem 2rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    width: '100%',
                    margin: 0,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {ambulances.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No ambulances registered. Click "Register Ambulance" to add one.
              </div>
            ) : ambulances.filter(a => {
              const query = fleetSearch.toLowerCase().trim();
              if (!query) return true;
              return (
                (a.vehicle_number && a.vehicle_number.toLowerCase().includes(query)) ||
                (a.model && a.model.toLowerCase().includes(query)) ||
                (a.driver_name && a.driver_name.toLowerCase().includes(query))
              );
            }).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No ambulances match your search criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      <th style={{ padding: '0.6rem' }}>Photo</th>
                      <th style={{ padding: '0.6rem' }}>Vehicle Number</th>
                      <th style={{ padding: '0.6rem' }}>Model</th>
                      <th style={{ padding: '0.6rem' }}>Assigned Driver</th>
                      <th style={{ padding: '0.6rem' }}>Phone</th>
                      <th style={{ padding: '0.6rem' }}>Status</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Trips ✓</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambulances
                      .filter(a => {
                        const query = fleetSearch.toLowerCase().trim();
                        if (!query) return true;
                        return (
                          (a.vehicle_number && a.vehicle_number.toLowerCase().includes(query)) ||
                          (a.model && a.model.toLowerCase().includes(query)) ||
                          (a.driver_name && a.driver_name.toLowerCase().includes(query))
                        );
                      })
                      .map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', verticalAlign: 'middle' }}>
                        <td style={{ padding: '0.6rem' }}>
                          {a.photo ? (
                            <img src={a.photo} alt="Ambulance" style={{ width: '60px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                          ) : (
                            <div style={{ width: '60px', height: '45px', borderRadius: '4px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🚑</div>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{a.vehicle_number}</td>
                        <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{a.model || 'Standard Model'}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 500 }}>{a.driver_name || 'No Driver Assigned'}</td>
                        <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{a.driver_phone || '—'}</td>
                        <td style={{ padding: '0.6rem' }}>
                          <span className={`badge ${a.status === 'Available' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>{a.status}</span>
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: a.trips_completed > 0 ? 'rgba(59,130,246,0.1)' : '#f1f5f9', color: a.trips_completed > 0 ? '#1d4ed8' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.78rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: a.trips_completed > 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-color)' }}>
                            🚑 {a.trips_completed ?? 0}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteAmbulance(a.id, a.vehicle_number)}
                            disabled={fleetLoading}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STAFF PASSWORD RESET MODAL ── */}
      {resetPasswordStaff && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            background: 'white', padding: '1.75rem', borderRadius: '16px',
            width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-2xl)',
            border: '2px solid rgba(239,68,68,0.2)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔑 Reset Password
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Change credentials for <b>{resetPasswordStaff.name}</b> (<code>@{resetPasswordStaff.username}</code>).
            </p>

            <form onSubmit={handleUpdateStaffPassword}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>New Secure Password</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showNewStaffPasswordToggle ? 'text' : 'password'}
                      placeholder="Enter new password"
                      required
                      value={newStaffPassword}
                      onChange={e => setNewStaffPassword(e.target.value)}
                      style={{ paddingRight: '2.5rem', marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewStaffPasswordToggle(v => !v)}
                      style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '0.75rem'
                      }}
                    >
                      {showNewStaffPasswordToggle ? '🙈' : '👁'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setNewStaffPassword(generatePassword())}
                    style={{ padding: '0 0.65rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setResetPasswordStaff(null); setNewStaffPassword(''); }}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
