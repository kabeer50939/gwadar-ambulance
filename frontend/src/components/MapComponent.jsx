import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Gwadar Center Coordinates
const GWADAR_CENTER = [25.1219, 62.3254];

// Custom Icon Creators using standard SVGs/Emojis to avoid Leaflet path bugs
const createPatientIcon = (isPending) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="marker-pin-wrapper">
        ${isPending ? '<div class="pulse-ring"></div>' : ''}
        <div class="marker-pin" style="background-color: #f43f5e; border-color: white;">
          <div class="marker-pin-inner">🆘</div>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -15]
  });
};

const createAmbulanceIcon = (status, bearing = 0, siren = false) => {
  let color = '#10b981'; // Available
  if (status === 'On Duty' || status === 'En Route') color = '#f97316'; // Orange
  if (status === 'Reached Patient') color = '#f43f5e'; // Red
  if (status === 'At Hospital') color = '#a855f7'; // Purple

  const extraClass = siren ? 'siren-pulse-active' : '';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="transform: rotate(${bearing}deg); transition: transform 0.3s ease-out; display: flex; justify-content: center; align-items: center;">
        <div class="${extraClass}" style="width: 36px; height: 36px; border-radius: 8px; background-color: ${color}; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-size: 18px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">🚑</span>
        </div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
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

export default function MapComponent({
  ambulances = [],
  requests = [],
  hospitals = [],
  selectedRequestId = null,
  onMapClick = null,
  userPin = null,
  showRoutes = true
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({
    ambulances: {},
    requests: {},
    hospitals: {},
    userPin: null,
    routes: []
  });

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

  // 2. Center map on selected request or user pin when they change
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedRequestId) {
      const req = requests.find(r => r.id === selectedRequestId);
      if (req) {
        mapRef.current.setView([req.latitude, req.longitude], 14, { animate: true });
      }
    } else if (userPin) {
      mapRef.current.setView([userPin.latitude, userPin.longitude], 14, { animate: true });
    }
  }, [selectedRequestId, userPin, requests]);

  // 3. Render / Update Markers and Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = markersRef.current;

    // A. Update Hospitals
    hospitals.forEach(hosp => {
      if (markers.hospitals[hosp.id]) {
        // Move or update popup
        markers.hospitals[hosp.id].setLatLng([hosp.latitude, hosp.longitude]);
      } else {
        // Create marker
        const marker = L.marker([hosp.latitude, hosp.longitude], { icon: createHospitalIcon() })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; color: #f8fafc; font-size: 13px;">
              <strong style="color: #3b82f6; font-size: 14px;">${hosp.name}</strong><br/>
              <b>📞 Contact:</b> ${hosp.contact_number}<br/>
              <b>🛏️ Available Beds:</b> ${hosp.available_beds} / ${hosp.total_beds}<br/>
              <b>💨 ICU Ventilators:</b> ${hosp.icu_ventilators}<br/>
              <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 4px;">
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
            <div style="color: #f8fafc; font-family: inherit;">
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
      currentAmbIds.add(amb.id);
      if (markers.ambulances[amb.id]) {
        markers.ambulances[amb.id].setLatLng([amb.latitude, amb.longitude]);
        markers.ambulances[amb.id].setIcon(createAmbulanceIcon(amb.status, amb.bearing, amb.siren));
        // Update popup
        markers.ambulances[amb.id].setPopupContent(`
          <div style="font-family: inherit; color: #f8fafc; font-size: 13px;">
            <strong style="font-size: 14px; color: #10b981;">🚑 ${amb.vehicle_number}</strong><br/>
            <b>Driver:</b> ${amb.driver_name}<br/>
            <b>Phone:</b> ${amb.driver_phone}<br/>
            <b>Status:</b> <span class="badge ${amb.status === 'Available' ? 'badge-green' : 'badge-orange'}">${amb.status}</span>
            ${amb.siren ? '<br/><span class="badge badge-red pulse-icon">🚨 SIREN ACTIVE</span>' : ''}
          </div>
        `);
      } else {
        const marker = L.marker([amb.latitude, amb.longitude], { icon: createAmbulanceIcon(amb.status, amb.bearing, amb.siren) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; color: #f8fafc; font-size: 13px;">
              <strong style="font-size: 14px; color: #10b981;">🚑 ${amb.vehicle_number}</strong><br/>
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
      if (req.status === 'Completed') return; // Don't show completed ones on map
      
      currentReqIds.add(req.id);
      const isPending = req.status === 'Pending';
      
      if (markers.requests[req.id]) {
        markers.requests[req.id].setLatLng([req.latitude, req.longitude]);
        markers.requests[req.id].setIcon(createPatientIcon(isPending));
      } else {
        const marker = L.marker([req.latitude, req.longitude], { icon: createPatientIcon(isPending) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; color: #f8fafc; font-size: 13px;">
              <strong style="color: #f43f5e; font-size: 14px;">🆘 ${req.emergency_type} Request</strong><br/>
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

  }, [ambulances, requests, hospitals, userPin, showRoutes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        className="dark-map"
      />
    </div>
  );
}
