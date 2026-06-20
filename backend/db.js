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
const cleanData = {
  users: [
    // Chairman (Super Admin)
    {
      id: "usr-chairman-01",
      name: "Chairman GASG",
      username: "chairman",
      phone: "03330001122",
      password: "chairman123",
      role: "chairman",
      cnic: "54400-1111111-1",
      photo: ""
    }
  ],
  ambulances: [],
  hospitals: [
    {
      id: "hosp-01",
      name: "Gwadar Indus Hospital (Pak-China Friendship)",
      latitude: 25.186108,
      longitude: 62.332846,
      contact_number: "+92 86 4211111",
      available_beds: 15,
      total_beds: 120,
      icu_ventilators: 8,
      facilities: ["Emergency Care", "ICU", "Surgery", "Pediatrics", "Trauma Center"]
    },
    {
      id: "hosp-03",
      name: "DHQ Hospital Gwadar",
      latitude: 25.134696,
      longitude: 62.321995,
      contact_number: "+92 86 4210080",
      available_beds: 5,
      total_beds: 60,
      icu_ventilators: 2,
      facilities: ["General Emergency", "X-Ray", "Pharmacy", "Operation Theater"]
    }
  ],
  requests: []
};

const demoData = {
  users: [
    // Chairman (Super Admin)
    {
      id: "usr-chairman-01",
      name: "Chairman GASG",
      username: "chairman",
      phone: "03330001122",
      password: "chairman123",
      role: "chairman",
      cnic: "54400-1111111-1",
      photo: ""
    },
    // Dispatcher (created by Chairman)
    {
      id: "usr-disp-01",
      name: "Saleem Shah",
      username: "saleem",
      phone: "+92 300 0000000",
      password: "dispatch123",
      role: "dispatcher",
      cnic: "54400-2222222-2",
      photo: ""
    },
    // Drivers (created by Chairman, linked to their ambulances)
    {
      id: "usr-driver-01",
      name: "Kabeer Khan",
      username: "kabeer",
      phone: "+92 300 1234567",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-01",
      cnic: "54400-3333333-3",
      photo: ""
    },
    {
      id: "usr-driver-02",
      name: "Sajid Baloch",
      username: "sajid",
      phone: "+92 312 9876543",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-02",
      cnic: "54400-4444444-4",
      photo: ""
    },
    {
      id: "usr-driver-03",
      name: "Zarif Gwadari",
      username: "zarif",
      phone: "+92 333 4567890",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-03",
      cnic: "54400-5555555-5",
      photo: ""
    },
    {
      id: "usr-driver-04",
      name: "Meer Jan",
      username: "meer",
      phone: "+92 321 2468135",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-04",
      cnic: "54400-6666666-6",
      photo: ""
    },
    {
      id: "usr-driver-05",
      name: "Yousuf Ali",
      username: "yousuf",
      phone: "+92 345 1357924",
      password: "driver123",
      role: "driver",
      ambulance_id: "amb-05",
      cnic: "54400-7777777-7",
      photo: ""
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
      bearing: 0,
      model: "Toyota Hiace 2024",
      photo: ""
    },
    {
      id: "amb-02",
      vehicle_number: "GWD-4321",
      driver_name: "Sajid Baloch",
      driver_phone: "+92 312 9876543",
      status: "Available",
      latitude: 25.1380,
      longitude: 62.3020,
      bearing: 0,
      model: "Toyota Hiace 2023",
      photo: ""
    },
    {
      id: "amb-03",
      vehicle_number: "GWD-8899",
      driver_name: "Zarif Gwadari",
      driver_phone: "+92 333 4567890",
      status: "Available",
      latitude: 25.1150,
      longitude: 62.3350,
      bearing: 0,
      model: "Suzuki APV 2024",
      photo: ""
    },
    {
      id: "amb-04",
      vehicle_number: "GWD-1122",
      driver_name: "Meer Jan",
      driver_phone: "+92 321 2468135",
      status: "Available",
      latitude: 25.1280,
      longitude: 62.3480,
      bearing: 0,
      model: "Toyota TownAce 2022",
      photo: ""
    },
    {
      id: "amb-05",
      vehicle_number: "GWD-5566",
      driver_name: "Yousuf Ali",
      driver_phone: "+92 345 1357924",
      status: "Available",
      latitude: 25.1060,
      longitude: 62.3280,
      bearing: 0,
      model: "Suzuki APV 2023",
      photo: ""
    }
  ],
  hospitals: [
    {
      id: "hosp-01",
      name: "Gwadar Indus Hospital (Pak-China Friendship)",
      latitude: 25.186108,
      longitude: 62.332846,
      contact_number: "+92 86 4211111",
      available_beds: 15,
      total_beds: 120,
      icu_ventilators: 8,
      facilities: ["Emergency Care", "ICU", "Surgery", "Pediatrics", "Trauma Center"]
    },
    {
      id: "hosp-03",
      name: "DHQ Hospital Gwadar",
      latitude: 25.134696,
      longitude: 62.321995,
      contact_number: "+92 86 4210080",
      available_beds: 5,
      total_beds: 60,
      icu_ventilators: 2,
      facilities: ["General Emergency", "X-Ray", "Pharmacy", "Operation Theater"]
    }
  ],
  requests: []
};

