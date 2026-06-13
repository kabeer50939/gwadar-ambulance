const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

app.use(express.json());

// Express HTTP Server & Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ================= RBAC AUTHENTICATION MIDDLEWARE =================

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing auth header" });
  }

  const token = authHeader.split(' ')[1];

  // Citizen anonymous session token format: citizen-session-<sessionId>
  if (token.startsWith('citizen-session-')) {
    req.user = { id: token, role: 'citizen', name: 'Anonymous Citizen' };
    return next();
  }

  // Staff token format: token-<role>-<userId>
  const parts = token.split('-');
  if (parts.length < 3 || parts[0] !== 'token') {
    return res.status(401).json({ error: "Unauthorized: Invalid token format" });
  }

  const role = parts[1];
  const userId = parts.slice(2).join('-');

  const user = db.getUserById(userId);
  if (!user || user.role !== role) {
    return res.status(401).json({ error: "Unauthorized: User mismatch" });
  }

  req.user = user;
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

// ================= API ENDPOINTS =================

// 1. Staff Login (Username + Password — Chairman, Driver, Dispatcher)
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = db.getUserByUsername(username.trim());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = `token-${user.role}-${user.id}`;
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        ambulance_id: user.ambulance_id || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1b. Citizen Quick Session (No credentials needed — anonymous access)
app.post('/api/citizen/session', (req, res) => {
  try {
    const sessionId = `citizen-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    res.json({
      token: sessionId,
      user: {
        id: sessionId,
        name: req.body.name || 'Citizen',
        phone: req.body.phone || '',
        role: 'citizen'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get ambulances
app.get('/api/ambulances', authenticate, requireRole(['dispatcher', 'driver', 'chairman']), (req, res) => {
  try {
    const ambulances = db.getAmbulances();
    res.json(ambulances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get hospitals
app.get('/api/hospitals', authenticate, (req, res) => {
  try {
    const hospitals = db.getHospitals();
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get emergency requests
app.get('/api/requests', authenticate, (req, res) => {
  try {
    const requests = db.getRequests();
    if (req.user.role === 'dispatcher' || req.user.role === 'chairman') {
      res.json(requests);
    } else if (req.user.role === 'citizen') {
      // Citizens see requests matching their session id or phone
      const citizenRequests = requests.filter(r =>
        r.citizen_id === req.user.id
      );
      res.json(citizenRequests);
    } else if (req.user.role === 'driver') {
      if (!req.user.ambulance_id) return res.json([]);
      const driverRequests = requests.filter(r => r.assigned_ambulance_id === req.user.ambulance_id);
      res.json(driverRequests);
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Create emergency request (Citizens and Dispatchers)
app.post('/api/requests', authenticate, requireRole(['citizen', 'dispatcher']), (req, res) => {
  try {
    const { citizen_name, citizen_phone, emergency_type, latitude, longitude, location_name } = req.body;
    if (!citizen_name || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newRequest = db.createRequest({
      citizen_id: req.user.id,
      citizen_name,
      citizen_phone: citizen_phone || req.user.phone || '',
      emergency_type,
      latitude,
      longitude,
      location_name
    });

    // Recommend nearest ambulance
    const ambulances = db.getAmbulances();
    const availableAmbulances = ambulances.filter(a => a.status === 'Available');
    let nearestAmbulance = null;
    let minDistance = Infinity;

    availableAmbulances.forEach(amb => {
      const dist = getDistance(latitude, longitude, amb.latitude, amb.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestAmbulance = amb;
      }
    });

    const responsePayload = {
      ...newRequest,
      suggested_ambulance: nearestAmbulance ? {
        id: nearestAmbulance.id,
        vehicle_number: nearestAmbulance.vehicle_number,
        driver_name: nearestAmbulance.driver_name,
        distance_km: parseFloat(minDistance.toFixed(2))
      } : null
    };

    io.emit('request:new', responsePayload);
    io.emit('ticker:log', `SOS Request by ${citizen_name} — ${emergency_type}`);

    res.status(201).json(responsePayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Assign ambulance & hospital (Dispatcher only)
app.post('/api/requests/:id/assign', authenticate, requireRole(['dispatcher']), (req, res) => {
  try {
    const { id } = req.params;
    const { ambulance_id, hospital_id } = req.body;

    const request = db.getRequestById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const ambulance = db.getAmbulanceById(ambulance_id);
    if (!ambulance) return res.status(404).json({ error: "Ambulance not found" });

    const updatedRequest = db.updateRequest(id, {
      status: 'Assigned',
      assigned_ambulance_id: ambulance_id,
      assigned_hospital_id: hospital_id || null
    });

    const updatedAmbulance = db.updateAmbulance(ambulance_id, { status: 'On Duty' });

    const payload = { request: updatedRequest, ambulance: updatedAmbulance };

    io.emit('request:updated', updatedRequest);
    io.emit('ambulance:updated', updatedAmbulance);
    io.to(id).emit('tracking:updated', payload);
    io.emit(`driver:assigned:${ambulance_id}`, payload);
    io.emit('ticker:log', `Ambulance ${ambulance.vehicle_number} dispatched to ${request.citizen_name}`);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Update request status
app.post('/api/requests/:id/status', authenticate, requireRole(['dispatcher', 'driver']), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = db.getRequestById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (req.user.role === 'driver' && request.assigned_ambulance_id !== req.user.ambulance_id) {
      return res.status(403).json({ error: "Forbidden: Not your assignment" });
    }

    const updates = { status };
    if (status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    }

    const updatedRequest = db.updateRequest(id, updates);
    let updatedAmbulance = null;

    if (request.assigned_ambulance_id) {
      let ambStatus = 'On Duty';
      if (status === 'Reached Patient') ambStatus = 'Reached Patient';
      else if (status === 'At Hospital') ambStatus = 'At Hospital';
      else if (status === 'Completed') ambStatus = 'Available';

      updatedAmbulance = db.updateAmbulance(request.assigned_ambulance_id, { status: ambStatus });
    }

    // Auto bed decrement when at hospital
    if (status === 'At Hospital' && request.status !== 'At Hospital' && request.assigned_hospital_id) {
      const hosp = db.getHospitalById(request.assigned_hospital_id);
      if (hosp && hosp.available_beds > 0) {
        const updatedHosp = db.updateHospital(request.assigned_hospital_id, {
          available_beds: hosp.available_beds - 1
        });
        io.emit('hospital:updated', updatedHosp);
        io.emit('ticker:log', `Bed allocated at ${hosp.name}. Remaining: ${updatedHosp.available_beds}`);
      }
    }

    const payload = { request: updatedRequest, ambulance: updatedAmbulance };

    io.emit('request:updated', updatedRequest);
    if (updatedAmbulance) io.emit('ambulance:updated', updatedAmbulance);
    io.to(id).emit('tracking:updated', payload);

    const amb = db.getAmbulanceById(request.assigned_ambulance_id);
    io.emit('ticker:log', `${amb ? amb.vehicle_number : 'Unit'} status → ${status}`);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Patient Vitals Telemetry (Driver only)
app.post('/api/requests/:id/telemetry', authenticate, requireRole(['driver']), (req, res) => {
  try {
    const { id } = req.params;
    const { heart_rate, blood_pressure, spo2, condition } = req.body;

    const request = db.getRequestById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.assigned_ambulance_id !== req.user.ambulance_id) {
      return res.status(403).json({ error: "Forbidden: Not your patient" });
    }

    const telemetry = {
      heart_rate: parseInt(heart_rate),
      blood_pressure,
      spo2: parseInt(spo2),
      condition,
      updated_at: new Date().toISOString()
    };

    const updatedRequest = db.updateRequest(id, { telemetry });
    const payload = { request: updatedRequest, ambulance: db.getAmbulanceById(request.assigned_ambulance_id) };

    io.emit('request:updated', updatedRequest);
    io.to(id).emit('tracking:updated', payload);
    io.emit('ticker:log', `ePCR Vitals received for ${request.citizen_name}. Condition: ${condition}`);

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8a. Voice Message Upload (Citizens)
app.post('/api/requests/:id/voice', authenticate, requireRole(['citizen']), (req, res) => {
  try {
    const { id } = req.params;
    const { voice_base64 } = req.body;

    if (!voice_base64) {
      return res.status(400).json({ error: "Missing voice data" });
    }

    const request = db.getRequestById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const updatedRequest = db.addRequestVoiceRecording(id, voice_base64);
    const payload = {
      request: updatedRequest,
      ambulance: request.assigned_ambulance_id ? db.getAmbulanceById(request.assigned_ambulance_id) : null
    };

    io.emit('request:updated', updatedRequest);
    io.to(id).emit('tracking:updated', payload);
    io.emit('ticker:log', `Voice message received from ${request.citizen_name}`);

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8b. Update Hospital Capacity (Dispatcher only)
app.put('/api/hospitals/:id', authenticate, requireRole(['dispatcher']), (req, res) => {
  try {
    const { id } = req.params;
    const { available_beds, total_beds, icu_ventilators } = req.body;

    const hospital = db.getHospitalById(id);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const updates = {};
    if (available_beds !== undefined) updates.available_beds = parseInt(available_beds);
    if (total_beds !== undefined) updates.total_beds = parseInt(total_beds);
    if (icu_ventilators !== undefined) updates.icu_ventilators = parseInt(icu_ventilators);

    const updatedHospital = db.updateHospital(id, updates);
    io.emit('hospital:updated', updatedHospital);
    io.emit('ticker:log', `${hospital.name} capacity updated.`);

    res.json(updatedHospital);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Reset DB (Dispatcher only)
app.post('/api/reset', authenticate, requireRole(['dispatcher', 'chairman']), (req, res) => {
  try {
    db.resetDb();
    io.emit('system:reset');
    res.json({ message: "Database reset successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= STAFF MANAGEMENT (Chairman Only) =================

// 10. Get all staff (drivers & dispatchers)
app.get('/api/staff', authenticate, requireRole(['chairman']), (req, res) => {
  try {
    const staff = db.getStaff().map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      phone: u.phone,
      role: u.role,
      ambulance_id: u.ambulance_id || null,
      created_at: u.created_at || null
    }));
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Create staff account (Chairman only)
app.post('/api/staff', authenticate, requireRole(['chairman']), (req, res) => {
  try {
    const { name, username, password, role, phone, ambulance_id } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: "Name, username, password, and role are required" });
    }

    if (!['driver', 'dispatcher'].includes(role)) {
      return res.status(400).json({ error: "Role must be 'driver' or 'dispatcher'" });
    }

    const result = db.createStaffAccount({
      name,
      username,
      password,
      role,
      phone: phone || '',
      ambulance_id: role === 'driver' ? (ambulance_id || null) : null,
      created_by: req.user.id
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    io.emit('ticker:log', `New ${role} account created: ${name} (@${username}) by Chairman`);
    res.status(201).json({
      id: result.id,
      name: result.name,
      username: result.username,
      phone: result.phone,
      role: result.role,
      ambulance_id: result.ambulance_id || null,
      created_at: result.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Delete staff account (Chairman only)
app.delete('/api/staff/:id', authenticate, requireRole(['chairman']), (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteStaffAccount(id);
    if (!deleted) {
      return res.status(404).json({ error: "Staff account not found or cannot be deleted" });
    }
    io.emit('ticker:log', `Staff account removed by Chairman`);
    res.json({ message: "Staff account deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= WEBSOCKET =================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join:tracking', (requestId) => {
    socket.join(requestId);
    const reqData = db.getRequestById(requestId);
    if (reqData && reqData.assigned_ambulance_id) {
      const ambData = db.getAmbulanceById(reqData.assigned_ambulance_id);
      socket.emit('tracking:updated', { request: reqData, ambulance: ambData });
    }
  });

  socket.on('driver:location-update', (data) => {
    const { ambulanceId, latitude, longitude, bearing, status, siren } = data;
    if (!ambulanceId) return;

    const updates = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    if (bearing !== undefined) updates.bearing = parseFloat(bearing);
    if (status) updates.status = status;
    if (siren !== undefined) updates.siren = !!siren;

    const updatedAmbulance = db.updateAmbulance(ambulanceId, updates);
    if (updatedAmbulance) {
      io.emit('ambulance:updated', updatedAmbulance);

      const activeRequests = db.getRequests().filter(
        r => r.assigned_ambulance_id === ambulanceId && r.status !== 'Completed'
      );

      activeRequests.forEach(req => {
        io.to(req.id).emit('tracking:updated', {
          request: req,
          ambulance: updatedAmbulance
        });
      });
    }
  });

  socket.on('chat:send-message', (data) => {
    const { requestId, sender, text } = data;
    if (!requestId || !sender || !text) return;

    const updatedRequest = db.addRequestChatMessage(requestId, { sender, text });
    if (updatedRequest) {
      const payload = {
        request: updatedRequest,
        ambulance: updatedRequest.assigned_ambulance_id
          ? db.getAmbulanceById(updatedRequest.assigned_ambulance_id)
          : null
      };
      io.to(requestId).emit('tracking:updated', payload);
      io.emit('request:updated', updatedRequest);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Gwadar Ambulance backend listening on http://localhost:${PORT}`);
});
