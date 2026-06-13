const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data', 'database.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial seed data with users and roles
const initialData = {
  users: [
    // Chairman (Super Admin)
    {
      id: "usr-chairman-01",
      name: "Chairman GASG",
      username: "chairman",
      phone: "03330001122",
      password: "chairman123",
      role: "chairman"
    },
    // Dispatcher (created by Chairman)
    {
      id: "usr-disp-01",
      name: "Saleem Shah",
      username: "saleem",
      phone: "+92 300 0000000",
      password: "dispatch123",
      role: "dispatcher"
    },
    // Drivers (created by Chairman, linked to their ambulances)
    {
      id: "usr-driver-01",
      name: "Kabeer Khan",
      username: "kabeer",
      phone: "+92 300 1234567",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-01"
    },
    {
      id: "usr-driver-02",
      name: "Sajid Baloch",
      username: "sajid",
      phone: "+92 312 9876543",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-02"
    },
    {
      id: "usr-driver-03",
      name: "Zarif Gwadari",
      username: "zarif",
      phone: "+92 333 4567890",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-03"
    },
    {
      id: "usr-driver-04",
      name: "Meer Jan",
      username: "meer",
      phone: "+92 321 2468135",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-04"
    },
    {
      id: "usr-driver-05",
      name: "Yousuf Ali",
      username: "yousuf",
      phone: "+92 345 1357924",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-05"
    }
  ],
  ambulances: [
    {
      id: "amb-01",
      vehicle_number: "GWD-7861",
      driver_name: "Kabeer Khan",
      driver_phone: "+92 300 1234567",
      status: "Available",
      latitude: 25.1225,
      longitude: 62.3210,
      bearing: 0
    },
    {
      id: "amb-02",
      vehicle_number: "GWD-4321",
      driver_name: "Sajid Baloch",
      driver_phone: "+92 312 9876543",
      status: "Available",
      latitude: 25.1380,
      longitude: 62.3020,
      bearing: 0
    },
    {
      id: "amb-03",
      vehicle_number: "GWD-8899",
      driver_name: "Zarif Gwadari",
      driver_phone: "+92 333 4567890",
      status: "Available",
      latitude: 25.1150,
      longitude: 62.3350,
      bearing: 0
    },
    {
      id: "amb-04",
      vehicle_number: "GWD-1122",
      driver_name: "Meer Jan",
      driver_phone: "+92 321 2468135",
      status: "Available",
      latitude: 25.1280,
      longitude: 62.3480,
      bearing: 0
    },
    {
      id: "amb-05",
      vehicle_number: "GWD-5566",
      driver_name: "Yousuf Ali",
      driver_phone: "+92 345 1357924",
      status: "Available",
      latitude: 25.1060,
      longitude: 62.3280,
      bearing: 0
    }
  ],
  hospitals: [
    {
      id: "hosp-01",
      name: "Gwadar Indus Hospital (Pak-China Friendship)",
      latitude: 25.1225,
      longitude: 62.3450,
      contact_number: "+92 86 4211111",
      available_beds: 15,
      total_beds: 120,
      icu_ventilators: 8,
      facilities: ["Emergency Care", "ICU", "Surgery", "Pediatrics", "Trauma Center"]
    },
    {
      id: "hosp-02",
      name: "GDA Hospital (Gwadar Development Authority)",
      latitude: 25.1380,
      longitude: 62.3210,
      contact_number: "+92 86 4211222",
      available_beds: 8,
      total_beds: 50,
      icu_ventilators: 3,
      facilities: ["Emergency Care", "Outpatient Clinic", "Maternity Ward", "Laboratory"]
    },
    {
      id: "hosp-03",
      name: "DHQ Hospital Gwadar",
      latitude: 25.1160,
      longitude: 62.3240,
      contact_number: "+92 86 4210080",
      available_beds: 5,
      total_beds: 60,
      icu_ventilators: 2,
      facilities: ["General Emergency", "X-Ray", "Pharmacy", "Operation Theater"]
    },
    {
      id: "hosp-04",
      name: "Red Crescent Medical Center",
      latitude: 25.1280,
      longitude: 62.3080,
      contact_number: "+92 86 4210456",
      available_beds: 4,
      total_beds: 25,
      icu_ventilators: 0,
      facilities: ["First Aid", "Ambulance Station", "Pharmacy"]
    }
  ],
  requests: []
};

// Load database
function loadDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      saveDb(initialData);
      return initialData;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, using initial memory state.", err);
    return initialData;
  }
}

// Save database
function saveDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing database file.", err);
    return false;
  }
}