const initialData = process.env.CLEAN_SEED === 'true' ? cleanData : demoData;

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
      cnic: staffData.cnic || '',
      photo: staffData.photo || '',
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
  updateUserPassword: (id, newPassword) => {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index].password = newPassword;
    saveDb(data);
    return data.users[index];
  },
  updateUserAmbulance: (id, ambulanceId) => {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index].ambulance_id = ambulanceId;
    saveDb(data);
    return data.users[index];
  },
  incrementDriverTrips: (driverId) => {
    const data = loadDb();
    const index = data.users.findIndex(u => u.id === driverId);
    if (index === -1) return null;
    data.users[index].trips_completed = (data.users[index].trips_completed || 0) + 1;
    saveDb(data);
    return data.users[index];
  },
  incrementAmbulanceTrips: (ambulanceId) => {
    const data = loadDb();
    const index = data.ambulances.findIndex(a => a.id === ambulanceId);
    if (index === -1) return null;
    data.ambulances[index].trips_completed = (data.ambulances[index].trips_completed || 0) + 1;
    saveDb(data);
    return data.ambulances[index];
  },

  // Ambulances
  getAmbulances: () => {
    const data = loadDb();
    return data.ambulances.map(amb => {
      const driver = data.users.find(u => 
        u.role === 'driver' && 
        (u.ambulance_id === amb.id || (u.ambulance_id && u.ambulance_id.trim().toLowerCase() === amb.vehicle_number.trim().toLowerCase()))
      );
      return {
        ...amb,
        driver_name: driver ? driver.name : 'No Driver Assigned',
        driver_phone: driver ? driver.phone : '—'
      };
    });
  },
  getAmbulanceById: (id) => {
    const data = loadDb();
    const amb = data.ambulances.find(a => a.id === id || (a.vehicle_number && id && a.vehicle_number.trim().toLowerCase() === id.trim().toLowerCase()));
    if (!amb) return null;
    const driver = data.users.find(u => 
      u.role === 'driver' && 
      (u.ambulance_id === amb.id || (u.ambulance_id && u.ambulance_id.trim().toLowerCase() === amb.vehicle_number.trim().toLowerCase()))
    );
    return {
      ...amb,
      driver_name: driver ? driver.name : 'No Driver Assigned',
      driver_phone: driver ? driver.phone : '—'
    };
  },
  createAmbulance: (ambData) => {
    const data = loadDb();
    const exists = data.ambulances.find(a => a.vehicle_number.trim().toLowerCase() === ambData.vehicle_number.trim().toLowerCase());
    if (exists) return { error: 'Ambulance vehicle number already exists' };

    const newAmb = {
      id: `amb-${uuidv4().slice(0,8)}`,
      vehicle_number: ambData.vehicle_number.trim(),
      model: ambData.model.trim(),
      photo: ambData.photo || '',
      status: 'Available',
      latitude: 25.1219,
      longitude: 62.3254,
      bearing: 0,
      siren: false,
      created_at: new Date().toISOString()
    };
    data.ambulances.push(newAmb);
    saveDb(data);
    return newAmb;
  },
  deleteAmbulance: (id) => {
    const data = loadDb();
    const index = data.ambulances.findIndex(a => a.id === id);
    if (index === -1) return false;
    data.ambulances.splice(index, 1);
    saveDb(data);
    return true;
  },
  updateAmbulance: (id, updates) => {
    const data = loadDb();
    const index = data.ambulances.findIndex(a => a.id === id || (a.vehicle_number && id && a.vehicle_number.trim().toLowerCase() === id.trim().toLowerCase()));
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
      assigned_driver_id: null,
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
  deleteRequest: (id) => {
    const data = loadDb();
    const index = data.requests.findIndex(r => r.id === id);
    if (index !== -1) {
      data.requests.splice(index, 1);
      saveDb(data);
      return true;
    }
    return false;
  },

  // Reset database state to clean start
  resetDb: () => {
    const data = loadDb();
    data.requests = [];
    if (data.ambulances) {
      data.ambulances = data.ambulances.map(amb => ({
        ...amb,
        status: 'Available',
        trips: 0
      }));
    }
    if (data.users) {
      data.users = data.users.map(u => {
        if (u.role === 'driver') {
          return { ...u, trips_completed: 0 };
        }
        return u;
      });
    }
    if (data.hospitals) {
      data.hospitals = data.hospitals.map(h => ({
        ...h,
        available_beds: h.total_beds
      }));
    }
    saveDb(data);
    return data;
  }
};

module.exports = db;
