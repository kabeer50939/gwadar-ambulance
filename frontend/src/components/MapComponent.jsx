import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const GWADAR_CENTER = [25.1219, 62.3254];

// ─── Icon Creators ──────────────────────────────────────────────────────────

const createPatientIcon = (shouldPulse) => {
  const pulseRing = shouldPulse ? '<div class="patient-pulse-ring"></div>' : '';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="display:flex;justify-content:center;align-items:center;position:relative;width:32px;height:32px;">${pulseRing}<span style="font-size:28px;line-height:1;user-select:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">👤</span></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
  });
};

const getHospitalAbbreviation = (name, id) => {
  if (!name) return 'HOSP';
  if (id === 'hosp-01' || name.toLowerCase().includes('indus')) return 'GIH';
  if (id === 'hosp-03' || name.toLowerCase().includes('dhq')) return 'DHQ';
  return name.slice(0, 3).toUpperCase();
};

const createAmbulanceIcon = (status, bearing = 0, siren = false, isOwn = false) => {
  const sirenGlow = siren ? 'filter:drop-shadow(0 0 6px #ef4444) drop-shadow(0 0 2px #ef4444);' : '';
  const ownHighlight = isOwn ? 'filter:drop-shadow(0 0 8px #eab308) drop-shadow(0 0 3px #eab308);' : '';
  const ownLabel = isOwn
    ? `<div style="position:absolute;top:-16px;background:#eab308;color:black;font-size:8px;font-weight:900;padding:1px 3px;border-radius:3px;border:1px solid white;white-space:nowrap;transform:rotate(${-bearing}deg);pointer-events:none;z-index:10;">YOU</div>`
    : '';
  const pulseColor = siren ? '#ef4444' : (status === 'Available' ? '#10b981' : '#3b82f6');
  const pulseRing = `<div class="ambulance-pulse-ring" style="border-color:${pulseColor}"></div>`;
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="transform:rotate(${bearing}deg);transition:transform 0.3s ease-out;display:flex;justify-content:center;align-items:center;position:relative;width:28px;height:28px;">${pulseRing}${ownLabel}<span style="font-size:26px;${sirenGlow}${ownHighlight}line-height:1;user-select:none;">🚑</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14]
  });
};

const createHospitalIcon = () => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="width:36px;height:36px;border-radius:50%;background-color:#3b82f6;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.4);"><span style="font-size:18px;">🏥</span></div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
});

const createPinIcon = () => L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="marker-pin-wrapper"><div class="marker-pin" style="background-color:#3b82f6;border-color:white;"><div class="marker-pin-inner">📍</div></div></div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -15]
});

