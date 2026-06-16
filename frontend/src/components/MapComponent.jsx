import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Gwadar Center Coordinates
const GWADAR_CENTER = [25.1219, 62.3254];

// Custom Icon Creators using standard SVGs/Emojis to avoid Leaflet path bugs
const createPatientIcon = (isPending) => {
  const pulseRing = isPending ? '<div class="patient-pulse-ring"></div>' : '';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="display: flex; justify-content: center; align-items: center; position: relative; width: 32px; height: 32px;">
        ${pulseRing}
        <span style="font-size: 28px; line-height: 1; user-select: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">👤</span>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const getHospitalAbbreviation = (name, id) => {
  if (!name) return 'HOSP';
  if (id === 'hosp-01' || name.toLowerCase().includes('indus')) return 'GIH';
  if (id === 'hosp-03' || name.toLowerCase().includes('dhq')) return 'DHQ';
  return name.slice(0, 3).toUpperCase();
};

const createAmbulanceIcon = (status, bearing = 0, siren = false, isOwn = false) => {
  const sirenGlow = siren ? 'filter: drop-shadow(0 0 6px #ef4444) drop-shadow(0 0 2px #ef4444);' : '';
  const ownHighlight = isOwn ? 'filter: drop-shadow(0 0 8px #eab308) drop-shadow(0 0 3px #eab308);' : '';
  
  const ownLabelHtml = isOwn
    ? `<div style="position: absolute; top: -16px; background: #eab308; color: black; font-size: 8px; font-weight: 900; padding: 1px 3px; border-radius: 3px; border: 1px solid white; white-space: nowrap; transform: rotate(${-bearing}deg); pointer-events: none; z-index: 10;">YOU</div>`
    : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="transform: rotate(${bearing}deg); transition: transform 0.3s ease-out; display: flex; justify-content: center; align-items: center; position: relative; width: 28px; height: 28px;">
        ${ownLabelHtml}
        <span style="font-size: 26px; ${sirenGlow} ${ownHighlight} line-height: 1; user-select: none;">🚑</span>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const createHospitalIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #3b82f6; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
        <span style="font-size: 18px;">🏥</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const createPinIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="marker-pin-wrapper">
        <div class="marker-pin" style="background-color: #3b82f6; border-color: white;">
          <div class="marker-pin-inner">📍</div>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -15]
  });
};

const createBlueDotIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="blue-dot-wrapper">
        <div class="blue-dot-pulse"></div>
        <div class="blue-dot"></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function MapComponent({
  ambulances = [],
  requests = [],
  hospitals = [],
  selectedRequestId = null,
  ownAmbulanceId = null,
  onMapClick = null,
  userPin = null,
  showRoutes = true
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const lastCenteredIdRef = useRef(null);
  const lastCenteredPinRef = useRef(null);
  const lastCenteredAmbRef = useRef(null);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const markersRef = useRef({
    ambulances: {},
    requests: {},
    hospitals: {},
    userPin: null,
    deviceLocation: null,
    routes: []
  });

  // Continuous watch of the device's real-time location (blue dot)
  useEffect(() => {
    if (!navigator.geolocation) return;

    const startWatch = (highAccuracy) => {
      return navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDeviceLocation({ latitude, longitude });
        },
        (err) => {
          console.warn("MapComponent geolocation watch failed, retrying with low accuracy...", err);
          if (highAccuracy) {
            navigator.geolocation.clearWatch(watchId);
            watchId = startWatch(false);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 3000 : 10000, maximumAge: 0 }
      );
    };

    let watchId = startWatch(true);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: GWADAR_CENTER,
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    // Add Click listener for placing a pin
    const handleMapClick = (e) => {
      if (onMapClick) {
        onMapClick({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        });
      }
    };
    
    map.on('click', handleMapClick);

    // Clean up
    return () => {
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // 2. Center map on selected request or user pin or device location when they change
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedRequestId) {
      if (lastCenteredIdRef.current !== selectedRequestId) {
        const req = requests.find(r => r.id === selectedRequestId);
        if (req) {
          mapRef.current.setView([req.latitude, req.longitude], 14, { animate: false });
          lastCenteredIdRef.current = selectedRequestId;
          lastCenteredAmbRef.current = null;
        }
      }
    } else {
      lastCenteredIdRef.current = null;
      if (userPin) {
        const pinKey = `${userPin.latitude.toFixed(4)},${userPin.longitude.toFixed(4)}`;
        if (lastCenteredPinRef.current !== pinKey) {
          mapRef.current.setView([userPin.latitude, userPin.longitude], 14, { animate: false });
          lastCenteredPinRef.current = pinKey;
          lastCenteredAmbRef.current = null;
        }
      } else if (ownAmbulanceId) {
        if (lastCenteredAmbRef.current !== ownAmbulanceId) {
          const ownAmb = ambulances.find(a => a.id === ownAmbulanceId);
          if (ownAmb) {
            mapRef.current.setView([ownAmb.latitude, ownAmb.longitude], 14, { animate: false });
            lastCenteredAmbRef.current = ownAmbulanceId;
          }
        }
      } else if (deviceLocation) {
        const pinKey = `${deviceLocation.latitude.toFixed(4)},${deviceLocation.longitude.toFixed(4)}`;
        if (lastCenteredPinRef.current !== pinKey) {
          mapRef.current.setView([deviceLocation.latitude, deviceLocation.longitude], 14, { animate: false });
          lastCenteredPinRef.current = pinKey;
          lastCenteredAmbRef.current = null;
        }
      }
    }
  }, [selectedRequestId, userPin, requests, deviceLocation, ownAmbulanceId, ambulances]);

  // 3. Render / Update Markers and Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;

    // A. Update Hospitals
    hospitals.forEach(hosp => {
      const abbrev = getHospitalAbbreviation(hosp.name, hosp.id);
      if (markers.hospitals[hosp.id]) {
        // Move or update popup
        markers.hospitals[hosp.id].setLatLng([hosp.latitude, hosp.longitude]);
      } else {
        // Create marker
        const marker = L.marker([hosp.latitude, hosp.longitude], { icon: createHospitalIcon() })
          .addTo(map)
          .bindTooltip(abbrev, {
            permanent: true,
            direction: 'top',
            className: 'hospital-tooltip',
            offset: [0, -18]
          })
          .bindPopup(`
            <div style="font-family: inherit; color: #0f172a; font-size: 13px;">
              <strong style="color: #2563eb; font-size: 14px;">${hosp.name} (${abbrev})</strong><br/>
              <b>📞 Contact:</b> ${hosp.contact_number}<br/>
              <b>🛏️ Available Beds:</b> ${hosp.available_beds} / ${hosp.total_beds}<br/>
              <b>💨 ICU Ventilators:</b> ${hosp.icu_ventilators}<br/>
              <span style="font-size: 11px; color: #475569; display: block; margin-top: 4px;">
                Facilities: ${hosp.facilities.join(', ')}
              </span>
            </div>
          `);
        markers.hospitals[hosp.id] = marker;
      }
    });

    // B. Update User Pin (Form Location Picker)
    if (userPin) {
      if (markers.userPin) {
        markers.userPin.setLatLng([userPin.latitude, userPin.longitude]);
      } else {
        markers.userPin = L.marker([userPin.latitude, userPin.longitude], { icon: createPinIcon() })
          .addTo(map)
          .bindPopup(`
            <div style="color: #0f172a; font-family: inherit;">
              <strong>Your Selected Location</strong><br/>
              Drag or click elsewhere to move
            </div>
          `);
      }
    } else {
      if (markers.userPin) {
        markers.userPin.remove();
        markers.userPin = null;
      }
    }

    // C. Update Ambulances
    const currentAmbIds = new Set();
    ambulances.forEach(amb => {
      if (!amb || amb.latitude === undefined || amb.longitude === undefined || amb.latitude === null || amb.longitude === null) return;
      
      const lat = parseFloat(amb.latitude);
      const lng = parseFloat(amb.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      currentAmbIds.add(amb.id);
      const isOwn = ownAmbulanceId && amb.id === ownAmbulanceId;
      
      if (markers.ambulances[amb.id]) {
        markers.ambulances[amb.id].setLatLng([lat, lng]);
        markers.ambulances[amb.id].setIcon(createAmbulanceIcon(amb.status, amb.bearing, amb.siren, isOwn));
        // Update popup
        markers.ambulances[amb.id].setPopupContent(`
          <div style="font-family: inherit; color: #0f172a; font-size: 13px;">
            <strong style="font-size: 14px; color: #059669;">🚑 ${amb.vehicle_number} ${isOwn ? '(YOU)' : ''}</strong><br/>
            <b>Driver:</b> ${amb.driver_name}<br/>
            <b>Phone:</b> ${amb.driver_phone}<br/>
            <b>Status:</b> <span class="badge ${amb.status === 'Available' ? 'badge-green' : 'badge-orange'}">${amb.status}</span>
            ${amb.siren ? '<br/><span class="badge badge-red pulse-icon">🚨 SIREN ACTIVE</span>' : ''}
          </div>
        `);
      } else {
        const marker = L.marker([lat, lng], { icon: createAmbulanceIcon(amb.status, amb.bearing, amb.siren, isOwn) })
          .addTo(map)
          .bindTooltip(`${amb.vehicle_number} ${isOwn ? '(YOU)' : ''}`, {
            permanent: true,
            direction: 'top',
            className: 'ambulance-tooltip',
            offset: [0, -14]
          })
          .bindPopup(`
            <div style="font-family: inherit; color: #0f172a; font-size: 13px;">
              <strong style="font-size: 14px; color: #059669;">🚑 ${amb.vehicle_number} ${isOwn ? '(YOU)' : ''}</strong><br/>
              <b>Driver:</b> ${amb.driver_name}<br/>
              <b>Phone:</b> ${amb.driver_phone}<br/>
              <b>Status:</b> <span class="badge ${amb.status === 'Available' ? 'badge-green' : 'badge-orange'}">${amb.status}</span>
              ${amb.siren ? '<br/><span class="badge badge-red pulse-icon">🚨 SIREN ACTIVE</span>' : ''}
            </div>
          `);
        markers.ambulances[amb.id] = marker;
      }
    });

    // Remove ambulances not in data
    Object.keys(markers.ambulances).forEach(id => {
      if (!currentAmbIds.has(id)) {
        markers.ambulances[id].remove();
        delete markers.ambulances[id];
      }
    });

    // D. Update Requests
    const currentReqIds = new Set();
    requests.forEach(req => {
      if (!req || !req.latitude || !req.longitude || req.status === 'Completed') return; // Don't show completed or invalid ones on map
      
      currentReqIds.add(req.id);
      const isPending = req.status === 'Pending';
      
      if (markers.requests[req.id]) {
        markers.requests[req.id].setLatLng([req.latitude, req.longitude]);
        markers.requests[req.id].setIcon(createPatientIcon(isPending));
        // Update popup
        markers.requests[req.id].setPopupContent(`
          <div style="font-family: inherit; color: #0f172a; font-size: 13px;">
            <strong style="color: #e11d48; font-size: 14px;">👤 Patient Request (${req.emergency_type})</strong><br/>
            <b>Patient:</b> ${req.citizen_name}<br/>
            <b>Phone:</b> ${req.citizen_phone}<br/>
            <b>Location:</b> ${req.location_name}<br/>
            <b>Status:</b> <span class="badge badge-red">${req.status}</span>
          </div>
        `);
      } else {
        const marker = L.marker([req.latitude, req.longitude], { icon: createPatientIcon(isPending) })
          .addTo(map)
          .bindTooltip(req.citizen_name || 'Patient', {
            permanent: true,
            direction: 'top',
            className: 'patient-tooltip',
            offset: [0, -16]
          })
          .bindPopup(`
            <div style="font-family: inherit; color: #0f172a; font-size: 13px;">
              <strong style="color: #e11d48; font-size: 14px;">👤 Patient Request (${req.emergency_type})</strong><br/>
              <b>Patient:</b> ${req.citizen_name}<br/>
              <b>Phone:</b> ${req.citizen_phone}<br/>
              <b>Location:</b> ${req.location_name}<br/>
              <b>Status:</b> <span class="badge badge-red">${req.status}</span>
            </div>
          `);
        markers.requests[req.id] = marker;
      }
    });

    // Remove outdated requests
    Object.keys(markers.requests).forEach(id => {
      if (!currentReqIds.has(id)) {
        markers.requests[id].remove();
        delete markers.requests[id];
      }
    });

    // E. Draw Routing Lines
    // Remove existing polylines
    markers.routes.forEach(line => line.remove());
    markers.routes = [];

    if (showRoutes) {
      requests.forEach(req => {
        if (req.status === 'Completed' || !req.assigned_ambulance_id) return;
        
        const amb = ambulances.find(a => a.id === req.assigned_ambulance_id);
        if (!amb) return;

        // Route: Ambulance -> Patient
        if (req.status === 'Assigned' || req.status === 'En Route') {
          const ambToPatientLine = L.polyline(
            [[amb.latitude, amb.longitude], [req.latitude, req.longitude]],
            { color: '#f97316', dashArray: '8, 8', weight: 3, opacity: 0.8 }
          ).addTo(map);
          markers.routes.push(ambToPatientLine);
        }

        // Route: Patient -> Hospital
        if (req.status === 'Reached Patient' || req.status === 'At Hospital') {
          if (req.assigned_hospital_id) {
            const hosp = hospitals.find(h => h.id === req.assigned_hospital_id);
            if (hosp) {
              const patientToHospLine = L.polyline(
                [[req.latitude, req.longitude], [hosp.latitude, hosp.longitude]],
                { color: '#a855f7', dashArray: '5, 5', weight: 3, opacity: 0.8 }
              ).addTo(map);
              markers.routes.push(patientToHospLine);
            }
          }
        }
      });
    }

    // F. Removed Device Location Blue Dot block to avoid duplicate markers

  }, [ambulances, requests, hospitals, userPin, showRoutes, deviceLocation, ownAmbulanceId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .blue-dot-wrapper {
          position: relative;
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .blue-dot {
          width: 12px;
          height: 12px;
          background-color: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
          z-index: 2;
        }
        .blue-dot-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          background-color: rgba(59, 130, 246, 0.4);
          border-radius: 50%;
          animation: blue-pulse 2s infinite ease-out;
          z-index: 1;
        }
        @keyframes blue-pulse {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
        .hospital-tooltip {
          background-color: #3b82f6 !important;
          color: white !important;
          border: 1px solid white !important;
          font-weight: bold !important;
          font-size: 10px !important;
          padding: 2px 5px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        .patient-tooltip {
          background-color: #ef4444 !important;
          color: white !important;
          border: 1px solid white !important;
          font-weight: bold !important;
          font-size: 10px !important;
          padding: 2px 5px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        .ambulance-tooltip {
          background-color: #10b981 !important;
          color: white !important;
          border: 1px solid white !important;
          font-weight: bold !important;
          font-size: 10px !important;
          padding: 2px 5px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        @keyframes own-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(234, 179, 8, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(234, 179, 8, 0);
          }
        }
        .own-ambulance-pulse {
          animation: own-pulse 2s infinite !important;
        }
        @keyframes patient-pulse {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(2.0);
            opacity: 0;
          }
        }
        .patient-pulse-ring {
          position: absolute;
          width: 32px;
          height: 32px;
          border: 2px solid #ef4444;
          border-radius: 50%;
          animation: patient-pulse 2s infinite ease-out;
          pointer-events: none;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        className="dark-map"
      />
    </div>
  );
}
