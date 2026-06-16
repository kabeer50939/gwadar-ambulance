const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Clean production state seed (No demo staff/ambulances, only Chairman and Hospitals)
const productionCleanData = {
  users: [
    // Chairman (Super Admin)
    {
      id: "usr-chairman-01",
      name: "Chairman GASG",
      username: "chairman",
      phone: "03330001122",
      password: "chairman123", // The client should change this upon login
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

try {
  fs.writeFileSync(dbPath, JSON.stringify(productionCleanData, null, 2), 'utf8');
  console.log("==========================================================");
  console.log("SUCCESS: Gwadar Ambulance Database Initialized!");
  console.log("----------------------------------------------------------");
  console.log("- All mock drivers, staff, and ambulances have been cleared.");
  console.log("- Request history and chat records have been wiped.");
  console.log("- Standard Gwadar hospitals are initialized.");
  console.log("- Default Chairman credentials: username 'chairman', password 'chairman123'");
  console.log("==========================================================");
} catch (err) {
  console.error("Failed to write clean database file:", err.message);
  process.exit(1);
}