const createLiveLocationIcon = (isAmbulance = false) => {
  const emoji = isAmbulance ? '🚑' : '👤';
  const color = isAmbulance ? '#3b82f6' : '#ef4444';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="display:flex;justify-content:center;align-items:center;position:relative;width:36px;height:36px;"><div class="live-pulse-ring" style="border-color:${color};"></div><div class="live-pulse-ring live-pulse-ring-delay" style="border-color:${color};"></div><span style="font-size:28px;line-height:1;user-select:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));position:relative;z-index:2;">${emoji}</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
  });
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MapComponent({
  ambulances = [],
  requests = [],
  hospitals = [],
  selectedRequestId = null,
  ownAmbulanceId = null,
  onMapClick = null,
  userPin = null,
  showRoutes = true,
  isCitizen = false,
  visible = true,   // pass this as showMapModal so map recenters on open
  onMaximizeChange = null
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  const [isMaximized, setIsMaximized] = useState(false);
  const markersRef = useRef({
    ambulances: {}, requests: {}, hospitals: {}, userPin: null, liveLocation: null, routes: []
  });

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // ── Initialize Leaflet ONCE ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: GWADAR_CENTER, zoom: 13, zoomControl: true, attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    map.on('click', (e) => {
      if (onMapClickRef.current) onMapClickRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    // Initial size corrections
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      map.remove(); mapRef.current = null;
    };
  }, []);

  // ── Helper function to invalidate size and recenter map ──────────────────
  const recenterMap = () => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();

    // 1. If there is a selected request, recenter on it
    if (selectedRequestId) {
      const req = requests.find(r => r.id === selectedRequestId);
      if (req?.latitude && req?.longitude) {
        map.setView([req.latitude, req.longitude], 14, { animate: false });
        return;
      }
    }

    // 2. If there is an ownAmbulanceId, center on that ambulance
    if (ownAmbulanceId) {
      const ownAmb = ambulances.find(a => a.id === ownAmbulanceId);
      if (ownAmb?.latitude && ownAmb?.longitude) {
        map.setView([ownAmb.latitude, ownAmb.longitude], 14, { animate: false });
        return;
      }
    }

    // 3. If there is a live location, recenter on it
    if (liveLocationRef.current) {
      map.setView([liveLocationRef.current.lat, liveLocationRef.current.lng], 14, { animate: false });
      return;
    }

    // 4. Fallback: recenter on GWADAR_CENTER
    map.setView(GWADAR_CENTER, 13, { animate: false });
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => {
      const next = !prev;
      if (onMaximizeChange) onMaximizeChange(next);
      return next;
    });
  };

  const handleCloseMaximize = () => {
    setIsMaximized(false);
    if (onMaximizeChange) onMaximizeChange(false);
  };

  // ── Invalidate size + recenter when isMaximized toggles ──────────────────
  useEffect(() => {
    const t1 = setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 60);
    const t2 = setTimeout(() => { recenterMap(); }, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isMaximized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Invalidate size + recenter when modal parent shows this map ──────────
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => { if (mapRef.current) { mapRef.current.invalidateSize(); } }, 100);
    const t2 = setTimeout(() => { recenterMap(); }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compute live location from props ───────────────────────────────────
  const liveLocation = (() => {
    if (isCitizen) {
      if (userPin?.latitude && userPin?.longitude) return { lat: userPin.latitude, lng: userPin.longitude, isAmbulance: false };
      const activeReq = requests.find(r => r && r.status !== 'Completed');
      if (activeReq?.latitude && activeReq?.longitude) return { lat: activeReq.latitude, lng: activeReq.longitude, isAmbulance: false };
    } else if (ownAmbulanceId) {
      const ownAmb = ambulances.find(a => a.id === ownAmbulanceId);
      if (ownAmb?.latitude && ownAmb?.longitude) {
        const lat = parseFloat(ownAmb.latitude), lng = parseFloat(ownAmb.longitude);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, isAmbulance: true };
      }
    }
    return null;
  })();

  // Keep a ref so the visible-effect closure can read the latest value
  const liveLocationRef = useRef(liveLocation);
  useEffect(() => { liveLocationRef.current = liveLocation; }, [liveLocation]);

  // ── Center map on selection / live location ─────────────────────────────
  const lastCenteredId = useRef(null);
  const lastCenteredKey = useRef(null);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (selectedRequestId) {
      if (lastCenteredId.current !== selectedRequestId) {
        const req = requests.find(r => r.id === selectedRequestId);
        if (req?.latitude && req?.longitude) {
          map.setView([req.latitude, req.longitude], 14, { animate: false });
          lastCenteredId.current = selectedRequestId; lastCenteredKey.current = null;
        }
      }
    } else if (liveLocation) {
      const key = `${liveLocation.lat.toFixed(5)},${liveLocation.lng.toFixed(5)}`;
      if (lastCenteredKey.current !== key) {
        map.setView([liveLocation.lat, liveLocation.lng], 14, { animate: false });
        lastCenteredKey.current = key; lastCenteredId.current = null;
      }
    }
  }, [selectedRequestId, requests, liveLocation]);

  // ── Render all markers ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const m = markersRef.current;

    // A. Hospitals
    hospitals.forEach(hosp => {
      const abbrev = getHospitalAbbreviation(hosp.name, hosp.id);
      if (m.hospitals[hosp.id]) {
        m.hospitals[hosp.id].setLatLng([hosp.latitude, hosp.longitude]);
      } else {
        m.hospitals[hosp.id] = L.marker([hosp.latitude, hosp.longitude], { icon: createHospitalIcon() })
          .addTo(map)
          .bindTooltip(abbrev, { permanent: true, direction: 'top', className: 'hospital-tooltip', offset: [0, -18] })
          .bindPopup(`<div style="font-family:inherit;color:#0f172a;font-size:13px;">
            <strong style="color:#2563eb;">${hosp.name} (${abbrev})</strong><br/>
            <b>📞</b> ${hosp.contact_number}<br/>
            <b>🛏️ Beds:</b> ${hosp.available_beds}/${hosp.total_beds}<br/>
            <span style="font-size:11px;color:#475569;">${hosp.facilities.join(', ')}</span>
          </div>`);
      }
    });
    const hospIds = new Set(hospitals.map(h => h.id));
    Object.keys(m.hospitals).forEach(id => { if (!hospIds.has(id)) { m.hospitals[id].remove(); delete m.hospitals[id]; } });

    // B. User pin (non-citizen form picker only)
    if (userPin && !isCitizen) {
      if (m.userPin) m.userPin.setLatLng([userPin.latitude, userPin.longitude]);
      else m.userPin = L.marker([userPin.latitude, userPin.longitude], { icon: createPinIcon() })
        .addTo(map).bindPopup('<div style="color:#0f172a;font-family:inherit;"><strong>Selected Location</strong><br/>Click elsewhere to move</div>');
    } else if (!isCitizen && m.userPin) { m.userPin.remove(); m.userPin = null; }

    // C. Ambulances
    const currentAmbIds = new Set();
    ambulances.forEach(amb => {
      if (!amb || amb.latitude == null || amb.longitude == null) return;
      const lat = parseFloat(amb.latitude), lng = parseFloat(amb.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      currentAmbIds.add(amb.id);
      const isOwn = ownAmbulanceId && amb.id === ownAmbulanceId;
      const popup = `<div style="font-family:inherit;color:#0f172a;font-size:13px;">
        <strong style="font-size:14px;color:#059669;">🚑 ${amb.vehicle_number}${isOwn ? ' (YOU)' : ''}</strong><br/>
        <b>Driver:</b> ${amb.driver_name}<br/><b>Phone:</b> ${amb.driver_phone}<br/>
        <b>Status:</b> <span class="badge ${amb.status === 'Available' ? 'badge-green' : 'badge-orange'}">${amb.status}</span>
        ${amb.siren ? '<br/><span class="badge badge-red">🚨 SIREN ACTIVE</span>' : ''}
      </div>`;
      if (m.ambulances[amb.id]) {
        m.ambulances[amb.id].setLatLng([lat, lng]);
        m.ambulances[amb.id].setIcon(createAmbulanceIcon(amb.status, amb.bearing, amb.siren, isOwn));
        m.ambulances[amb.id].setPopupContent(popup);
      } else {
        m.ambulances[amb.id] = L.marker([lat, lng], { icon: createAmbulanceIcon(amb.status, amb.bearing, amb.siren, isOwn) })
          .addTo(map)
          .bindTooltip(`${amb.vehicle_number}${isOwn ? ' (YOU)' : ''}`, { permanent: true, direction: 'top', className: 'ambulance-tooltip', offset: [0, -14] })
          .bindPopup(popup);
      }
    });
    Object.keys(m.ambulances).forEach(id => { if (!currentAmbIds.has(id)) { m.ambulances[id].remove(); delete m.ambulances[id]; } });

    // D. Requests / Patients
    const currentReqIds = new Set();
    requests.forEach(req => {
      if (!req || !req.latitude || !req.longitude || req.status === 'Completed') return;
      currentReqIds.add(req.id);
      const popup = `<div style="font-family:inherit;color:#0f172a;font-size:13px;">
        <strong style="color:#e11d48;font-size:14px;">👤 ${req.emergency_type}</strong><br/>
        <b>Patient:</b> ${req.citizen_name}<br/><b>Phone:</b> ${req.citizen_phone}<br/>
        <b>Location:</b> ${req.location_name}<br/>
        <b>Status:</b> <span class="badge badge-red">${req.status}</span>
      </div>`;
      if (m.requests[req.id]) {
        m.requests[req.id].setLatLng([req.latitude, req.longitude]);
        m.requests[req.id].setIcon(createPatientIcon(true));
        m.requests[req.id].setPopupContent(popup);
      } else {
        m.requests[req.id] = L.marker([req.latitude, req.longitude], { icon: createPatientIcon(true) })
          .addTo(map)
          .bindTooltip(req.citizen_name || 'Patient', { permanent: true, direction: 'top', className: 'patient-tooltip', offset: [0, -16] })
          .bindPopup(popup);
      }
    });
    Object.keys(m.requests).forEach(id => { if (!currentReqIds.has(id)) { m.requests[id].remove(); delete m.requests[id]; } });

    // E. Routes
    m.routes.forEach(l => l.remove()); m.routes = [];
    if (showRoutes) {
      requests.forEach(req => {
        if (req.status === 'Completed' || !req.assigned_ambulance_id) return;
        const amb = ambulances.find(a => a.id === req.assigned_ambulance_id); if (!amb) return;
        if (req.status === 'Assigned' || req.status === 'En Route')
          m.routes.push(L.polyline([[amb.latitude, amb.longitude], [req.latitude, req.longitude]], { color: '#f97316', dashArray: '8,8', weight: 3, opacity: 0.8 }).addTo(map));
        if ((req.status === 'Reached Patient' || req.status === 'At Hospital') && req.assigned_hospital_id) {
          const hosp = hospitals.find(h => h.id === req.assigned_hospital_id);
          if (hosp) m.routes.push(L.polyline([[req.latitude, req.longitude], [hosp.latitude, hosp.longitude]], { color: '#a855f7', dashArray: '5,5', weight: 3, opacity: 0.8 }).addTo(map));
        }
      });
    }

    // F. Live "You Are Here" marker — always from database props, never from browser GPS
    // Only render for citizen (patient marker). Drivers already have their own ambulance marker with yellow highlight/tooltip.
    if (liveLocation && !liveLocation.isAmbulance) {
      if (m.liveLocation) {
        m.liveLocation.setLatLng([liveLocation.lat, liveLocation.lng]);
        m.liveLocation.setIcon(createLiveLocationIcon(liveLocation.isAmbulance));
      } else {
        m.liveLocation = L.marker([liveLocation.lat, liveLocation.lng], { icon: createLiveLocationIcon(liveLocation.isAmbulance), zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(`<div style="font-family:inherit;color:#0f172a;font-size:12px;font-weight:bold;text-align:center;">👤 Your Live Position</div>`);
      }
    } else if (m.liveLocation) { m.liveLocation.remove(); m.liveLocation = null; }

  }, [ambulances, requests, hospitals, userPin, showRoutes, liveLocation, ownAmbulanceId, isCitizen]);

  // ── Map div style changes based on isMaximized ──────────────────────────
  const outerStyle = isMaximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: '#1a1a2e'
      }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
      };

  const mapStyle = isMaximized
    ? {
        position: 'absolute',
        top: '48px',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100vh - 48px)',
        background: '#1a1a2e'
      }
    : {
        width: '100%',
        height: '100%',
        minHeight: '300px'
      };

  return (
    <>
      {/* ── CSS ── */}
      <style>{`
        .hospital-tooltip{background-color:#3b82f6!important;color:white!important;border:1px solid white!important;font-weight:bold!important;font-size:10px!important;padding:2px 5px!important;border-radius:4px!important;}
        .patient-tooltip{background-color:#ef4444!important;color:white!important;border:1px solid white!important;font-weight:bold!important;font-size:10px!important;padding:2px 5px!important;border-radius:4px!important;}
        .ambulance-tooltip{background-color:#10b981!important;color:white!important;border:1px solid white!important;font-weight:bold!important;font-size:10px!important;padding:2px 5px!important;border-radius:4px!important;}
        @keyframes patient-pulse{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}
        @keyframes ambulance-pulse{0%{transform:scale(0.6);opacity:1}100%{transform:scale(2.2);opacity:0}}
        @keyframes live-pulse{0%{transform:scale(0.5);opacity:0.9}100%{transform:scale(2.8);opacity:0}}
        .patient-pulse-ring{position:absolute;width:32px;height:32px;border:2px solid #ef4444;border-radius:50%;animation:patient-pulse 2s infinite ease-out;pointer-events:none;}
        .ambulance-pulse-ring{position:absolute;width:28px;height:28px;border:2px solid #3b82f6;border-radius:50%;animation:ambulance-pulse 2s infinite ease-out;pointer-events:none;z-index:1;}
        .live-pulse-ring{position:absolute;width:36px;height:36px;border:2.5px solid #ef4444;border-radius:50%;animation:live-pulse 2s infinite ease-out;pointer-events:none;}
        .live-pulse-ring-delay{animation-delay:1s;}
        .marker-pin-wrapper{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;}
        .marker-pin{width:32px;height:32px;border-radius:50% 50% 50% 0;background:#3b82f6;position:absolute;transform:rotate(-45deg);left:50%;top:50%;margin-left:-16px;margin-top:-16px;display:flex;align-items:center;justify-content:center;border:3px solid white;}
        .marker-pin-inner{transform:rotate(45deg);font-size:16px;}
      `}</style>

      {/* ── Map container wrapper ── */}
      <div style={outerStyle}>
        {/* ── Fullscreen header (only when maximized) ── */}
        {isMaximized && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '48px',
            zIndex: 999999, background: 'rgba(10,14,26,0.98)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.5)'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🗺️ Live Map
              {liveLocation && (
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>● LIVE</span>
              )}
            </span>
            <button
              onClick={handleCloseMaximize}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)',
                color: '#ef4444', fontSize: '1.1rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >✕</button>
          </div>
        )}

        <div
          ref={mapContainerRef}
          style={mapStyle}
        />

        {/* Maximize / Minimize button */}
        <button
          onClick={toggleMaximize}
          title={isMaximized ? 'Minimize map' : 'Expand to full screen'}
          style={{
            position: 'absolute',
            bottom: '12px', right: '12px',
            zIndex: 999999,
            width: '38px', height: '38px', borderRadius: '8px',
            background: 'rgba(15,23,42,0.88)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            color: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            fontSize: '16px',
            fontWeight: 700,
            transition: 'background 0.18s, transform 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(37,99,235,0.9)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(15,23,42,0.88)'}
        >
          {isMaximized ? '⊠' : '⊞'}
        </button>
      </div>
    </>
  );
}