// Helper Repository Layer
const db = {
  // Users (RBAC)
  getUsers: () => loadDb().users,
  getUserById: (id) => loadDb().users.find(u => u.id === id),
  getUserByPhone: (phone) => loadDb().users.find(u => u.phone === phone),
  getUserByUsername: (username) => loadDb().users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase()),

  // Staff management (Chairman only)
  getStaff: () => loadDb().users.filter(u => u.role === 'driver' || u.role === 'dispatcher'),
  createStaffAccount: (staffData) => {
    const data = loadDb();
    // Check username uniqueness
    const exists = data.users.find(u => u.username && u.username.toLowerCase() === staffData.username.toLowerCase());
    if (exists) return { error: 'Username already exists' };

    const newUser = {
      id: `usr-${staffData.role}-${uuidv4().slice(0,8)}`,
      name: staffData.name,
      username: staffData.username,
      phone: staffData.phone || '',
      password: staffData.password,
      role: staffData.role,
      ...(staffData.role === 'driver' && staffData.ambulance_id ? { ambulance_id: staffData.ambulance_id } : {}),
      created_at: new Date().toISOString(),
      created_by: staffData.created_by || 'chairman'
    };
    data.users.push(newUser);
    saveDb(data);
    return newUser;
  },
  deleteStaffAccount: (id) => {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === id && (u.role === 'driver' || u.role === 'dispatcher'));
    if (index === -1) return false;
    data.users.splice(index, 1);
    saveDb(data);
    return true;
  },

  // Ambulances
  getAmbulances: () => loadDb().ambulances,
  getAmbulanceById: (id) => loadDb().ambulances.find(a => a.id === id),
  updateAmbulance: (id, updates) => {
    const data = loadDb();
    const index = data.ambulances.findIndex(a => a.id === id);
    if (index !== -1) {
      data.ambulances[index] = { ...data.ambulances[index], ...updates };
      saveDb(data);
      return data.ambulances[index];
    }
    return null;
  },

  // Hospitals
  getHospitals: () => loadDb().hospitals,
  getHospitalById: (id) => loadDb().hospitals.find(h => h.id === id),
  updateHospital: (id, updates) => {
    const data = loadDb();
    const index = data.hospitals.findIndex(h => h.id === id);
    if (index !== -1) {
      data.hospitals[index] = { ...data.hospitals[index], ...updates };
      saveDb(data);
      return data.hospitals[index];
    }
    return null;
  },

  // Requests
  getRequests: () => loadDb().requests,
  getRequestById: (id) => loadDb().requests.find(r => r.id === id),
  createRequest: (requestData) => {
    const data = loadDb();
    const newRequest = {
      id: uuidv4(),
      citizen_id: requestData.citizen_id || null,
      citizen_name: requestData.citizen_name,
      citizen_phone: requestData.citizen_phone,
      emergency_type: requestData.emergency_type || "Other",
      status: "Pending",
      latitude: parseFloat(requestData.latitude),
      longitude: parseFloat(requestData.longitude),
      location_name: requestData.location_name || "Gwadar",
      assigned_ambulance_id: null,
      assigned_hospital_id: null,
      chat_history: [],
      voice_recordings: [],
      created_at: new Date().toISOString(),
      completed_at: null
    };
    data.requests.push(newRequest);
    saveDb(data);
    return newRequest;
  },
  updateRequest: (id, updates) => {
    const data = loadDb();
    const index = data.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      data.requests[index] = { ...data.requests[index], ...updates };
      saveDb(data);
      return data.requests[index];
    }
    return null;
  },
  addRequestChatMessage: (id, message) => {
    const data = loadDb();
    const index = data.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      if (!data.requests[index].chat_history) {
        data.requests[index].chat_history = [];
      }
      data.requests[index].chat_history.push({
        id: uuidv4(),
        sender: message.sender,
        text: message.text,
        time: new Date().toISOString()
      });
      saveDb(data);
      return data.requests[index];
    }
    return null;
  },
  addRequestVoiceRecording: (id, voiceBase64) => {
    const data = loadDb();
    const index = data.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      if (!data.requests[index].voice_recordings) {
        data.requests[index].voice_recordings = [];
      }
      data.requests[index].voice_recordings.push({
        id: uuidv4(),
        audioData: voiceBase64,
        created_at: new Date().toISOString()
      });
      saveDb(data);
      return data.requests[index];
    }
    return null;
  },

  // Reset database state to seed
  resetDb: () => {
    saveDb(initialData);
    return initialData;
  }
};

module.exports = db;
